import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import {
  CentreFormation,
  FiltresCentres,
  StatistiquesCentres,
  FeatureCollectionCentres,
  FeatureGeoJSONCentre,
  EntreeHistorique,
  IndicateurQualite,
  MappingChamps,
  EntiteGeoJSONAnalysee,
  RapportImportation,
  UtilisateurConnecte,
} from '../types';

const NOM_COLLECTION = 'centres';
const NOM_COLLECTION_HISTORIQUE = 'historique';
const CLE_STOCKAGE_DERNIER_EXPORT = 'fpt_dakar_date_dernier_export';

/**
 * Nettoie un objet pour Firestore (Firestore refuse les valeurs undefined)
 */
function assainirPourFirestore<T extends Record<string, any>>(objet: T): Record<string, any> {
  const propre: Record<string, any> = {};
  for (const [cle, valeur] of Object.entries(objet)) {
    if (valeur !== undefined) {
      propre[cle] = valeur;
    }
  }
  return propre;
}

/**
 * Enregistre une entrée dans l'historique d'audit Firestore
 */
export async function enregistrerHistorique(
  entree: Omit<EntreeHistorique, 'id'>
): Promise<string> {
  try {
    const idEntree = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const docRef = doc(db, NOM_COLLECTION_HISTORIQUE, idEntree);
    const donneesSauvegarde: EntreeHistorique = {
      ...entree,
      id: idEntree,
    };
    await setDoc(docRef, assainirPourFirestore(donneesSauvegarde));
    return idEntree;
  } catch (err) {
    console.warn("Impossible d'enregistrer dans l'historique Firestore :", err);
    return '';
  }
}

/**
 * Récupère l'historique des modifications depuis Firestore
 */
export async function obtenirHistorique(limiteMax = 50): Promise<EntreeHistorique[]> {
  try {
    const colRef = collection(db, NOM_COLLECTION_HISTORIQUE);
    const q = query(colRef, orderBy('date', 'desc'), limit(limiteMax));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return [];
    }

    const entrees: EntreeHistorique[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as EntreeHistorique;
      entrees.push({
        ...data,
        id: d.id,
      });
    });

    return entrees;
  } catch (err) {
    console.error("Erreur lors de la récupération de l'historique :", err);
    return [];
  }
}

/**
 * Restaure un centre vers ses anciennes valeurs issues d'une entrée d'historique
 */
export async function restaurerVersionHistorique(
  entree: EntreeHistorique,
  utilisateur?: UtilisateurConnecte
): Promise<void> {
  if (!entree.anciennesValeurs || !entree.centreId) {
    throw new Error('Aucune valeur antérieure disponible pour la restauration.');
  }

  const id = entree.centreId;
  const docRef = doc(db, NOM_COLLECTION, String(id));
  const snap = await getDoc(docRef);
  const existant = snap.exists() ? (snap.data() as CentreFormation) : undefined;

  const maintenant = new Date().toISOString();
  const donneesRestaurees = {
    ...entree.anciennesValeurs,
    updatedAt: maintenant,
    updatedBy: utilisateur?.email || 'admin',
    isDeleted: false,
  };

  await setDoc(docRef, assainirPourFirestore(donneesRestaurees), { merge: true });

  await enregistrerHistorique({
    action: 'RESTAURATION',
    centreId: id,
    centreNom: entree.centreNom || (donneesRestaurees as any).nom || 'Établissement',
    date: maintenant,
    utilisateur: {
      uid: utilisateur?.uid || 'admin',
      email: utilisateur?.email || null,
      nomAffiche: utilisateur?.nomAffiche || null,
    },
    details: `Restauration de la version antérieure du ${new Date(entree.date).toLocaleString('fr-FR')}`,
    anciennesValeurs: existant,
    nouvellesValeurs: donneesRestaurees,
  });
}

/**
 * Récupère tous les établissements réels depuis Firestore
 * Par défaut, ne renvoie pas les éléments envoyés à la corbeille (isDeleted: true)
 */
export async function obtenirLesCentres(options?: {
  inclureSupprimes?: boolean;
}): Promise<CentreFormation[]> {
  try {
    const colRef = collection(db, NOM_COLLECTION);
    const snapshot = await getDocs(colRef);

    if (snapshot.empty) {
      return [];
    }

    const centres: CentreFormation[] = [];
    snapshot.forEach((document) => {
      const donnees = document.data();

      // Filtrer les éléments supprimés logiquement sauf demande explicite
      if (donnees.isDeleted === true && !options?.inclureSupprimes) {
        return;
      }

      centres.push({
        id: donnees.id !== undefined ? donnees.id : document.id,
        nom: donnees.nom || '',
        nom_officiel: donnees.nom_officiel || undefined,
        type: donnees.type || undefined,
        statut: donnees.statut || undefined,
        commune: donnees.commune || undefined,
        adresse: donnees.adresse || undefined,
        telephone: donnees.telephone || undefined,
        email: donnees.email || undefined,
        site_web: donnees.site_web || undefined,
        formation: donnees.formation || undefined,
        filiere: donnees.filiere || undefined,
        diplomes: donnees.diplomes || undefined,
        date_creation: donnees.date_creation || undefined,
        description: donnees.description || undefined,
        capacite: typeof donnees.capacite === 'number' ? donnees.capacite : undefined,
        photo: donnees.photo || undefined,
        source: donnees.source || undefined,
        latitude: typeof donnees.latitude === 'number' ? donnees.latitude : Number(donnees.latitude),
        longitude: typeof donnees.longitude === 'number' ? donnees.longitude : Number(donnees.longitude),
        createdAt: donnees.createdAt || undefined,
        updatedAt: donnees.updatedAt || undefined,
        createdBy: donnees.createdBy || undefined,
        updatedBy: donnees.updatedBy || undefined,
        dataStatus: donnees.dataStatus || 'publie',
        isDeleted: donnees.isDeleted || false,
        deletedAt: donnees.deletedAt || undefined,
        deletedBy: donnees.deletedBy || undefined,
      });
    });

    // Tri par nom ou ID pour un affichage stable
    return centres.sort((a, b) => {
      if (typeof a.id === 'number' && typeof b.id === 'number') {
        return a.id - b.id;
      }
      return String(a.nom).localeCompare(String(b.nom), 'fr');
    });
  } catch (erreur) {
    console.error('Erreur lors de la récupération des centres depuis Firestore :', erreur);
    throw new Error('Impossible de charger les données des établissements.');
  }
}

/**
 * Récupère les établissements situés dans la Corbeille logique
 */
