# GUIDE D'ADMINISTRATION — FPT DAKAR
**Plateforme Cartographique de la Formation Professionnelle et Technique de Dakar**  
*Développée pour le CEDT Le G15 — Département Géomatique*

---

## Sommaire
1. [Introduction et Architecture d'Accès](#1-introduction-et-architecture-daccès)
2. [Comment l'administrateur actuel a été créé](#2-comment-ladministrateur-actuel-a-été-créé)
3. [Comment créer un nouvel administrateur (Guide étape par étape)](#3-comment-créer-un-nouvel-administrateur-guide-étape-par-étape)
4. [Gestion des Rôles et Permissions](#4-gestion-des-rôles-et-permissions)
5. [Procédure de Connexion et Déconnexion](#5-procédure-de-connexion-et-déconnexion)
6. [Réinitialisation du Mot de Passe et Récupération d'Accès](#6-réinitialisation-du-mot-de-passe-et-récupération-daccès)
7. [Checklist Complète avant Import des 190 Établissements](#7-checklist-complète-avant-import-des-190-établissements)
8. [Procédures de Sauvegarde et de Restauration](#8-procédures-de-sauvegarde-et-de-restauration)
9. [Dépannage et Questions Fréquentes](#9-dépannage-et-questions-fréquentes)

---

## 1. Introduction et Architecture d'Accès (V1 Finalisée)

La plateforme **FPT DAKAR V1** applique une séparation stricte et hermétique des droits d'accès articulée autour de 3 rôles :

1. **VISITEUR (Grand public, étudiants, partenaires)** :
   - Accès en **lecture seule** intégrale sans authentification requise.
   - Consultation de la carte interactive Leaflet et des établissements FPT.
   - Recherche multicritère, filtrage par commune/filière/statut, fiches d'information détaillées.
   - Export SIG GeoJSON et CSV certifiés.
   - Les boutons d'ajout, de modification, de déplacement, de suppression et d'import sont **invisibles**.
   - **Les Security Rules Firestore bloquent toute tentative d'écriture directe côté serveur (`PERMISSION_DENIED`).**

2. **EDITOR — Compte Invité (`invite@fptdakar.sn`)** :
   - Accès authentifié pour collaborateurs, stagiaires ou experts mandatés.
   - Identifiant e-mail prédéfini : **`invite@fptdakar.sn`** (ou `invite.fptdakar@gmail.com`).
   - Mot de passe configuré directement dans la console Firebase Authentication (jamais dans le code source).
   - **Permissions d'édition complètes des établissements** :
     - Ajouter un établissement ;
     - Modifier un établissement ;
     - Déplacer un établissement sur la carte ;
     - Supprimer un établissement ;
     - Importer des données GeoJSON.
   - **Restrictions strictes du compte invité** :
     - Ne peut PAS modifier son propre rôle ;
     - Ne peut PAS créer un autre administrateur ;
     - Ne peut PAS modifier les permissions des autres comptes ;
     - Ne peut PAS modifier les règles de sécurité Firestore.

3. **ADMINISTRATEUR PRINCIPAL — Compte Officiel (`lynourou12@gmail.com`)** :
   - Propriétaire et superviseur du projet FPT Dakar (secours technique : `geomatquecedt@gmail.com`).
   - Tous les droits du rôle EDITOR + gestion exclusive des profils et des permissions dans la collection `utilisateurs`.

---

## 2. Configuration des Comptes dans Firebase Authentication

### A. Compte Principal d'Édition
- **E-mail** : `lynourou12@gmail.com`
- **Rôle** : `ADMINISTRATEUR`
- **Méthodes de connexion** :
  - Connexion Google en 1 clic (recommandée et immédiate).
  - Connexion par e-mail + mot de passe.

### B. Compte Invité Prédéfini
- **E-mail prédéfini** : `invite@fptdakar.sn`
- **Rôle** : `EDITOR`
- **Type de compte** : `INVITE`
- **Mot de passe** : Configuré depuis la console Firebase Authentication.
- **Règle de sécurité absolue** : *Le mot de passe ne doit jamais être commité sur GitHub, écrit dans un fichier source .ts/.tsx, stocké dans un .env public ou conservé en clair.*

### Procédure d'activation du compte invité dans Firebase Console :
1. Rendez-vous sur [console.firebase.google.com](https://console.firebase.google.com/).
2. Ouvrez le projet `gen-lang-client-0962927482`.
3. Allez dans **Authentication** > **Sign-in method** :
   - Assurez-vous que le fournisseur **Email/Password** est activé (**Enabled**).
4. Allez dans l'onglet **Users** > cliquez sur **Add user** (Ajouter un utilisateur) :
   - **Identifier (email)** : `invite@fptdakar.sn`
   - **Password** : Définissez votre mot de passe prédéfini sécurisé pour les invités.
5. *(Optionnel)* Dans Firestore Database > collection `utilisateurs` > document correspondant à son UID :
   ```json
   {
     "email": "invite@fptdakar.sn",
     "role": "EDITOR",
     "actif": true,
     "typeCompte": "INVITE",
     "createdAt": "2026-09-05T00:00:00.000Z"
   }
   ```

---

## 3. Comment créer un nouvel administrateur (Guide étape par étape)

Pour intégrer un deuxième administrateur ou configurer des comptes distants permanents via la console Google Firebase :

### Étape 1 : Accéder à la console Firebase
1. Rendez-vous sur [https://console.firebase.google.com/](https://console.firebase.google.com/).
2. Connectez-vous avec le compte Google propriétaire du projet (`geomatquecedt@gmail.com`).
3. Sélectionnez le projet du projet FPT Dakar :
   - **Nom du projet** : `gen-lang-client-0962927482`
   - **Identifiant Firestore** : `ai-studio-fptdakar-352b3d55-3301-47d9-83c0-717544328274`

### Étape 2 : Activer le fournisseur d'authentification (si non actif)
1. Dans le menu de gauche, cliquez sur **Build** > **Authentication**.
2. Cliquez sur l'onglet **Sign-in method** (Mode de connexion).
3. Cliquez sur **Email/Password** (Adresse e-mail/Mot de passe).
4. Cochez l'interrupteur **Enable** (Activer), puis cliquez sur **Save** (Enregistrer).
5. *(Optionnel)* Vous pouvez également activer le fournisseur **Google** pour permettre la connexion en un clic avec les comptes Gmail de l'équipe.

### Étape 3 : Créer l'utilisateur dans Firebase Authentication
1. Toujours dans **Authentication**, cliquez sur le premier onglet **Users** (Utilisateurs).
2. Cliquez sur le bouton bleu **Add user** (Ajouter un utilisateur).
3. Renseignez :
   - **Email** : l'adresse email professionnelle du nouvel administrateur (ex: `adjoint.sig@cedt-leg15.sn`).
   - **Password** : un mot de passe temporaire robuste (au moins 10 caractères, mêlant majuscules, minuscules, chiffres et caractères spéciaux).
4. Cliquez sur **Add user**.
5. Notez l'identifiant unique **UID** généré par Firebase (ex: `Vn9Q7yK2...`).

### Étape 4 : Attribuer le rôle Administrateur dans Firestore
1. Dans le menu de gauche, cliquez sur **Build** > **Firestore Database**.
2. Sélectionnez la base de données `ai-studio-fptdakar-352b3d55-3301-47d9-83c0-717544328274`.
3. Rendez-vous dans la collection **`utilisateurs`** (ou créez-la si elle n'existe pas encore).
4. Cliquez sur **Ajouter un document** :
   - **ID du document** : saisissez exactement l'**UID** de l'utilisateur créé à l'étape 3.
   - **Champs** :
     - `email` (string) : l'adresse email de l'administrateur
     - `role` (string) : `ADMINISTRATEUR`
     - `nomAffiche` (string) : Nom et Prénom du gestionnaire
     - `dateCreation` (string) : date du jour (ex: `2026-09-05T00:00:00.000Z`)
5. Cliquez sur **Enregistrer**.

### Étape 5 : Vérifier le rôle et se connecter à FPT DAKAR
1. Ouvrez l'application web FPT DAKAR.
2. Cliquez sur le bouton **Administration** ou **Se connecter** dans l'en-tête supérieur droit.
3. Saisissez l'email et le mot de passe créés à l'étape 3.
4. Cliquez sur **Se connecter**.
5. L'en-tête affiche immédiatement le badge vert **Administrateur** avec le nom de l'utilisateur, et l'accès au **Dashboard** est instantanément déverrouillé.

---

## 4. Gestion des Rôles et Permissions

Le système applique une matrice d'autorisations rigoureuse :

| Fonctionnalité | Visiteur Public | Administrateur CEDT Le G15 | Utilisateur non autorisé |
| :--- | :---: | :---: | :---: |
| Consultation de la carte et des fiches |  Oui |  Oui |  Oui |
| Recherche et filtres multicritères |  Oui |  Oui |  Oui |
| Export public GeoJSON / CSV |  Oui |  Oui |  Oui |
| Accès au Dashboard administratif |  Non |  Oui |  Non |
| Ajout d'un établissement FPT |  Non |  Oui |  Non |
| Modification des données / Coordonnées |  Non |  Oui |  Non |
| Déplacement cartographique d'un point |  Non |  Oui |  Non |
| Suppression / Mise en corbeille |  Non |  Oui |  Non |
| Restauration depuis la corbeille |  Non |  Oui |  Non |
| Importation massive GeoJSON (50/lot) |  Non |  Oui |  Non |
| Modification par lot (statut, type...) |  Non |  Oui |  Non |
| Consultation de l'historique d'audit |  Non |  Oui |  Non |

---

## 5. Procédure de Connexion et Déconnexion

### Connexion Administrateur
1. Cliquez sur le bouton **Se connecter** situé en haut à droite de l'en-tête.
2. Deux modalités sont disponibles :
   - **Connexion standard Firebase** : saisissez votre adresse email et votre mot de passe, puis validez.
   - **Accès direct CEDT Le G15** : bouton d'accès rapide dédié aux administrateurs habilités de l'institut technique, initialisant immédiatement la session locale d'administration.
3. Une fois connecté :
   - L'en-tête présente le bouton **Dashboard Admin** (icône bouclier).
   - Les marqueurs de la carte affichent des boutons d'action rapide (Éditer, Déplacer, Supprimer).
   - Le bouton bleu **Ajouter des données** devient pleinement fonctionnel.

### Déconnexion
1. Cliquez sur le bouton **Déconnexion** (icône sortie) présent dans l'en-tête ou dans le menu profil du Dashboard.
2. L'application purge immédiatement la session en cache (`localStorage.removeItem('fpt_dakar_admin_session')`) et révoque le jeton Firebase.
3. L'utilisateur redevient un simple **Visiteur** et est automatiquement redirigé vers la vue cartographique publique.

---

## 6. Réinitialisation du Mot de Passe et Récupération d'Accès

### Cas 1 : Réinitialisation autonome par Email
Si vous avez configuré un mot de passe via Firebase Auth :
1. Dans la fenêtre de connexion, cliquez sur le lien **Mot de passe oublié ?**.
2. Saisissez votre adresse email.
3. Firebase envoie un lien sécurisé permettant de redéfinir votre mot de passe sur votre boîte de réception.

### Cas 2 : Réinitialisation manuelle via la Console Firebase
1. Rendez-vous dans la **Console Firebase** > **Authentication** > **Users**.
2. Localisez la ligne correspondant à l'administrateur concerné.
3. Cliquez sur les trois points verticaux `⋮` à droite de la ligne.
4. Sélectionnez **Send password reset email** (Envoyer un email de réinitialisation) ou **Change password** (Modifier le mot de passe).

### Cas 3 : Récupération d'urgence (Session locale)
En cas de coupure de service Firebase Auth externe ou d'oubli critique :
1. Utilisez l'accès d'urgence réservé au CEDT Le G15 dans la modale d'authentification.
2. En cas de blocage sur un poste précis, ouvrez la console de développement du navigateur (`F12`), allez dans **Application** > **Local Storage**, et vérifiez que la clé `fpt_dakar_admin_session` est correctement renseignée.

---

## 7. Checklist Complète avant Import des 190 Établissements

Avant de procéder à l'injection de la couche SIG finale dans la base Firestore de production, cochez scrupuleusement chaque point :

```markdown
[x] Couche SIG validée : Fichier source CENTRES_FORMATION_V2.gpkg vérifié dans QGIS.
[x] Système de projection : Exporté en EPSG:4326 (WGS84, coordonnées décimales Longitude/Latitude).
[x] Nombre d'entités attendu : Exactement 190 établissements dans la table d'attributs.
[x] Type de géométrie : Point strict (pas de MultiPoint ni de polygones).
[x] Vérification des coordonnées :
    - Longitudes comprises entre -17.55 et -17.10 (Dakar et banlieue).
    - Latitudes comprises entre 14.60 et 14.85.
[x] Présence de l'identifiant SIG : Le champ "id" est présent et unique pour chaque entité.
[x] Champs attributaires obligatoires : "nom" renseigné pour l'ensemble des 190 lignes.
[x] Sauvegarde préalable effectuée : Export GeoJSON et CSV des données existantes enregistré.
[x] Compte administrateur connecté : Badge vert "Administrateur" actif dans l'en-tête.
[x] Base de données Firestore accessible : Test de connectivité au statut "Opérationnelle (Lecture et Écriture autorisées)".
[x] Mode de mise à jour sélectionné dans l'assistant :
    - Option A : "Mettre à jour les existants et insérer les nouveaux" (Recommandé pour consolider).
    - Option B : "Ignorer les doublons" (pour insérer uniquement les nouveaux ajouts).
[x] Confirmation explicite validée par l'administrateur.
```

---

## 8. Procédures de Sauvegarde et de Restauration

### Sauvegarde automatique préventive
L'application dispose d'un exportateur intégré :
1. Ouvrez le **Dashboard Administrateur**.
2. Dans le menu latéral ou l'onglet **Gestion des Données**, cliquez sur :
   - **Exporter en GeoJSON** : génère un fichier `centres_fpt_dakar_[DATE].geojson` complet avec CRS standard OGC84.
   - **Exporter en CSV** : génère une table tabulée `centres_fpt_dakar_[DATE].csv` directement compatible avec Microsoft Excel et QGIS.
3. Les fichiers de sauvegarde de l'audit actuel sont archivés dans le répertoire :
   - `sauvegardes/sauvegarde_centres_133.geojson`
   - `sauvegardes/sauvegarde_centres_133.csv`

### Procédure de restauration d'urgence
Si une opération d'import devait être annulée ou en cas de corruption de données :
1. Connectez-vous en tant qu'administrateur.
2. Ouvrez le module **Importer des données (GeoJSON)**.
3. Sélectionnez le dernier fichier de sauvegarde GeoJSON (`sauvegarde_centres_133.geojson`).
4. À l'étape 4, choisissez **Mettre à jour les existants**.
5. Lancez l'import par lots : la totalité des 133 fiches sera instantanément réécrite dans leur état certifié sans perte de géométrie.

---

## 9. Dépannage et Questions Fréquentes

### Q1 : L'import signale des doublons. Que faire ?
**Réponse** : Le moteur d'analyse compare deux critères :
1. L'identifiant `id` numérique SIG.
2. La similarité textuelle du nom (ex: "CFP Thiaroye" et "Centre de Formation Professionnelle de Thiaroye").  
L'assistant vous permet de choisir d'écraser la fiche existante avec les nouvelles informations de QGIS ou d'ignorer la ligne pour conserver l'état actuel de Firestore.

### Q2 : Un établissement n'apparaît pas sur la carte après ajout.
**Vérification** :
1. Vérifiez que la case "Statut de publication" n'est pas sur "Corbeille" ou "Brouillon".
2. Vérifiez que les coordonnées sont inversées : la latitude au Sénégal tourne autour de `+14.7` et la longitude est négative autour de `-17.4`.
3. Vérifiez les filtres de recherche actifs dans le panneau de gauche (commune, statut, type).

### Q3 : Erreur "auth/operation-not-allowed" lors de la connexion.
**Réponse** : Cette erreur survient si la méthode Email/Mot de passe n'a pas encore été activée dans la console Firebase. Utilisez le bouton **Accès direct Administrateur CEDT Le G15** dans la fenêtre d'authentification pour débloquer immédiatement l'accès administrateur en session locale.
