# Deployment Guide - cPanel Hosting

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      YOUR cPanel                            │
├───────────────────────────────────────────────────────────┤
│  public_html/                                               │
│  ├── index.html        (React app entry)                   │
│  ├── assets/           (React built assets)                │
│  ├── .htaccess         (Routing config)                    │
│  └── api/              (PHP backend)                       │
│       ├── config.php                                        │
│       ├── sessions.php                                      │
│       ├── questions.php                                     │
│       ├── responses.php                                     │
│       └── ...                                               │
├───────────────────────────────────────────────────────────┤
│  MySQL Database: luniazyy_quiz                             │
└─────────────────────────────────────────────────────────────┘
           │
           │ Real-time events
           ▼
    ┌──────────────┐
    │   Pusher     │  (Free tier)
    └──────────────┘
```

---

## Step 1: Database Setup

### Via phpMyAdmin

1. Open **phpMyAdmin** from cPanel
2. Select database `luniazyy_quiz`
3. Click **Import** tab
4. Choose `api/schema.sql`
5. Click **Go** to import

---

## Step 2: Build Frontend

Run locally:

```bash
cd frontend
npm run build
```

This creates a `dist/` folder with production files.

---

## Step 3: Upload Files to cPanel

### Using File Manager or FTP

1. **Upload React build** (`dist/` contents) to `public_html/`:

   ```
   public_html/
   ├── index.html
   ├── assets/
   │   ├── index-xxxxx.js
   │   └── index-xxxxx.css
   └── vite.svg (if any)
   ```

2. **Upload API folder** to `public_html/api/`:

   ```
   public_html/api/
   ├── config.php
   ├── db.php
   ├── pusher.php
   ├── helpers.php
   ├── sessions.php
   ├── questions.php
   ├── responses.php
   └── participants.php
   ```

3. **Upload .htaccess** to `public_html/`:

   ```
   public_html/.htaccess
   ```

---

## Step 4: Verify Configuration

### Check config.php has correct credentials

```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'luniazyy_quiz');
define('DB_USER', 'luniazyy_quiz');
define('DB_PASS', 'KTQr5zCkVzktRcPEWfpf');
```

### Check Pusher credentials are set

```php
define('PUSHER_APP_ID', '2112762');
define('PUSHER_KEY', '1aaf0b4792f2a1ffd6fa');
define('PUSHER_SECRET', '4af8c24bed865d358c94');
define('PUSHER_CLUSTER', 'ap2');
```

---

## Step 5: Test

1. Visit your domain: `https://yourdomain.com`
2. You should see the engagement platform
3. Try creating a session and joining with a code

---

## Troubleshooting

### API returns 500 error

- Check PHP error logs in cPanel
- Verify database credentials in `config.php`

### CORS errors

- Ensure `.htaccess` is in `public_html/`
- Check if mod_headers is enabled on your hosting

### Routes not working

- Ensure `.htaccess` is uploaded
- Check if mod_rewrite is enabled (most cPanel hosts have it on)

### Pusher events not received

- Check browser console for errors
- Verify Pusher credentials match your dashboard

---

## Files Checklist

| File/Folder | Location | Required? |
|-------------|----------|-----------|
| `index.html` | `public_html/` | ✅ |
| `assets/` | `public_html/` | ✅ |
| `.htaccess` | `public_html/` | ✅ |
| `api/config.php` | `public_html/api/` | ✅ |
| `api/db.php` | `public_html/api/` | ✅ |
| `api/pusher.php` | `public_html/api/` | ✅ |
| `api/helpers.php` | `public_html/api/` | ✅ |
| `api/sessions.php` | `public_html/api/` | ✅ |
| `api/questions.php` | `public_html/api/` | ✅ |
| `api/responses.php` | `public_html/api/` | ✅ |
| `api/participants.php` | `public_html/api/` | ✅ |

---

## Security Notes

1. **Do NOT upload** `schema.sql` to production (only use for import)
2. **Do NOT upload** `.env` files
3. Set CORS_ORIGIN in `config.php` to your actual domain in production