export async function obtenirCentresCorbeille(): Promise<CentreFormation[]> {
  try {
    const colRef = collection(db, NOM_COLLECTION);
    const snapshot = await getDocs(colRef);

    if (snapshot.empty) {
      return [];
    }

    const centresCorbeille: CentreFormation[] = [];
    snapshot.forEach((document) => {
      const donnees = document.data();
      if (donnees.isDeleted === true) {
        centresCorbeille.push({
          id: donnees.id !== undefined ? donnees.id : document.id,
          nom: donnees.nom || '',
          nom_officiel: donnees.nom_officiel || undefined,
          type: donnees.type || undefined,
          statut: donnees.statut || undefined,
          commune: donnees.commune || undefined,
          adresse: donnees.adresse || undefined,
          telephone: donnees.telephone || undefined,
          email: donnees.email || undefined,
          site_web: donnees.site_web || undefined,
          formation: donnees.formation || undefined,
          filiere: donnees.filiere || undefined,
          diplomes: donnees.diplomes || undefined,
          date_creation: donnees.date_creation || undefined,
          description: donnees.description || undefined,
          capacite: typeof donnees.capacite === 'number' ? donnees.capacite : undefined,
          photo: donnees.photo || undefined,
          source: donnees.source || undefined,
          latitude: typeof donnees.latitude === 'number' ? donnees.latitude : Number(donnees.latitude),
          longitude: typeof donnees.longitude === 'number' ? donnees.longitude : Number(donnees.longitude),
          createdAt: donnees.createdAt || undefined,
          updatedAt: donnees.updatedAt || undefined,
          dataStatus: donnees.dataStatus || 'archive',
          isDeleted: true,
          deletedAt: donnees.deletedAt || undefined,
          deletedBy: donnees.deletedBy || undefined,
        });
      }
    });

    return centresCorbeille.sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || ''));
  } catch (err) {
    console.error('Erreur récupération corbeille:', err);
    return [];
  }
}

/**
 * Récupère un établissement unique selon son identifiant
 */
export async function obtenirCentreParId(id: number | string): Promise<CentreFormation | undefined> {
  try {
    const docRef = doc(db, NOM_COLLECTION, String(id));
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      return undefined;
    }

    const donnees = snapshot.data();
    return {
      id: donnees.id !== undefined ? donnees.id : snapshot.id,
      nom: donnees.nom || '',
      nom_officiel: donnees.nom_officiel || undefined,
      type: donnees.type || undefined,
      statut: donnees.statut || undefined,
      commune: donnees.commune || undefined,
      adresse: donnees.adresse || undefined,
      telephone: donnees.telephone || undefined,
      email: donnees.email || undefined,
      site_web: donnees.site_web || undefined,
      formation: donnees.formation || undefined,
      filiere: donnees.filiere || undefined,
      diplomes: donnees.diplomes || undefined,
      date_creation: donnees.date_creation || undefined,
      description: donnees.description || undefined,
      capacite: typeof donnees.capacite === 'number' ? donnees.capacite : undefined,
      photo: donnees.photo || undefined,
      source: donnees.source || undefined,
      latitude: Number(donnees.latitude),
      longitude: Number(donnees.longitude),
      createdAt: donnees.createdAt || undefined,
      updatedAt: donnees.updatedAt || undefined,
      createdBy: donnees.createdBy || undefined,
      updatedBy: donnees.updatedBy || undefined,
      dataStatus: donnees.dataStatus || 'publie',
      isDeleted: donnees.isDeleted || false,
      deletedAt: donnees.deletedAt || undefined,
      deletedBy: donnees.deletedBy || undefined,
    };
  } catch (erreur) {
    console.error('Erreur lors de la récupération du centre par id :', erreur);
    throw new Error('Impossible de charger les données de cet établissement.');
  }
}

/**
 * Ajoute un nouvel établissement dans Firestore
 */
export async function ajouterCentre(
  nouveauCentre: Omit<CentreFormation, 'createdAt' | 'updatedAt'>,
  utilisateur?: UtilisateurConnecte
): Promise<CentreFormation> {
  try {
    const maintenant = new Date().toISOString();
    const docId = String(nouveauCentre.id);
    const docRef = doc(db, NOM_COLLECTION, docId);

    const donneesSauvegarde: CentreFormation = {
      ...nouveauCentre,
      createdAt: maintenant,
      updatedAt: maintenant,
      createdBy: utilisateur?.email || 'admin',
      updatedBy: utilisateur?.email || 'admin',
      dataStatus: nouveauCentre.dataStatus || 'publie',
      isDeleted: false,
    };

    await setDoc(docRef, assainirPourFirestore(donneesSauvegarde));

    // Audit historique
    await enregistrerHistorique({
      action: 'AJOUT',
      centreId: docId,
      centreNom: donneesSauvegarde.nom,
      date: maintenant,
      utilisateur: {
        uid: utilisateur?.uid || 'admin',
        email: utilisateur?.email || null,
        nomAffiche: utilisateur?.nomAffiche || null,
      },
      details: `Création de la fiche de l'établissement "${donneesSauvegarde.nom}"`,
      nouvellesValeurs: donneesSauvegarde,
    });

    return donneesSauvegarde;
  } catch (erreur) {
    console.error("Erreur lors de l'ajout du centre :", erreur);
    throw new Error("Impossible d'enregistrer les modifications.");
  }
}

/**
 * Modifie les informations d'un établissement existant
 */
export async function modifierCentre(
  id: number | string,
  modifications: Partial<CentreFormation>,
  utilisateur?: UtilisateurConnecte
): Promise<void> {
  try {
    const maintenant = new Date().toISOString();
    const docRef = doc(db, NOM_COLLECTION, String(id));

    // Récupérer l'état actuel pour l'historique
    const snapActuel = await getDoc(docRef);
    const anciennesValeurs = snapActuel.exists() ? (snapActuel.data() as CentreFormation) : undefined;

    const champsMiseAJour = assainirPourFirestore({
      ...modifications,
      updatedAt: maintenant,
      updatedBy: utilisateur?.email || 'admin',
    });

    delete champsMiseAJour.id;

    await updateDoc(docRef, champsMiseAJour);

    // Audit historique
    await enregistrerHistorique({
      action: 'MODIFICATION',
      centreId: id,
      centreNom: modifications.nom || anciennesValeurs?.nom || 'Établissement',
      date: maintenant,
      utilisateur: {
        uid: utilisateur?.uid || 'admin',
        email: utilisateur?.email || null,
        nomAffiche: utilisateur?.nomAffiche || null,
      },
      details: `Mise à jour des informations de l'établissement`,
      anciennesValeurs,
      nouvellesValeurs: { ...anciennesValeurs, ...champsMiseAJour },
    });
  } catch (erreur) {
    console.error('Erreur lors de la modification du centre :', erreur);
    throw new Error("Impossible d'enregistrer les modifications.");
  }
}

