# Vishnuda Paintings — fix guide (do these in order)

## 1. Publish the Firestore rules (this is the step that makes saving work)
Firebase Console → vishnuda-paintings → Firestore Database
- If you see a "Create database" button, create it first (Production mode, region asia-south1 or nearest).
- Open the **Rules** tab, replace everything with the contents of `firestore.rules`, click **Publish**.

## 2. Sign in to admin with Google
Admin → "Continue with Google" using vishnudaprakashrajaa.2002@gmail.com.
(Rules now require a verified email, so unverified email/password sign-ups can never become admin.)
Firebase Console → Authentication → Sign-in method → make sure Google is enabled.

## 3. Run / deploy both apps from these new folders
    cd admin && npm install && npm run dev        # http://localhost:5173
    cd storefront && npm install && npm run dev -- --port 5174

Both `.env.local` files must say `vishnuda-paintings` as project ID (they do).

## 4. Hosting: give each app its own site (otherwise one overwrites the other)
    firebase hosting:sites:create vishnuda-paintings-admin
    cd storefront && npm run build && firebase deploy --only hosting
    cd ../admin  && npm run build && firebase deploy --only hosting
Then add the new admin domain in Authentication → Settings → Authorized domains if Google sign-in complains.

## 5. Redeploy functions (demo paintings can no longer be bought)
    cd admin/functions && npm install && cd .. && firebase deploy --only functions

## How to tell it works
- Admin shows a green bar: "Live — connected to the shared database".
- After Publish you get "now live on the customer site". A painting still marked "⏳ Saving… not on the server yet" means it did NOT save.
- Any failure now shows a red message for 15 seconds with the reason.

## UPDATE: "Publish failed … database did not confirm the save" / paintings vanish on refresh
This means the browser cannot reach a Firestore database. Do this in order:
1. Firebase Console → vishnuda-paintings → Build → Firestore Database → **Create database** (default database, Production mode, region asia-south1). If it already exists, skip.
2. Firestore → Rules tab → paste firestore.rules → **Publish**.
3. Google Cloud Console → APIs & Services → check "Cloud Firestore API" is enabled, and that the API key has no restriction blocking localhost.
4. Turn off VPN/ad-blocker, restart `npm run dev`.
Code change: Firestore now uses forced long-polling, and the admin red/green bar now prints the exact reason when it cannot connect.
