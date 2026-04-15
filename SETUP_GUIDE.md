# Parish CMS — Setup & Admin Guide

## Askeaton & Ballysteen Parish  
### Firebase-Powered Admin System

---

## What's Been Built

| Feature | Status |
|---|---|
| Admin login (email + password) | ✅ |
| "Forgot password" email reset | ✅ |
| Floating ✟ trigger (hidden from public) | ✅ |
| Persistent admin toolbar | ✅ |
| Edit Mode toggle with inline editing | ✅ |
| "Apply change everywhere?" prompt | ✅ |
| Save / Discard Changes | ✅ |
| Version history (last 20 snapshots) | ✅ |
| Restore previous version | ✅ |
| Create news articles (4 types) | ✅ |
| Edit / delete existing articles | ✅ |
| Image upload with auto-compression | ✅ |
| Booking link support on Event articles | ✅ |
| Firebase Storage for images | ✅ |
| Page Builder (index.html only) | ✅ |
| Drag-reorder page sections | ✅ |
| Fallback to local news.json if offline | ✅ |

---

## Step 1 — Create Your Firebase Project

1. Go to **https://console.firebase.google.com**
2. Click **"Add project"**
3. Name it `askeaton-parish` (or any name you like)
4. Disable Google Analytics if you prefer (not needed)
5. Click **"Create project"**

---

## Step 2 — Enable Authentication

1. In your Firebase project, click **"Authentication"** in the left sidebar
2. Click **"Get started"**
3. Click the **"Email/Password"** provider
4. Enable it → **Save**

**Create the admin account:**
1. Go to **Authentication → Users → Add user**
2. Enter the parish admin email and a strong password
3. Click **"Add user"**

That's the only account needed — no registration page required.

---

## Step 3 — Enable Firestore Database

1. Click **"Firestore Database"** in the left sidebar
2. Click **"Create database"**
3. Choose **"Start in production mode"** → Next
4. Choose your region: **europe-west2 (London)** is closest to Limerick → Enable

**Set security rules** (click the Rules tab):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Public can read pages and news
    match /pages/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /news/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /pagebuilder/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    // Version history — admin only
    match /versions/{doc} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Click **"Publish"**.

---

## Step 4 — Enable Firebase Storage

1. Click **"Storage"** in the left sidebar
2. Click **"Get started"** → Production mode → Next → Done

**Set storage rules** (click the Rules tab):

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Anyone can read images (for the public website)
    match /news/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

Click **"Publish"**.

---

## Step 5 — Get Your Firebase Config

1. Click the **gear icon ⚙** → **Project settings**
2. Scroll down to **"Your apps"** → click the **`</>`** (Web) icon
3. Register the app with a name like `parish-website`
4. Copy the `firebaseConfig` object — it looks like:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "askeaton-parish.firebaseapp.com",
  projectId: "askeaton-parish",
  storageBucket: "askeaton-parish.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc..."
};
```

---

## Step 6 — Update the Config in Your Files

Open both **`admin-core.js`** and **`news.html`** and replace the placeholder values:

```javascript
const FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",        // ← paste your value
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};
```

Do this in **both files** — search for `YOUR_API_KEY` to find both locations.

---

## Step 7 — Upload to GitHub Pages

1. Go to your GitHub repository
2. Upload **all files** from this folder (replacing existing ones)
3. Key new files to upload:
   - `admin.css`
   - `admin-core.js`
   - All updated `.html` files
4. Go to **Settings → Pages** and confirm it's still deploying from `main`

Your site will rebuild within ~2 minutes.

---

## Step 8 — Enable CORS for Firebase Storage

If images don't display after upload, you may need to configure CORS.

1. Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install
2. Create a file called `cors.json`:
```json
[
  {
    "origin": ["*"],
    "method": ["GET"],
    "maxAgeSeconds": 3600
  }
]
```
3. Run: `gsutil cors set cors.json gs://YOUR_PROJECT.appspot.com`

*(This is only needed if you see CORS errors in the browser console.)*

---

## How to Use the Admin System

### Logging In

1. Visit your website on any device
2. Look for the small **✟** button in the bottom-right corner (it's subtle — only you know it's there)
3. Click it → enter your email and password → Sign In