/**
 * Modifie la position géographique d'un établissement (déplacement de marqueur)
 */
export async function deplacerCentre(
  id: number | string,
  latitude: number,
  longitude: number,
  utilisateur?: UtilisateurConnecte
): Promise<void> {
  try {
    const maintenant = new Date().toISOString();
    const docRef = doc(db, NOM_COLLECTION, String(id));

    const snapActuel = await getDoc(docRef);
    const anciennesValeurs = snapActuel.exists() ? (snapActuel.data() as CentreFormation) : undefined;

    await updateDoc(docRef, {
      latitude: Number(latitude),
      longitude: Number(longitude),
      updatedAt: maintenant,
      updatedBy: utilisateur?.email || 'admin',
    });

    // Audit historique
    await enregistrerHistorique({
      action: 'DEPLACEMENT',
      centreId: id,
      centreNom: anciennesValeurs?.nom || 'Établissement',
      date: maintenant,
      utilisateur: {
        uid: utilisateur?.uid || 'admin',
        email: utilisateur?.email || null,
        nomAffiche: utilisateur?.nomAffiche || null,
      },
      details: `Repositionnement géographique : ${latitude.toFixed(5)}° N, ${longitude.toFixed(5)}° O`,
      anciennesValeurs: anciennesValeurs
        ? { latitude: anciennesValeurs.latitude, longitude: anciennesValeurs.longitude }
        : undefined,
      nouvellesValeurs: { latitude: Number(latitude), longitude: Number(longitude) },
    });
  } catch (erreur) {
    console.error('Erreur lors du déplacement du centre :', erreur);
    throw new Error("Impossible d'enregistrer les modifications.");
  }
}

export const modifierPosition = deplacerCentre;

/**
 * Suppression logique (envoi dans la Corbeille)
 */
export async function supprimerCentre(
  id: number | string,
  utilisateur?: UtilisateurConnecte,
  centreNom?: string
): Promise<void> {
  try {
    const maintenant = new Date().toISOString();
    const docRef = doc(db, NOM_COLLECTION, String(id));

    const snapActuel = await getDoc(docRef);
    const anciennesValeurs = snapActuel.exists() ? (snapActuel.data() as CentreFormation) : undefined;

    await updateDoc(docRef, {
      isDeleted: true,
      deletedAt: maintenant,
      deletedBy: utilisateur?.email || 'admin',
      updatedAt: maintenant,
    });

    await enregistrerHistorique({
      action: 'SUPPRESSION',
      centreId: id,
      centreNom: centreNom || anciennesValeurs?.nom || 'Établissement',
      date: maintenant,
      utilisateur: {
        uid: utilisateur?.uid || 'admin',
        email: utilisateur?.email || null,
        nomAffiche: utilisateur?.nomAffiche || null,
      },
      details: `Envoi de l'établissement à la corbeille`,
      anciennesValeurs,
    });
  } catch (erreur) {
    console.error('Erreur lors de la suppression du centre :', erreur);
    throw new Error("Impossible d'enregistrer les modifications.");
  }
}

/**
 * Restauration d'un établissement depuis la Corbeille
 */
export async function restaurerCentre(
  id: number | string,
  utilisateur?: UtilisateurConnecte,
  centreNom?: string
): Promise<void> {
  try {
    const maintenant = new Date().toISOString();
    const docRef = doc(db, NOM_COLLECTION, String(id));

    await updateDoc(docRef, {
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      updatedAt: maintenant,
      updatedBy: utilisateur?.email || 'admin',
    });

    await enregistrerHistorique({
      action: 'RESTAURATION',
      centreId: id,
      centreNom: centreNom || 'Établissement',
      date: maintenant,
      utilisateur: {
        uid: utilisateur?.uid || 'admin',
        email: utilisateur?.email || null,
        nomAffiche: utilisateur?.nomAffiche || null,
      },
      details: `Restauration de l'établissement depuis la corbeille`,
    });
  } catch (err) {
    console.error('Erreur restauration centre:', err);
    throw new Error('Impossible de restaurer cet établissement.');
  }
}

/**
 * Suppression définitive irréversible d'un établissement
 */
export async function supprimerCentreDefinitif(
  id: number | string,
  centreNom?: string,
  utilisateur?: UtilisateurConnecte
): Promise<void> {
  try {
    const docRef = doc(db, NOM_COLLECTION, String(id));
    await deleteDoc(docRef);

    await enregistrerHistorique({
      action: 'SUPPRESSION',
      centreId: id,
      centreNom: centreNom || 'Établissement',
      date: new Date().toISOString(),
      utilisateur: {
        uid: utilisateur?.uid || 'admin',
        email: utilisateur?.email || null,
        nomAffiche: utilisateur?.nomAffiche || null,
      },
      details: `Suppression définitive irréversible de l'établissement`,
    });
  } catch (err) {
    console.error('Erreur suppression définitive:', err);
    throw new Error("Impossible de supprimer définitivement l'établissement.");
  }
}

/**
 * Modification groupée en masse de plusieurs établissements
 */
export async function modifierCentresEnMasse(
  ids: (number | string)[],
  modifications: Partial<CentreFormation>,
  utilisateur?: UtilisateurConnecte
): Promise<number> {
  if (ids.length === 0) return 0;

  try {
    const maintenant = new Date().toISOString();
    const champsMiseAJour = assainirPourFirestore({
      ...modifications,
      updatedAt: maintenant,
      updatedBy: utilisateur?.email || 'admin',
    });
    delete champsMiseAJour.id;

    const tailleLot = 250;
    let totalModifies = 0;

    for (let i = 0; i < ids.length; i += tailleLot) {
      const lotIds = ids.slice(i, i + tailleLot);
      const batch = writeBatch(db);

      for (const id of lotIds) {
        const docRef = doc(db, NOM_COLLECTION, String(id));
        batch.update(docRef, champsMiseAJour);
        totalModifies++;
      }

      await batch.commit();
    }

    await enregistrerHistorique({
      action: 'MODIFICATION_MASSE',
      centreId: 'multiples',
      centreNom: `${ids.length} établissements`,
      date: maintenant,
      utilisateur: {
        uid: utilisateur?.uid || 'admin',
        email: utilisateur?.email || null,
        nomAffiche: utilisateur?.nomAffiche || null,
      },
      details: `Modification en masse de ${ids.length} établissements (${Object.keys(modifications).join(', ')})`,
      nouvellesValeurs: modifications,
    });

    return totalModifies;
  } catch (err) {
    console.error('Erreur modification en masse:', err);
    throw new Error('Impossible de réaliser la modification en masse.');
  }
}

