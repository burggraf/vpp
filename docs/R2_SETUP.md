# Cloudflare R2 Storage Setup for VPP

This guide covers creating a Cloudflare R2 bucket, configuring API tokens, setting CORS, and connecting R2 to PocketBase as the S3-compatible storage backend.

---

## Table of Contents

1. [Create Cloudflare Account](#1-create-cloudflare-account)
2. [Create R2 Bucket](#2-create-r2-bucket)
3. [Create R2 API Token](#3-create-r2-api-token)
4. [Configure CORS](#4-configure-cors)
5. [Connect PocketBase to R2](#5-connect-pocketbase-to-r2)
6. [Verify Uploads](#6-verify-uploads)
7. [Public URL Generation](#7-public-url-generation)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Create Cloudflare Account

1. Go to [https://dash.cloudflare.com](https://dash.cloudflare.com)
2. Sign up with email or use existing account
3. Verify email address
4. No domain required for R2 — storage works standalone

> **Cost:** R2 offers 10 GB storage free per month. No egress fees.

---

## 2. Create R2 Bucket

1. Log into [Cloudflare Dashboard](https://dash.cloudflare.com)
2. In left sidebar, click **R2** (under "Storage & Databases")
3. Click **Create Bucket**
4. Fill in:
   - **Bucket name:** `vpp-storage` (or your preferred name)
   - **Location:** Select nearest region (e.g., `WNAM` for Western North America)
5. Click **Create Bucket**

Screenshot description:
```
[R2 Dashboard]
┌─────────────────────────────────────────┐
│  R2 Storage Buckets                     │
│  ┌───────────────────────────────────┐  │
│  │ Bucket name: [vpp-storage________] │  │
│  │ Location:      [WNAM (Western NA)▼]│  │
│  │                                   │  │
│  │         [Create Bucket]           │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## 3. Create R2 API Token

1. In R2 dashboard, click **Manage R2 API Tokens** (or navigate to R2 → API Tokens)
2. Click **Create API Token**
3. Configure:
   - **Token name:** `vpp-pocketbase`
   - **Permissions:**
     - **Object Read** ✓
     - **Object Write** ✓
   - **Bucket access:** Select your bucket (`vpp-storage`) or "All buckets"
4. Click **Create API Token**
5. **Important:** Copy the **Access Key ID** and **Secret Access Key** immediately — the secret key is shown only once.

Store these securely:
```
R2_ACCESS_KEY_ID=<copied-access-key-id>
R2_SECRET_ACCESS_KEY=<copied-secret-access-key>
```

---

## 4. Configure CORS

R2 buckets need CORS configuration to allow browser uploads.

### Via Cloudflare Dashboard

1. Go to R2 → Select your bucket → **Settings** tab
2. Scroll to **CORS Policy**
3. Click **Add CORS Policy**
4. Configure:
   - **Allowed Origins:** `https://your-domain.com` (or `http://localhost:5173` for dev)
   - **Allowed Methods:** `GET`, `PUT`, `POST`, `DELETE`, `HEAD`
   - **Allowed Headers:** `*`
   - **Expose Headers:** `ETag`
   - **Max Age:** `86400`

### Via wrangler CLI (alternative)

```bash
# Install wrangler
npm install -g wrangler

# Login
wrangler login

# Create CORS config file
cat > cors-policy.json << 'EOF'
[
  {
    "AllowedOrigins": [
      "https://your-domain.com",
      "http://localhost:5173"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposedHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 86400
  }
]
EOF

# Apply CORS policy
wrangler r2 bucket put-cors-policy vpp-storage --cors-policy-file cors-policy.json
```

---

## 5. Connect PocketBase to R2

PocketBase supports S3-compatible storage out of the box. R2 is S3-compatible.

### Steps

1. **Start PocketBase** (if not already running):
   ```bash
   cd /Users/markb/dev/vpp/pb
   ./pocketbase serve
   ```

2. **Open Admin UI:** Navigate to `http://127.0.0.1:8090/_/`

3. **Navigate to Settings:**
   - Click **Settings** (left sidebar)
   - Click **S3 Storage** tab

4. **Fill in R2 credentials:**

   | Field              | Value                                              |
   |--------------------|----------------------------------------------------|
   | **Enabled**        | ✓ (toggle on)                                      |
   | **Endpoint**       | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`   |
   | **Bucket**         | `vpp-storage`                                      |
   | **Access Key**     | `<R2_ACCESS_KEY_ID>` (from Step 3)                |
   | **Secret Key**     | `<R2_SECRET_ACCESS_KEY>` (from Step 3)            |
   | **Region**         | `auto`                                             |
   | **Force Path Style**| ✓ (enabled)                                      |

5. **Find your Account ID:**
   - Go to Cloudflare Dashboard → Right sidebar shows **Account ID**
   - Or: R2 → Your bucket → URL contains account ID
   - Format: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

6. **Test Connection:**
   - Click **Test connection** button
   - Expect: "Connection successful" message

Screenshot description:
```
[PocketBase Admin → Settings → S3 Storage]
┌──────────────────────────────────────────────────────┐
│  ☑ Enable S3 storage                                 │
│                                                      │
│  Endpoint:    [https://xxxx.r2.cloudflarestorage.com]│
│  Bucket:      [vpp-storage                           ]│
│  Access Key:  [AKIAIOSFODNN7EXAMPLE________________]│
│  Secret Key:  [••••••••••••••••••••••••••••••••••]│
│  Region:      [auto                                  ]│
│  ☑ Force Path Style                                  │
│                                                      │
│           [Test connection]  [Save changes]          │
└──────────────────────────────────────────────────────┘
```

---

## 6. Verify Uploads

After configuring S3 storage in PocketBase:

### Via Admin UI

1. Go to **Collections** → Select a collection with a file field (e.g., `assets`, `renders`)
2. Click a record or create a new one
3. Upload a test file using the file field
4. Check the file appears in the record
5. Verify in Cloudflare Dashboard → R2 → `vpp-storage` → **Objects** tab → file should appear

### Via API

```bash
# Test upload via PocketBase API
curl -X POST http://127.0.0.1:8090/api/collections/YOUR_COLLECTION/records \
  -F "data={}" \
  -F "fileField=@test-image.png"
```

### Verify in R2 Dashboard

```
[R2 Dashboard → vpp-storage → Objects]
┌──────────────────────────────────────┐
│ Name            Size    Last modified│
│ uploads/col/... 42 KB   Just now     │
└──────────────────────────────────────┘
```

---

## 7. Public URL Generation

PocketBase constructs file URLs using this pattern:

```
https://<PB_HOST>/api/files/<collection_id>/<record_id>/<filename>
```

When S3/R2 storage is enabled, PocketBase:
- Stores files in R2 bucket under `uploads/<collection_id>/<record_id>/<filename>`
- Serves files through PocketBase's proxy endpoint (above URL)
- Files are fetched from R2 on request and served to the client

### Optional: Direct R2 Public Access

To serve files directly from R2 (bypassing PocketBase proxy):

1. **Via Cloudflare Dashboard:**
   - R2 → Bucket → **Settings** → **Public Access**
   - Click **Connect Domain**
   - Add a custom domain (e.g., `storage.yourdomain.com`) or use the default R2 endpoint

2. **Direct URL format:**
   ```
   https://pub-<ACCOUNT_ID>.r2.dev/<object-key>
   ```

3. **In PocketBase:**
   - Currently, PB uses its own URL pattern regardless of S3 backend
   - The S3 backend is for storage only; PB still proxies file downloads

---

## 8. Troubleshooting

### Error: "Connection failed" when testing S3 in PocketBase

**Cause:** Incorrect endpoint, access key, or secret key.

**Fix:**
- Verify endpoint format: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
- Verify Access Key and Secret Key match the API token
- Ensure API token has **Object Read** and **Object Write** permissions
- Check bucket name matches exactly

### Error: "SignatureDoesNotMatch" or "403 Forbidden"

**Cause:** Clock skew or wrong secret key.

**Fix:**
- Ensure system clock is synchronized (`sudo sntp -sS time.apple.com` on macOS)
- Regenerate API token and update credentials in PocketBase

### Error: CORS blocked in browser

**Cause:** Missing or incorrect CORS configuration on R2 bucket.

**Fix:**
- Apply CORS policy from [Step 4](#4-configure-cors)
- Verify allowed origins include your frontend URL
- Clear browser cache and retry

### Error: Files upload to PocketBase but not visible in R2

**Cause:** S3 storage not enabled or misconfigured in PocketBase.

**Fix:**
- Verify S3 toggle is ON in PocketBase Settings
- Check file path prefix: R2 objects should be under `uploads/`
- Test with a small file first (< 1 MB)

### Error: "Bucket not found" or "NoSuchBucket"

**Cause:** Bucket name mismatch or wrong region/endpoint.

**Fix:**
- Bucket name in PocketBase must exactly match the R2 bucket name
- Region must be set to `auto` for R2
- Force Path Style must be enabled

### Files upload but return 404 when accessed

**Cause:** PocketBase URL mismatch or file field not saved correctly.

**Fix:**
- Check record has the file field populated
- Verify PB_HOST environment variable matches the URL you're accessing
- Check PocketBase logs: `./pocketbase serve --http=0.0.0.0:8090`

---

## Quick Reference

| Item                  | Value                                                        |
|-----------------------|--------------------------------------------------------------|
| R2 Endpoint           | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`             |
| Region                | `auto`                                                       |
| Force Path Style      | `true`                                                       |
| Bucket Name           | `vpp-storage` (or your chosen name)                          |
| CORS Origins (dev)    | `http://localhost:5173`                                      |
| File URL Pattern      | `/api/files/<collection_id>/<record_id>/<filename>`          |
