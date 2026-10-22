# Vishnuda Private Studio Admin — Separate Admin App

Responsive React/Vite storefront with Firebase Authentication, Firestore, Storage, a separate `/studio-admin` route, product management, cart, delivery details, order history/status, courier estimates, and Razorpay Checkout test integration.

## Important security notice

- The Razorpay Key Secret must only be stored in Firebase Functions Secret Manager. It is **not** in `.env.local`, the React bundle, or this ZIP.
- The Razorpay test credentials previously pasted into chat should be considered exposed. Regenerate them in the Razorpay Dashboard before continuing.
- This project uses **Test Mode** only until you explicitly configure your live credentials and verify your merchant account.
- Firebase Cloud Functions deployment may require the Firebase Blaze billing plan. Check your current Firebase billing page before deployment.
- Never accept an order as paid based only on the browser callback. The callable function checks the signature and confirms/captures the payment server-side.

## Requirements

- Node.js 20+
- Firebase CLI
- A Firebase project with Authentication and Cloud Firestore enabled (painting images are compressed and stored in Firestore; Firebase Storage is not used for new uploads)
- Razorpay merchant account with test API keys
- Firebase Blaze plan if required for Cloud Functions deployment

## 1. Install dependencies and run the storefront locally

Open this project folder in a terminal:

```bash
npm install
npm run dev
```

The existing `.env.local` contains the Firebase **web app configuration** previously supplied. These are client-side Firebase config values, not Razorpay secrets. If Firebase reports `auth/invalid-api-key`, verify the Web API key in Firebase Console → Project settings → General → Your apps, and restart Vite.

In Firebase Console → Authentication → Sign-in method, enable Email/Password and Google. Add `localhost` to Authorized domains. Create Firestore. Firebase Storage is not required for painting uploads in this version.

## 2. Select the Firebase project

```bash
npm install -g firebase-tools
firebase login
firebase projects:list
firebase use vishnuda-paintings
```

If `firebase use` says the project is not configured, run `firebase use --add` and select the correct project.

## 3. Add Razorpay secrets securely

Regenerate the test keys first because the previous test secret was shared in chat.

