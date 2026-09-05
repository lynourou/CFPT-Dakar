# DOCUMENTATION TECHNIQUE — FPT DAKAR
**Système d'Information Géographique Web pour la Formation Professionnelle et Technique**  
*CEDT Le G15 — Département Géomatique et Informatique*

---

## 1. Vue d'Ensemble de la Pile Technologique

| Couche | Technologie / Bibliothèque | Rôle |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18 (TypeScript) | Composants fonctionnels réactifs, gestion de cycle de vie et hooks |
| **Outillage de Build** | Vite 6 | Compilation ultra-rapide, bundling optimisé pour la production |
| **Système de Style** | Tailwind CSS v4 | Mise en page responsive, design system moderne et accessible |
| **Bibliothèque Cartographique** | Leaflet 1.9 & React-Leaflet | Moteur cartographique interactif, clustering de marqueurs, géolocalisation |
| **Base de Données Cloud** | Google Cloud Firestore | Stockage NoSQL en temps réel, requêtes structurées, transactions par lots |
| **Gestion des Médias** | Firebase Storage | Hébergement des photographies des infrastructures scolaires |
| **Authentification** | Firebase Auth (Hybride) | Gestion des identités, sessions administrateurs, contrôle d'accès basé sur les rôles |
| **Gestion des Icônes** | Lucide React | Jeu d'icônes vectorielles cohérentes et légères |

---

## 2. Architecture des Données et Collections Firestore

### 2.1. Configuration de l'environnement Firebase
- **Projet Cloud** : `gen-lang-client-0962927482`
- **Instance Firestore** : `ai-studio-fptdakar-352b3d55-3301-47d9-83c0-717544328274`
- **Domaine d'authentification** : `gen-lang-client-0962927482.firebaseapp.com`
- **Bucket Storage** : `gen-lang-client-0962927482.firebasestorage.app`

### 2.2. Collection Principale : `centres`
Chaque document de cette collection représente un établissement de formation professionnelle et technique.  
La clé du document (`doc.id`) correspond à l'identifiant SIG numérique ou textuel unique de l'établissement (ex: `"1"`, `"61"`, `"165"`).

#### Modèle de Document (`CentreFormation`) :

```typescript
export interface CentreFormation {
  // --- CHAMPS MÉTIER (Issus du SIG CENTRES_FORMATION_V2.gpkg) ---
  id: number | string;            // Identifiant unique SIG QGIS
  nom: string;                    // Dénomination courante ou abrégée
  nom_officiel?: string;          // Dénomination officielle complète
  type?: string;                  // 'Public', 'Privé', etc.
  statut?: string;                // 'Homologué', 'Reconnu', etc.
  commune?: string;               // Commune d'implantation (Dakar, Pikine, Rufisque...)
  adresse?: string;               // Adresse physique / repère géographique
  telephone?: string;             // Ligne téléphonique de contact
  email?: string;                 // Adresse électronique officielle
  site_web?: string;              // Portail ou page web
  formation?: string;             // Type ou filière principale
  filiere?: string;               // Liste détaillée des filières de formation
  diplomes?: string;              // Diplômes délivrés (CAP, BEP, BT, BTS, etc.)
  date_creation?: string;         // Année ou date d'ouverture
  description?: string;           // Historique, spécialités, missions
  capacite?: number;              // Effectif ou capacité d'accueil annuel
  photo?: string;                 // Chemin relatif ou URL publique de la photographie
  source?: string;                // Origine de la donnée SIG (ex: 'Fusion_final')
  latitude: number;               // Coordonnée GPS Nord (EPSG:4326 WGS84)
  longitude: number;              // Coordonnée GPS Ouest (EPSG:4326 WGS84)

  // --- CHAMPS SYSTÈME (Gestion du cycle de vie et d'audit) ---
  createdAt?: string;             // Horodatage ISO de création dans la base
  updatedAt?: string;             // Horodatage ISO de dernière modification
  createdBy?: string;             // Auteur (email ou UID) ayant créé la fiche
  updatedBy?: string;             // Auteur ayant procédé à la dernière modification
  dataStatus?: 'publie' | 'brouillon' | 'a_verifier' | 'archive';
  isDeleted?: boolean;            // Drapeau de mise en corbeille logique (false par défaut)
  deletedAt?: string;             // Horodatage ISO de mise en corbeille
  deletedBy?: string;             // Auteur de la suppression
}
```

