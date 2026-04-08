# Biolink Site v2

A personal bio link site with tabbed dashboard, analytics, image icon support, avatar upload, and more.

## Local Dev

```bash
npm install
npm run dev
```

Visit: http://localhost:3000

**Default admin login:**
- Username: `9170`  
- Password: `lolripbozo1)`

---

## Deploy to Railway

### Step 1 — Push to GitHub
1. Create a new GitHub repo (github.com → New repository)
2. In the project folder, run:
```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### Step 2 — Deploy on Railway
1. Go to [railway.app](https://railway.app) and sign in (GitHub login works great)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repo — Railway auto-detects Node.js and deploys
4. Go to your service → **Variables** tab, add:
   - `SESSION_SECRET` = (generate a random 32+ char string)
   - `NODE_ENV` = `production`
   - `DB_PATH` = `/data/data.db`

### Step 3 — Add Persistent Storage (IMPORTANT for DB)
1. In your Railway project, click **New** → **Volume**
2. Set mount path to `/data`
3. Redeploy your service

### Step 4 — Get your domain
- Go to **Settings** → **Networking** → **Generate Domain**
- Your site is live!

---

## Dashboard Tabs

| Tab | What's there |
|-----|-------------|
| **Profile** | Display name, bio, avatar (emoji or photo), SEO title/description |
| **Appearance** | Background color, overlay, text color, font picker, text sizes |
| **Layout** | Card style (glass/solid/outline/frosted/plain), content position, button styles |
| **Links** | Add links with emoji icons OR uploaded image icons |
| **Media** | Video background upload, splash screen text |
| **Analytics** | Total/today/weekly/monthly views, 30-day chart, referrers, recent visits |
| **Settings** | Change password, clear analytics data |

## Features
- 🔐 Secure login/signup (bcrypt, rate limiting, sessions)
- 🎬 Video background (up to 100MB)
- 🖼️ Avatar: upload a photo OR pick an emoji
- 🔗 Link icons: pick any emoji OR upload a custom image
- 📊 Analytics dashboard with charts
- ✒️ 14 font choices
- 🎨 Full color/style customization
- 📱 Mobile-friendly
- 🛡️ Helmet security headers
