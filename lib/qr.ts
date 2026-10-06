/**
 * Minimal QR Code encoder (byte mode, ECC level M, versions 1-10) used to render the
 * TOTP `otpauth://` enrolment URI as an inline SVG data URL (Task 14 §6).
 *
 * No dependency on purpose: a QR library is the kind of package that silently drags a
 * megabyte into the Worker bundle for the one screen that needs it, and enrolment must not
 * call an external QR service (that would leak the TOTP secret to a third party).
 *
 * Scope: byte mode only, ECC M (15 % recovery — comfortable for phone cameras), version
 * chosen automatically between 1 and 10 (~213 bytes of payload). Larger payloads throw;
 * callers fall back to showing the secret for manual entry.
 *
 * Implemented to ISO/IEC 18004: mode/quantity header, Reed-Solomon EC over GF(256) with the
 * 0x11D primitive polynomial, block interleaving, all eight masks scored with the standard
 * four penalty rules.
 */

export interface QrMatrix {
  readonly size: number;
  /** `modules[row][col]`, `true` = dark. */
  readonly modules: readonly (readonly boolean[])[];
}

const VERSIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const MAX_VERSION = 10;

/** Data codewords per version, ECC level M. */
const DATA_CODEWORDS = [16, 28, 44, 64, 86, 108, 124, 154, 182, 216] as const;
/** Total codewords per version (data + error correction), ECC level M. */
const TOTAL_CODEWORDS = [26, 44, 70, 100, 134, 172, 196, 242, 292, 346] as const;

interface BlockSpec {
  readonly count: number;
  readonly dataCodewords: number;
  readonly ecCodewords: number;
}

/** Reed-Solomon block layout per version, ECC level M. */
const RS_BLOCKS: readonly (readonly BlockSpec[])[] = [
  [{ count: 1, dataCodewords: 16, ecCodewords: 10 }],
  [{ count: 1, dataCodewords: 28, ecCodewords: 16 }],
  [{ count: 1, dataCodewords: 44, ecCodewords: 26 }],
  [{ count: 2, dataCodewords: 32, ecCodewords: 18 }],
  [{ count: 2, dataCodewords: 43, ecCodewords: 24 }],
  [{ count: 4, dataCodewords: 27, ecCodewords: 16 }],
  [{ count: 4, dataCodewords: 31, ecCodewords: 18 }],
  [
    { count: 2, dataCodewords: 38, ecCodewords: 22 },
    { count: 2, dataCodewords: 39, ecCodewords: 22 },
  ],
  [
    { count: 3, dataCodewords: 36, ecCodewords: 22 },
    { count: 2, dataCodewords: 37, ecCodewords: 22 },
  ],
  [
    { count: 4, dataCodewords: 43, ecCodewords: 26 },
    { count: 1, dataCodewords: 44, ecCodewords: 26 },
  ],
];

/** Alignment-pattern centre coordinates per version. */
const ALIGNMENT_POSITIONS: readonly (readonly number[])[] = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

// --- GF(256) arithmetic ------------------------------------------------------

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if ((x & 0x100) !== 0) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) GF_EXP[i] = GF_EXP[i - 255];
}

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

/** Generator polynomial for `ecLen` EC codewords: coefficients highest degree first. */
function rsGenerator(ecLen: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < ecLen; i += 1) {
    const next = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], GF_EXP[i]);
    }
    poly = next;
  }
  return poly;
}

const generatorCache = new Map<number, Uint8Array>();

/** Remainder of `data * x^ecLen` divided by the generator polynomial — the EC codewords. */
function rsEncode(data: Uint8Array, ecLen: number): Uint8Array {
  let generator = generatorCache.get(ecLen);
  if (!generator) {
    generator = rsGenerator(ecLen);
    generatorCache.set(ecLen, generator);
  }

  const remainder = new Uint8Array(ecLen);
  for (const byte of data) {
    const factor = byte ^ remainder[0];
    remainder.copyWithin(0, 1);
    remainder[ecLen - 1] = 0;
    if (factor !== 0) {
      for (let j = 1; j <= ecLen; j += 1) {
        remainder[j - 1] ^= gfMul(generator[j], factor);
      }
    }
  }
  return remainder;
}

// --- Bit stream + codeword assembly ------------------------------------------

class BitWriter {
  private readonly bits: number[] = [];

  put(value: number, length: number): void {
    for (let i = length - 1; i >= 0; i -= 1) this.bits.push((value >>> i) & 1);
  }

