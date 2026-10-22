import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// Vite env names are case-sensitive. Keep legacy lowercase aliases as fallback.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || import.meta.env.VITE_FIREBASE_authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || import.meta.env.VITE_FIREBASE_projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || import.meta.env.VITE_FIREBASE_storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || import.meta.env.VITE_FIREBASE_messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || import.meta.env.VITE_FIREBASE_appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || import.meta.env.VITE_FIREBASE_measurementId,
};

export const configured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
// Reuse the app during Vite hot reload instead of initializing duplicate Firebase apps.
const app = getApps().length ? getApp() : initializeApp(config);
export const auth = getAuth(app);
export const google = new GoogleAuthProvider();
// Force long polling so saves still reach the server on networks/proxies/ad-blockers that break the default streaming connection.
let firestore;
try { firestore = initializeFirestore(app, { experimentalForceLongPolling: true }); }
catch { firestore = getFirestore(app); } // already initialised (hot reload)
export const db = firestore;
export const functions = getFunctions(app, 'asia-south1');
// The owner identity is fixed in the client; Firestore and Storage rules enforce it server-side too.
export const adminEmail = 'vishnudaprakashrajaa.2002@gmail.com'.toLowerCase();
export const storeEmail = import.meta.env.VITE_STORE_EMAIL || 'vishnudaprakashrajaa.2002@gmail.com';
export const storePhone = import.meta.env.VITE_STORE_PHONE || '9025364235';

// Direct server round-trip used by the admin status bar to show the EXACT reason a save cannot reach Firestore.
import { doc, getDocFromServer } from 'firebase/firestore';
export async function pingServer() {
  try {
    await Promise.race([
      getDocFromServer(doc(db, 'products', '__ping__')),
      new Promise((_, rej) => setTimeout(() => rej({ code: 'timeout' }), 12000)),
    ]);
    return { ok: true, code: '' };
  } catch (e) { return { ok: false, code: e?.code || e?.message || 'unknown' }; }
}
