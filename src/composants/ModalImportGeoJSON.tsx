import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Upload,
  Database,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  Layers,
  RefreshCw,
  FileText,
  ArrowRight,
  ArrowLeft,
  Settings2,
  ShieldAlert,
  HelpCircle,
  AlertTriangle,
  Copy,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Activity,
  Check,
  Clock,
  Info,
} from 'lucide-react';
import {
  FeatureCollectionCentres,
  CentreFormation,
  MappingChamps,
  EntiteGeoJSONAnalysee,
  RapportImportation,
  UtilisateurConnecte,
} from '../types';
import {
  verifierEtChargerGeoJSONPublic,
  genererMappingAutomatique,
  analyserGeoJSON,
  importerLotEntites,
  obtenirLesCentres,
  testerConnexionFirestore,
} from '../services/centresService';

interface ModalImportGeoJSONProps {
  ouvert: boolean;
  utilisateur?: UtilisateurConnecte;
  surFermer: () => void;
  surImportReussi: () => void;
}

type EtapeImport = 1 | 2 | 3 | 4 | 5;

interface EntreeJournal {
  id: string;
  heure: string;
  texte: string;
  statut: 'succes' | 'erreur' | 'en_cours' | 'attente';
  detail?: string;
}

export const ModalImportGeoJSON: React.FC<ModalImportGeoJSONProps> = ({
  ouvert,
  utilisateur,
  surFermer,
  surImportReussi,
}) => {
  const [etape, setEtape] = useState<EtapeImport>(1);

  // Étape 1 : Fichier brut
  const [fichierGeoJSON, setFichierGeoJSON] = useState<FeatureCollectionCentres | null>(null);
  const [nomFichier, setNomFichier] = useState<string>('');
  const [tailleFichier, setTailleFichier] = useState<string>('');
  const [typeFichier, setTypeFichier] = useState<string>('');
  const [chargementFichier, setChargementFichier] = useState<boolean>(false);
  const [erreurFichier, setErreurFichier] = useState<string | null>(null);
  const [estEnSurvolDrag, setEstEnSurvolDrag] = useState<boolean>(false);

  // Journal d'importation en direct
  const [journalImport, setJournalImport] = useState<EntreeJournal[]>([]);

  // Structure détectée
  const [typesGeometriesDetectees, setTypesGeometriesDetectees] = useState<string>('');
  const [champsSourceDisponibles, setChampsSourceDisponibles] = useState<string[]>([]);

  // Test de connexion Firestore
  const [testEnCours, setTestEnCours] = useState<boolean>(false);
  const [resultatTestFirestore, setResultatTestFirestore] = useState<{
    accessible: boolean;
    message: string;
    codeErreur?: string;
    details?: any;
  } | null>(null);

  // Données Firestore existantes pour la détection de doublons
  const [centresExistants, setCentresExistants] = useState<CentreFormation[]>([]);

  // Étape 2 : Mapping
  const [mapping, setMapping] = useState<MappingChamps>({
    id: '',
    nom: '',
    nom_officiel: '',
    type: '',
    statut: '',
    commune: '',
    adresse: '',
    telephone: '',
    email: '',
    site_web: '',
    formation: '',
    filiere: '',
    diplomes: '',
    date_creation: '',
    description: '',
    capacite: '',
    photo: '',
    source: '',
  });

  // Étape 3 : Analyse
  const [entitesAnalyses, setEntitesAnalyses] = useState<EntiteGeoJSONAnalysee[]>([]);
  const [resumeAnalyse, setResumeAnalyse] = useState<{
    total: number;
    valides: number;
    alertes: number;
    erreurs: number;
    doublons: number;
    champsDetectes: string[];
    geometriesPonctuelles: number;
    autresGeometries: number;
  } | null>(null);
  const [filtreEtatApercu, setFiltreEtatApercu] = useState<'tous' | 'valide' | 'attention' | 'erreur' | 'doublons'>('tous');
  const [ligneOuverte, setLigneOuverte] = useState<number | null>(null);

  // Options d'import
  const [modeEcrasement, setModeEcrasement] = useState<boolean>(false);
  const [ignorerDoublons, setIgnorerDoublons] = useState<boolean>(true);

  // Étape 4 : Progression par lots
  const [progression, setProgression] = useState<{
    actuel: number;
    total: number;
    trancheTexte?: string;
    lotsHistorique: string[];
  }>({ actuel: 0, total: 0, trancheTexte: '', lotsHistorique: [] });

  // Étape 5 : Rapport
  const [rapportFinal, setRapportFinal] = useState<RapportImportation | null>(null);

  const inputFichierRef = useRef<HTMLInputElement>(null);

  // Ajouter une ligne horodatée au journal d'importation
  const ajouterAuJournal = (
    texte: string,
    statut: 'succes' | 'erreur' | 'en_cours' | 'attente',
    detail?: string
  ) => {
    const maintenant = new Date();
    const heure = maintenant.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setJournalImport((prev) => [
      ...prev,
      {
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        heure,
        texte,
        statut,
        detail,
      },
    ]);
  };

  // Formater la taille en Ko ou Mo
  const formaterTaille = (octets: number): string => {
    if (octets >= 1024 * 1024) {
      return `${(octets / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
    }
    return `${Math.round(octets / 1024)} Ko`;
  };

  // Réinitialiser complètement le formulaire
  const reinitialiserFormulaire = () => {
    setEtape(1);
    setFichierGeoJSON(null);
    setNomFichier('');
    setTailleFichier('');
    setTypeFichier('');
    setErreurFichier(null);
    setEntitesAnalyses([]);
    setResumeAnalyse(null);
    setRapportFinal(null);
    setProgression({ actuel: 0, total: 0, trancheTexte: '', lotsHistorique: [] });
    setJournalImport([]);
    setTypesGeometriesDetectees('');
    setChampsSourceDisponibles([]);
    if (inputFichierRef.current) {
      inputFichierRef.current.value = '';
    }
  };

  // Test de connectivité Firestore sans écriture permanente
  const executerTestFirestore = async () => {
    setTestEnCours(true);
    ajouterAuJournal('Vérification de la connectivité Firestore...', 'en_cours');
    try {
      const resultat = await testerConnexionFirestore();
      setResultatTestFirestore(resultat);
      if (resultat.accessible) {
        ajouterAuJournal('✓ Firestore accessible et prêt', 'succes', resultat.message);
      } else {
        ajouterAuJournal('❌ Firestore inaccessible', 'erreur', resultat.message);
      }
    } catch (err: any) {
      const msg = err?.message || 'Erreur inattendue';
      setResultatTestFirestore({
        accessible: false,
        message: msg,
        codeErreur: err?.code || 'erreur-inattendue',
      });
      ajouterAuJournal('❌ Erreur de test Firestore', 'erreur', msg);
    } finally {
      setTestEnCours(false);
    }
  };

  // Initialisation à l'ouverture
  useEffect(() => {
    if (!ouvert) {
      reinitialiserFormulaire();
      return;
    }

    // Charger les centres existants de Firestore pour doublons
    const chargerExistants = async () => {
      try {
        const existants = await obtenirLesCentres({ inclureSupprimes: true });
        setCentresExistants(existants);
      } catch (err) {
        console.warn('Impossible de charger les centres existants pour comparaison:', err);
      }
    };
    chargerExistants();

    // Tester d'emblée la connexion Firestore
    executerTestFirestore();
  }, [ouvert]);

  // Validation stricte du fichier
  const validerFichier = (fichier: File): string | null => {
    const nomMinuscule = fichier.name.toLowerCase();
    const aBonneExtension =
      nomMinuscule.endsWith('.geojson') || nomMinuscule.endsWith('.json');
    const aBonMime =
      fichier.type === 'application/geo+json' ||
      fichier.type === 'application/json' ||
      fichier.type === '';

    if (!aBonneExtension && !aBonMime) {
      return 'Format de fichier non pris en charge. Veuillez sélectionner un fichier .geojson ou .json.';
    }

    const TAILLE_MAX = 50 * 1024 * 1024; // 50 MB
    if (fichier.size > TAILLE_MAX) {
      return `Le fichier est trop volumineux (${formaterTaille(fichier.size)}). La taille maximale autorisée est de 50 MB.`;
    }

    return null;
  };

  // Traitement d'un fichier sélectionné via explorateur ou glisser-déposer
  const traiterFichier = (fichier: File) => {
    // 1. Réinitialiser l'état d'erreur et le journal pour ce nouveau fichier
    setErreurFichier(null);
    setChargementFichier(true);
    setJournalImport([]);

    ajouterAuJournal(`Fichier sélectionné : ${fichier.name}`, 'succes', `Taille : ${formaterTaille(fichier.size)}`);

    // 2. Valider l'extension et la taille
    const erreurValidation = validerFichier(fichier);
    if (erreurValidation) {
      setErreurFichier(erreurValidation);
      ajouterAuJournal('❌ Format de fichier non pris en charge', 'erreur', erreurValidation);
      setChargementFichier(false);
      return;
    }

    setNomFichier(fichier.name);
    setTailleFichier(formaterTaille(fichier.size));
    setTypeFichier(fichier.type || 'application/geo+json');

    // 3. Lire le fichier avec FileReader
    ajouterAuJournal('Lecture du fichier en cours...', 'en_cours');
    const lecteur = new FileReader();

    lecteur.onload = (e) => {
      try {
        const contenu = e.target?.result as string;
        ajouterAuJournal('Fichier lu avec succès', 'succes');

        // 4. Parser le JSON
        let parsed: any;
        try {
          parsed = JSON.parse(contenu);
        } catch (jsonErr: any) {
          throw new Error(`Le fichier sélectionné n'est pas un GeoJSON valide (syntaxe JSON incorrecte : ${jsonErr.message}).`);
        }

        // 5. Vérifier la conformité GeoJSON FeatureCollection
        if (!parsed || typeof parsed !== 'object') {
          throw new Error("Le fichier sélectionné n'est pas un GeoJSON valide (structure vide ou non-objet).");
        }

        if (parsed.type !== 'FeatureCollection') {
          throw new Error(`Le fichier sélectionné n'est pas un GeoJSON valide (type "${parsed.type || 'inconnu'}" détecté au lieu de "FeatureCollection").`);
        }

        if (!Array.isArray(parsed.features)) {
          throw new Error("Le fichier sélectionné n'est pas un GeoJSON valide (la propriété 'features' est manquante ou n'est pas un tableau).");
        }

        if (parsed.features.length === 0) {
          throw new Error("Le fichier GeoJSON ne contient aucune entité géographique (liste 'features' vide).");
        }

        ajouterAuJournal('GeoJSON valide (FeatureCollection)', 'succes');
        ajouterAuJournal(`${parsed.features.length} entités détectées`, 'succes');

        // 6. Détection de la géométrie et des champs
        const typesGeom = Array.from(
          new Set(
            parsed.features
              .map((f: any) => f.geometry?.type)
              .filter(Boolean)
          )
        );
        const texteGeom = typesGeom.length > 0 ? typesGeom.join(', ') : 'Point';
        setTypesGeometriesDetectees(texteGeom);
        ajouterAuJournal(`Géométries analysées (${texteGeom})`, 'succes');

        // Extraction des propriétés disponibles
        const tousChamps = new Set<string>();
        parsed.features.forEach((f: any) => {
          if (f.properties && typeof f.properties === 'object') {
            Object.keys(f.properties).forEach((k) => tousChamps.add(k));
          }
        });
        const champsArray = Array.from(tousChamps).sort((a, b) =>
          a.localeCompare(b, 'fr')
        );
        setChampsSourceDisponibles(champsArray);
        ajouterAuJournal(`Attributs analysés (${champsArray.length} champs disponibles)`, 'succes');

        // Préparation du mapping automatique
        const mappingGenere = genererMappingAutomatique(champsArray);
        setMapping(mappingGenere);

        setFichierGeoJSON(parsed as FeatureCollectionCentres);
        ajouterAuJournal('Prêt pour la configuration du mapping et le contrôle qualité', 'attente');
      } catch (err: any) {
        const msg = err?.message || 'Le fichier sélectionné n’est pas un GeoJSON valide.';
        setErreurFichier(msg);
        setFichierGeoJSON(null);
        ajouterAuJournal('❌ Lecture du fichier impossible ou GeoJSON invalide', 'erreur', msg);
      } finally {
        setChargementFichier(false);
      }
    };

    lecteur.onerror = () => {
      const msg = 'Erreur lors de la lecture du fichier sur le disque.';
      setErreurFichier(msg);
      ajouterAuJournal('❌ Lecture du fichier impossible', 'erreur', msg);
      setChargementFichier(false);
    };

    lecteur.readAsText(fichier);
  };

  const gererSelectionFichier = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      traiterFichier(e.target.files[0]);
    }
  };

  const gererGlisserDeposer = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setEstEnSurvolDrag(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      traiterFichier(e.dataTransfer.files[0]);
    }
  };

  // Passer à l'étape 3 : analyse selon le mapping choisi
  const passerAEtape3 = () => {
    if (!fichierGeoJSON) return;
    ajouterAuJournal('Analyse des entités et détection des anomalies...', 'en_cours');
    const resultat = analyserGeoJSON(fichierGeoJSON, mapping, centresExistants);
    setEntitesAnalyses(resultat.entites);
    setResumeAnalyse(resultat.resume);
    ajouterAuJournal(
      `Analyse terminée : ${resultat.resume.valides} valides, ${resultat.resume.alertes} alertes, ${resultat.resume.doublons} doublons, ${resultat.resume.erreurs} erreurs`,
      resultat.resume.erreurs > 0 ? 'erreur' : 'succes'
    );
    ajouterAuJournal('⏳ Prêt pour importation dans Firestore', 'attente');
    setEtape(3);
  };

  // Lancer l'importation par lot dans Firestore (Étape 4 -> Étape 5)
  const lancerImportation = async () => {
    if (entitesAnalyses.length === 0) return;
    setEtape(4);
    setProgression({
      actuel: 0,
      total: entitesAnalyses.length,
      trancheTexte: 'Initialisation des lots...',
      lotsHistorique: [],
    });
    ajouterAuJournal("Démarrage de l'importation par lots dans Firestore...", 'en_cours');

    try {
      const rapport = await importerLotEntites(entitesAnalyses, {
        modeEcrasement,
        ignorerDoublons,
        utilisateur,
        onProgression: (actuel, total, trancheTexte) => {
          setProgression((prev) => ({
            actuel,
            total,
            trancheTexte: trancheTexte || `${actuel} / ${total}`,
            lotsHistorique: trancheTexte
              ? [...new Set([...prev.lotsHistorique, trancheTexte])]
              : prev.lotsHistorique,
          }));
          if (trancheTexte) {
            ajouterAuJournal(`Lot traité : ${trancheTexte}`, 'succes');
          }
        },
      });

      setRapportFinal(rapport);
      ajouterAuJournal(
        `✓ Importation Firestore terminée : ${rapport.totalImportes} importés (${rapport.totalNouveaux || 0} créés, ${rapport.totalMisAJour || 0} mis à jour), ${rapport.totalIgnores} ignorés, ${rapport.totalDoublons} doublons, ${rapport.totalErreurs} erreurs`,
        'succes'
      );
      setEtape(5);
    } catch (err: any) {
      console.error('Erreur lors du traitement du lot:', err);
      const code = err?.code || 'erreur-firestore';
      const msg = err?.message || "Erreur lors de l'enregistrement dans Firestore.";
      setErreurFichier(`❌ Erreur Firestore [${code}] : ${msg}`);
      ajouterAuJournal('❌ Erreur Firestore', 'erreur', `Code : ${code} — ${msg}`);
      setEtape(3);
    }
  };

  // Entités filtrées pour l'étape 3
  const entitesFiltrees = useMemo(() => {
    if (filtreEtatApercu === 'valide') return entitesAnalyses.filter((e) => e.etat === 'valide');
    if (filtreEtatApercu === 'attention') return entitesAnalyses.filter((e) => e.etat === 'attention');
    if (filtreEtatApercu === 'erreur') return entitesAnalyses.filter((e) => e.etat === 'erreur');
    if (filtreEtatApercu === 'doublons') return entitesAnalyses.filter((e) => Boolean(e.doublonPotentiel));
    return entitesAnalyses;
  }, [entitesAnalyses, filtreEtatApercu]);

  // Prévisualisation des 6 premières lignes du fichier brut (pour Étape 1)
  const previsualisationBrute = useMemo(() => {
    if (!fichierGeoJSON || !fichierGeoJSON.features) return [];
    return fichierGeoJSON.features.slice(0, 8).map((f, i) => {
      const p = f.properties || {};
      const coords = f.geometry?.coordinates;
      return {
        id: i + 1,
        nom: p.nom || p.Nom || p.NOM || p.nom_centre || p.name || null,
        commune: p.commune || p.Commune || p.COMMUNE || null,
        type: p.type || p.Type || p.TYPE || p.statut_juridique || null,
        statut: p.statut || p.Statut || p.STATUT || null,
        formation: p.formation || p.Formation || p.type_formation || null,
        filiere: p.filiere || p.Filiere || p.filieres || null,
        latitude: Array.isArray(coords) && coords.length >= 2 ? coords[1] : null,
        longitude: Array.isArray(coords) && coords.length >= 2 ? coords[0] : null,
      };
    });
  }, [fichierGeoJSON]);

  if (!ouvert) return null;

  return (
    <div
      id="modal-import-geojson-wizard-overlay"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={() => etape !== 4 && surFermer()}
    >
      <div
        id="modal-import-geojson-contenu"
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative flex flex-col my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="bg-slate-900 text-white p-5 shrink-0">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">
                  Importer des données SIG GeoJSON
                </h3>
                <p className="text-xs text-slate-400">
                  Intégration certifiée des établissements QGIS vers Firebase Firestore
                </p>
              </div>
            </div>

            {etape !== 4 && (
              <button
                type="button"
                onClick={surFermer}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                title="Fermer la boîte de dialogue"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Stepper graphique */}
          <div className="grid grid-cols-5 gap-2 text-xs">
            {[
              { num: 1, label: '1. Fichier' },
              { num: 2, label: '2. Mapping' },
              { num: 3, label: '3. Contrôle' },
              { num: 4, label: '4. Import par lots' },
              { num: 5, label: '5. Rapport' },
            ].map((st) => (
              <div
                key={st.num}
                className={`py-1 px-2 rounded-md border text-center transition-all ${
                  etape === st.num
                    ? 'bg-blue-600 text-white border-blue-500 font-bold shadow-xs'
                    : etape > st.num
                    ? 'bg-slate-800 text-emerald-400 border-emerald-900 font-medium'
                    : 'bg-slate-950/40 text-slate-500 border-slate-800'
                }`}
              >
                <span className="truncate block">{st.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Corps du dialogue */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs">
          {/* ==================================================== */}
          {/* ÉTAPE 1 : DOUBLE MÉTHODE D'IMPORTATION & PRÉVISUALISATION */}
          {/* ==================================================== */}
          {etape === 1 && (
            <div className="space-y-4">
              {/* Entrée fichier invisible pour compatibilité native absolue */}
              <input
                ref={inputFichierRef}
                id="input-fichier-geojson-reel"
                type="file"
                accept=".geojson,.json,application/geo+json,application/json"
                className="sr-only"
                onChange={gererSelectionFichier}
              />

              {/* Si aucun fichier n'est encore sélectionné : affichage double méthode */}
              {!fichierGeoJSON ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setEstEnSurvolDrag(true);
                  }}
                  onDragLeave={() => setEstEnSurvolDrag(false)}
                  onDrop={gererGlisserDeposer}
                  className={`border-2 border-dashed rounded-2xl p-7 sm:p-10 text-center transition-all ${
                    estEnSurvolDrag
                      ? 'border-blue-700 bg-blue-50/60 scale-[1.005]'
                      : 'border-slate-300 bg-slate-50/50 hover:border-slate-400'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                    <Upload className="w-6 h-6" />
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-900">
                      Glissez-déposez votre fichier GeoJSON ici
                    </p>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Formats acceptés : <strong>.geojson</strong> ou <strong>.json</strong> (FeatureCollection avec coordonnées WGS84 EPSG:4326)
                    </p>
                  </div>

                  {/* Séparateur OU */}
                  <div className="flex items-center justify-center gap-3 my-4">
                    <div className="h-px bg-slate-200 w-16" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">OU</span>
                    <div className="h-px bg-slate-200 w-16" />
                  </div>

                  {/* Bouton de sélection explicite */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                    <button
                      id="bouton-selectionner-fichier"
                      type="button"
                      onClick={() => inputFichierRef.current?.click()}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-blue-900 text-white shadow-sm hover:bg-blue-800 active:scale-98 transition-all cursor-pointer select-none"
                    >
                      <FolderOpen className="w-4 h-4" />
                      <span>Sélectionner un fichier</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Fichier sélectionné : affichage détaillé et options */
                <div className="space-y-4">
                  {/* Carte d'identification du fichier */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center shrink-0 mt-0.5">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                          Fichier sélectionné
                        </span>
                        <strong className="text-sm text-slate-900 font-mono block break-all">
                          {nomFichier}
                        </strong>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span>{tailleFichier}</span>
                          <span>•</span>
                          <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            GeoJSON valide (FeatureCollection)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        id="bouton-changer-fichier"
                        type="button"
                        onClick={() => inputFichierRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Changer de fichier</span>
                      </button>

                      <button
                        id="bouton-retirer-fichier"
                        type="button"
                        onClick={reinitialiserFormulaire}
                        className="px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 font-medium text-xs transition-colors cursor-pointer"
                        title="Retirer et recommencer"
                      >
                        Retirer
                      </button>
                    </div>
                  </div>

                  {/* Détection de la structure */}
                  <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-blue-950 font-bold">
                        <Layers className="w-4 h-4 text-blue-700" />
                        <span>Structure détectée</span>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-300">
                        {fichierGeoJSON.features.length} entités détectées
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="bg-white p-2.5 rounded-lg border border-blue-100 shadow-2xs">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">
                          Nombre d'entités
                        </span>
                        <strong className="text-sm text-slate-900">
                          {fichierGeoJSON.features.length}
                        </strong>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-blue-100 shadow-2xs">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">
                          Géométrie
                        </span>
                        <strong className="text-sm text-slate-900 truncate block">
                          {typesGeometriesDetectees || 'Point'}
                        </strong>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-blue-100 shadow-2xs">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">
                          Champs détectés
                        </span>
                        <strong className="text-sm text-slate-900">
                          {champsSourceDisponibles.length}
                        </strong>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-blue-100 shadow-2xs">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">
                          Système SIG
                        </span>
                        <strong className="text-sm text-slate-900">
                          WGS84 EPSG:4326
                        </strong>
                      </div>
                    </div>

                    {/* Liste des champs disponibles */}
                    <div>
                      <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                        Champs disponibles dans le fichier ({champsSourceDisponibles.length}) :
                      </span>
                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-1.5 bg-white rounded-lg border border-blue-100">
                        {champsSourceDisponibles.map((champ) => (
                          <span
                            key={champ}
                            className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] border border-slate-200"
                          >
                            {champ}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Prévisualisation des premières lignes */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        Prévisualisation (premières lignes du fichier)
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {previsualisationBrute.length} affichées
                      </span>
                    </div>

                    <div className="overflow-x-auto max-h-56">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                            <th className="py-2 px-2.5">Nom</th>
                            <th className="py-2 px-2.5">Commune</th>
                            <th className="py-2 px-2.5">Type</th>
                            <th className="py-2 px-2.5">Statut</th>
                            <th className="py-2 px-2.5">Formation</th>
                            <th className="py-2 px-2.5">Filière</th>
                            <th className="py-2 px-2.5">Latitude</th>
                            <th className="py-2 px-2.5">Longitude</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {previsualisationBrute.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/60">
                              <td className="py-1.5 px-2.5 font-semibold text-slate-900 truncate max-w-[160px]">
                                {item.nom || <span className="text-slate-400 italic font-normal">Non disponible</span>}
                              </td>
                              <td className="py-1.5 px-2.5 truncate max-w-[100px]">
                                {item.commune || <span className="text-slate-400 italic">Non disponible</span>}
                              </td>
                              <td className="py-1.5 px-2.5 truncate max-w-[90px]">
                                {item.type || <span className="text-slate-400 italic">Non disponible</span>}
                              </td>
                              <td className="py-1.5 px-2.5 truncate max-w-[90px]">
                                {item.statut || <span className="text-slate-400 italic">Non disponible</span>}
                              </td>
                              <td className="py-1.5 px-2.5 truncate max-w-[120px]">
                                {item.formation || <span className="text-slate-400 italic">Non disponible</span>}
                              </td>
                              <td className="py-1.5 px-2.5 truncate max-w-[120px]">
                                {item.filiere || <span className="text-slate-400 italic">Non disponible</span>}
                              </td>
                              <td className="py-1.5 px-2.5 font-mono text-[10px] whitespace-nowrap">
                                {item.latitude !== null ? item.latitude.toFixed(4) : <span className="text-slate-400 italic">Non disponible</span>}
                              </td>
                              <td className="py-1.5 px-2.5 font-mono text-[10px] whitespace-nowrap">
                                {item.longitude !== null ? item.longitude.toFixed(4) : <span className="text-slate-400 italic">Non disponible</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Message d'erreur explicite */}
              {erreurFichier && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-2.5 shadow-2xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <div className="space-y-0.5">
                    <strong className="font-bold block">Erreur de validation :</strong>
                    <span className="text-xs">{erreurFichier}</span>
                  </div>
                </div>
              )}

              {/* Journal d'importation */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-900 text-slate-200 shadow-2xs">
                <div className="p-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <Activity className="w-3.5 h-3.5 text-blue-400" />
                    <span>Journal d'importation</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {journalImport.length} étape(s) enregistrée(s)
                  </span>
                </div>

                <div className="p-3 max-h-36 overflow-y-auto space-y-1.5 font-mono text-[11px]">
                  {journalImport.length === 0 ? (
                    <div className="text-slate-500 italic py-1">
                      En attente de sélection d'un fichier GeoJSON...
                    </div>
                  ) : (
                    journalImport.map((log) => (
                      <div key={log.id} className="flex items-start gap-2">
                        <span className="text-slate-500 text-[10px] select-none shrink-0">
                          [{log.heure}]
                        </span>
                        {log.statut === 'succes' && (
                          <span className="text-emerald-400 shrink-0">✓</span>
                        )}
                        {log.statut === 'erreur' && (
                          <span className="text-red-400 shrink-0">❌</span>
                        )}
                        {log.statut === 'en_cours' && (
                          <span className="text-amber-400 shrink-0 animate-spin">⟳</span>
                        )}
                        {log.statut === 'attente' && (
                          <span className="text-blue-400 shrink-0">⏳</span>
                        )}
                        <div className="flex-1">
                          <span
                            className={
                              log.statut === 'erreur'
                                ? 'text-red-300 font-bold'
                                : log.statut === 'succes'
                                ? 'text-slate-200'
                                : 'text-slate-400'
                            }
                          >
                            {log.texte}
                          </span>
                          {log.detail && (
                            <span className="block text-[10px] text-slate-400 mt-0.5 break-all">
                              ↳ {log.detail}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Diagnostic Firestore & Test de connexion */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      resultatTestFirestore?.accessible
                        ? 'bg-emerald-100 text-emerald-800'
                        : resultatTestFirestore
                        ? 'bg-red-100 text-red-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    <Database className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-xs font-bold text-slate-900">
                        Connexion Firestore :
                      </strong>
                      {resultatTestFirestore ? (
                        <span
                          className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                            resultatTestFirestore.accessible
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {resultatTestFirestore.accessible
                            ? '✓ Firestore accessible'
                            : '❌ Firestore inaccessible'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Non vérifiée</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {resultatTestFirestore?.message ||
                        "Vérifiez l'accès à la collection 'centres' avant de procéder."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={executerTestFirestore}
                  disabled={testEnCours}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testEnCours ? 'animate-spin' : ''}`} />
                  <span>{testEnCours ? 'Test en cours...' : 'Tester la connexion'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* ÉTAPE 2 : MAPPING DES CHAMPS */}
          {/* ==================================================== */}
          {etape === 2 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 flex items-start gap-2.5">
                <Settings2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <strong>Association des colonnes :</strong> Les colonnes ont été pré-associées
                  automatiquement selon la nomenclature SIG du Sénégal. Vous pouvez ajuster
                  chaque correspondance pour garantir la conformité des 190 fiches.
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                      <th className="py-2.5 px-3.5">Champ Plateforme FPT</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3.5">Propriété dans votre GeoJSON</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {[
                      { cle: 'nom', label: 'Nom du centre *', desc: 'Désignation usuelle', requis: true },
                      { cle: 'id', label: 'Identifiant unique (ID)', desc: 'ID QGIS ou code numérique', requis: false },
                      { cle: 'nom_officiel', label: 'Nom officiel', desc: 'Nom administratif complet', requis: false },
                      { cle: 'commune', label: 'Commune', desc: 'Commune de rattachement', requis: false },
                      { cle: 'type', label: 'Type', desc: 'Public ou Privé', requis: false },
                      { cle: 'statut', label: 'Statut', desc: 'Homologation ou convention', requis: false },
                      { cle: 'formation', label: 'Formation', desc: 'Type de formation', requis: false },
                      { cle: 'filiere', label: 'Filière', desc: 'Spécialités techniques', requis: false },
                      { cle: 'diplomes', label: 'Diplômes', desc: 'Certificats délivrés', requis: false },
                      { cle: 'telephone', label: 'Téléphone', desc: 'Contact téléphonique', requis: false },
                      { cle: 'email', label: 'Courriel', desc: 'Adresse email', requis: false },
                      { cle: 'site_web', label: 'Site Internet', desc: 'URL du site web', requis: false },
                      { cle: 'adresse', label: 'Adresse physique', desc: 'Quartier, rue...', requis: false },
                      { cle: 'date_creation', label: 'Date de création', desc: 'Année ou date', requis: false },
                      { cle: 'capacite', label: 'Capacité', desc: "Nombre d'apprenants", requis: false },
                      { cle: 'source', label: 'Source', desc: 'Origine de la donnée SIG', requis: false },
                      { cle: 'photo', label: 'Photo', desc: 'URL de la photo', requis: false },
                      { cle: 'description', label: 'Description', desc: 'Présentation sommaire', requis: false },
                    ].map((champ) => {
                      const cle = champ.cle as keyof MappingChamps;
                      return (
                        <tr key={cle} className="hover:bg-slate-50/60">
                          <td className="py-2 px-3.5 font-semibold text-slate-900 whitespace-nowrap">
                            {champ.label}
                          </td>
                          <td className="py-2 px-3 text-slate-500 text-[11px]">{champ.desc}</td>
                          <td className="py-2 px-3.5">
                            <select
                              value={mapping[cle]}
                              onChange={(e) =>
                                setMapping({
                                  ...mapping,
                                  [cle]: e.target.value,
                                })
                              }
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-900"
                            >
                              <option value="">-- Ignorer / Non présent --</option>
                              {champsSourceDisponibles.map((col) => (
                                <option key={col} value={col}>
                                  {col}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* ÉTAPE 3 : CONTRÔLE QUALITÉ & DÉTECTION DES DOUBLONS */}
          {/* ==================================================== */}
          {etape === 3 && resumeAnalyse && (
            <div className="space-y-4">
              {/* Badges de synthèse */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => setFiltreEtatApercu('valide')}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    filtreEtatApercu === 'valide'
                      ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Valides</span>
                  <div className="flex items-center gap-1.5 text-emerald-700 font-extrabold text-lg">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{resumeAnalyse.valides}</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFiltreEtatApercu('attention')}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    filtreEtatApercu === 'attention'
                      ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-500'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Alertes</span>
                  <div className="flex items-center gap-1.5 text-amber-700 font-extrabold text-lg">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{resumeAnalyse.alertes}</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFiltreEtatApercu('erreur')}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    filtreEtatApercu === 'erreur'
                      ? 'bg-red-50 border-red-500 ring-1 ring-red-500'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Erreurs</span>
                  <div className="flex items-center gap-1.5 text-red-700 font-extrabold text-lg">
                    <AlertCircle className="w-4 h-4" />
                    <span>{resumeAnalyse.erreurs}</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFiltreEtatApercu('doublons')}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    filtreEtatApercu === 'doublons'
                      ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-500'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Doublons</span>
                  <div className="flex items-center gap-1.5 text-purple-700 font-extrabold text-lg">
                    <Copy className="w-4 h-4" />
                    <span>{resumeAnalyse.doublons}</span>
                  </div>
                </button>
              </div>

              {/* Options de gestion des doublons */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                <span className="font-bold text-slate-900 block">Règles d'importation :</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={ignorerDoublons}
                      onChange={(e) => setIgnorerDoublons(e.target.checked)}
                      className="rounded text-blue-900 focus:ring-blue-900"
                    />
                    <span className="text-slate-700">Ignorer les doublons identifiés</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={modeEcrasement}
                      onChange={(e) => setModeEcrasement(e.target.checked)}
                      className="rounded text-blue-900 focus:ring-blue-900"
                    />
                    <span className="text-slate-700">Écraser / fusionner si ID déjà existant</span>
                  </label>
                </div>
              </div>

              {/* Tableau interactif d'analyse */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">
                    Aperçu des entités ({entitesFiltrees.length} affichée{entitesFiltrees.length > 1 ? 's' : ''})
                  </span>
                  {filtreEtatApercu !== 'tous' && (
                    <button
                      type="button"
                      onClick={() => setFiltreEtatApercu('tous')}
                      className="text-blue-900 hover:underline font-semibold cursor-pointer"
                    >
                      Afficher tous ({entitesAnalyses.length})
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Nom</th>
                        <th className="py-2 px-3">Commune</th>
                        <th className="py-2 px-3">Coordonnées GPS</th>
                        <th className="py-2 px-3">État</th>
                        <th className="py-2 px-3 text-right">Détails</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {entitesFiltrees.slice(0, 100).map((item) => {
                        const estOuvert = ligneOuverte === item.index;
                        return (
                          <React.Fragment key={item.index}>
                            <tr
                              className={`hover:bg-slate-50/70 transition-colors ${
                                item.etat === 'erreur' ? 'bg-red-50/40' : ''
                              }`}
                            >
                              <td className="py-1.5 px-3 font-mono text-[10px] text-slate-400">
                                {item.index + 1}
                              </td>
                              <td className="py-1.5 px-3 font-semibold text-slate-900 truncate max-w-[220px]">
                                {item.nom || <span className="text-red-600 italic">Sans nom</span>}
                              </td>
                              <td className="py-1.5 px-3 text-slate-600 truncate max-w-[120px]">
                                {item.commune || '—'}
                              </td>
                              <td className="py-1.5 px-3 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                                {item.latitude !== null && item.longitude !== null
                                  ? `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`
                                  : 'Invalides'}
                              </td>
                              <td className="py-1.5 px-3">
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                    item.etat === 'valide'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : item.etat === 'attention'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {item.etat === 'valide'
                                    ? 'Valide'
                                    : item.etat === 'attention'
                                    ? 'Alerte'
                                    : 'Erreur'}
                                </span>
                              </td>
                              <td className="py-1.5 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => setLigneOuverte(estOuvert ? null : item.index)}
                                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                                >
                                  {estOuvert ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </td>
                            </tr>

                            {estOuvert && (
                              <tr className="bg-slate-50 text-[11px]">
                                <td colSpan={6} className="p-3 space-y-2 border-b border-slate-200">
                                  {item.anomalies.length > 0 && (
                                    <div className="space-y-1">
                                      <span className="font-bold text-slate-700 block">
                                        Remarques et alertes :
                                      </span>
                                      <ul className="list-disc pl-5 space-y-0.5 text-slate-600">
                                        {item.anomalies.map((an, i) => (
                                          <li key={i}>{an}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  <div>
                                    <span className="font-bold text-slate-700 block">
                                      Données brutes extraites du fichier :
                                    </span>
                                    <pre className="bg-white p-2 rounded border border-slate-200 text-[10px] font-mono text-slate-600 overflow-x-auto max-h-24">
                                      {JSON.stringify(item.proprietesBrutes, null, 2)}
                                    </pre>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* ÉTAPE 4 : IMPORTATION EN COURS PAR LOTS */}
          {/* ==================================================== */}
          {etape === 4 && (
            <div className="py-10 px-4 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center mx-auto animate-pulse">
                <Database className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900">
                  Importation en cours dans Firestore...
                </h4>
                <p className="text-xs text-slate-500">
                  Traitement certifié par lots pour préserver l'intégrité de la base de données.
                </p>
              </div>

              {/* Indicateur de lot actif */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 font-bold text-sm">
                <Activity className="w-4 h-4 animate-spin text-blue-700" />
                <span>Importation : {progression.trancheTexte || `${progression.actuel} / ${progression.total}`}</span>
              </div>

              {/* Barre de progression */}
              <div className="max-w-md mx-auto space-y-2">
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-blue-900 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        progression.total > 0
                          ? Math.round((progression.actuel / progression.total) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>
                    {progression.actuel} sur {progression.total} entités traitées
                  </span>
                  <span className="font-bold text-blue-900">
                    {progression.total > 0
                      ? Math.round((progression.actuel / progression.total) * 100)
                      : 0}
                    %
                  </span>
                </div>
              </div>

              {/* Historique des lots terminés */}
              {progression.lotsHistorique.length > 0 && (
                <div className="max-w-md mx-auto text-left bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Lots traités avec succès :
                  </span>
                  <div className="space-y-0.5">
                    {progression.lotsHistorique.map((lot, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-emerald-700 font-mono text-[11px]">
                        <Check className="w-3.5 h-3.5" />
                        <span>Lot {lot} validé dans Firestore</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* ÉTAPE 5 : RAPPORT FINAL */}
          {/* ==================================================== */}
          {etape === 5 && rapportFinal && (
            <div className="space-y-4 py-3">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-emerald-950">
                    Importation terminée
                  </h4>
                  <p className="text-xs text-emerald-800">
                    L'intégration dans Firebase Firestore a été effectuée avec succès et enregistrée dans l'historique d'audit.
                  </p>
                </div>
              </div>

              {/* Grille conforme à la spécification exacte */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Entités détectées
                  </span>
                  <strong className="text-lg font-extrabold text-slate-900">
                    {rapportFinal.totalAnalyse}
                  </strong>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                    Importées
                  </span>
                  <strong className="text-lg font-extrabold text-emerald-800">
                    {rapportFinal.totalNouveaux ?? rapportFinal.totalImportes}
                  </strong>
                </div>

                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-blue-700 block">
                    Mises à jour
                  </span>
                  <strong className="text-lg font-extrabold text-blue-800">
                    {rapportFinal.totalMisAJour ?? 0}
                  </strong>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Ignorées
                  </span>
                  <strong className="text-lg font-extrabold text-slate-700">
                    {rapportFinal.totalIgnores}
                  </strong>
                </div>

                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-purple-700 block">
                    Doublons
                  </span>
                  <strong className="text-lg font-extrabold text-purple-800">
                    {rapportFinal.totalDoublons}
                  </strong>
                </div>

                <div className="p-3 bg-red-50 rounded-xl border border-red-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-red-700 block">
                    Erreurs
                  </span>
                  <strong className="text-lg font-extrabold text-red-800">
                    {rapportFinal.totalErreurs}
                  </strong>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 flex items-center justify-between text-xs">
                <span>Durée totale d'importation :</span>
                <strong className="font-mono text-slate-900">{rapportFinal.dureeSecondes} seconde(s)</strong>
              </div>
            </div>
          )}
        </div>

        {/* Pied de dialogue avec navigation entre étapes */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs">
          {etape !== 4 && etape !== 5 ? (
            <>
              {etape > 1 ? (
                <button
                  type="button"
                  onClick={() => setEtape((e) => (e - 1) as EtapeImport)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Précédent</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={surFermer}
                  className="px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-200 font-medium cursor-pointer"
                >
                  Annuler
                </button>

                {etape === 1 && (
                  <button
                    type="button"
                    onClick={() => setEtape(2)}
                    disabled={!fichierGeoJSON}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-white transition-all shadow-xs cursor-pointer ${
                      fichierGeoJSON
                        ? 'bg-blue-900 hover:bg-blue-800'
                        : 'bg-slate-400 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <span>Étape 2 : Mapping des champs</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {etape === 2 && (
                  <button
                    type="button"
                    onClick={passerAEtape3}
                    disabled={!mapping.nom}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-white bg-blue-900 hover:bg-blue-800 transition-all shadow-xs cursor-pointer"
                  >
                    <span>Étape 3 : Contrôle qualité & aperçu</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {etape === 3 && (
                  <button
                    type="button"
                    onClick={lancerImportation}
                    disabled={entitesAnalyses.length === 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-all shadow-xs cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Confirmer et importer {entitesAnalyses.length} fiches</span>
                  </button>
                )}
              </div>
            </>
          ) : etape === 5 ? (
            <button
              type="button"
              onClick={() => {
                surImportReussi();
                surFermer();
              }}
              className="ml-auto inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg font-bold text-white bg-blue-900 hover:bg-blue-800 shadow-xs transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Terminer et actualiser les données</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