  get length(): number {
    return this.bits.length;
  }

  toBytes(): Uint8Array {
    const out = new Uint8Array(Math.ceil(this.bits.length / 8));
    for (let i = 0; i < this.bits.length; i += 1) {
      if (this.bits[i] === 1) out[i >> 3] |= 0x80 >> (i & 7);
    }
    return out;
  }
}

function buildCodewords(bytes: Uint8Array): { version: number; codewords: Uint8Array } {
  let version = -1;
  for (const candidate of VERSIONS) {
    const capacityBits = DATA_CODEWORDS[candidate - 1] * 8;
    const headerBits = 4 + (candidate >= 10 ? 16 : 8);
    if (headerBits + bytes.length * 8 <= capacityBits) {
      version = candidate;
      break;
    }
  }
  if (version === -1) {
    throw new Error(`QR payload of ${bytes.length} bytes exceeds the version ${MAX_VERSION}-M capacity`);
  }

  const capacityBits = DATA_CODEWORDS[version - 1] * 8;
  const writer = new BitWriter();
  writer.put(0b0100, 4); // byte mode
  writer.put(bytes.length, version >= 10 ? 16 : 8);
  for (const byte of bytes) writer.put(byte, 8);

  writer.put(0, Math.min(4, capacityBits - writer.length)); // terminator
  while (writer.length % 8 !== 0) writer.put(0, 1); // byte alignment

  const data: number[] = [...writer.toBytes()];
  let pad = 0xec;
  while (data.length < DATA_CODEWORDS[version - 1]) {
    data.push(pad);
    pad = pad === 0xec ? 0x11 : 0xec;
  }

  const specs = RS_BLOCKS[version - 1];
  // A spec's `count` means "this many identical blocks" (e.g. 2×38 + 2×39 for v8-M):
  // expand it before slicing the data stream, or the blocks come out half-length.
  const blockSpecs: Array<{ readonly dataCodewords: number; readonly ecCodewords: number }> = [];
  for (const spec of specs) {
    for (let i = 0; i < spec.count; i += 1) {
      blockSpecs.push({ dataCodewords: spec.dataCodewords, ecCodewords: spec.ecCodewords });
    }
  }

  const blocks = blockSpecs.map((spec) => ({
    data: data.splice(0, spec.dataCodewords),
    ec: [] as number[],
  }));
  for (let i = 0; i < blocks.length; i += 1) {
    blocks[i].ec = [...rsEncode(Uint8Array.from(blocks[i].data), blockSpecs[i].ecCodewords)];
  }

  const codewords: number[] = [];
  const maxData = Math.max(...blocks.map((block) => block.data.length));
  for (let i = 0; i < maxData; i += 1) {
    for (const block of blocks) if (i < block.data.length) codewords.push(block.data[i]);
  }
  const ecPerBlock = blockSpecs[0].ecCodewords;
  for (let i = 0; i < ecPerBlock; i += 1) {
    for (const block of blocks) codewords.push(block.ec[i]);
  }

  // Fail loudly if a table above is ever mistyped instead of emitting an unscannable code.
  const expected = TOTAL_CODEWORDS[version - 1];
  if (codewords.length !== expected) {
    throw new Error(`QR codeword table mismatch for version ${version}: ${codewords.length} != ${expected}`);
  }

  return { version, codewords: Uint8Array.from(codewords) };
}

// --- BCH format / version information ----------------------------------------

function bchDigit(value: number): number {
  let digit = 0;
  let rest = value;
  while (rest !== 0) {
    digit += 1;
    rest >>>= 1;
  }
  return digit;
}

/** 15-bit format information (ECC level M = 0b00, so only the mask changes). */
function formatInfoBits(mask: number): number {
  const data = mask; // (0b00 << 3) | mask
  let remainder = data << 10;
  while (bchDigit(remainder) - bchDigit(0x0537) >= 0) {
    remainder ^= 0x0537 << (bchDigit(remainder) - bchDigit(0x0537));
  }
  return ((data << 10) | remainder) ^ 0x5412;
}

/** 18-bit version information for version >= 7. */
function versionInfoBits(version: number): number {
  let remainder = version << 12;
  while (bchDigit(remainder) - bchDigit(0x1f25) >= 0) {
    remainder ^= 0x1f25 << (bchDigit(remainder) - bchDigit(0x1f25));
  }
  return (version << 12) | remainder;
}

// --- Matrix construction ------------------------------------------------------

