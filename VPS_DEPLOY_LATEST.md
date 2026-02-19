# Deploying Latest Changes to VPS

Follow these steps to deploy the Authentication, Saved Sessions Library, and Analytics Dashboard updates.

## 1. Connect to VPS

```bash
ssh brian@89.116.26.24
cd MojoQuiz
```

## 2. Update Code

```bash
git pull origin main
```

## 3. Install Dependencies & Rebuild

```bash
# Backend
cd backend
npm install
npm run build

# Frontend (includes recharts for analytics)
cd ../frontend
npm install
npm run build
```

## 4. Run Database Migrations

**IMPORTANT:** These migrations add the necessary tables and columns for Authentication and the Library.

```bash
cd ../backend
npx ts-node --esm src/scripts/migrateAuth.ts
npx ts-node --esm src/scripts/migrateLibrary.ts
```

## 5. Environment Variables Guide

Your current `.env` is missing several critical keys for production. Use the guide below to fill them in.

### 1. General Settings

- `NODE_ENV`: Change to `production` when deploying on the VPS.
- `JWT_SECRET`: This is used to sign your login tokens. Generate a secure one by running this in your terminal:

  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

### 2. Google OAuth (For Google Login)

To get these, you need to:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project.
3. Search for **"APIs & Services"** > **"Credentials"**.
4. Create **"OAuth 2.0 Client IDs"** (Web application type).
5. Set the **Authorized redirect URIs** to: `https://mojoquiz.co.zw/api/auth/google/callback`
6. Copy the `Client ID` and `Client Secret`.

### 3. SMTP (For Verification Emails)

You need an actual SMTP service to send emails (Ethereal is for testing only).

- **Option A (Professional)**: Use [SendGrid](https://sendgrid.com/) or [Mailgun](https://www.mailgun.com/).
- **Option B (Fast)**: Use a Gmail account with an **App Password** (requires 2FA enabled on the Gmail account).
- **Variables**:
  - `SMTP_HOST`: e.g., `smtp.gmail.com`
  - `SMTP_PORT`: `587`
  - `SMTP_SECURE`: `false` (for port 587/TLS)
  - `SMTP_USER`: Your email address
  - `SMTP_PASS`: Your App Password

## 6. Restart Application

```bash
pm2 restart mojoquiz-backend
```

## 7. Verify

- Visit [https://mojoquiz.co.zw](https://mojoquiz.co.zw)
- Log in and check the **Library** and **Analytics** features.