/**
 * Mapping par défaut : tente de reconnaître intelligemment les champs usuels d'un SIG
 */
export function genererMappingAutomatique(champsSource: string[]): MappingChamps {
  const normaliseChamps = champsSource.map((c) => ({
    original: c,
    nettoye: c.toLowerCase().trim().replace(/[-_\s]/g, ''),
  }));

  const trouverCorrespondance = (candidats: string[]): string => {
    for (const cand of candidats) {
      const candNet = cand.toLowerCase().replace(/[-_\s]/g, '');
      const match = normaliseChamps.find((c) => c.nettoye === candNet || c.nettoye.includes(candNet));
      if (match) return match.original;
    }
    return '';
  };

  return {
    id: trouverCorrespondance(['id', 'fid', 'identifiant', 'code', 'objectid']),
    nom: trouverCorrespondance(['nom', 'name', 'nom_centre', 'etablissement', 'denomination']),
    nom_officiel: trouverCorrespondance(['nom_officiel', 'official_name', 'nomofficiel', 'sigle']),
    type: trouverCorrespondance(['type', 'statut_juridique', 'secteur']),
    statut: trouverCorrespondance(['statut', 'homologation', 'etat', 'regime']),
    commune: trouverCorrespondance(['commune', 'ville', 'localite', 'zone', 'dept', 'departement']),
    adresse: trouverCorrespondance(['adresse', 'address', 'localisation', 'quartier']),
    telephone: trouverCorrespondance(['telephone', 'tel', 'phone', 'contact', 'mobile']),
    email: trouverCorrespondance(['email', 'mail', 'courriel']),
    site_web: trouverCorrespondance(['site_web', 'siteweb', 'web', 'url', 'website']),
    formation: trouverCorrespondance(['formation', 'formations', 'type_formation', 'niveau']),
    filiere: trouverCorrespondance(['filiere', 'filieres', 'specialite', 'domaine']),
    diplomes: trouverCorrespondance(['diplomes', 'diplome', 'certificats']),
    date_creation: trouverCorrespondance(['date_creation', 'annee', 'creation', 'date_ouv']),
    description: trouverCorrespondance(['description', 'presentation', 'obs', 'remarques']),
    capacite: trouverCorrespondance(['capacite', 'effectif', 'nb_eleves', 'places']),
    photo: trouverCorrespondance(['photo', 'image', 'url_photo', 'logo']),
    source: trouverCorrespondance(['source', 'origine', 'enquete']),
  };
}

/**
 * Analyse approfondie du fichier GeoJSON avant import :
 * détection de géométrie, propriétés, contrôles qualité et doublons potentiels
 */
