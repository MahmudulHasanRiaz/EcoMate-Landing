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
import json
import os
import sys
import urllib.request
import urllib.error

API_BASE = "https://api.cloudflare.com/client/v4"
TOKEN_NAME = os.environ.get("TOKEN_NAME", "ecomate-media-presign")
MEDIA_BUCKET = os.environ.get("MEDIA_BUCKET", "ecomate-media-prod")
WRITE_GROUP_NAME = "Workers R2 Storage Bucket Item Write"
JURISDICTION = "default"


def fail_soft(message: str) -> "NoReturn":
    print(f"::warning::{message}", flush=True)
    sys.exit(2)


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
        return

    account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
    if not account_id:
        print("provision-r2-presign: CLOUDFLARE_ACCOUNT_ID is not set", file=sys.stderr)
        sys.exit(1)

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


if __name__ == "__main__":
    main()
