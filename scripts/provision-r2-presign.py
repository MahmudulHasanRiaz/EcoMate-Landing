#!/usr/bin/env python3
"""Auto-provision R2 presign credentials for direct-to-R2 uploads (Decision 9).

The deploy pipeline owns these credentials end to end: no operator ever mints an
R2 API token by hand. Given only the existing Cloudflare credentials
(`CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`), this script ensures exactly one
API token named `ecomate-media-presign` scoped to Object Read & Write on the media
bucket, then prints the derived S3 credentials for the caller to store:

    KEY_ID=<token id>          # S3 Access Key ID
    SECRET=<hex(sha256(value))> # S3 Secret Access Key (docs: R2 API tokens page)

Exit codes: 0 = provisioned (values on stdout) or already-provisioned-skip is
handled by the caller; 2 = soft skip with a WARNING printed (missing "API Tokens:
Edit" on the deploy token, permission group not found, or any API failure — the
legacy Worker-mediated upload keeps working, so provisioning must never fail a
deploy); 1 = mis-invocation (missing env).

API shapes (verified 2026-10-09 against developers.cloudflare.com):
- GET  /user/tokens?per_page=50&page=N
       -> {success, result: [{id, name, status, ...}], result_info: {total_count}}
- GET  /user/tokens/permission_groups
       -> {success, result: [{id, name, ...}]}  (resolved BY NAME at runtime —
       no permission-group ID is hardcoded anywhere in this repo)
- POST /user/tokens  {name, policies: [{effect: allow,
       permission_groups: [{id}], resources: {<bucket-resource>: "*"}}]}
       -> {success, result: {id, value}}  (value shown ONCE — stored immediately)
- DELETE /user/tokens/{id} -> {success, result: {id}}

Bucket resource (R2 API-tokens docs):
    com.cloudflare.edge.r2.bucket.<ACCOUNT_ID>_<JURISDICTION>_<BUCKET_NAME>
Jurisdiction is `default` for standard buckets (these are; created without a
jurisdiction flag — verify with `wrangler r2 bucket info` if ever in doubt).

Usage:
    TOKEN_NAME=ecomate-media-presign MEDIA_BUCKET=ecomate-media-prod \\
      python3 scripts/provision-r2-presign.py
    # dry run (no network, prints the exact create payload for review):
    python3 scripts/provision-r2-presign.py --dry-run
"""

import hashlib
import hmac
import json
import os
import sys
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

API_BASE = "https://api.cloudflare.com/client/v4"
TOKEN_NAME = os.environ.get("TOKEN_NAME", "ecomate-media-presign")
MEDIA_BUCKET = os.environ.get("MEDIA_BUCKET", "ecomate-media-prod")
WRITE_GROUP_NAME = "Workers R2 Storage Bucket Item Write"
JURISDICTION = "default"

# CORS ensure (deploy-owned, runs every deploy independent of credential state).
# Comma-separated site origins allowed to PUT straight to R2 from a browser.
SITE_ORIGINS = [o.strip() for o in os.environ.get("SITE_ORIGIN", "https://ecomate.bd").split(",") if o.strip()]
CORS_METHODS = ["PUT"]
CORS_HEADERS = ["content-type"]
CORS_MAX_AGE = 86400


class SoftSkip(Exception):
    """Provisioning step skipped with a warning — never fails the deploy."""


def warn(message: str) -> None:
    print(f"::warning::{message}", flush=True)


def fail_soft(message: str) -> "NoReturn":
    warn(message)
    raise SoftSkip(message)