export function analyserGeoJSON(
  featureCollection: FeatureCollectionCentres,
  mapping: MappingChamps,
  centresExistants: CentreFormation[]
): {
  entites: EntiteGeoJSONAnalysee[];
  resume: {
    total: number;
    valides: number;
    alertes: number;
    erreurs: number;
    doublons: number;
    champsDetectes: string[];
    geometriesPonctuelles: number;
    autresGeometries: number;
  };
} {
  const entites: EntiteGeoJSONAnalysee[] = [];
  const champsDetectesSet = new Set<string>();
  let valides = 0;
  let alertes = 0;
  let erreurs = 0;
  let doublons = 0;
  let geometriesPonctuelles = 0;
  let autresGeometries = 0;

  // Index des centres existants pour recherche rapide de doublons
  const mapIdsExistants = new Map<string, CentreFormation>();
  const mapNomsExistants = new Map<string, CentreFormation>();
  centresExistants.forEach((c) => {
    mapIdsExistants.set(String(c.id).trim().toLowerCase(), c);
    mapNomsExistants.set(normaliserTexte(c.nom), c);
    if (c.nom_officiel) {
      mapNomsExistants.set(normaliserTexte(c.nom_officiel), c);
    }
  });

  const nomsDansFichier = new Map<string, number>();

  featureCollection.features.forEach((feature, index) => {
    const props = feature.properties || {};
    Object.keys(props).forEach((k) => champsDetectesSet.add(k));

    let lat: number | null = null;
    let lng: number | null = null;

    if (feature.geometry && feature.geometry.type === 'Point' && Array.isArray(feature.geometry.coordinates)) {
      geometriesPonctuelles++;
      lng = Number(feature.geometry.coordinates[0]);
      lat = Number(feature.geometry.coordinates[1]);
    } else if (feature.geometry) {
      autresGeometries++;
    }

    // Extraction des champs selon le mapping
    const getVal = (champCible: keyof MappingChamps): any => {
      const cleSource = mapping[champCible];
      if (cleSource && props[cleSource] !== undefined && props[cleSource] !== null) {
        return props[cleSource];
      }
      return props[champCible];
    };

    const idBrut = getVal('id') !== undefined ? getVal('id') : (feature as any).id;
    const idPropose = idBrut !== undefined && idBrut !== null ? idBrut : `SIG_${index + 1}_${Date.now().toString(36)}`;
    const nom = String(getVal('nom') || '').trim();
    const nomOfficiel = getVal('nom_officiel') ? String(getVal('nom_officiel')).trim() : '';
    const commune = String(getVal('commune') || '').trim();
    const type = String(getVal('type') || '').trim();
    const statut = String(getVal('statut') || '').trim();
    const formation = String(getVal('formation') || '').trim();
    const filiere = String(getVal('filiere') || '').trim();
    const telephone = String(getVal('telephone') || '').trim();
    const email = String(getVal('email') || '').trim();
    const siteWeb = String(getVal('site_web') || '').trim();
    const diplomes = String(getVal('diplomes') || '').trim();
    const dateCreation = String(getVal('date_creation') || '').trim();
    const description = String(getVal('description') || '').trim();
    const capacite = getVal('capacite') ? Number(getVal('capacite')) : undefined;
    const photo = String(getVal('photo') || '').trim();
    const source = String(getVal('source') || '').trim();

    const anomalies: string[] = [];
    let aErreur = false;
    let aAlerte = false;

    // 1. Contrôles obligatoires (Erreurs blocantes)
    if (!nom) {
      anomalies.push('✕ Nom du centre non renseigné');
      aErreur = true;
    }

    if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
      anomalies.push('✕ Coordonnées géographiques absentes ou invalides');
      aErreur = true;
    } else {
      // Vérification limites GPS WGS84
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        anomalies.push(`✕ Coordonnées hors limites WGS84 : [${lat}, ${lng}]`);
        aErreur = true;
      }
      // Avertissement si en dehors de la région de Dakar (environ 14.5 à 15.0 N et -17.7 à -17.0 O)
      if (lat < 14.0 || lat > 15.5 || lng < -18.0 || lng > -16.5) {
        anomalies.push(`⚠ Coordonnées situées en dehors du périmètre habituel de Dakar [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
        aAlerte = true;
      }
    }

    // 2. Contrôles Qualité (Avertissements informatifs)
    if (!commune) {
      anomalies.push('⚠ Commune non renseignée');
      aAlerte = true;
    }
    if (!telephone) {
      anomalies.push('⚠ Téléphone non renseigné');
      aAlerte = true;
    }
    if (email && !email.includes('@')) {
      anomalies.push(`⚠ Format email potentiellement invalide : "${email}"`);
      aAlerte = true;
    }
    if (!formation) {
      anomalies.push('⚠ Type de formation non renseigné');
      aAlerte = true;
    }
    if (!filiere) {
      anomalies.push('⚠ Filière non renseignée');
      aAlerte = true;
    }
    if (!source) {
      anomalies.push('⚠ Source de données non renseignée');
      aAlerte = true;
    }

    // 3. Détection des Doublons potentiels
    let doublonPotentiel: EntiteGeoJSONAnalysee['doublonPotentiel'] = undefined;
    const nomNorm = normaliserTexte(nom);

    // Doublon avec Firestore
    if (mapIdsExistants.has(String(idPropose).trim().toLowerCase())) {
      const match = mapIdsExistants.get(String(idPropose).trim().toLowerCase())!;
      doublonPotentiel = {
        id: match.id,
        nom: match.nom,
        commune: match.commune,
        sourceExistante: 'firestore',
      };
      anomalies.push(`⚠ Doublon potentiel avec l'établissement existant (ID ${match.id} : "${match.nom}")`);
      aAlerte = true;
      doublons++;
    } else if (nomNorm && mapNomsExistants.has(nomNorm)) {
      const match = mapNomsExistants.get(nomNorm)!;
      doublonPotentiel = {
        id: match.id,
        nom: match.nom,
        commune: match.commune,
        sourceExistante: 'firestore',
      };
      anomalies.push(`⚠ Nom identique à un établissement existant (ID ${match.id} : "${match.nom}")`);
      aAlerte = true;
      doublons++;
    } else if (nomNorm && nomsDansFichier.has(nomNorm)) {
      // Doublon interne au fichier
      const premierIndex = nomsDansFichier.get(nomNorm)!;
      doublonPotentiel = {
        id: `Ligne ${premierIndex + 1}`,
        nom,
        commune,
        sourceExistante: 'fichier',
      };
      anomalies.push(`⚠ Doublon interne au fichier (déjà présent à la ligne ${premierIndex + 1})`);
      aAlerte = true;
      doublons++;
    }

    if (nomNorm && !nomsDansFichier.has(nomNorm)) {
      nomsDansFichier.set(nomNorm, index);
    }

    // Détermination de l'état
    let etat: 'valide' | 'attention' | 'erreur' = 'valide';
    if (aErreur) {
      etat = 'erreur';
      erreurs++;
    } else if (aAlerte) {
      etat = 'attention';
      alertes++;
    } else {
      valides++;
    }

    const donneesMappees: Partial<CentreFormation> = {
      id: idPropose,
      nom,
      nom_officiel: nomOfficiel || undefined,
      type: type || undefined,
      statut: statut || undefined,
      commune: commune || undefined,
      telephone: telephone || undefined,
      email: email || undefined,
      site_web: siteWeb || undefined,
      formation: formation || undefined,
      filiere: filiere || undefined,
      diplomes: diplomes || undefined,
      date_creation: dateCreation || undefined,
      description: description || undefined,
      capacite: !isNaN(capacite as any) ? capacite : undefined,
      photo: photo || undefined,
      source: source || undefined,
      latitude: lat || 0,
      longitude: lng || 0,
    };

    entites.push({
      index,
      idPropose,
      nom,
      commune,
      type,
      statut,
      formation,
      filiere,
      latitude: lat,
      longitude: lng,
      etat,
      anomalies,
      doublonPotentiel,
      donneesMappees,
      proprietesBrutes: props,
    });
  });

  return {
    entites,
    resume: {
      total: featureCollection.features.length,
      valides,
      alertes,
      erreurs,
      doublons,
      champsDetectes: Array.from(champsDetectesSet).sort((a, b) => a.localeCompare(b, 'fr')),
      geometriesPonctuelles,
      autresGeometries,
    },
  };
}

/**
 * Importation par lot avec gestion de progression en temps réel
 */
