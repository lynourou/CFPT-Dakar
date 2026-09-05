import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { EnTete } from '../composants/EnTete';
import { BarreRecherche } from '../composants/BarreRecherche';
import { PanneauFiltres } from '../composants/PanneauFiltres';
import { CarteCentre } from '../composants/CarteCentre';
import { Carte } from '../composants/Carte';
import { FicheCentre } from '../composants/FicheCentre';
import { Statistiques } from '../composants/Statistiques';
import { SectionAPropos } from '../composants/SectionAPropos';
import { ModalAuthentification } from '../composants/ModalAuthentification';
import { FormulaireCentre } from '../composants/FormulaireCentre';
import { ModalImportGeoJSON } from '../composants/ModalImportGeoJSON';
import { DashboardAdmin } from '../composants/DashboardAdmin';
import { ModalConfirmationSuppression } from '../composants/ModalConfirmationSuppression';
import { CentreFormation, FiltresCentres, UtilisateurConnecte } from '../types';
import {
  obtenirLesCentres,
  filtrerCentres,
  calculerStatistiques,
  obtenirOptionsFiltres,
  supprimerCentre,
  deplacerCentre,
  verifierEtChargerGeoJSONPublic,
  importerGeoJSON,
} from '../services/centresService';
import {
  observerAuthentification,
  deconnecter,
} from '../services/authentificationService';
import {
  MapPin,
  SlidersHorizontal,
  BarChart3,
  ListFilter,
  AlertCircle,
  Database,
  Plus,
  CheckCircle2,
  X,
  Upload,
  Shield,
  Lock,
} from 'lucide-react';

