# GUIDE D'UTILISATION — FPT DAKAR
**Système d'Information Géographique et d'Orientation Professionnelle**  
*Centre d'Entrepreneuriat et de Développement Technique (CEDT Le G15)*

---

## 1. Vue d'Ensemble de l'Application

La plateforme **FPT DAKAR** est une application web cartographique interactive conçue pour faciliter l'accès, l'orientation et la gestion des établissements de Formation Professionnelle et Technique de la région de Dakar.

Elle propose deux modes d'utilisation distincts :
1. **Mode Public (Visiteurs)** : accessible à tous, sans inscription.
2. **Mode Gestion (Administrateurs)** : réservé aux agents habilités du CEDT Le G15.

---

## 2. Guide du Visiteur

### 2.1. Naviguer sur la Carte Interactive
- **Fond de carte** : La carte utilise les tuiles OpenStreetMap avec rendu haute définition des communes de la presqu'île de Dakar et des départements limitrophes (Pikine, Guédiawaye, Keur Massar, Rufisque).
- **Zoom et Déplacement** : Utilisez la molette de la souris, les boutons `+` / `-` ou le pincement tactile sur smartphone.
- **Marqueurs de couleur** :
  - 🔵 **Bleu** : Établissement public d'enseignement professionnel et technique.
  - 🟣 **Violet** : Établissement privé homologué ou reconnu.
  - 🟢 **Vert** : Centre mixte ou parapublic.
- **Regroupement (Clusters)** : Lorsque plusieurs établissements sont proches à un niveau de zoom éloigné, un macaron numéroté regroupe les points. Cliquez dessus pour zoomer automatiquement sur la zone.

### 2.2. Rechercher un Établissement
- Dans la barre de recherche supérieure, tapez :
  - Le nom de l'établissement (ex: *CEDT Le G15*, *Delafosse*, *CFPT Sénégal-Japon*, *ISMI*) ;
  - Une filière ou un métier (ex: *Électromécanique*, *BTP*, *Couture*, *Hôtellerie*, *Agroalimentaire*) ;
  - Un diplôme recherché (ex: *CAP*, *BEP*, *BTS*, *BT*, *Licence professionnelle*).
- Les résultats se filtrent en temps réel sur la carte et dans la liste latérale.

### 2.3. Filtrer par Critères
Ouvrez le **Panneau des Filtres** (icône entonnoir) pour affiner la sélection :
- **Par Commune** : Dakar Plateau, Médina, Grand Dakar, Parcelles Assainies, Pikine, Rufisque, Sebikotane, Sangalkam, etc.
- **Par Type** : Public vs Privé.
- **Par Statut d'homologation** : Homologué, En cours, Reconnu.
- **Réinitialisation** : Un bouton permet de réinitialiser tous les filtres en un clic.

### 2.4. Consulter une Fiche Détaillée
- Cliquez sur un marqueur cartographique pour faire apparaître la bulle d'information rapide (nom, commune, téléphone, type).
- Cliquez sur **Consulter la fiche** pour ouvrir le panneau complet :
  - Nom officiel et sigle usuel ;
  - Adresse physique précise et indications de repérage ;
  - Contact téléphonique direct (cliquable sur mobile pour appeler) ;
  - Adresse email et site web officiel ;
  - Liste exhaustive des filières dispensées et des diplômes préparés ;
  - Capacité d'accueil et historique ;
  - Photographie de l'infrastructure (si disponible).

### 2.5. Partager une Fiche ou un Emplacement
- Dans la fiche d'un établissement, cliquez sur le bouton **Partager** (icône de partage).
- Le lien unique centré sur l'établissement est copié dans votre presse-papier pour envoi par WhatsApp, email ou réseaux sociaux.

---

## 3. Guide de l'Administrateur

Pour déverrouiller les fonctionnalités d'administration, cliquez sur **Se connecter** en haut à droite et validez vos identifiants d'administration.

### 3.1. Le Dashboard Administrateur
Accessible via le bouton **Dashboard** (icône bouclier) :
- **Statistiques synthétiques** : Nombre total d'établissements enregistrés, répartition Public / Privé, pourcentage de complétude des coordonnées et des fiches.
- **Menu d'actions rapides** :
  - Ajouter un établissement ;
  - Importer un fichier SIG GeoJSON ;
  - Ouvrir la corbeille ;
  - Consulter l'historique d'audit ;
  - Contrôle qualité des données ;
  - Export GeoJSON et CSV.

### 3.2. Ajouter un Nouvel Établissement
1. Cliquez sur le bouton bleu **Ajouter des données** > **Ajouter un établissement**.
2. Renseignez les champs du formulaire :
   - Informations d'identification (Nom, Nom officiel, Type, Statut) ;
   - Localisation (Commune, Adresse, Coordonnées géographiques) ;
   - Contacts (Téléphone, Email, Site Web) ;
   - Formations (Filières, Diplômes délivrés, Capacité).
