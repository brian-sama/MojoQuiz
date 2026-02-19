# Manual VPS Update Guide

Since direct access is restricted, follow these steps to deploy the latest changes to your VPS.

## 1. Connect to VPS

Open your terminal and SSH into the server:

```bash
ssh brian@89.116.26.24
```

## 2. Pull Latest Code

Navigate to the project directory and pull the changes from GitHub:

```bash
cd MojoQuiz
git pull origin main
```

## 3. Install Dependencies & Rebuild

### Backend

```bash
cd backend
npm install
npm run build
```

### Frontend

```bash
cd ../frontend
npm install
npm run build
```

## 4. Restart Application

Restart the backend service to apply the changes:

```bash
cd ../backend
pm2 restart mojoquiz-backend
```

## 5. Verification

- Visit [https://mojoquiz.co.zw](https://mojoquiz.co.zw)
- Check that the login page shows "Sign in or create an account"
- Verify the floating label animates correctly on the email input
- Confirm the background images crossfade smoothly
- Test the host session view has opaque card backgrounds