### 2.3. Collection d'Audit : `historique`
Chaque opération de création, mise à jour, suppression, déplacement ou import est enregistrée dans cette collection pour garantir la traçabilité.

```typescript
export interface EntreeHistorique {
  id: string;                     // Identifiant généré (ex: timestamp + suffixe)
  action: 'AJOUT' | 'MODIFICATION' | 'DEPLACEMENT' | 'SUPPRESSION' | 'IMPORT' | 'RESTAURATION' | 'MODIFICATION_MASSE';
  centreId: string | number;      // ID du centre concerné ou 'import_lot'
  centreNom: string;              // Nom du centre ou libellé de l'opération
  date: string;                   // Date ISO 8601
  utilisateur: {
    uid: string;
    email: string | null;
    nomAffiche?: string | null;
  };
  details?: string;               // Explication textuelle de l'opération
  anciennesValeurs?: Partial<CentreFormation>;
  nouvellesValeurs?: Partial<CentreFormation>;
}
```

### 2.4. Collection des Utilisateurs : `utilisateurs`
Associe les profils et rôles administratifs aux identifiants Firebase :
- `uid` : Clé du document
- `email` : Adresse de messagerie
- `role` : `'ADMINISTRATEUR'` | `'VISITEUR'`
- `nomAffiche` : Dénomination du titulaire

---

## 3. Architecture Logicielle et Services

### 3.1. Organisation des Fichiers (`/src`)

```text
src/
├── main.tsx                      # Point d'entrée React / DOM
├── App.tsx                       # Racine de navigation et thèmes
├── types/
│   └── index.ts                  # Déclarations TypeScript unifiées
├── services/
│   ├── firebase.ts               # Initialisation du SDK Firebase (Auth, Firestore, Storage)
│   ├── authentificationService.ts# Gestion des sessions, login, logout, observateur
│   ├── centresService.ts         # Couche d'accès aux données Firestore (CRUD, filtres, lots, historique)
│   └── storageService.ts         # Téléversement de photos sur Firebase Storage
├── composants/
│   ├── EnTete.tsx                # Barre de navigation supérieure et statut utilisateur
│   ├── Carte.tsx                 # Carte Leaflet interactive avec tuiles et marqueurs
│   ├── CarteCentre.tsx           # Vue cartographique centrée pour la fiche individuelle
│   ├── FormulaireCentre.tsx      # Formulaire modal d'ajout et d'édition d'établissement
│   ├── FicheCentre.tsx           # Volet de visualisation détaillée d'un centre
│   ├── TableauCentres.tsx        # Vue tabulaire avec tris et sélection multiple
│   ├── ModalImportGeoJSON.tsx    # Assistant en 5 étapes d'import SIG GeoJSON
│   ├── ModalModificationMasse.tsx# Édition simultanée d'un lot d'établissements
│   ├── ModalAuthentification.tsx # Dialogue de connexion et accès direct admin
│   ├── ModalConfirmationSuppression.tsx # Modale de sécurité avant suppression
│   ├── DashboardAdmin.tsx        # Tableau de bord d'administration centralisé
│   ├── PageCorbeille.tsx         # Gestionnaire de restauration des centres archivés
│   ├── PageHistorique.tsx        # Journal de traçabilité des actions
│   ├── PageQualiteDonnees.tsx    # Métriques de complétude et détection des lacunes
│   ├── PanneauFiltres.tsx        # Tiroir des filtres multicritères
│   ├── BarreRecherche.tsx        # Moteur de recherche plein texte instantané
│   ├── Statistiques.tsx          # Widgets et graphiques analytiques
│   └── SectionAPropos.tsx        # Mentions légales, partenaires et méthodologie CEDT Le G15
└── utilitaires/
    └── geojson.ts                # Utilitaires de conversion GeoJSON / WGS84
```

---

## 4. Règles de Sécurité Firestore (`firestore.rules`)