function setProbePattern(modules: (boolean | null)[][], size: number, row: number, col: number): void {
  for (let r = -1; r <= 7; r += 1) {
    if (row + r < 0 || row + r >= size) continue;
    for (let c = -1; c <= 7; c += 1) {
      if (col + c < 0 || col + c >= size) continue;
      const dark =
        (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
        (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
        (r >= 2 && r <= 4 && c >= 2 && c <= 4);
      modules[row + r][col + c] = dark;
    }
  }
}

function setTiming(modules: (boolean | null)[][], size: number): void {
  for (let r = 8; r < size - 8; r += 1) {
    if (modules[r][6] === null) modules[r][6] = r % 2 === 0;
  }
  for (let c = 8; c < size - 8; c += 1) {
    if (modules[6][c] === null) modules[6][c] = c % 2 === 0;
  }
}

function setAlignment(modules: (boolean | null)[][], version: number): void {
  const positions = ALIGNMENT_POSITIONS[version - 1];
  for (const row of positions) {
    for (const col of positions) {
      if (modules[row][col] !== null) continue;
      for (let r = -2; r <= 2; r += 1) {
        for (let c = -2; c <= 2; c += 1) {
          modules[row + r][col + c] = Math.max(Math.abs(r), Math.abs(c)) !== 1;
        }
      }
    }
  }
}

function setVersionInfo(modules: (boolean | null)[][], size: number, version: number): void {
  const bits = versionInfoBits(version);
  for (let i = 0; i < 18; i += 1) {
    const dark = ((bits >>> i) & 1) === 1;
    modules[Math.floor(i / 3)][(i % 3) + size - 11] = dark;
    modules[(i % 3) + size - 11][Math.floor(i / 3)] = dark;
  }
}

function setFormatInfo(modules: (boolean | null)[][], size: number, mask: number): void {
  const bits = formatInfoBits(mask);
  for (let i = 0; i < 15; i += 1) {
    const dark = ((bits >>> i) & 1) === 1;
    if (i < 6) modules[i][8] = dark;
    else if (i < 8) modules[i + 1][8] = dark;
    else modules[size - 15 + i][8] = dark;
  }
  for (let i = 0; i < 15; i += 1) {
    const dark = ((bits >>> i) & 1) === 1;
    if (i < 8) modules[8][size - i - 1] = dark;
    else if (i < 9) modules[8][15 - i] = dark;
    else modules[8][15 - i - 1] = dark;
  }
  modules[size - 8][8] = true; // the always-dark module
}

function maskBit(mask: number, row: number, col: number): boolean {
  switch (mask) {
    case 0:
      return (row + col) % 2 === 0;
    case 1:
      return row % 2 === 0;
    case 2:
      return col % 3 === 0;
    case 3:
      return (row + col) % 3 === 0;
    case 4:
      return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5:
      return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6:
      return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    default:
      return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
  }
}

function createBaseMatrix(version: number): (boolean | null)[][] {
  const size = version * 4 + 17;
  const modules: (boolean | null)[][] = Array.from({ length: size }, () =>
    new Array<boolean | null>(size).fill(null),
  );

  setProbePattern(modules, size, 0, 0);
  setProbePattern(modules, size, size - 7, 0);
  setProbePattern(modules, size, 0, size - 7);
  // Alignment patterns before the timing pattern: several centres sit on row/column 6 and
  // the alignment cell must win there (the reference/ISO behaviour), otherwise the timing
  // row would block them out.
  setAlignment(modules, version);
  setTiming(modules, size);
  if (version >= 7) setVersionInfo(modules, size, version);
  // Reserve the format-information cells (and the always-dark module) before data
  // placement. Without this, `mapData` treats them as free cells, shifts the codeword
  // stream into them and `setFormatInfo` overwrites that data — an unscannable symbol.
  // The values written here are placeholders; `setFormatInfo` rewrites them per mask.
  setFormatInfo(modules, size, 0);
  return modules;
}

function mapData(modules: (boolean | null)[][], codewords: Uint8Array, mask: number): void {
  const size = modules.length;
  let inc = -1;
  let row = size - 1;
  let bitIndex = 7;
  let byteIndex = 0;

  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col -= 1;
    for (;;) {
      for (let c = 0; c < 2; c += 1) {
        const targetCol = col - c;
        if (modules[row][targetCol] !== null) continue;

        let dark = false;
        if (byteIndex < codewords.length) {
          dark = ((codewords[byteIndex] >>> bitIndex) & 1) === 1;
        }
        if (maskBit(mask, row, targetCol)) dark = !dark;
        modules[row][targetCol] = dark;

        bitIndex -= 1;
        if (bitIndex === -1) {
          byteIndex += 1;
          bitIndex = 7;
        }
      }
      row += inc;
      if (row < 0 || row >= size) {
        row -= inc;
        inc = -inc;
        break;
      }
    }
  }
}

// --- Mask penalty scoring -----------------------------------------------------

const PENALTY_PATTERN_A = 0b00001011101; // 4 light, then 1:1:3:1:1
const PENALTY_PATTERN_B = 0b10111010000; // 1:1:3:1:1, then 4 light

function linePenalty(lines: readonly (readonly boolean[])[]): number {
  let score = 0;
  for (const line of lines) {
    // Rule 1: runs of five or more same-colour modules.
    let run = 1;
    for (let i = 1; i < line.length; i += 1) {
      if (line[i] === line[i - 1]) {
        run += 1;
      } else {
        if (run >= 5) score += 3 + (run - 5);
        run = 1;
      }
    }
    if (run >= 5) score += 3 + (run - 5);

    // Rule 3: the finder-like 1:1:3:1:1 pattern with four light modules beside it.
    for (let i = 0; i + 11 <= line.length; i += 1) {
      let window = 0;
      for (let j = 0; j < 11; j += 1) window = (window << 1) | (line[i + j] ? 1 : 0);
      if (window === PENALTY_PATTERN_A || window === PENALTY_PATTERN_B) score += 40;
    }
  }
  return score;
}

function penalty(matrix: readonly (readonly boolean[])[]): number {
  const size = matrix.length;
  const rows = matrix;
  const columns: boolean[][] = Array.from({ length: size }, (_, col) =>
    matrix.map((row) => row[col]),
  );

  let score = linePenalty(rows) + linePenalty(columns);

  // Rule 2: 2x2 blocks of the same colour.
  for (let row = 0; row + 1 < size; row += 1) {
    for (let col = 0; col + 1 < size; col += 1) {
      const cell = matrix[row][col];
      if (
        cell === matrix[row][col + 1] &&
        cell === matrix[row + 1][col] &&
        cell === matrix[row + 1][col + 1]
      ) {
        score += 3;
      }
    }
  }

  // Rule 4: deviation from a 50 % dark ratio.
  let dark = 0;
  for (const row of matrix) for (const cell of row) if (cell) dark += 1;
  const ratioPercent = (dark * 100) / (size * size);
  score += Math.floor(Math.abs(ratioPercent - 50) / 5) * 10;

  return score;
}

// --- Public API ---------------------------------------------------------------

/** Encode `text` (UTF-8, byte mode) and return the finished module matrix. */
export function encodeQrMatrix(text: string): QrMatrix {
  const bytes = new TextEncoder().encode(text);
  const { version, codewords } = buildCodewords(bytes);
  const size = version * 4 + 17;

  // One candidate matrix per mask, scored with the standard penalty rules.
  const candidates: boolean[][][] = [];
  const scores: number[] = [];
  for (let mask = 0; mask < 8; mask += 1) {
    const modules = createBaseMatrix(version);
    mapData(modules, codewords, mask);
    setFormatInfo(modules, size, mask);
    const matrix = modules.map((row) => row.map((cell) => cell === true));
    candidates.push(matrix);
    scores.push(penalty(matrix));
  }

  let best = 0;
  for (let i = 1; i < scores.length; i += 1) if (scores[i] < scores[best]) best = i;
  return { size, modules: candidates[best] };
}

/** Render a matrix as a standalone SVG document with a four-module quiet zone. */
export function qrMatrixToSvg(matrix: QrMatrix, margin = 4): string {
  const dimension = matrix.size + margin * 2;
  const runs: string[] = [];
  for (let row = 0; row < matrix.size; row += 1) {
    let start = -1;
    for (let col = 0; col <= matrix.size; col += 1) {
      const dark = col < matrix.size && matrix.modules[row][col];
      if (dark && start === -1) start = col;
      if (!dark && start !== -1) {
        const width = col - start;
        runs.push(`M${start + margin} ${row + margin}h${width}v1h-${width}z`);
        start = -1;
      }
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dimension} ${dimension}" ` +
    `width="${dimension * 8}" height="${dimension * 8}" shape-rendering="crispEdges" role="img">` +
    `<rect width="${dimension}" height="${dimension}" fill="#ffffff"/>` +
    `<path d="${runs.join('')}" fill="#000000"/></svg>`
  );
}