export const PageAccueil: React.FC = () => {
  // 1. États principaux des données
  const [tousLesCentres, setTousLesCentres] = useState<CentreFormation[]>([]);
  const [chargement, setChargement] = useState<boolean>(true);
  const [centreSelectionne, setCentreSelectionne] = useState<CentreFormation | null>(null);
  const [centrePourFiche, setCentrePourFiche] = useState<CentreFormation | null>(null);

  // 2. Authentification et rôles
  const [utilisateur, setUtilisateur] = useState<UtilisateurConnecte | null>(null);
  const [modalAuthOuvert, setModalAuthOuvert] = useState<boolean>(false);

  // 3. Modales d'administration
  const [modalAProposOuvert, setModalAProposOuvert] = useState<boolean>(false);
  const [modalAjoutCentreOuvert, setModalAjoutCentreOuvert] = useState<boolean>(false);
  const [modalImportGeoJSONOuvert, setModalImportGeoJSONOuvert] = useState<boolean>(false);
  const [centrePourEdition, setCentrePourEdition] = useState<CentreFormation | null>(null);
  const [centrePourSuppression, setCentrePourSuppression] = useState<CentreFormation | null>(null);
  const [suppressionEnCours, setSuppressionEnCours] = useState<boolean>(false);

  // 4. Modes interactifs sur la carte
  const [centreEnDeplacement, setCentreEnDeplacement] = useState<CentreFormation | null>(null);
  const [modePlacementCarte, setModePlacementCarte] = useState<boolean>(false);
  const [positionProvisoire, setPositionProvisoire] = useState<{ latitude: number; longitude: number } | null>(null);

  // 5. Navigation & UI mobile
  const [vueActive, setVueActive] = useState<'carte' | 'liste' | 'statistiques' | 'apropos' | 'admin'>('carte');
  const [filtresVisiblesMobile, setFiltresVisiblesMobile] = useState<boolean>(false);

  // 6. Notifications toasts
  const [notificationToast, setNotificationToast] = useState<{
    message: string;
    type: 'succes' | 'erreur';
  } | null>(null);

  // 7. Filtres
  const [filtres, setFiltres] = useState<FiltresCentres>({
    recherche: '',
    commune: 'Toutes',
    typeFormation: 'Tous',
    filiere: 'Toutes',
    diplome: 'Tous',
    statut: 'Tous',
    formation: 'Toutes',
  });

  const estAdmin = utilisateur?.role === 'ADMINISTRATEUR' || utilisateur?.role === 'EDITOR';

  // Afficher un toast de notification
  const afficherToast = useCallback((message: string, type: 'succes' | 'erreur' = 'succes') => {
    setNotificationToast({ message, type });
    setTimeout(() => {
      setNotificationToast((actuel) => (actuel?.message === message ? null : actuel));
    }, 4500);
  }, []);

  // Détection d'URL /admin ou #admin
  useEffect(() => {
    const verifierRoute = () => {
      const chemin = window.location.pathname;
      const hash = window.location.hash;
      if (chemin === '/admin' || hash === '#admin' || hash === '#/admin') {
        setVueActive('admin');
      }
    };
    verifierRoute();
    window.addEventListener('popstate', verifierRoute);
    window.addEventListener('hashchange', verifierRoute);
    return () => {
      window.removeEventListener('popstate', verifierRoute);
      window.removeEventListener('hashchange', verifierRoute);
    };
  }, []);

  // Écoute de l'état d'authentification Firebase Auth
  useEffect(() => {
    const unsub = observerAuthentification((u) => {
      setUtilisateur(u);
    });
    return () => unsub();
  }, []);

  // Chargement des données Firestore
  const rechargerCentres = useCallback(async () => {
    try {
      setChargement(true);
      const centres = await obtenirLesCentres();
      setTousLesCentres(centres);

      // Si le centre affiché dans la fiche a été modifié, le mettre à jour
      setCentrePourFiche((actuel) => {
        if (!actuel) return null;
        const misAJour = centres.find((c) => String(c.id) === String(actuel.id));
        return misAJour || null;
      });

      // Si le centre sélectionné a été modifié, le mettre à jour
      setCentreSelectionne((actuel) => {
        if (!actuel) return null;
        const misAJour = centres.find((c) => String(c.id) === String(actuel.id));
        return misAJour || null;
      });
    } catch (err) {
      console.error('Erreur chargement centres:', err);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    rechargerCentres();
  }, [rechargerCentres]);

  // Options pour les filtres (extraites des données réelles uniquement)
  const optionsFiltres = useMemo(() => {
    return obtenirOptionsFiltres(tousLesCentres);
  }, [tousLesCentres]);

  // Établissements filtrés
  const centresFiltres = useMemo(() => {
    return filtrerCentres(filtres, tousLesCentres);
  }, [filtres, tousLesCentres]);

  // Statistiques calculées dynamiquement
  const statistiques = useMemo(() => {
    return calculerStatistiques(tousLesCentres);
  }, [tousLesCentres]);

  // Gestion des filtres
  const gererChangementFiltre = <K extends keyof FiltresCentres>(cle: K, valeur: FiltresCentres[K]) => {
    setFiltres((prev) => ({
      ...prev,
      [cle]: valeur,
    }));
  };

  const gererReinitialisationFiltres = () => {
    setFiltres({
      recherche: '',
      commune: 'Toutes',
      typeFormation: 'Tous',
      filiere: 'Toutes',
      diplome: 'Tous',
      statut: 'Tous',
      formation: 'Toutes',
    });
  };

  // Sélection d'un établissement
  const gererSelectionCentre = (centre: CentreFormation) => {
    setCentreSelectionne(centre);
    if (window.innerWidth < 1024 && vueActive !== 'admin') {
      setVueActive('carte');
    }
  };

  // Actions d'administration
  const gererSuppressionCentre = async (centre: CentreFormation) => {
    try {
      await supprimerCentre(centre.id);
      await rechargerCentres();
      afficherToast('Établissement supprimé avec succès.', 'succes');
      if (centreSelectionne?.id === centre.id) {
        setCentreSelectionne(null);
      }
    } catch (err) {
      afficherToast("Impossible d'enregistrer les modifications.", 'erreur');
      throw err;
    }
  };

  // Validation du déplacement d'un marqueur sur la carte
  const gererValiderDeplacement = async (
    centre: CentreFormation,
    nouvelleLat: number,
    nouvelleLng: number
  ) => {
    try {
      await deplacerCentre(centre.id, nouvelleLat, nouvelleLng);
      setCentreEnDeplacement(null);
      await rechargerCentres();
      afficherToast('Position mise à jour avec succès.', 'succes');
    } catch (err) {
      console.error('Erreur déplacement:', err);
      afficherToast("Impossible d'enregistrer les modifications.", 'erreur');
    }
  };

  // Placement d'un nouveau centre sur la carte
  const gererActiverPlacementCarte = (posActuelle?: { latitude: number; longitude: number }) => {
    if (posActuelle) {
      setPositionProvisoire(posActuelle);
    }
    setModalAjoutCentreOuvert(false);
    setModePlacementCarte(true);
    setVueActive('carte');
  };

  const gererValiderPositionPlacee = (position: { latitude: number; longitude: number }) => {
    setPositionProvisoire(position);
    setModePlacementCarte(false);
    setModalAjoutCentreOuvert(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Toast de notification global */}
      {notificationToast && (
        <div
          id="toast-notification"
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl border flex items-center gap-3 transition-all animate-fadeIn ${
            notificationToast.type === 'succes'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : 'bg-red-900 text-white border-red-700'
          }`}
        >
          {notificationToast.type === 'succes' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span className="text-xs font-semibold">{notificationToast.message}</span>
          <button
            type="button"
            onClick={() => setNotificationToast(null)}
            className="p-1 text-slate-300 hover:text-white cursor-pointer ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. En-tête principal avec gestion du statut Administrateur */}
      <EnTete
        centresFiltres={centresFiltres}
        vueActuelle={vueActive}
        surChangerVue={(vue) => {
          if (vue === 'apropos') {
            setModalAProposOuvert(true);
          } else {
            setVueActive(vue);
          }
        }}
        surOuvrirAPropos={() => setModalAProposOuvert(true)}
        utilisateur={utilisateur}
        surOuvrirConnexion={() => setModalAuthOuvert(true)}
        surDeconnexion={async () => {
          await deconnecter();
          if (vueActive === 'admin') {
            setVueActive('carte');
          }
          afficherToast('Vous êtes maintenant en mode visiteur.', 'succes');
        }}
        surOuvrirAjoutCentre={() => {
          setPositionProvisoire(null);
          setModalAjoutCentreOuvert(true);
        }}
        surOuvrirImportGeoJSON={() => setModalImportGeoJSONOuvert(true)}
      />

      {/* 2. Contenu principal adaptatif */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 lg:p-6 flex flex-col gap-4">
        {/* Vue Dashboard Administrateur */}
        {vueActive === 'admin' ? (
          !estAdmin ? (
            <div
              id="ecran-connexion-requise-admin"
              className="max-w-md mx-auto my-12 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4"
            >
              <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-900 flex items-center justify-center mx-auto">
                <Lock className="w-7 h-7" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Espace d'Administration Sécurisé
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Cet espace est réservé aux administrateurs de la formation professionnelle. Veuillez vous authentifier pour accéder au tableau de bord.
              </p>
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setModalAuthOuvert(true)}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 transition-colors shadow-sm cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  <span>Se connecter en tant qu'administrateur</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVueActive('carte');
                    if (window.location.hash.includes('admin')) {
                      window.location.hash = '';
                    }
                  }}
                  className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Retour à la carte publique
                </button>
              </div>
            </div>
          ) : (
            <DashboardAdmin
              utilisateur={utilisateur}
              centres={tousLesCentres}
              centresFiltres={centresFiltres}
              statistiques={statistiques}
              filtres={filtres}
              optionsFiltres={optionsFiltres}
              centreSelectionne={centreSelectionne}
              centreEnDeplacement={centreEnDeplacement}
              surChangementFiltre={gererChangementFiltre}
              surReinitialiserFiltres={gererReinitialisationFiltres}
              surSelectionnerCentre={gererSelectionCentre}
              surVoirCentre={(centre) => setCentrePourFiche(centre)}
              surModifierCentre={(centre) => setCentrePourEdition(centre)}
              surDeplacerCentre={(centre) => {
                setCentreEnDeplacement(centre);
                afficherToast(
                  `Cliquez sur la carte pour définir le nouvel emplacement de "${centre.nom}".`,
                  'succes'
                );
              }}
              surDemanderSuppression={(centre) => setCentrePourSuppression(centre)}
              surOuvrirAjout={() => {
                setPositionProvisoire(null);
                setModalAjoutCentreOuvert(true);
              }}
              surOuvrirImport={() => setModalImportGeoJSONOuvert(true)}
              surDeconnexion={async () => {
                await deconnecter();
                setVueActive('carte');
                afficherToast('Déconnexion réussie.', 'succes');
              }}
              surRetourPublic={() => {
                setVueActive('carte');
                if (window.location.hash.includes('admin')) {
                  window.location.hash = '';
                }
              }}
              surValiderDeplacement={gererValiderDeplacement}
              surAnnulerDeplacement={() => setCentreEnDeplacement(null)}
              surCentresModifies={rechargerCentres}
            />
          )
        ) : vueActive === 'statistiques' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-900" />
                Statistiques de la FPT à Dakar
              </h2>
              <button
                onClick={() => setVueActive('carte')}
                className="text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
              >
                Retour à la carte
              </button>
            </div>
            <Statistiques statistiques={statistiques} modeAdmin={estAdmin} />
            <div className="bg-white rounded-xl p-5 border border-slate-200 text-sm space-y-3 shadow-2xs">
              <h3 className="font-bold text-slate-900">Note méthodologique SIG</h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                Ces indicateurs sont calculés en temps réel à partir de la base de données cartographique
                développée par l'équipe SIG du <strong>CEDT Le G15</strong>.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Bandeau d'information si la base est vide (avant import initial) */}
            {!chargement && tousLesCentres.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-2xs text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
                  <Database className="w-6 h-6 text-blue-900" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Aucun établissement disponible
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                  Ajoutez un établissement ou importez vos données pour commencer.
                </p>
                {estAdmin && (
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPositionProvisoire(null);
                        setModalAjoutCentreOuvert(true);
                      }}
                      className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 transition-colors shadow-2xs inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Ajouter un centre</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalImportGeoJSONOuvert(true)}
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-blue-900" />
                      <span>Importer GeoJSON</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Statistiques compactes en haut sur grand écran */}
            <div className="hidden lg:block">
              <Statistiques statistiques={statistiques} modeAdmin={estAdmin} />
            </div>

            {/* Structure principale : gauche (Recherche, Filtres, Liste) | droite (Carte) */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch min-h-[640px]">
              {/* PANNEAU GAUCHE : Recherche, Filtres et Liste */}
              <div
                className={`lg:col-span-5 flex flex-col gap-3 h-full ${
                  vueActive === 'carte' ? 'hidden lg:flex' : 'flex'
                }`}
              >
                {/* Outil de recherche textuelle */}
                <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
                  <BarreRecherche
                    valeur={filtres.recherche}
                    surChangement={(v) => gererChangementFiltre('recherche', v)}
                    surReinitialiser={() => gererChangementFiltre('recherche', '')}
                  />

                  {/* Bouton filtres avancés sur mobile */}
                  <div className="mt-2 flex items-center justify-between sm:hidden">
                    <button
                      type="button"
                      onClick={() => setFiltresVisiblesMobile(!filtresVisiblesMobile)}
                      className="text-xs font-semibold text-blue-600 inline-flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      {filtresVisiblesMobile ? 'Masquer les filtres' : 'Afficher les filtres avancés'}
                    </button>
                    <span className="text-[11px] text-slate-500">
                      {centresFiltres.length} résultat(s)
                    </span>
                  </div>
                </div>

                {/* Panneau de filtres multicritères */}
                <div className={`${filtresVisiblesMobile ? 'block' : 'hidden sm:block'}`}>
                  <PanneauFiltres
                    filtres={filtres}
                    surChangementFiltre={gererChangementFiltre}
                    surReinitialiser={gererReinitialisationFiltres}
                    optionsCommunes={optionsFiltres.communes}
                    optionsTypes={optionsFiltres.types}
                    optionsFilieres={optionsFiltres.filieres}
                    optionsDiplomes={optionsFiltres.diplomes}
                    optionsStatuts={optionsFiltres.statuts}
                    optionsFormations={optionsFiltres.formations}
                    totalTrouves={centresFiltres.length}
                  />
                </div>

                {/* Liste des résultats */}
                <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                  <div className="flex items-center justify-between px-1 pb-2 text-xs font-semibold text-slate-600">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <ListFilter className="w-3.5 h-3.5 text-slate-400" />
                      Résultats ({centresFiltres.length})
                    </span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      Cliquez pour localiser
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[500px] lg:max-h-[540px]">
                    {chargement ? (
                      <div className="py-12 text-center text-slate-400 text-xs">
                        Chargement des établissements...
                      </div>
                    ) : centresFiltres.length === 0 ? (
                      <div className="p-6 text-center bg-white rounded-xl border border-dashed border-slate-300">
                        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-80" />
                        <p className="text-xs font-bold text-slate-800">
                          {tousLesCentres.length === 0
                            ? 'Aucun établissement disponible'
                            : 'Aucun établissement ne correspond à vos critères.'}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {tousLesCentres.length === 0
                            ? 'Ajoutez un établissement ou importez vos données pour commencer.'
                            : 'Modifiez votre recherche ou réinitialisez les filtres.'}
                        </p>
                        {tousLesCentres.length > 0 ? (
                          <button
                            type="button"
                            onClick={gererReinitialisationFiltres}
                            className="mt-3 inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
                          >
                            Réinitialiser les filtres
                          </button>
                        ) : estAdmin ? (
                          <button
                            type="button"
                            onClick={() => setModalImportGeoJSONOuvert(true)}
                            className="mt-3 inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 transition-colors cursor-pointer"
                          >
                            Importer GeoJSON
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      centresFiltres.map((centre) => (
                        <CarteCentre
                          key={centre.id}
                          centre={centre}
                          estSelectionne={centreSelectionne?.id === centre.id}
                          surSelectionner={gererSelectionCentre}
                          surOuvrirFiche={(c) => setCentrePourFiche(c)}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* PANNEAU DROIT : Carte interactive Leaflet */}
              <div
                className={`lg:col-span-7 h-[500px] lg:h-auto min-h-[460px] flex flex-col ${
                  vueActive === 'liste' ? 'hidden lg:flex' : 'flex'
                }`}
              >
                <Carte
                  centres={centresFiltres}
                  centreSelectionne={centreSelectionne}
                  surSelectionnerCentre={(c) => setCentreSelectionne(c)}
                  surOuvrirFiche={(c) => setCentrePourFiche(c)}
                  modePlacementActif={modePlacementCarte}
                  surPositionPlacee={gererValiderPositionPlacee}
                  surAnnulerPlacement={() => setModePlacementCarte(false)}
                  centreEnDeplacement={centreEnDeplacement}
                  surValiderDeplacement={gererValiderDeplacement}
                  surAnnulerDeplacement={() => setCentreEnDeplacement(null)}
                />
              </div>
            </div>
          </>
        )}
      </main>

      {/* 3. Modal de la fiche détaillée d'un centre */}
      {centrePourFiche && (
        <FicheCentre
          centre={centrePourFiche}
          estAdmin={estAdmin}
          surFermer={() => setCentrePourFiche(null)}
          surLocaliserSurCarte={(centre) => {
            gererSelectionCentre(centre);
            setVueActive('carte');
          }}
          surModifier={(centre) => {
            setCentrePourFiche(null);
            setCentrePourEdition(centre);
          }}
          surDeplacer={(centre) => {
            setCentrePourFiche(null);
            setCentreEnDeplacement(centre);
            setVueActive('carte');
          }}
          surSupprimer={(centre) => {
            setCentrePourFiche(null);
            setCentrePourSuppression(centre);
          }}
        />
      )}

      {/* Modal Confirmation de Suppression d'un établissement */}
      <ModalConfirmationSuppression
        ouvert={Boolean(centrePourSuppression)}
        centre={centrePourSuppression}
        enCours={suppressionEnCours}
        surAnnuler={() => setCentrePourSuppression(null)}
        surConfirmer={async () => {
          if (!centrePourSuppression) return;
          setSuppressionEnCours(true);
          try {
            await gererSuppressionCentre(centrePourSuppression);
            setCentrePourSuppression(null);
          } catch (err) {
            console.error(err);
          } finally {
            setSuppressionEnCours(false);
          }
        }}
      />

      {/* 4. Modal Formulaire Centre (Ajout et Modification) */}
      {(modalAjoutCentreOuvert || centrePourEdition) && (
        <FormulaireCentre
          centrePourEdition={centrePourEdition}
          ouvert={modalAjoutCentreOuvert || Boolean(centrePourEdition)}
          surFermer={() => {
            setModalAjoutCentreOuvert(false);
            setCentrePourEdition(null);
            setPositionProvisoire(null);
          }}
          surSucces={(message) => {
            rechargerCentres();
            afficherToast(message, 'succes');
            setModalAjoutCentreOuvert(false);
            setCentrePourEdition(null);
            setPositionProvisoire(null);
          }}
          surActiverPlacementCarte={gererActiverPlacementCarte}
          positionProvisoire={positionProvisoire}
        />
      )}

      {/* 5. Modal Importation GeoJSON (SIG / QGIS) */}
      <ModalImportGeoJSON
        ouvert={modalImportGeoJSONOuvert}
        utilisateur={utilisateur}
        surFermer={() => setModalImportGeoJSONOuvert(false)}
        surImportReussi={() => {
          rechargerCentres();
          afficherToast('Importation terminée avec succès.', 'succes');
        }}
      />

      {/* 6. Modal Authentification (Visiteur / Administrateur) */}
      <ModalAuthentification
        ouvert={modalAuthOuvert}
        surFermer={() => setModalAuthOuvert(false)}
        surSucces={(u) => {
          setUtilisateur(u);
          afficherToast(`Bienvenue, Administrateur (${u.email}) !`, 'succes');
        }}
      />

      {/* 7. Modal À Propos & Contexte CEDT Le G15 */}
      {modalAProposOuvert && (
        <SectionAPropos surFermer={() => setModalAProposOuvert(false)} />
      )}

      {/* 8. Pied de page discret */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-3 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong>FPT DAKAR</strong> — Système d'Information Géographique & Orientation
          </span>
          <span>Développé par le CEDT Le G15 au Sénégal • Données SIG Dakar</span>
        </div>
      </footer>
    </div>
  );
};
