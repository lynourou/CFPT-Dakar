import { CentreFormation } from '../types';

/**
 * Base de données locale vide par défaut.
 * Conformément à la RÈGLE ABSOLUE FPT DAKAR (CEDT Le G15) :
 * AUCUNE DONNÉE FICTIVE N'EST UTILISÉE.
 * Les 190 établissements réels proviennent exclusivement de la base SIG officielle
 * (GeoPackage CENTRES_FORMATION_V2.gpkg / GeoJSON) et sont synchronisés via Firebase Firestore.
 */
export const CENTRES_FORMATION_INITIAL: CentreFormation[] = [];