def api(method: str, path: str, body: object | None = None) -> object:
    token = os.environ.get("CLOUDFLARE_API_TOKEN", "")
    if not token:
        print("provision-r2-presign: CLOUDFLARE_API_TOKEN is not set", file=sys.stderr)
        sys.exit(1)
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        API_BASE + path,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            return json.load(res)
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")[:500]
        if e.code in (401, 403):
            fail_soft(
                "Presign auto-provisioning skipped: the deploy token was rejected "
                f"(HTTP {e.code}). Add 'API Tokens: Edit' to CLOUDFLARE_API_TOKEN "
                "(dashboard → Manage Account → API Tokens), then re-run deploy. "
                "The legacy Worker-mediated upload keeps working meanwhile."
            )
        fail_soft(f"Presign auto-provisioning skipped: Cloudflare API HTTP {e.code}: {detail}")
    except Exception as e:  # network failure, timeout, bad JSON
        fail_soft(f"Presign auto-provisioning skipped: Cloudflare API unreachable: {e}")
    raise AssertionError("unreachable")


def find_token_by_name(name: str) -> dict | None:
    """Paginate the token list; return the token dict with the exact name, if any."""
    page = 1
    while True:
        payload = api("GET", f"/user/tokens?per_page=50&page={page}")
        results = payload.get("result", []) if isinstance(payload, dict) else []
        for token in results:
            if isinstance(token, dict) and token.get("name") == name:
                return token
        info = payload.get("result_info", {}) if isinstance(payload, dict) else {}
        total = info.get("total_count", 0) or 0
        if page * 50 >= total or not results:
            return None
        page += 1


def resolve_write_group_id() -> str:
    """Permission-group ID for Object Read & Write, looked up BY NAME at runtime."""
    payload = api("GET", "/user/tokens/permission_groups")
    results = payload.get("result", []) if isinstance(payload, dict) else []
    for group in results:
        if isinstance(group, dict) and group.get("name") == WRITE_GROUP_NAME:
            group_id = group.get("id", "")
            if group_id:
                return str(group_id)
    fail_soft(
        f"Presign auto-provisioning skipped: permission group "
        f"'{WRITE_GROUP_NAME}' not found in this account's permission_groups list."
    )
    raise AssertionError("unreachable")


def build_create_payload(account_id: str, bucket: str, group_id: str) -> dict:
    resource = f"com.cloudflare.edge.r2.bucket.{account_id}_{JURISDICTION}_{bucket}"
    return {
        "name": TOKEN_NAME,
        "policies": [
            {
                "effect": "allow",
                "permission_groups": [{"id": group_id}],
                "resources": {resource: "*"},
            }
        ],
    }


def main() -> None:
    if "--dry-run" in sys.argv:
        print(json.dumps(build_create_payload("<ACCOUNT_ID>", MEDIA_BUCKET, "<WRITE_GROUP_ID>"), indent=2))
        print(f"# resource: com.cloudflare.edge.r2.bucket.<ACCOUNT_ID>_{JURISDICTION}_{MEDIA_BUCKET}")
        print(f"# token name: {TOKEN_NAME}")
        print()
        print(cors_xml(SITE_ORIGINS if SITE_ORIGINS else ["https://ecomate.bd"]))
        print()
        print("# canonical request the CORS PUT would sign (no secrets in this text):")
        print(
            build_canonical_request(
                "PUT",
                "ecomate-media-prod",
                {"content-type": "application/xml", "host": "<ACCOUNT_ID>.r2.cloudflarestorage.com",
                 "x-amz-content-sha256": "<hex(sha256(xml))>", "x-amz-date": "<amzdate>"},
                "<hex(sha256(xml))>",
            )
        )
        return

    account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
    if not account_id:
        print("provision-r2-presign: CLOUDFLARE_ACCOUNT_ID is not set", file=sys.stderr)
        sys.exit(1)

    try:
        provision_credentials(account_id)
    except SoftSkip:
        pass  # warning already printed; CORS ensure below still runs

    try:
        ensure_bucket_cors(account_id)
    except SoftSkip:
        pass  # warning already printed; legacy upload path is unaffected