export async function importerLotEntites(
  entitesAImporter: EntiteGeoJSONAnalysee[],
  options: {
    modeEcrasement: boolean;
    ignorerDoublons: boolean;
    utilisateur?: UtilisateurConnecte;
    onProgression?: (actuel: number, total: number, trancheTexte?: string) => void;
  }
): Promise<RapportImportation> {
  const debut = Date.now();
  let totalImportes = 0;
  let totalNouveaux = 0;
  let totalMisAJour = 0;
  let totalIgnores = 0;
  let totalDoublons = 0;
  let totalErreurs = 0;

  const maintenant = new Date().toISOString();
  // Lot de 50 pour affichage précis (1-50, 51-100, 101-150, 151-190...)
  const tailleLot = 50;

  for (let i = 0; i < entitesAImporter.length; i += tailleLot) {
    const tranche = entitesAImporter.slice(i, i + tailleLot);
    const debutTranche = i + 1;
    const finTranche = Math.min(i + tranche.length, entitesAImporter.length);
    const trancheTexte = `${debutTranche}–${finTranche} / ${entitesAImporter.length}`;

    const batch = writeBatch(db);
    let ecritures = 0;

    for (const item of tranche) {
      if (item.etat === 'erreur' || item.latitude === null || item.longitude === null) {
        totalErreurs++;
        continue;
      }

      if (item.doublonPotentiel) {
        totalDoublons++;
        if (options.ignorerDoublons && !options.modeEcrasement) {
          totalIgnores++;
          continue;
        }
      }

      const donneesCentre: Record<string, any> = {
        ...item.donneesMappees,
        latitude: Number(item.latitude),
        longitude: Number(item.longitude),
        createdAt: maintenant,
        updatedAt: maintenant,
        createdBy: options.utilisateur?.email || 'admin',
        updatedBy: options.utilisateur?.email || 'admin',
        isDeleted: false,
        dataStatus: 'publie',
      };

      const docRef = doc(db, NOM_COLLECTION, String(item.idPropose));
      batch.set(docRef, assainirPourFirestore(donneesCentre), { merge: options.modeEcrasement });
      ecritures++;
      totalImportes++;

      if (item.doublonPotentiel && options.modeEcrasement) {
        totalMisAJour++;
      } else {
        totalNouveaux++;
      }
    }

    if (ecritures > 0) {
      try {
        await batch.commit();
      } catch (err: any) {
        const codeErreur = err?.code || 'inconnu';
        const msgErreur = err?.message || 'Erreur inconnue';
        const currentUser = auth.currentUser;
        let explication = `Échec de l'écriture du lot (${trancheTexte}) dans Firestore.`;

        if (codeErreur === 'permission-denied') {
          explication += ` [permission-denied] Droits Firestore insuffisants. L'écriture dans la collection '${NOM_COLLECTION}' requiert une authentification administrateur. (Statut: ${currentUser ? `Connecté avec ${currentUser.email}` : 'Non connecté'}).`;
        } else if (codeErreur === 'unavailable') {
          explication += ` [unavailable] Le service Firestore est temporairement inaccessible.`;
        } else {
          explication += ` [Code: ${codeErreur}] ${msgErreur}`;
        }

        const erreurDiagnostique = new Error(explication);
        (erreurDiagnostique as any).code = codeErreur;
        (erreurDiagnostique as any).firebaseOriginal = err;
        throw erreurDiagnostique;
      }
    }

    if (options.onProgression) {
      options.onProgression(finTranche, entitesAImporter.length, trancheTexte);
    }
  }

  // Enregistrement de l'événement dans l'historique d'audit
  try {
    await enregistrerHistorique({
      action: 'IMPORT',
      centreId: 'import_lot',
      centreNom: `${totalImportes} établissements importés`,
      date: maintenant,
      utilisateur: {
        uid: options.utilisateur?.uid || auth.currentUser?.uid || 'admin',
        email: options.utilisateur?.email || auth.currentUser?.email || null,
        nomAffiche: options.utilisateur?.nomAffiche || auth.currentUser?.displayName || null,
      },
      details: `Importation SIG par lot : ${totalImportes} importés (${totalNouveaux} créés, ${totalMisAJour} mis à jour), ${totalIgnores} ignorés, ${totalDoublons} doublons signalés`,
    });
  } catch (errHistorique) {
    console.warn("Avertissement : L'historique d'audit n'a pas pu être enregistré:", errHistorique);
  }

  const dureeSecondes = Math.round((Date.now() - debut) / 1000);

  return {
    totalAnalyse: entitesAImporter.length,
    totalImportes,
    totalNouveaux,
    totalMisAJour,
    totalIgnores,
    totalDoublons,
    totalErreurs,
    dureeSecondes,
  };
}

/**
 * Vérifie la connectivité et les permissions Firestore sans créer de document permanent
 */
export async function testerConnexionFirestore(): Promise<{
  accessible: boolean;
  message: string;
  codeErreur?: string;
  details: {
    authentifie: boolean;
    uid?: string;
    email?: string | null;
    collection: string;
    lecturePossible: boolean;
    ecritureAutorisee: boolean;
  };
}> {
  try {
    const user = auth.currentUser;
    const testQuery = query(collection(db, NOM_COLLECTION), limit(1));
    await getDocs(testQuery);

    const email = (user?.email || '').toLowerCase().trim();
    const estEditeur = Boolean(
      user &&
        ['lynourou12@gmail.com', 'geomatquecedt@gmail.com', 'invite@fptdakar.sn', 'invite.fptdakar@gmail.com'].includes(email)
    );
    return {
      accessible: true,
      message: estEditeur
        ? 'Connexion Firestore accessible. Compte d’édition authentifié et autorisé.'
        : user
        ? `Connecté en tant que ${user.email} (lecture seule).`
        : 'Connexion Firestore accessible en lecture publique.',
      details: {
        authentifie: Boolean(user),
        uid: user?.uid,
        email: user?.email,
        collection: NOM_COLLECTION,
        lecturePossible: true,
        ecritureAutorisee: estEditeur,
      },
    };
  } catch (err: any) {
    const code = err?.code || 'erreur-connexion';
    const msg = err?.message || 'Erreur lors du contact avec Firestore';
    return {
      accessible: false,
      message: `Firestore inaccessible [${code}] : ${msg}`,
      codeErreur: code,
      details: {
        authentifie: Boolean(auth.currentUser),
        uid: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        collection: NOM_COLLECTION,
        lecturePossible: false,
        ecritureAutorisee: false,
      },
    };
  }
}

/**
 * Importation GeoJSON basique pour rétrocompatibilité
 */
export async function importerGeoJSON(
  contenuGeoJSON: FeatureCollectionCentres | string,
  modeEcrasement = false
): Promise<{
  totalTraites: number;
  totalAjoutes: number;
  totalIgnores: number;
  totalErreurs: number;
}> {
  const collectionGeoJSON: FeatureCollectionCentres =
    typeof contenuGeoJSON === 'string' ? JSON.parse(contenuGeoJSON) : contenuGeoJSON;

  const centresExistants = await obtenirLesCentres({ inclureSupprimes: true });
  const mappingDefaut = genererMappingAutomatique(
    Object.keys(collectionGeoJSON.features[0]?.properties || {})
  );
  const analyse = analyserGeoJSON(collectionGeoJSON, mappingDefaut, centresExistants);

  const rapport = await importerLotEntites(analyse.entites, {
    modeEcrasement,
    ignorerDoublons: !modeEcrasement,
  });

  return {
    totalTraites: rapport.totalAnalyse,
    totalAjoutes: rapport.totalImportes,
    totalIgnores: rapport.totalIgnores,
    totalErreurs: rapport.totalErreurs,
  };
}

/**
 * Tente de charger le fichier GeoJSON officiel depuis /data/centres.geojson s'il existe
 */
