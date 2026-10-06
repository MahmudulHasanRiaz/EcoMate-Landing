/**
 * RFC 4180 CSV serialisation (Task 16 §2).
 *
 * ## Why this is not `JSON.stringify` with commas
 *
 * A lead note is free text from a public form. It may contain a comma, a double quote, a
 * newline, or all three, and every one of those is legal in CSV — provided the field is quoted
 * and its own quotes are doubled. A value written unescaped into a comma-delimited file does
 * not corrupt the *file* so much as silently shift every later cell one column left, which
 * Excel shows as a plausible-looking wrong spreadsheet. Nobody notices until a phone number
 * reads as a date.
 *
 * ## The formula-injection guard
 *
 * A leading `=`, `+`, `-`, `@`, TAB or CR makes Excel and LibreOffice treat a cell as a
 * formula. `=HYPERLINK("http://attacker.example","click")` in a lead name is therefore a live
 * payload the moment an operator opens the export, and the row is attacker-controlled by
 * construction. Those cells are prefixed with a single quote, which is the one prefix every
 * spreadsheet treats as "this is text" while still displaying the original characters. The
 * cost is a leading apostrophe in a non-spreadsheet parser (Postgres `COPY`, `csv.reader`),
 * which is the right trade against a formula executing with the operator's own privileges.
 *
 * Already-quoted values are unaffected: the guard runs before quoting, on the raw cell.
 */
const NEEDS_QUOTING = /[",\r\n]/;

/** Characters a spreadsheet treats as the start of a formula. */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export type CsvCell = string | number | boolean | null | undefined;

/** Serialise one cell, quoting and escaping as required. */
export function csvCell(value: CsvCell): string {
  if (value === null || value === undefined) return '';
  const raw = String(value);

  // Guard first, on the unquoted value: the apostrophe is part of the cell's *content*, so it
  // has to be decided before the quoting rules are applied.
  const guarded = FORMULA_PREFIX.test(raw) ? `'${raw}` : raw;

  // Quote on the *guarded* value. A neutralised formula cell needs no quoting of its own — the
  // apostrophe is not a delimiter — and adding quotes there would be noise in the output.
  if (!NEEDS_QUOTING.test(guarded)) return guarded;
  // RFC 4180: wrap in double quotes, and each embedded double quote becomes two. A literal
  // newline inside quotes is legal and is preserved verbatim.
  return `"${guarded.replace(/"/g, '""')}"`;
}

/** Serialise one row. Always produces exactly as many fields as `columns` requested. */
export function csvRow(cells: readonly CsvCell[]): string {
  return cells.map(csvCell).join(',');
}

/**
 * Build a whole CSV document, header first.
 *
 * Rows are joined with CRLF per RFC 4180. `\n` alone is accepted by every spreadsheet, but a
 * CRLF document is what Excel writes and what a diff of two exports should be able to
 * compare cleanly.
 */
export function csvDocument(columns: readonly string[], rows: readonly (readonly CsvCell[])[]): string {
  const lines = [csvRow(columns), ...rows.map(csvRow)];
  return `${lines.join('\r\n')}\r\n`;
}

/**
 * UTF-8 BOM for Excel.
 *
 * Without it, Excel on Windows reads a UTF-8 CSV as the system codepage and Bengali
 * (`আপনার অর্ডার`) renders as mojibake. There is no equivalent workaround in the file format
 * itself — the BOM is the only signal Excel honours for this. Modern Excel, LibreOffice and
 * Google Sheets all skip a leading BOM correctly, so it is safe for every consumer.
 */
export const UTF8_BOM = '\uFEFF';