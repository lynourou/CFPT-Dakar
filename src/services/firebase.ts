import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// App Check
import { initializeAppCheck, DebugProvider, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

// Initialisation idempotente de l'application Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Firestore avec la base de données spécifique provisionnée
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

// Authentification Firebase
export const auth = getAuth(app);

// Stockage Firebase Storage pour les photos d'établissements
export const storage = getStorage(app);

export default app;

// === App Check initialization ===
if (typeof window !== 'undefined') {
  const hostname = window.location.hostname;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

  if (isLocal) {
    // Debug provider for local development. Developer must register the debug token in Firebase Console > App Check > Debug tokens
    try {
      initializeAppCheck(app, {
        provider: new DebugProvider(),
        isTokenAutoRefreshEnabled: true,
      });
      // console.info('App Check (DebugProvider) initialized for localhost');
    } catch (err) {
      // don't break app if app-check init fails
      // console.warn('Failed to initialize App Check (DebugProvider):', err);
    }
  } else {
    // Production / staging: use ReCAPTCHA Enterprise provider if site key provided via env
    const siteKey = (import.meta.env as any).VITE_RECAPTCHA_ENTERPRISE_SITE_KEY || '';
    if (siteKey) {
      try {
        initializeAppCheck(app, {
          provider: new ReCaptchaEnterpriseProvider(siteKey),
          isTokenAutoRefreshEnabled: true,
        });
        // console.info('App Check (ReCaptchaEnterpriseProvider) initialized');
      } catch (err) {
        // console.warn('Failed to initialize App Check (ReCaptchaEnterpriseProvider):', err);
      }
    } else {
      // site key not provided; App Check not initialized client-side.
      // Operator must set VITE_RECAPTCHA_ENTERPRISE_SITE_KEY at build-time for production.
    }
  }
}
