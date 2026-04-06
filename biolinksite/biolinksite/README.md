# Biolink Site

A personal bio link website with admin dashboard, video background, and font customization.

## Local Development

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`

**Your admin login:**
- Username: `9170`
- Password: `lolripbozo1)`

---

## Deploy to Render

### Method 1: render.yaml (Blueprint)

1. Push this folder to a GitHub repo
2. Go to [render.com](https://render.com) → New → Blueprint
3. Connect your GitHub repo
4. Render reads `render.yaml` and sets everything up automatically

### Method 2: Manual

1. Push to GitHub
2. Go to Render → New → Web Service
3. Connect your repo
4. Set these:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. Add environment variables:
   - `NODE_ENV` = `production`
   - `SESSION_SECRET` = (click "Generate" for a random value)
   - `DB_PATH` = `/var/data/data.db`
6. Add a **Disk** (under Advanced):
   - Mount Path: `/var/data`
   - Size: 1 GB
7. Click **Create Web Service**

---

## Features

- 🔐 Secure login & signup (bcrypt hashed passwords, rate limiting, session security)
- 🎥 Video background upload (up to 100MB)
- ✒️ 14 font choices for your display name
- 🔗 Custom links editor
- 📱 Mobile-friendly bio link page
- 🛡️ Helmet security headers, CSRF-safe sessions, input sanitization

## File Structure

```
├── server.js          # Express app entry
├── db.js              # SQLite database + seed
├── routes/
│   ├── auth.js        # Login / signup / logout
│   ├── admin.js       # Dashboard API (protected)
│   └── public.js      # Public bio link page
├── middleware/
│   └── auth.js        # Session auth middleware
├── public/
│   ├── index.html     # Bio link page (public)
│   ├── login.html     # Login page
│   ├── signup.html    # Signup page
│   ├── dashboard.html # Admin dashboard
│   └── uploads/       # Video files (gitignored)
└── render.yaml        # Render deployment config
```
