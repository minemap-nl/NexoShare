# 🚀 Nexo Share v1.06

**Nexo Share v1.06** builds on v1.05 with faster ZIP downloads, a smarter **Share** button for ready-to-send messages, clearer ClamAV controls for internal vs reverse shares, SSO admin groups, editable max downloads, and major dependency / toolchain upgrades.

## ⚠️ Beta
**Please note**, that Nexo Share is still in beta! Always keep a copy of the data that you're sending to others.
**Also note**, that this is always a best practice, as a share can expire if you set an expiry date or leave the default expiry date. In that case, the share along with its data will be deleted upon that expiry date!

## ⚠️ Important Changes
*   **ClamAV scanning split:** Reverse-share uploads are **always** virus-scanned (and rejected if ClamAV is offline). Outbound / internal shares are scanned only when **Settings → Security → Scan internal shares with ClamAV** is enabled (default **off**). The previous “Enforce Virus Scan” option is now **Reject internal uploads if scanner offline**, and only applies when internal scanning is on.
*   **Upgrade migration:** If your existing config had enforce-scan (`clamavMustScan`) enabled and no `clamavScanInternalShares` flag yet, internal scanning is turned **on** automatically so enforced setups keep scanning. Instances that relied on opportunistic scanning with enforce **off** should enable “Scan internal shares with ClamAV” after upgrade if they want that behaviour back.
*   **Prebuilt ZIP cache:** Shares and reverse shares now generate background ZIP archives under `uploads/share_zips/` (or `SHARE_ZIPS_DIR`). Plan disk space for this cache; orphaned ZIPs are cleaned with the hourly job.
*   **SSO admin groups:** Empty list = policy off. Non-empty = on SSO login, exact match against the user’s IdP `groups` claim (promote/demote). OIDC cannot distinguish a typo from a real group you are not in — both demote. Missing groups claim → leave `is_admin` unchanged. Bootstrap admin remains the local seed/setup account. **Test** + confirm on **Save** warn SSO admins who would demote themselves.
*   **Default account emails:** Fresh installs / demo seeds use `@nexoshare.nl` (e.g. `admin@nexoshare.nl`). Existing databases keep their current emails.

## 📦 How to Install (Docker)

You don't need to download source code. You can pull the pre-built Docker image directly from this repository.

### 1. Pull the Image

`docker pull ghcr.io/minemap-nl/nexoshare:v1.06.00`

### 2. Quick Start (docker-compose.yml)

Create a `docker-compose.yml` file and paste the following configuration:

```yaml
services:
  nexoshare:
    image: ghcr.io/minemap-nl/nexoshare:v1.06.00 # or latest depending on what you pulled
    container_name: nexoshare
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - DB_HOST=postgres
      - DB_USER=nexoshare
      - DB_PASSWORD=your_secure_db_password # generate: openssl rand -base64 32
      - DB_NAME=nexoshare
      - UPLOAD_DIR=/app/backend/uploads
      - JWT_SECRET=change_this_to_a_long_random_string # generate: openssl rand -hex 32
      - APP_URL= #like https://share.yourdomain.com
      
      - CLAMAV_HOST=clamav
      - CLAMAV_PORT=3310
      - NODE_ENV=production
      - TZ=UTC
      - APP_LOCALE=en-GB
      # Optional: directory for prebuilt share ZIPs (default: $UPLOAD_DIR/share_zips)
      #- SHARE_ZIPS_DIR=/app/backend/uploads/share_zips
      # Optional: extra CSP connect-src / default-src origins (comma-separated)
      #- CSP_EXTRA_CONNECT_ORIGINS=https://analytics.example.com
    volumes:
      - ./uploads:/app/backend/uploads
    depends_on:
      postgres:
        condition: service_healthy
      clamav: 
        condition: service_healthy
  postgres:
    image: postgres:17-alpine
    container_name: nexoshare_db
    restart: unless-stopped
    environment:
      - POSTGRES_USER=nexoshare
      - POSTGRES_PASSWORD=your_secure_db_password
      - POSTGRES_DB=nexoshare
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U nexoshare -d nexoshare"]
      interval: 5s
      timeout: 5s
      retries: 10
    volumes:
      - ./data:/var/lib/postgresql/data
  clamav:
    image: clamav/clamav:latest
    container_name: nexoshare_clamav
    restart: unless-stopped
    environment:
      # Align StreamMaxLength with Settings → Max Virus Scan File Size
      - CLAMD_CONF_StreamMaxLength=25M
      # Archive / zip-bomb limits (see also Settings → Security in the app)
      - CLAMD_CONF_MaxScanSize=100M
      - CLAMD_CONF_MaxFileSize=50M
      - CLAMD_CONF_MaxFiles=10000
      - CLAMD_CONF_MaxRecursion=16
      - CLAMD_CONF_MaxScanTime=120000
    healthcheck:
      test: ["CMD", "nc", "-z", "localhost", "3310"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 120s
    volumes:
      - ./clamav:/var/lib/clamav:rw
```

## 🎯 Key Changes in this Release (v1.06)

