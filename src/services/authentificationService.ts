import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UtilisateurConnecte, RoleUtilisateur } from '../types';

const googleProvider = new GoogleAuthProvider();

/**
 * Configuration des comptes d'accès FPT DAKAR V1 :
 * - Compte principal : lynourou12@gmail.com (ADMINISTRATEUR PRINCIPAL)
 * - Compte invité : invite@fptdakar.sn (EDITOR)
 */
export const EMAIL_ADMIN_PRINCIPAL = 'lynourou12@gmail.com';
export const EMAILS_ADMINS_AUTORISES = ['lynourou12@gmail.com', 'geomatquecedt@gmail.com'];
export const EMAIL_INVITE_OFFICIEL = 'invite@fptdakar.sn';
export const EMAILS_INVITES_AUTORISES = ['invite@fptdakar.sn', 'invite.fptdakar@gmail.com'];

// Rétrocompatibilité d'export
export const EMAIL_EDITEUR_OFFICIEL = EMAIL_ADMIN_PRINCIPAL;
export const EMAILS_EDITEURS_AUTORISES = [...EMAILS_ADMINS_AUTORISES, ...EMAILS_INVITES_AUTORISES];

/**
 * Vérifie le rôle réel d'un utilisateur Firebase :
 * 1. Les comptes principaux -> ADMINISTRATEUR
 * 2. Les comptes invités officiels -> EDITOR
 * 3. Les utilisateurs dans Firestore /utilisateurs/{uid} avec rôle actif
 * 4. Par défaut : VISITEUR (lecture seule)
 */
export async function verifierRoleUtilisateur(user: User | null): Promise<{
  role: RoleUtilisateur;
  typeCompte: 'PRINCIPAL' | 'INVITE' | 'STANDARD';
}> {
  if (!user) {
    return { role: 'VISITEUR', typeCompte: 'STANDARD' };
  }

  const email = (user.email || '').toLowerCase().trim();

  // Compte principal (ADMINISTRATEUR)
  if (EMAILS_ADMINS_AUTORISES.map((e) => e.toLowerCase()).includes(email)) {
    return { role: 'ADMINISTRATEUR', typeCompte: 'PRINCIPAL' };
  }

  // Compte invité prédéfini (EDITOR)
  if (EMAILS_INVITES_AUTORISES.map((e) => e.toLowerCase()).includes(email)) {
    return { role: 'EDITOR', typeCompte: 'INVITE' };
  }

  // Vérification secondaire dans Firestore /utilisateurs/{uid}
  try {
    const snap = await getDoc(doc(db, 'utilisateurs', user.uid));
    if (snap.exists()) {
      const data = snap.data();
      if (data?.actif !== false) {
        if (data?.role === 'ADMINISTRATEUR') {
          return { role: 'ADMINISTRATEUR', typeCompte: data?.typeCompte || 'STANDARD' };
        }
        if (data?.role === 'EDITOR') {
          return { role: 'EDITOR', typeCompte: data?.typeCompte || 'INVITE' };
        }
      }
    }
  } catch {
    // Si la vérification échoue, par sécurité rôle VISITEUR
  }

  return { role: 'VISITEUR', typeCompte: 'STANDARD' };
}

/**
 * Initialise ou met à jour les profils dans la collection /utilisateurs
 * lorsque l'administrateur principal se connecte.
 */
export async function initialiserProfilsComptesSiAdmin(user: User): Promise<void> {
  const email = (user.email || '').toLowerCase().trim();
  if (!EMAILS_ADMINS_AUTORISES.map((e) => e.toLowerCase()).includes(email)) {
    return;
  }

  try {
    // 1. Profil de l'administrateur principal
    await setDoc(
      doc(db, 'utilisateurs', user.uid),
      {
        uid: user.uid,
        email: user.email,
        role: 'ADMINISTRATEUR',
        actif: true,
        typeCompte: 'PRINCIPAL',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // 2. Profil modèle du compte invité prédéfini
    const docInviteRef = doc(db, 'utilisateurs', 'compte_invite_officiel');
    const snapInvite = await getDoc(docInviteRef);
    if (!snapInvite.exists()) {
      await setDoc(docInviteRef, {
        email: EMAIL_INVITE_OFFICIEL,
        role: 'EDITOR',
        actif: true,
        typeCompte: 'INVITE',
        createdAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.info('[Auth] Synchronisation des profils utilisateurs ignorée :', err);
  }
}

/**
 * Convertit un utilisateur Firebase en UtilisateurConnecte
 */
export async function convertirUtilisateurFirebase(user: User | null): Promise<UtilisateurConnecte | null> {
  if (!user) return null;
  const { role, typeCompte } = await verifierRoleUtilisateur(user);

  // Synchronisation des profils si administrateur principal
  if (role === 'ADMINISTRATEUR') {
    initialiserProfilsComptesSiAdmin(user).catch(() => {});
  }

  return {
    uid: user.uid,
    email: user.email,
    nomAffiche:
      user.displayName ||
      (typeCompte === 'INVITE'
        ? 'Compte Invité'
        : user.email?.split('@')[0] || 'Utilisateur'),
    role,
    typeCompte,
  };
}

/**
 * Connexion par e-mail et mot de passe Firebase
 */
export async function connecterEmail(email: string, motDePasse: string): Promise<UtilisateurConnecte> {
  try {
    const resultat = await signInWithEmailAndPassword(auth, email.trim(), motDePasse);
    const utilisateur = await convertirUtilisateurFirebase(resultat.user);
    if (!utilisateur) throw new Error('Erreur de connexion');
    return utilisateur;
  } catch (err: any) {
    if (
      err?.code === 'auth/invalid-credential' ||
      err?.code === 'auth/user-not-found' ||
      err?.code === 'auth/wrong-password' ||
      err?.code === 'auth/invalid-email'
    ) {
      throw new Error('Adresse e-mail ou mot de passe incorrect.');
    }
    throw err;
  }
}

/**
 * Création d'un compte Firebase
 */
export async function creerCompteAdmin(email: string, motDePasse: string): Promise<UtilisateurConnecte> {
  const resultat = await createUserWithEmailAndPassword(auth, email.trim(), motDePasse);
  const utilisateur = await convertirUtilisateurFirebase(resultat.user);
  if (!utilisateur) throw new Error("Erreur lors de la création du compte");
  return utilisateur;
}

/**
 * Connexion via Google Firebase Auth
 */
export async function connecterGoogle(): Promise<UtilisateurConnecte> {
  const resultat = await signInWithPopup(auth, googleProvider);
  const utilisateur = await convertirUtilisateurFirebase(resultat.user);
  if (!utilisateur) throw new Error('Erreur lors de la connexion Google');
  return utilisateur;
}

/**
 * Déconnexion Firebase (retour au statut visiteur non connecté)
 */
export async function deconnecter(): Promise<void> {
  await signOut(auth);
}

/**
 * Observateur en temps réel de l'état d'authentification Firebase Auth
 */
export function observerAuthentification(
  callback: (utilisateur: UtilisateurConnecte | null) => void
): () => void {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const u = await convertirUtilisateurFirebase(user);
      callback(u);
    } else {
      callback(null);
    }
  });
}