def provision_credentials(account_id: str) -> None:
    existing = find_token_by_name(TOKEN_NAME)
    if existing and existing.get("id"):
        # Its value is unrecoverable (shown once at creation) — a token we cannot
        # read the secret of is useless, and names are not unique, so remove it
        # before minting exactly one replacement. A failed delete aborts: creating
        # a second same-name token would violate the no-duplicates invariant.
        token_id = str(existing["id"])
        deleted = api("DELETE", f"/user/tokens/{token_id}")
        if not (isinstance(deleted, dict) and deleted.get("success")):
            fail_soft(
                f"Presign auto-provisioning skipped: found orphan token "
                f"'{TOKEN_NAME}' but could not delete it; refusing to mint a duplicate."
            )
        print(f"Removed orphan token '{TOKEN_NAME}' (value unrecoverable), minting a replacement.")

    group_id = resolve_write_group_id()
    created = api("POST", "/user/tokens", build_create_payload(account_id, MEDIA_BUCKET, group_id))
    result = created.get("result", {}) if isinstance(created, dict) else {}
    key_id = str(result.get("id", ""))
    value = str(result.get("value", ""))
    if not (isinstance(created, dict) and created.get("success") and key_id and value):
        fail_soft("Presign auto-provisioning skipped: token creation returned no id/value.")

    # S3 derivation (R2 API-tokens docs): key id = token id,
    # secret = hex(sha256(token value)). Values go to stdout ONLY, for the caller
    # to mask + push — never into logs.
    secret = hashlib.sha256(value.encode()).hexdigest()
    print(f"KEY_ID={key_id}")
    print(f"SECRET={secret}")


# ---------------------------------------------------------------------------
# Bucket CORS ensure (runs every deploy, independent of credential state).
#
# Browser PUTs go cross-origin to <account>.r2.cloudflarestorage.com, so the media
# bucket needs a CORS rule or every preflight fails. Same SigV4 HMAC chain as
# lib/r2sign.ts (header variant this time), stdlib only. The narrow media token is
# OBJECT-scoped and would 403 on bucket-level PutBucketCors, so these calls use S3
# credentials derived from the DEPLOY token itself (id via /user/tokens/verify,
# secret = hex(sha256(value)) — same derivation as above); the deploy token manages
# R2 buckets, the media token stays presign-only.
# ---------------------------------------------------------------------------

def _hmac(key: bytes, msg: str) -> bytes:
    return hmac.new(key, msg.encode(), hashlib.sha256).digest()


def s3_sign_headers(
    method: str,
    account_id: str,
    bucket: str,
    extra_headers: dict,
    payload: bytes,
    access_key: str,
    secret_key: str,
    now: datetime,
) -> dict:
    """SigV4 Authorization (+ x-amz-*) headers for one R2 S3 call (docs: AWS SigV4).

    Signs exactly the headers actually sent: content-type (PUT only), host,
    x-amz-content-sha256 (real payload hash, never UNSIGNED-PAYLOAD — always
    accepted), x-amz-date. Scope `<date>/auto/s3/aws4_request` (R2 region `auto`).
    """
    host = f"{account_id}.r2.cloudflarestorage.com"
    amzdate = now.strftime("%Y%m%dT%H%M%SZ")
    datestamp = now.strftime("%Y%m%d")
    payload_hash = hashlib.sha256(payload).hexdigest()
    headers = {"host": host, "x-amz-content-sha256": payload_hash, "x-amz-date": amzdate}
    headers.update({k.lower(): v.strip() for k, v in extra_headers.items()})
    signed = ";".join(sorted(headers))
    canonical = build_canonical_request(method, bucket, headers, payload_hash)
    scope = f"{datestamp}/auto/s3/aws4_request"
    string_to_sign = "\n".join(["AWS4-HMAC-SHA256", amzdate, scope, hashlib.sha256(canonical.encode()).hexdigest()])
    k_date = _hmac(("AWS4" + secret_key).encode(), datestamp)
    k_region = _hmac(k_date, "auto")
    k_service = _hmac(k_region, "s3")
    k_signing = _hmac(k_service, "aws4_request")
    signature = hmac.new(k_signing, string_to_sign.encode(), hashlib.sha256).hexdigest()
    return {
        "Authorization": f"AWS4-HMAC-SHA256 Credential={access_key}/{scope}, SignedHeaders={signed}, Signature={signature}",
        "x-amz-date": amzdate,
        "x-amz-content-sha256": payload_hash,
    }


