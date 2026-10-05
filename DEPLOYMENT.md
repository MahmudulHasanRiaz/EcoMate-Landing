# EcoMate Platform — Cloudflare & CI/CD Deployment Architecture

This document explains the production deployment governance configured for EcoMate.

---

## 1. Architecture Flow

```
┌──────────────────────────────────────────────┐
│                GitHub Commit                 │
└──────────────────────┬───────────────────────┘
                       │ (git push)
                       ▼
┌──────────────────────────────────────────────┐
│           GitHub Actions (ci.yml)            │
│  - Setup Node.js (v24 minimum)               │
│  - npm ci (frozen lockfile)                  │
│  - npm run lint (TypeScript validate)        │
│  - npm run build (production bundle)         │
│  * NO DEPLOYMENT OCCURS ON COMMIT *          │
└──────────────────────┬───────────────────────┘
                       │
                       ▼ (Code Validated)
┌──────────────────────────────────────────────┐
│   Manual Trigger in GitHub Actions UI        │
│   (deploy.yml via workflow_dispatch)         │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│         Job 1: Build & Verify Integrity      │
│  - Setup Node.js (v24 minimum)               │
│  - Fresh npm ci & production build           │
│  - Verifies dist/index.html artifact         │
└──────────────────────┬───────────────────────┘
                       │
                 Build Success (If Fails -> STOP)
                       │
                       ▼
┌──────────────────────────────────────────────┐
│      Job 2: Cloudflare Wrangler Deploy       │
│  - Direct upload of built /dist bundle       │
│  - Deploys exclusively to Cloudflare Pages   │
└──────────────────────────────────────────────┘
```

---

## 2. Preventing Duplicate Triggers (Test D)

In Cloudflare Pages, when a repository is connected to Git, Cloudflare tries to trigger its own internal build runner on every commit.

### Exact Cloudflare Dashboard Steps to Disable Automatic Deployments:
1. Log in to **[Cloudflare Dashboard](https://dash.cloudflare.com/)**.
2. Navigate to **Compute (Workers & Pages)** → Click your project (`ecomate-platform` or your chosen name).
3. Click on the **Settings** tab.
4. Go to **Builds & deployments**.
5. Under **Automatic deployments** / **Configure deployments**:
   - Set **Automatic deployments** to **Pause** or **Disable**.
   - If connected via Git: Under **Production branch deployment**, toggle **Automatic deployment** to **Disabled**.
6. Save changes.

**Outcome:**
Cloudflare will no longer build on GitHub push events. Only GitHub Actions has the authority to deploy new builds.

---

## 3. How to Trigger a Manual Deployment (Test B)

1. Open your GitHub Repository in your browser.
2. Click on the **Actions** tab at the top.
3. In the left sidebar, click **"Production Deployment - Cloudflare Pages (Manual Trigger Only)"**.
4. Click the **Run workflow** button on the right.
5. Select the target branch (`main`) and environment (`production`).
6. Click **Run workflow**.

GitHub Actions will execute:
- **Lint & Build**: Runs full TypeScript check and bundle creation.
- **Wrangler Deploy**: Deploys the built `dist` folder to Cloudflare Pages Production.

---

## 4. Failed Build Protection (Test C)

If any TypeScript error, missing file, or build failure occurs:
- Job 1 (`build_and_verify`) will exit with status `failed`.
- Job 2 (`deploy_to_cloudflare`) will **never execute** (`needs: [build_and_verify]` + `if: success()`).
- Cloudflare Pages will continue serving the existing stable production release.

---

## 5. Required GitHub Secrets

Go to **GitHub Repo → Settings → Secrets and variables → Actions** and add:

| Secret Name | Value Description |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token with `Cloudflare Pages: Edit` permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Your 32-character Cloudflare Account ID |
| `CLOUDFLARE_PROJECT_NAME` | *(Optional, defaults to `ecomate-platform`)* |