### Edit Mode

1. After logging in, an **admin toolbar** appears at the very top of every page
2. Toggle **"Edit Mode: On"** with the switch in the centre of the toolbar
3. Every editable piece of text gets an **✎ Edit** button beside it
4. Click **✎ Edit** on any text → edit it → click **✓ Done**
5. When a piece of text appears in multiple places, you'll be asked: *"Apply this change everywhere on this page?"*
6. When finished editing, click **Save Changes** in the toolbar

### Creating a News Article

1. Click **"+ News"** in the admin toolbar (from any page)
2. Choose the article type:
   - **General Update** — standard parish news
   - **Critical Update** — shown with a red border (urgent notices)
   - **Event Notice** — shows with navy border (upcoming events)
   - **Event with Booking** — adds a booking link and button
3. Fill in the headline, date, excerpt, and full body
4. Upload images if needed (automatically compressed)
5. Click **"Publish Article"**

### Editing or Deleting an Article

1. Go to the **News** page
2. Each article shows an **✎ Edit** button when you're logged in
3. Click it to edit any field, replace images, or delete the article

### Version History

1. Click **"⎙ History"** in the admin toolbar
2. See the last 20 snapshots of content changes
3. Click **"Restore"** on any entry to revert to that state

### Page Builder (Homepage Only)

1. On the **homepage (index.html)**, turn on Edit Mode
2. An **"+ Add Element"** bar appears at the bottom of the page
3. Choose an element type from the dropdown and click **"+ Add Element"**
4. Element types available:
   - **Text Block** — heading + paragraph
   - **Announcement Banner** — gold strip with icon and text
   - **Image with Caption** — image area + editable caption
   - **Two-Column Layout** — side-by-side text columns
   - **Ornamental Divider** — the decorative ✟ divider line
5. Use the **▲ ▼** buttons to reorder sections
6. Use **×** to delete a section
7. Edit text directly by clicking on it
8. Click **Save Changes** when done

### Signing Out

Click **"Sign Out"** on the right side of the admin toolbar.

---

## Architecture Summary

```
GitHub Pages (static hosting)
│
├── HTML/CSS/JS files (your website)
├── admin.css          ← admin UI styles
├── admin-core.js      ← admin logic (ES Module)
│
└── Firebase (Google Cloud — free tier)
    ├── Authentication  ← email/password login
    ├── Firestore       ← stores page edits, news articles, versions
    └── Storage         ← stores uploaded images
```

**Why this architecture?**
- GitHub Pages handles 100% of the public website — fast, free, reliable
- Firebase only activates when admin is logged in
- Public visitors never load Firebase (no performance impact)
- The `news.json` file remains as a fallback if Firebase is ever unavailable
- Everything is on Google's free tier (Spark plan) — no credit card needed for this usage level

---

## Free Tier Limits (Firebase Spark Plan)

| Resource | Free Limit | Parish Usage |
|---|---|---|
| Authentication | 10,000 users/month | Way under (1 admin) |
| Firestore reads | 50,000/day | Easily sufficient |
| Firestore writes | 20,000/day | Easily sufficient |
| Storage | 5 GB | ~500–1,000 article images |
| Storage bandwidth | 1 GB/day | Sufficient |

You will very likely never exceed free tier limits for a parish website.

---

## Troubleshooting

**"The ✟ button doesn't appear"**  
- Check that `admin.css` and `admin-core.js` are both uploaded correctly
- Check the browser console (F12) for errors

**"Login fails with 'invalid credential'"**  
- Double-check the email/password you created in Firebase Authentication
- Use "Forgot password" to reset if needed

**"Images don't upload"**  
- Check that Firebase Storage is enabled and rules are published
- Check the browser console for CORS errors — see Step 8 above

**"Changes don't save"**  
- Check that Firestore rules are published (Step 3)
- Ensure you're logged in (admin toolbar is visible)

**"News doesn't load from Firebase"**  
- Verify `YOUR_API_KEY` and other config values are replaced in both `admin-core.js` and `news.html`
- The site will automatically fall back to `data/news.json` as a backup

---

*Parish CMS built for Askeaton & Ballysteen Parish, Diocese of Limerick.*