export async function verifierEtChargerGeoJSONPublic(): Promise<FeatureCollectionCentres | null> {
  try {
    const reponse = await fetch('/data/centres.geojson');
    if (!reponse.ok) {
      return null;
    }
    const contenu = await reponse.json();
    if (contenu && contenu.type === 'FeatureCollection' && Array.isArray(contenu.features)) {
      return contenu as FeatureCollectionCentres;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Normalise une chaîne pour une recherche insensible à la casse et aux accents
 */
export function normaliserTexte(texte?: string): string {
  if (!texte) return '';
  return String(texte)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Recherche textuelle rapide dans les champs prescrits :
 * nom, nom_officiel, commune, formation, filiere, diplomes
 */
export function rechercherCentres(terme: string, centres: CentreFormation[]): CentreFormation[] {
  const termeNormalise = normaliserTexte(terme.trim());
  if (!termeNormalise) return centres;

  return centres.filter((c) => {
    const nom = normaliserTexte(c.nom);
    const nomOfficiel = normaliserTexte(c.nom_officiel);
    const commune = normaliserTexte(c.commune);
    const formation = normaliserTexte(c.formation);
    const filiere = normaliserTexte(c.filiere);
    const diplomes = normaliserTexte(c.diplomes);

    return (
      nom.includes(termeNormalise) ||
      nomOfficiel.includes(termeNormalise) ||
      commune.includes(termeNormalise) ||
      formation.includes(termeNormalise) ||
      filiere.includes(termeNormalise) ||
      diplomes.includes(termeNormalise)
    );
  });
}

/**
 * Filtrage multicritère simultané basé exclusivement sur les données existantes
 */
export function filtrerCentres(filtres: FiltresCentres, centres: CentreFormation[]): CentreFormation[] {
  let resultats = centres;

  // Recherche textuelle
  if (filtres.recherche && filtres.recherche.trim() !== '') {
    resultats = rechercherCentres(filtres.recherche, resultats);
  }

  // Commune
  if (filtres.commune && filtres.commune !== 'Toutes') {
    resultats = resultats.filter(
      (c) => c.commune && normaliserTexte(c.commune) === normaliserTexte(filtres.commune)
    );
  }

  // Type
  if (filtres.typeFormation && filtres.typeFormation !== 'Tous') {
    resultats = resultats.filter(
      (c) => c.type && normaliserTexte(c.type) === normaliserTexte(filtres.typeFormation)
    );
  }

  // Statut
  if (filtres.statut && filtres.statut !== 'Tous') {
    resultats = resultats.filter(
      (c) => c.statut && normaliserTexte(c.statut) === normaliserTexte(filtres.statut)
    );
  }

  // Filière
  if (filtres.filiere && filtres.filiere !== 'Toutes') {
    resultats = resultats.filter(
      (c) => c.filiere && normaliserTexte(c.filiere).includes(normaliserTexte(filtres.filiere))
    );
  }

  // Diplôme
  if (filtres.diplome && filtres.diplome !== 'Tous') {
    resultats = resultats.filter(
      (c) => c.diplomes && normaliserTexte(c.diplomes).includes(normaliserTexte(filtres.diplome))
    );
  }

  // Formation
  if (filtres.formation && filtres.formation !== 'Toutes') {
    resultats = resultats.filter(
      (c) => c.formation && normaliserTexte(c.formation).includes(normaliserTexte(filtres.formation!))
    );
  }

  return resultats;
}

/**
 * Calcul automatique des statistiques sans aucun chiffre codé en dur
 */
export function calculerStatistiques(centres: CentreFormation[]): StatistiquesCentres {
  const communesSet = new Set<string>();
  const formationsSet = new Set<string>();
  const filieresSet = new Set<string>();
  let totalPublics = 0;
  let totalPrives = 0;

  centres.forEach((c) => {
    if (c.commune && c.commune.trim()) {
      communesSet.add(c.commune.trim());
    }
    if (c.formation && c.formation.trim()) {
      formationsSet.add(c.formation.trim());
    }
    if (c.filiere && c.filiere.trim()) {
      c.filiere.split(',').forEach((f) => {
        const nettoye = f.trim();
        if (nettoye) filieresSet.add(nettoye);
      });
    }

    const statutOuType = normaliserTexte(`${c.statut || ''} ${c.type || ''}`);
    if (statutOuType.includes('public')) {
      totalPublics++;
    } else if (statutOuType.includes('prive')) {
      totalPrives++;
    }
  });

  return {
    totalCentres: centres.length,
    totalPublics,
    totalPrives,
    totalCommunes: communesSet.size,
    totalFormations: formationsSet.size,
    totalFilieres: filieresSet.size,
  };
}

/**
 * Extrait les valeurs de filtres uniques UNIQUEMENT à partir des données présentes dans la base
 */
export function obtenirOptionsFiltres(centres: CentreFormation[]) {
  const communes = Array.from(
    new Set(centres.map((c) => c.commune?.trim()).filter((c): c is string => Boolean(c)))
  ).sort((a, b) => a.localeCompare(b, 'fr'));

  const types = Array.from(
    new Set(centres.map((c) => c.type?.trim()).filter((t): t is string => Boolean(t)))
  ).sort((a, b) => a.localeCompare(b, 'fr'));

  const statuts = Array.from(
    new Set(centres.map((c) => c.statut?.trim()).filter((s): s is string => Boolean(s)))
  ).sort((a, b) => a.localeCompare(b, 'fr'));

  const formations = Array.from(
    new Set(centres.map((c) => c.formation?.trim()).filter((f): f is string => Boolean(f)))
  ).sort((a, b) => a.localeCompare(b, 'fr'));

  const filieresSet = new Set<string>();
  centres.forEach((c) => {
    if (c.filiere) {
      c.filiere.split(',').forEach((f) => {
        const item = f.trim();
        if (item) filieresSet.add(item);
      });
    }
  });
  const filieres = Array.from(filieresSet).sort((a, b) => a.localeCompare(b, 'fr'));

  const diplomesSet = new Set<string>();
  centres.forEach((c) => {
    if (c.diplomes) {
      c.diplomes.split(',').forEach((d) => {
        const item = d.trim();
        if (item) diplomesSet.add(item);
      });
    }
  });
  const diplomes = Array.from(diplomesSet).sort((a, b) => a.localeCompare(b, 'fr'));

  return { communes, types, statuts, formations, filieres, diplomes };
}

/**
 * Calcul des indicateurs de Contrôle Qualité des Données (Section 36)
 * Calculé exclusivement à partir des données réelles de Firestore
 */
export function calculerQualiteDonnees(centres: CentreFormation[]): IndicateurQualite[] {
  const total = centres.length;
  if (total === 0) return [];

  const checkManquants = (
    predicate: (c: CentreFormation) => boolean
  ): { renseignes: number; manquants: number; ids: (string | number)[] } => {
    const manquantsList: (string | number)[] = [];
    centres.forEach((c) => {
      if (!predicate(c)) {
        manquantsList.push(c.id);
      }
    });
    return {
      renseignes: total - manquantsList.length,
      manquants: manquantsList.length,
      ids: manquantsList,
    };
  };

  const coordStats = checkManquants(
    (c) =>
      typeof c.latitude === 'number' &&
      typeof c.longitude === 'number' &&
      !isNaN(c.latitude) &&
      !isNaN(c.longitude) &&
      c.latitude !== 0 &&
      c.longitude !== 0
  );

  const telStats = checkManquants((c) => Boolean(c.telephone && c.telephone.trim() !== ''));
  const emailStats = checkManquants((c) => Boolean(c.email && c.email.trim() !== ''));
  const webStats = checkManquants((c) => Boolean(c.site_web && c.site_web.trim() !== ''));
  const communeStats = checkManquants((c) => Boolean(c.commune && c.commune.trim() !== ''));
  const formationStats = checkManquants((c) => Boolean(c.formation && c.formation.trim() !== ''));
  const filiereStats = checkManquants((c) => Boolean(c.filiere && c.filiere.trim() !== ''));
  const sourceStats = checkManquants((c) => Boolean(c.source && c.source.trim() !== ''));

  return [
    {
      cle: 'coordonnees',
      label: 'Coordonnées GPS',
      description: 'Latitude et longitude WGS84 renseignées',
      totalRenseignes: coordStats.renseignes,
      totalManquants: coordStats.manquants,
      pourcentage: Math.round((coordStats.renseignes / total) * 100),
      centresManquantsIds: coordStats.ids,
    },
    {
      cle: 'telephone',
      label: 'Téléphone',
      description: 'Numéro de contact téléphonique',
      totalRenseignes: telStats.renseignes,
      totalManquants: telStats.manquants,
      pourcentage: Math.round((telStats.renseignes / total) * 100),
      centresManquantsIds: telStats.ids,
    },
    {
      cle: 'email',
      label: 'Courriel',
      description: 'Adresse email officielle',
      totalRenseignes: emailStats.renseignes,
      totalManquants: emailStats.manquants,
      pourcentage: Math.round((emailStats.renseignes / total) * 100),
      centresManquantsIds: emailStats.ids,
    },
    {
      cle: 'site_web',
      label: 'Site Web',
      description: 'Lien vers le site officiel',
      totalRenseignes: webStats.renseignes,
      totalManquants: webStats.manquants,
      pourcentage: Math.round((webStats.renseignes / total) * 100),
      centresManquantsIds: webStats.ids,
    },
    {
      cle: 'commune',
      label: 'Commune',
      description: 'Rattachement administratif communal',
      totalRenseignes: communeStats.renseignes,
      totalManquants: communeStats.manquants,
      pourcentage: Math.round((communeStats.renseignes / total) * 100),
      centresManquantsIds: communeStats.ids,
    },
    {
      cle: 'formation',
      label: 'Formation',
      description: 'Types de formations dispensées',
      totalRenseignes: formationStats.renseignes,
      totalManquants: formationStats.manquants,
      pourcentage: Math.round((formationStats.renseignes / total) * 100),
      centresManquantsIds: formationStats.ids,
    },
    {
      cle: 'filiere',
      label: 'Filière',
      description: 'Filières et spécialités techniques',
      totalRenseignes: filiereStats.renseignes,
      totalManquants: filiereStats.manquants,
      pourcentage: Math.round((filiereStats.renseignes / total) * 100),
      centresManquantsIds: filiereStats.ids,
    },
    {
      cle: 'source',
      label: 'Source de la donnée',
      description: 'Origine certifiée (ANSD, ONFP, AMIE-FPT, terrain...)',
      totalRenseignes: sourceStats.renseignes,
      totalManquants: sourceStats.manquants,
      pourcentage: Math.round((sourceStats.renseignes / total) * 100),
      centresManquantsIds: sourceStats.ids,
    },
  ];
}

/**
 * Exportation des établissements en FeatureCollection GeoJSON standard (Section 9)
 */
export function exporterVersGeoJSON(centres: CentreFormation[]): string {
  const collectionGeoJSON: FeatureCollectionCentres = {
    type: 'FeatureCollection',
    name: 'fpt_dakar_export',
    features: centres.map((centre) => {
      const props: Record<string, any> = { ...centre };
      delete props.latitude;
      delete props.longitude;

      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [Number(centre.longitude), Number(centre.latitude)],
        },
        properties: props,
      };
    }),
  };

  return JSON.stringify(collectionGeoJSON, null, 2);
}

/**
 * Exportation des établissements en format CSV (Section 9)
 */
export function exporterVersCSV(centres: CentreFormation[]): string {
  const colonnes: (keyof CentreFormation)[] = [
    'id',
    'nom',
    'nom_officiel',
    'type',
    'statut',
    'commune',
    'adresse',
    'telephone',
    'email',
    'site_web',
    'formation',
    'filiere',
    'diplomes',
    'date_creation',
    'description',
    'capacite',
    'source',
    'latitude',
    'longitude',
    'createdAt',
    'updatedAt',
  ];

  const echapperCSV = (val: any): string => {
    if (val === undefined || val === null) return '';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const ligneEnTete = colonnes.join(';');
  const lignesDonnees = centres.map((c) =>
    colonnes.map((col) => echapperCSV(c[col])).join(';')
  );

  return [ligneEnTete, ...lignesDonnees].join('\r\n');
}

/**
 * Déclenche le téléchargement du fichier généré dans le navigateur
 */
export function telechargerFichier(
  contenu: string,
  nomFichier: string,
  typeMime: string
): void {
  const blob = new Blob([contenu], { type: typeMime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomFichier;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Sauvegarde la date de la dernière exportation
 */
export function enregistrerDateDernierExport(): void {
  try {
    localStorage.setItem(CLE_STOCKAGE_DERNIER_EXPORT, new Date().toISOString());
  } catch {
    // Silencieux si localStorage inaccessible
  }
}

/**
 * Récupère la date de la dernière exportation
 */
export function obtenirDateDernierExport(): string | null {
  try {
    return localStorage.getItem(CLE_STOCKAGE_DERNIER_EXPORT);
  } catch {
    return null;
  }
}