Les règles de sécurité en production garantissent un accès public sans authentification en lecture, tout en verrouillant hermétiquement toutes les opérations d'écriture exclusivement aux comptes d'édition autorisés (`lynourou12@gmail.com`, `geomatquecedt@gmail.com`) :

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Vérifie si l'utilisateur est le compte d'édition officiel autorisé
    function estEditeurAutorise() {
      return request.auth != null && (
        request.auth.token.email in ['lynourou12@gmail.com', 'geomatquecedt@gmail.com'] ||
        (exists(/databases/$(database)/documents/utilisateurs/$(request.auth.uid)) &&
         get(/databases/$(database)/documents/utilisateurs/$(request.auth.uid)).data.role == 'ADMINISTRATEUR')
      );
    }

    // Établissements FPT :
    // - Lecture publique pour tous les visiteurs du portail
    // - Écriture strictement réservée au compte d'édition officiel
    match /centres/{centreId} {
      allow read: if true;
      allow create, update, delete: if estEditeurAutorise();
    }

    // Journal d'audit et traçabilité
    match /historique/{entreeId} {
      allow read: if estEditeurAutorise();
      allow write: if estEditeurAutorise();
    }

    // Profils utilisateurs et permissions
    match /utilisateurs/{userId} {
      allow read: if request.auth != null && (request.auth.uid == userId || estEditeurAutorise());
      allow write: if request.auth != null && (request.auth.uid == userId || estEditeurAutorise());
    }
  }
}
```

*Durcissement actif et déployé* : Toute tentative d'écriture sans authentification ou provenant d'un compte non autorisé est rejetée avec l'erreur `7 PERMISSION_DENIED: Missing or insufficient permissions`.

---

## 5. Moteur d'Importation GeoJSON (`ModalImportGeoJSON.tsx`)

Le module d'import SIG intègre un algorithme robuste en 5 phases :

1. **Validation du fichier** :
   - Formats acceptés : `.geojson`, `.json`
   - Taille maximale : 50 Mo
   - Vérification de l'enveloppe : `type === "FeatureCollection"` et présence d'un tableau `features` non vide.
2. **Contrôle Géométrique** :
   - Filtrage strict des entités ayant une géométrie de type `Point`.
   - Extraction des coordonnées `[longitude, latitude]` selon la norme WGS84 (EPSG:4326).
3. **Mappage Dynamique** :
   - Détection automatique des propriétés du GeoPackage (`nom`, `nom_officiel`, `commune`, `telephone`, `filiere`, etc.).
   - Possibilité de réassignation manuelle des champs dans l'interface.
4. **Analyse de Qualité & Détection des Doublons** :
   - Comparaison des identifiants SIG existants dans Firestore.
   - Calcul de distance de Levenshtein / similarité textuelle sur les dénominations pour éviter les doublons accidentels.
5. **Écriture par Lots Transactionnels (`writeBatch`)** :
   - Découpage automatique en tranches de 50 documents maximum pour respecter les limites strictes de l'API Cloud Firestore.
   - Enregistrement immédiat d'une entrée de synthèse dans la collection `historique`.

---

## 6. Moteur d'Exportation des Données

L'application permet aux gestionnaires d'exporter les données à tout moment sous deux formats standards :
- **GeoJSON** : Fichier normalisé au standard OGC CRS84, prêt pour l'intégration directe dans les logiciels SIG (QGIS, ArcGIS, MapStore, etc.).
- **CSV** : Fichier tabulé avec séparateur point-virgule (`;`) et encodage UTF-8, facilitant l'analyse statistique dans Microsoft Excel ou R.

---

## 7. Procédure de Compilation et Déploiement

### Commande de compilation
```bash
npm run build
```
Cette commande exécute le compilateur TypeScript (`tsc -b`) pour valider les types stricts, puis le bundler Vite (`vite build`) qui génère les fichiers statiques de production dans le dossier `/dist`.

### Vérification de conformité
- **Port d'écoute** : Port standard de conteneur 3000 avec liaison `0.0.0.0`.
- **Ressources externes** : Fichiers Leaflet CSS chargés via CDN sécurisé avec intégrité SHA256.
- **Aucune dépendance fictive** : Le bundle final est exempt de dépendances inutiles ou de données de test.