Set each secret interactively (the CLI prompts you; don't paste the secret into source code):

```bash
firebase functions:secrets:set RAZORPAY_KEY_ID
firebase functions:secrets:set RAZORPAY_KEY_SECRET
```

Enter the **new Test Key ID** for the first prompt and the **new Test Key Secret** for the second. Do not add either secret to `VITE_` variables or commit it to Git.

## 4. Install and deploy the backend

```bash
cd functions
npm install
cd ..
firebase deploy --only firestore:rules
firebase deploy --only functions
```

The functions are deployed to `asia-south1` (Mumbai). They expose:
- `createRazorpayOrder`: requires a signed-in Firebase user, validates delivery fields and server-controlled product prices, computes shipping, creates a Razorpay order and saves an unpaid order record.
- `verifyRazorpayPayment`: verifies the Razorpay HMAC signature, fetches the payment, captures it if authorized, and marks the Firestore order paid only after a captured payment is confirmed.

## 5. Test the payment flow

1. Start the site with `npm run dev`.
2. Sign in to the storefront.
3. Add paintings to the cart and open checkout.
4. Enter delivery details and choose a region. Tamil Nadu shipping is ₹40; other supported Indian regions use the estimates shown in checkout. International delivery requires a quote and can't be paid until the fee is agreed.
5. Choose Pay securely with Razorpay. Use the Razorpay Dashboard's current official **test payment details** for the payment method shown in Checkout. Never use real customer card details while in Test Mode.
6. Confirm the order shows `Paid` only after the server confirms a captured payment.

### Shipping estimates

- Tamil Nadu: ₹40
- Supported other Indian states: ₹100
- Other / Union Territory: ₹120
- International: quote required before checkout

These are estimates, not live courier API rates. The backend calculates the same amounts independently of the browser.

## Admin access

The admin route is `/studio-admin` and is not linked from customer navigation. Sign in with `vishnudaprakashrajaa.2002@gmail.com`. The route being hidden is not itself security; the Firestore and Storage rules also check the configured admin email. Deploy rules and test both customer and admin accounts before launch.

## Build and hosting

```bash
npm run build
firebase deploy --only hosting
```

For local preview of the production build:

```bash
npm run preview
```

## Before going live

- Complete Razorpay KYC/merchant activation and replace the test secrets with live credentials only after the test flow passes.
- Test failure, cancellation, duplicate clicks, and mobile Checkout.
- Configure a Razorpay webhook (for example `payment.captured`) and verify its webhook signature server-side to recover reliably from cases where a customer completes payment but closes the browser before the client callback finishes.
- Consider decrementing inventory transactionally after confirmed payment and add idempotency protection before production.
- Review consumer policies, taxes, privacy and refund requirements before accepting customer payments.
- SMS/email notifications are not configured in this project.


## Updated checkout and owner page

- Customer checkout now calls `createRazorpayOrder`, opens Razorpay Checkout, and calls `verifyRazorpayPayment` after payment. The Firebase Functions must be deployed and Razorpay test secrets configured first.
- The owner workspace is available at `http://localhost:5173/studio-admin` while running locally. Sign in using the configured admin email (`VITE_ADMIN_EMAIL`). Customers who do not use that email cannot manage products.
- Add paintings in Studio Admin → Manage paintings → Add a painting → Publish painting. The product list listens to Firestore, so newly published paintings appear on the storefront.
- “Write to Vishnuda” now opens a WhatsApp chat with the configured store phone; an email fallback is provided.
- Checkout uses ₹40 courier fee for Tamil Nadu and ₹100 for other listed Indian states; Union Territories use ₹120. International orders must request a quote first. Adjust rates in both `src/store.jsx` and `functions/index.js` together if needed.

Do not share the Razorpay Key Secret. Set it with Firebase Functions secrets as described above. Test the entire payment flow before accepting real payments.


## Separate admin app

This is the owner-only admin application. It connects to the same Firebase project as the customer storefront. Sign in with `vishnudaprakashrajaa.2002@gmail.com`. Products created/edited/deleted here are written to Firestore `products`, which the storefront subscribes to in real time. The deployed Firestore and Storage rules must be applied for server-enforced owner-only writes.


## Painting image storage (no Firebase Storage)
New painting images are resized and compressed in the browser, then stored as a data URL in the same Firestore product document. This keeps admin and storefront synchronized without Firebase Storage. Firestore has a 1 MiB document limit, so images are compressed to approximately 360 KiB or less; use a smaller image if compression cannot reach that limit. Existing image URLs continue to work.


## Important: shared paintings and image storage

Both the storefront and private studio admin must use the **same Firebase project ID** and the same Firestore database. Painting details and the compressed painting image are saved together in the Firestore `products` collection; Firebase Storage is not used by the painting upload flow. The storefront listens to that collection in real time, so published, edited, stock-updated, and deleted paintings should update automatically.

Image files are resized/compressed in the browser before being saved as a data URL in Firestore. Firestore has a 1 MiB document limit, so very large/detailed images may be rejected after compression. If changes still do not appear, verify both deployments' `VITE_FIREBASE_PROJECT_ID`, sign in with the authorized admin email, and deploy `firestore.rules` to the same Firebase project.


## Important: shared painting database
Both the admin and storefront must use the same Firebase project ID (`vishnuda-paintings`) and the same Firestore database. The painting collection is named `products`. After changing `firestore.rules`, publish the rules to Firebase Console → Firestore Database → Rules (or run `firebase deploy --only firestore:rules` from a correctly configured Firebase CLI project). The rules permit public reads but allow painting writes only when signed in as `vishnudaprakashrajaa.2002@gmail.com`. If Publish/Save fails, read the on-page error message; `permission-denied` usually means the admin email or deployed rules do not match. Images are compressed and stored as data URLs in Firestore; Firebase Storage is not used. Each Firestore document has a 1 MiB limit, so images are compressed before saving.
