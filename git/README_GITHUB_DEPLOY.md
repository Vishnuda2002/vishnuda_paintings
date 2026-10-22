# Vishnuda Paintings Website

This repository contains two separate Vite/React apps:

- `storefront/` — customer-facing painting shop
- `admin/` — admin portal

## Deploy on Vercel

Deploy each app as a separate Vercel project from this same GitHub repository.

### Storefront project
- Root Directory: `storefront`
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`

### Admin project
- Root Directory: `admin`
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`

For both Vercel projects, add the required environment variables from that app's `.env.example` in **Settings → Environment Variables**. Use your real Firebase Web App API key for `VITE_FIREBASE_API_KEY`; `.env.local` files are intentionally excluded from this archive and must never be committed.

After changing environment variables, redeploy the project.

## Local development

Open a terminal in `storefront` or `admin`, then run:

```bash
npm install
npm run dev
```

Build check:

```bash
npm run build
```

## Notes

- `node_modules/` and `dist/` are generated folders and are not included.
- Firebase rules, Functions source, QR image, source files, and setup guides are retained.
- Deploy Firebase rules/Functions separately only after reviewing the Firebase project configuration and security rules.
- A successful Vercel deployment does not by itself configure Firebase Authentication, Firestore, Storage, payment handling, or email/SMS notifications. Those Firebase services must be configured and tested separately.
