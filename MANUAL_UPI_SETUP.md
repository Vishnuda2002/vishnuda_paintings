# Manual UPI payment setup

This version replaces Razorpay Checkout with manual UPI QR payment and admin approval.

## What changed
- Includes the supplied UPI QR image at `public/upi-qr.png`.
- Checkout displays the QR, UPI ID `vishnuda.2002@okicici`, asks for a transaction reference, and requires a payment screenshot.
- The screenshot is compressed before being saved to Firestore.
- Orders are created as `Payment pending` / `Pending verification`.
- In the private admin page, open **Orders & delivery**, inspect the screenshot and transaction reference, verify the actual payment in your bank/UPI app, then click **Verify payment & approve dispatch**.
- Do not approve based only on the uploaded screenshot.

## Publish Firestore rules
The updated rules are in `firestore.rules` in both `storefront` and `admin`. They allow signed-in customers to create their own pending-verification orders, allow them to read their own orders, and restrict updates to the verified admin account.

From the `storefront` directory, after confirming the Firebase project is correct:
```
firebase use vishnuda-paintings
firebase deploy --only firestore:rules
```
Repeat from `admin` only if that app is configured to deploy its own rules. Both apps point to the same project/database, so publishing either identical rules file is enough.

## Run locally
In each folder (`storefront` and `admin`) run:
```
npm install
npm run dev
```
Use the storefront for customers and the separate admin app for the studio owner. Deploy each hosting target using its existing README instructions.

## Important limits and safety
- This manual flow does not automatically confirm that money arrived. Check your bank/UPI account before approving.
- Screenshot proof is stored in Firestore, so upload a compressed screenshot; the app compresses images automatically. Firestore has a 1 MiB per-document limit.
- Keep Firestore rules secure. Do not use open public write rules.
- The supplied QR is copied as provided; test scanning it with a small amount before accepting customer orders.