def build_canonical_request(method: str, bucket: str, headers: dict, payload_hash: str) -> str:
    """Canonical request string (also used by --dry-run for review — no secrets in it)."""
    names = sorted(headers)
    canonical_headers = "".join(f"{name}:{headers[name].strip()}\n" for name in names)
    return "\n".join([method, f"/{bucket}", "cors=", canonical_headers, ";".join(names), payload_hash])


def s3_request(
    method: str,
    account_id: str,
    bucket: str,
    access_key: str,
    secret_key: str,
    body: bytes = b"",
    content_type: str | None = None,
) -> tuple:
    """One signed R2 S3 call against /<bucket>?cors. Returns (http_status, raw_body)."""
    host = f"{account_id}.r2.cloudflarestorage.com"
    extra = {"content-type": content_type} if content_type else {}
    now = datetime.now(timezone.utc)
    headers = s3_sign_headers(method, account_id, bucket, extra, body, access_key, secret_key, now)
    if content_type:
        headers["content-type"] = content_type
    req = urllib.request.Request(
        f"https://{host}/{bucket}?cors", data=body if method != "GET" else None, method=method, headers=headers
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            return res.status, res.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def cors_xml(origins: list) -> str:
    """The exact rule PUT when ours is missing (AWS PutBucketCors shape, verified)."""
    root = ET.Element("CORSConfiguration", xmlns="http://s3.amazonaws.com/doc/2006-03-01/")
    rule = ET.SubElement(root, "CORSRule")
    for origin in origins:
        ET.SubElement(rule, "AllowedOrigin").text = origin
    for method in CORS_METHODS:
        ET.SubElement(rule, "AllowedMethod").text = method
    for header in CORS_HEADERS:
        ET.SubElement(rule, "AllowedHeader").text = header
    ET.SubElement(rule, "MaxAgeSeconds").text = str(CORS_MAX_AGE)
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(root, encoding="unicode")


def parse_cors_rules(xml_bytes: bytes) -> list:
    """Existing rules as {origins, methods, headers(lower), max_age}. Unparseable -> []."""
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        return []
    rules = []
    for rule in root.iter():
        if not rule.tag.endswith("CORSRule"):
            continue
        def texts(suffix: str) -> list:
            return [(el.text or "").strip() for el in rule.iter() if el.tag.endswith(suffix) and (el.text or "").strip()]
        max_ages = texts("MaxAgeSeconds")
        rules.append({
            "origins": set(texts("AllowedOrigin")),
            "methods": {m.upper() for m in texts("AllowedMethod")},
            "headers": {h.lower() for h in texts("AllowedHeader")},
            "max_age": int(max_ages[0]) if max_ages and max_ages[0].isdigit() else 0,
        })
    return rules


def rule_covers(rule: dict, origins: list) -> bool:
    """Our desired rule is covered when origins/methods/headers are a subset with enough max-age."""
    return (
        set(origins) <= rule["origins"]
        and {m.upper() for m in CORS_METHODS} <= rule["methods"]
        and {h.lower() for h in CORS_HEADERS} <= rule["headers"]
        and rule["max_age"] >= CORS_MAX_AGE
    )


def valid_origin(origin: str) -> bool:
    return origin.startswith("https://") and "/" not in origin[len("https://"):] and " " not in origin


def ensure_bucket_cors(account_id: str) -> None:
    """Idempotent CORS ensure: GET ?cors, no-op if covered, else merge-append + PUT."""
    deploy_token = os.environ.get("CLOUDFLARE_API_TOKEN", "")
    if not deploy_token:
        fail_soft("Bucket CORS ensure skipped: CLOUDFLARE_API_TOKEN is not set (legacy upload unaffected).")
    origins = [o for o in SITE_ORIGINS if valid_origin(o)]
    if not origins:
        fail_soft("Bucket CORS ensure skipped: no valid SITE_ORIGIN (want https://host, comma-separated).")
    if len(origins) != len(SITE_ORIGINS):
        fail_soft("Bucket CORS ensure skipped: a SITE_ORIGIN entry is not a bare https://host.")

    verified = api("GET", "/user/tokens/verify")
    result = verified.get("result", {}) if isinstance(verified, dict) else {}
    key_id = str(result.get("id", ""))
    if not (isinstance(verified, dict) and verified.get("success") and key_id):
        fail_soft("Bucket CORS ensure skipped: could not verify the deploy token.")
    secret = hashlib.sha256(deploy_token.encode()).hexdigest()

    try:
        status, body = s3_request("GET", account_id, MEDIA_BUCKET, key_id, secret)
    except Exception as e:
        fail_soft(f"Bucket CORS ensure skipped: R2 ?cors read failed: {e} (legacy upload unaffected).")
    if status == 404:
        existing = []  # NoSuchCORSConfiguration — nothing to merge, ours becomes the whole config.
    elif status != 200:
        fail_soft(f"Bucket CORS ensure skipped: R2 ?cors read returned HTTP {status} (legacy upload unaffected).")
    else:
        existing = parse_cors_rules(body)
        if not existing and body.strip():
            fail_soft("Bucket CORS ensure skipped: existing CORS config is unparseable — refusing to clobber it.")
        if any(rule_covers(rule, origins) for rule in existing):
            print("Bucket CORS already configured — no change.")
            return

    merged = cors_xml(origins) if not existing else None
    if existing:
        # Non-destructive merge: keep operator rules, append ours. Rebuild XML from the
        # parsed rules so formatting stays canonical.
        root = ET.Element("CORSConfiguration", xmlns="http://s3.amazonaws.com/doc/2006-03-01/")
        for rule in existing:
            node = ET.SubElement(root, "CORSRule")
            for origin in sorted(rule["origins"]):
                ET.SubElement(node, "AllowedOrigin").text = origin
            for method in sorted(rule["methods"]):
                ET.SubElement(node, "AllowedMethod").text = method
            for header in sorted(rule["headers"]):
                ET.SubElement(node, "AllowedHeader").text = header
            ET.SubElement(node, "MaxAgeSeconds").text = str(rule["max_age"])
        node = ET.SubElement(root, "CORSRule")
        for origin in origins:
            ET.SubElement(node, "AllowedOrigin").text = origin
        for method in CORS_METHODS:
            ET.SubElement(node, "AllowedMethod").text = method
        for header in CORS_HEADERS:
            ET.SubElement(node, "AllowedHeader").text = header
        ET.SubElement(node, "MaxAgeSeconds").text = str(CORS_MAX_AGE)
        merged = '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(root, encoding="unicode")
    try:
        put_status, put_body = s3_request(
            "PUT", account_id, MEDIA_BUCKET, key_id, secret,
            body=merged.encode(), content_type="application/xml",
        )
    except Exception as e:
        fail_soft(f"Bucket CORS ensure skipped: R2 ?cors write failed: {e} (legacy upload unaffected).")
    if put_status != 200:
        fail_soft(
            f"Bucket CORS ensure skipped: R2 ?cors write returned HTTP {put_status}: "
            f"{put_body[:300].decode(errors='replace')} (legacy upload unaffected)."
        )
    print(f"Bucket CORS configured for {', '.join(origins)} (PUT, content-type, max-age {CORS_MAX_AGE}).")


if __name__ == "__main__":
    main()
