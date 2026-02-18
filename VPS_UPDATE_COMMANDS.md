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

# Discard any local package-lock changes (just in case)
# Pull the latest main branch
git pull origin main
```

## 3. Update Environment Variables

You need to add your `GEMINI_API_KEY` to the backend configuration.

```bash
nano backend/.env
```

Add the line:

```env
GEMINI_API_KEY=your_actual_api_key_here
```

*(Press `Ctrl+O` to save, `Enter` to confirm, and `Ctrl+X` to exit)*

## 4. Install Dependencies & Rebuild

Run these commands to update dependencies and rebuild both frontend and backend:

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

## 5. Restart Application

Restart the backend service to apply the changes:

```bash
cd ../backend
pm2 restart mojoquiz-backend
```

## 6. Verification

- Visit [https://mojoquiz.co.zw](https://mojoquiz.co.zw)
- Verify the new "AI Extractor" tab is visible in the session host view.
- Check that the mobile participant view loads correctly on your phone.
