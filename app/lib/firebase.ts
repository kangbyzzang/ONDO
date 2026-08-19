import { getAnalytics, isSupported } from "firebase/analytics";
import { getApp, getApps, initializeApp } from "firebase/app";
import { browserSessionPersistence, getAuth, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDuISb7ayr47jQV4QP4U0IXoAX4yaBa6KM",
  authDomain: "data-platform-b4587.firebaseapp.com",
  projectId: "data-platform-b4587",
  storageBucket: "data-platform-b4587.firebasestorage.app",
  messagingSenderId: "321123660167",
  appId: "1:321123660167:web:51e5a4895df7d8a4eda322",
  measurementId: "G-B7NSZ88LCJ",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);

let persistencePromise: Promise<void> | undefined;

export function initializeAuthSession() {
  persistencePromise ??= setPersistence(firebaseAuth, browserSessionPersistence);
  return persistencePromise;
}

export async function initializeFirebaseAnalytics() {
  if (typeof window === "undefined" || !(await isSupported())) return;
  getAnalytics(firebaseApp);
}
