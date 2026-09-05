/**
 * Structure de données pour un établissement de Formation Professionnelle et Technique (FPT)
 * Conforme aux spécifications du projet FPT DAKAR (CEDT Le G15, base QGIS CENTRES_FORMATION_V2.gpkg).
 */
export interface CentreFormation {
  id: number | string;
  nom: string;
  nom_officiel?: string;
  type?: string;
  statut?: string;
  commune?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  site_web?: string;
  formation?: string;
  filiere?: string;
  diplomes?: string;
  date_creation?: string;
  description?: string;
  capacite?: number;
  photo?: string;
  source?: string;
  latitude: number;
  longitude: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  dataStatus?: 'publie' | 'brouillon' | 'a_verifier' | 'archive';
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

/**
 * Entrée d'audit dans la collection Firestore "historique"
 */
export interface EntreeHistorique {
  id: string;
  action:
    | 'AJOUT'
    | 'MODIFICATION'
    | 'DEPLACEMENT'
    | 'SUPPRESSION'
    | 'IMPORT'
    | 'RESTAURATION'
    | 'MODIFICATION_MASSE';
  centreId: string | number;
  centreNom: string;
  date: string;
  utilisateur: {
    uid: string;
    email: string | null;
    nomAffiche?: string | null;
  };
  details?: string;
  anciennesValeurs?: Partial<CentreFormation>;
  nouvellesValeurs?: Partial<CentreFormation>;
}

/**
 * Indicateur de contrôle qualité des données
 */
export interface IndicateurQualite {
  cle: string;
  label: string;
  description: string;
  totalRenseignes: number;
  totalManquants: number;
  pourcentage: number;
  centresManquantsIds: (string | number)[];
}

/**
 * Configuration du mapping de champs GeoJSON vers champs Firestore
 */
export interface MappingChamps {
  id: string;
  nom: string;
  nom_officiel: string;
  type: string;
  statut: string;
  commune: string;
  adresse: string;
  telephone: string;
  email: string;
  site_web: string;
  formation: string;
  filiere: string;
  diplomes: string;
  date_creation: string;
  description: string;
  capacite: string;
  photo: string;
  source: string;
}

/**
 * Entité GeoJSON analysée lors de la prévisualisation avant import
 */
export interface EntiteGeoJSONAnalysee {
  index: number;
  idPropose: string | number;
  nom: string;
  commune: string;
  type: string;
  statut: string;
  formation: string;
  filiere: string;
  latitude: number | null;
  longitude: number | null;
  etat: 'valide' | 'attention' | 'erreur';
  anomalies: string[];
  doublonPotentiel?: {
    id: string | number;
    nom: string;
    commune?: string;
    sourceExistante: 'firestore' | 'fichier';
  };
  donneesMappees: Partial<CentreFormation>;
  proprietesBrutes: Record<string, any>;
}

/**
 * Résumé de l'opération d'importation par lot
 */
export interface RapportImportation {
  totalAnalyse: number;
  totalImportes: number;
  totalNouveaux?: number;
  totalMisAJour?: number;
  totalIgnores: number;
  totalDoublons: number;
  totalErreurs: number;
  dureeSecondes: number;
}

/**
 * Filtres disponibles pour la recherche multicritère
 */
export interface FiltresCentres {
  recherche: string;
  commune: string;
  typeFormation: string;
  filiere: string;
  diplome: string;
  statut: string;
  formation?: string;
}

/**
 * Statistiques calculées dynamiquement sur la base des centres disponibles
 */
export interface StatistiquesCentres {
  totalCentres: number;
  totalPublics: number;
  totalPrives: number;
  totalCommunes: number;
  totalFormations: number;
  totalFilieres: number;
}

/**
 * Rôles d'accès pour la plateforme V1 :
 * - VISITEUR : consultation en lecture seule
 * - EDITOR : droits d'édition des établissements FPT (compte invité)
 * - ADMINISTRATEUR : droits d'édition + administration (compte principal)
 */
export type RoleUtilisateur = 'VISITEUR' | 'EDITOR' | 'ADMINISTRATEUR';

export interface UtilisateurConnecte {
  uid: string;
  email: string | null;
  nomAffiche?: string | null;
  role: RoleUtilisateur;
  typeCompte?: 'PRINCIPAL' | 'INVITE' | 'STANDARD';
}

export interface ProfilUtilisateurFirestore {
  uid: string;
  email: string;
  role: RoleUtilisateur;
  actif: boolean;
  typeCompte: 'PRINCIPAL' | 'INVITE' | 'STANDARD';
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Format standard GeoJSON pour interopérabilité SIG (QGIS, GeoPackage)
 */
export interface FeatureGeoJSONCentre {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: Record<string, any>;
}

export interface FeatureCollectionCentres {
  type: 'FeatureCollection';
  name?: string;
  features: FeatureGeoJSONCentre[];
}
