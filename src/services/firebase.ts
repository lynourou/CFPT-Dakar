import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// App Check
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from 'firebase/app-check';

// Initialisation idempotente de l'application Firebase
const app =
  getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApp();

// Firestore avec la base de données spécifique provisionnée
export const db = getFirestore(
  app,
  firebaseConfig.firestoreDatabaseId || undefined
);

// Authentification Firebase
export const auth = getAuth(app);

// Stockage Firebase Storage pour les photos d'établissements
export const storage = getStorage(app);

export default app;

// === App Check initialization ===
// En production, App Check utilise reCAPTCHA Enterprise.
// En développement local, App Check n'est pas initialisé afin
// d'éviter de dépendre de DebugProvider, qui n'est pas exporté
// par la version actuelle du SDK Firebase utilisée par le projet.
if (typeof window !== 'undefined') {
  const hostname = window.location.hostname;

  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1';

  if (!isLocal) {
    const siteKey =
      (import.meta.env as any)
        .VITE_RECAPTCHA_ENTERPRISE_SITE_KEY || '';

    if (siteKey) {
      try {
        initializeAppCheck(app, {
          provider: new ReCaptchaEnterpriseProvider(siteKey),
          isTokenAutoRefreshEnabled: true,
        });
      } catch (err) {
        console.warn(
          'Impossible d’initialiser Firebase App Check :',
          err
        );
      }
    }
  }
}
