import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialisation idempotente de l'application Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Firestore avec la base de données spécifique provisionnée
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

// Authentification Firebase
export const auth = getAuth(app);

// Stockage Firebase Storage pour les photos d'établissements
export const storage = getStorage(app);

export default app;