3. **Pointage assisté sur la carte** :
   - Cliquez sur l'icône **Placer sur la carte** : la modale se réduit et vous permet de cliquer directement sur la carte à l'emplacement exact du centre pour capturer automatiquement sa Latitude et sa Longitude.
4. Cliquez sur **Enregistrer** : la fiche est immédiatement créée dans Firestore et projetée sur la carte sans rechargement.

### 3.3. Modifier les Informations d'un Établissement
1. Ouvrez la fiche de l'établissement ou cliquez sur l'icône **Édition** (crayon) sur la carte ou dans le tableau de données.
2. Ajustez les informations nécessaires.
3. Cliquez sur **Enregistrer les modifications**.
4. L'opération est automatiquement consignée dans le journal d'audit Firestore.

### 3.4. Déplacer un Établissement sur la Carte
1. Dans la bulle de l'établissement sur la carte, cliquez sur **Déplacer** (icône boussole / repère).
2. Le marqueur passe en mode actif avec un indicateur visuel.
3. Cliquez sur le nouvel emplacement exact sur la carte.
4. Une boîte de confirmation s'affiche avec les anciennes et les nouvelles coordonnées GPS.
5. Validez pour mettre à jour la position instantanément dans Firestore.

### 3.5. Supprimer et Mettre en Corbeille (Suppression Logique)
- Cliquez sur **Supprimer** (icône corbeille rouge) sur la fiche ou dans la liste.
- Confirmez la suppression dans la modale.
- **Sécurité anti-perte** : L'établissement n'est pas détruit définitivement, il reçoit le drapeau `isDeleted: true` et est déplacé dans la **Corbeille**.

### 3.6. Restaurer un Établissement depuis la Corbeille
1. Dans le Dashboard, cliquez sur l'onglet **Corbeille**.
2. Consultez la liste des établissements archivés avec la date et l'auteur de la suppression.
3. Cliquez sur **Restaurer** pour réactiver immédiatement le centre sur la carte publique.
4. *(Seul l'administrateur principal peut forcer une suppression physique définitive si nécessaire).*

### 3.7. Importation Massive de Données SIG (GeoJSON)
Pour injecter ou mettre à jour la base à partir d'un export QGIS :
1. Cliquez sur **Importer des données** > **Import GeoJSON**.
2. **Étape 1 : Sélection du fichier** :
   - Glissez-déposez votre fichier `.geojson` dans la zone prévue, **OU**
   - Cliquez sur le bouton **Sélectionner un fichier** pour choisir le fichier via l'explorateur de votre ordinateur.
3. **Étape 2 : Structure & Mapping** :
   - Le système vérifie la conformité (FeatureCollection, géométrie `Point`).
   - Associez chaque colonne QGIS (ex: `nom`, `filiere`, `commune`, `telephone`) au champ Firestore correspondant.
4. **Étape 3 : Contrôle Qualité & Doublons** :
   - Le moteur détecte les établissements déjà existants et vous propose soit de les mettre à jour, soit d'ignorer les doublons.
5. **Étape 4 : Confirmation** :
   - Vérifiez le résumé chiffré avant écriture.
6. **Étape 5 : Exécution par lots & Journal** :
   - L'import s'exécute par tranches sécurisées de 50 enregistrements avec affichage de la progression en direct.

### 3.8. Modification en Masse (Batch Edit)
1. Dans le **Tableau des Centres**, sélectionnez plusieurs établissements en cochant les cases à gauche.
2. Cliquez sur le bouton **Modifier la sélection**.
3. Choisissez le champ à harmoniser (ex: attribuer le statut *Homologué*, changer le type *Public*, ou réassigner la commune).
4. Validez : tous les documents sélectionnés sont mis à jour simultanément.

### 3.9. Contrôle Qualité des Données
1. Dans le Dashboard, rendez-vous sur l'onglet **Qualité des données**.
2. Visualisez les jauges de complétude :
   - Pourcentage d'établissements disposant d'un numéro de téléphone ;
   - Pourcentage avec adresse email ;
   - Pourcentage avec filières et diplômes détaillés ;
   - Pourcentage avec photographie.
3. Cliquez sur un indicateur pour filtrer instantanément la liste des établissements dont le champ est manquant, permettant ainsi une saisie ciblée des données manquantes.

### 3.10. Historique d'Audit et Traçabilité
1. Dans le Dashboard, ouvrez l'onglet **Historique**.
2. Chaque action est consignée avec précision :
   - **Date et heure exacte** ;
   - **Auteur de l'action** (email et identifiant) ;
   - **Type d'action** : AJOUT, MODIFICATION, DEPLACEMENT, SUPPRESSION, RESTAURATION, IMPORT ;
   - **Établissement concerné** ;
   - **Détails des modifications** (anciennes vs nouvelles valeurs).