### 📤 Smart Share Button
Next to the existing copy-link control, a new **Share** button helps you send links in chat apps, email, or Teams without retyping.

*   **Ready-to-paste message:** Copies a short, friendly message that includes the share name (if set), optional description, expiry information, and the link — not just the bare URL.
*   **Works everywhere you share:** Available after uploading, in **My Shares**, and on **Reverse Shares** (with wording tailored to download vs. upload links).
*   **Localized:** Message text follows your `APP_LOCALE` setting (English and Dutch).
*   **Native share on mobile:** On phones and tablets, opens the system share sheet when supported; otherwise falls back to copying the full message to your clipboard.

**Example (outbound share):**
```
I'm sharing files with you for Project Alpha via Nexo Share.
Description: Here are the signed documents.
Available until 4 July 2026 at 14:30.
Download link: https://share.example.com/s/abc123
```

### ⚡ Faster ZIP Downloads (Prezip Cache)
*   **Background ZIP generation:** After uploads finalize (and when files change), Nexo Share prebuilds a ZIP for shares and reverse shares.
*   **Streaming downloads:** When a matching prebuilt archive is ready, ZIP downloads stream from disk instead of assembling on the fly.
*   **Storage:** Archives live under `uploads/share_zips/` by default; override with `SHARE_ZIPS_DIR`. Cache entries are invalidated on delete, expiry, and file changes.

### 🛡️ ClamAV Policy Clarification
*   **Always scan reverse shares:** Guest uploads via reverse links are always scanned; offline scanner → upload refused.
*   **Optional internal scanning:** New toggle **Scan internal shares with ClamAV** (default off) for outbound shares you create yourself.
*   **Fail-closed for internal:** **Reject internal uploads if scanner offline** only applies when internal scanning is enabled.
*   **Demo mode:** Internal scanning remains enforced on demo instances.

### 🔑 SSO Admin Groups
*   Map OIDC `groups` claims to admin rights via **SSO groups with admin rights** (one group per line).
*   **Empty list:** policy off — existing admin flags unchanged on SSO login; new SSO users are non-admin.
*   **Non-empty list:** on SSO login, exact match against the user’s IdP groups — promote or demote. Typo and “real group I’m not in” are indistinguishable without an IdP admin API; both demote.
*   **Missing groups claim:** leave `is_admin` unchanged (scope/mapping fail-safe).
*   **Test + Save confirm:** warn SSO admins who would demote themselves; auto SSO refresh if groups were never synced for this session.
*   CLI support: `config-sso-admin-groups` / `config-set ssoAdminGroups`.

### 📂 Shares & Reverse Shares
*   **Editable max downloads:** Update the download limit on existing shares from **My Shares** (was create-only).
*   **Reverse create UX:** Creating a reverse share shows a success screen with the link and Share button (API also returns `name`, `expiresAt`, and `thankYouMessage`).

### 🔐 Passkeys & Docker Hardening
*   **SimpleWebAuthn** server upgraded to v13 (API aligned; Bun install uses `dedupe-peculiar` postinstall for `@peculiar` schema compatibility).
*   Docker image applies OS package upgrades during build and includes the postinstall script required for passkeys under Bun.

### 🎨 Branding & Defaults
*   Default / demo admin emails use the **`@nexoshare.nl`** domain on new installs.
*   Footer credit links to the Minemap-NL GitHub organisation.

### 🧰 Developer Experience
*   `bun run generate-env` helper (`backend/scripts/generate-env.mjs`) for local `.env` scaffolding.
*   Frontend toolchain: **Tailwind CSS v4** + **Vite 8** (PostCSS / `tailwind.config.js` removed in favour of `@tailwindcss/vite`).
*   Unit tests for SSO group mapping (`ssoGroups.test.ts`).

### 🔒 Security: Dependency Updates
Multiple dependencies have been updated to address known vulnerabilities and improve stability.

*   **@simplewebauthn/server** updated from `^9.0.3` → `^13.3.2`
*   **archiver** updated from `^7.0.1` → `^8.0.0`
*   **nodemailer** updated from `^8.0.5` → `^9.0.3`
*   **axios** updated from `^1.16.1` → `^1.18.1`
*   **express-rate-limit** updated from `^8.5.1` → `^8.6.0`
*   **multer** updated from `^2.1.1` → `^2.2.0`
*   **dompurify** updated from `^3.4.0` → `^3.4.12`
*   **@peculiar/asn1-\*** pinned to `2.8.0` (Bun WebAuthn compatibility)
*   Frontend: **tailwindcss** `^3` → `^4.3.3`, **vite** `^7` → `^8.1.5`, **vitest** `^3` → `^4.1.10`, **lucide-react** `^0.561` → `^1.27.0`

---

**Important Note:** After upgrading, review **Settings → Security** ClamAV toggles and ensure your upload volume has room for the ZIP cache. We recommend upgrading to v1.06 for faster downloads and clearer scanning policy, especially on publicly accessible instances.

**Maintained by [Minemap-NL](https://github.com/minemap-nl)**.
