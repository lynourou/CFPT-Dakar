import React, { useState } from 'react';
import {
  ShieldCheck,
  Plus,
  Upload,
  LayoutList,
  Map as MapIcon,
  Columns,
  LogOut,
  ArrowLeft,
  Search,
  RotateCcw,
  SlidersHorizontal,
  Layers,
  History,
  Trash2,
  CheckCircle2,
  Download,
  Database,
  FileCheck,
  Sparkles,
} from 'lucide-react';
import {
  CentreFormation,
  FiltresCentres,
  StatistiquesCentres,
  UtilisateurConnecte,
} from '../types';
import { Statistiques } from './Statistiques';
import { PanneauFiltres } from './PanneauFiltres';
import { TableauCentres } from './TableauCentres';
import { Carte } from './Carte';
import { BarreRecherche } from './BarreRecherche';
import { ModalModificationMasse } from './ModalModificationMasse';
import { PageQualiteDonnees } from './PageQualiteDonnees';
import { PageHistorique } from './PageHistorique';
import { PageCorbeille } from './PageCorbeille';
import {
  exporterVersGeoJSON,
  exporterVersCSV,
  telechargerFichier,
} from '../services/centresService';

export type OngletAdmin = 'centres' | 'qualite' | 'audit' | 'corbeille' | 'exports';

interface DashboardAdminProps {
  utilisateur: UtilisateurConnecte;
  centres: CentreFormation[];
  centresFiltres: CentreFormation[];
  statistiques: StatistiquesCentres;
  filtres: FiltresCentres;
  optionsFiltres: {
    communes: string[];
    types: string[];
    statuts: string[];
    formations: string[];
    filieres: string[];
    diplomes: string[];
  };
  centreSelectionne: CentreFormation | null;
  centreEnDeplacement: CentreFormation | null;
  surChangementFiltre: <K extends keyof FiltresCentres>(cle: K, valeur: FiltresCentres[K]) => void;
  surReinitialiserFiltres: () => void;
  surSelectionnerCentre: (centre: CentreFormation) => void;
  surVoirCentre: (centre: CentreFormation) => void;
  surModifierCentre: (centre: CentreFormation) => void;
  surDeplacerCentre: (centre: CentreFormation) => void;
  surDemanderSuppression: (centre: CentreFormation) => void;
  surOuvrirAjout: () => void;
  surOuvrirImport: () => void;
  surDeconnexion: () => void;
  surRetourPublic: () => void;
  surValiderDeplacement: (centre: CentreFormation, nouvelleLat: number, nouvelleLng: number) => void;
  surAnnulerDeplacement: () => void;
  surCentresModifies?: () => void;
}

export const DashboardAdmin: React.FC<DashboardAdminProps> = ({
  utilisateur,
  centres,
  centresFiltres,
  statistiques,
  filtres,
  optionsFiltres,
  centreSelectionne,
  centreEnDeplacement,
  surChangementFiltre,
  surReinitialiserFiltres,
  surSelectionnerCentre,
  surVoirCentre,
  surModifierCentre,
  surDeplacerCentre,
  surDemanderSuppression,
  surOuvrirAjout,
  surOuvrirImport,
  surDeconnexion,
  surRetourPublic,
  surValiderDeplacement,
  surAnnulerDeplacement,
  surCentresModifies,
}) => {
  // Onglet actif dans le dashboard admin
  const [ongletActif, setOngletActif] = useState<OngletAdmin>('centres');

  // Mode d'affichage dans la vue "centres" : tableau seul, carte seule, ou mixte
  const [modeVue, setModeVue] = useState<'tableau' | 'mixte' | 'carte'>('tableau');
  const [filtresAvancesOuverts, setFiltresAvancesOuverts] = useState<boolean>(true);

  // Modal de modification en masse
  const [centresPourModificationMasse, setCentresPourModificationMasse] = useState<
    CentreFormation[] | null
  >(null);

  // Toast interne
  const [toastInterne, setToastInterne] = useState<{
    message: string;
    type: 'succes' | 'erreur';
  } | null>(null);

  const afficherNotification = (message: string, type: 'succes' | 'erreur' = 'succes') => {
    setToastInterne({ message, type });
    setTimeout(() => setToastInterne(null), 4000);
  };

  // Exporter un sous-ensemble ou tous les centres
  const gererExport = (liste: CentreFormation[], format: 'geojson' | 'csv', prefixe: string = 'fpt_centres') => {
    const timestamp = new Date().toISOString().slice(0, 10);
    if (format === 'geojson') {
      const geojson = exporterVersGeoJSON(liste);
      telechargerFichier(
        geojson,
        `${prefixe}_${timestamp}.geojson`,
        'application/geo+json;charset=utf-8;'
      );
      afficherNotification(`${liste.length} établissements exportés en GeoJSON.`);
    } else {
      const csv = exporterVersCSV(liste);
      telechargerFichier(
        csv,
        `${prefixe}_${timestamp}.csv`,
        'text/csv;charset=utf-8;'
      );
      afficherNotification(`${liste.length} établissements exportés en CSV.`);
    }
  };

  return (
    <div id="dashboard-admin-root" className="space-y-4 animate-fadeIn">
      {/* Toast interne admin */}
      {toastInterne && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl border flex items-center gap-3 transition-all animate-fadeIn ${
            toastInterne.type === 'succes'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : 'bg-red-900 text-white border-red-700'
          }`}
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastInterne.message}</span>
        </div>
      )}

      {/* 1. Barre supérieure du Dashboard Admin */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            id="bouton-retour-carte-public"
            type="button"
            onClick={surRetourPublic}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-900 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Retourner à la cartographie publique"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {utilisateur.role === 'ADMINISTRATEUR'
                  ? "Espace d'Administration FPT Dakar"
                  : "Espace d'Édition FPT Dakar"}
              </h2>
              {utilisateur.role === 'ADMINISTRATEUR' ? (
                <span
                  id="badge-admin-principal"
                  className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300"
                >
                  <ShieldCheck className="w-3 h-3 text-emerald-700" />
                  Administrateur Principal
                </span>
              ) : (
                <span
                  id="badge-editeur-invite"
                  className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300"
                >
                  <ShieldCheck className="w-3 h-3 text-blue-700" />
                  Éditeur Invité
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {utilisateur.role === 'ADMINISTRATEUR'
                ? `Compte Principal • ${utilisateur.email}`
                : `Compte Invité • ${utilisateur.email}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {/* Bouton Ajouter */}
          <button
            id="bouton-admin-ajouter-centre"
            type="button"
            onClick={surOuvrirAjout}
            className="inline-flex items-center px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>+ Ajouter un centre</span>
          </button>

          {/* Bouton Importer GeoJSON */}
          <button
            id="bouton-admin-importer-geojson"
            type="button"
            onClick={surOuvrirImport}
            className="inline-flex items-center px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Upload className="w-4 h-4 mr-1.5 text-blue-900" />
            <span className="hidden sm:inline">Importer GeoJSON</span>
            <span className="sm:hidden">Import</span>
          </button>

          {/* Déconnexion */}
          <button
            id="bouton-admin-deconnexion"
            type="button"
            onClick={surDeconnexion}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
            title="Se déconnecter de l'administration"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Barre d'onglets modulaire de l'administrateur */}
      <div className="bg-white rounded-xl border border-slate-200 p-1.5 shadow-2xs overflow-x-auto flex items-center gap-1.5 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setOngletActif('centres')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer shrink-0 ${
            ongletActif === 'centres'
              ? 'bg-blue-900 text-white font-bold shadow-xs'
              : 'text-slate-600 hover:text-blue-900 hover:bg-slate-50'
          }`}
        >
          <LayoutList className="w-4 h-4" />
          <span>Établissements & Carte</span>
          <span className="ml-1 text-[10px] bg-white/20 px-1.5 py-0.2 rounded">
            {centres.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setOngletActif('qualite')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer shrink-0 ${
            ongletActif === 'qualite'
              ? 'bg-blue-900 text-white font-bold shadow-xs'
              : 'text-slate-600 hover:text-blue-900 hover:bg-slate-50'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Contrôle Qualité</span>
        </button>

        <button
          type="button"
          onClick={() => setOngletActif('audit')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer shrink-0 ${
            ongletActif === 'audit'
              ? 'bg-blue-900 text-white font-bold shadow-xs'
              : 'text-slate-600 hover:text-blue-900 hover:bg-slate-50'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Journal d'Audit</span>
        </button>

        <button
          type="button"
          onClick={() => setOngletActif('corbeille')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer shrink-0 ${
            ongletActif === 'corbeille'
              ? 'bg-blue-900 text-white font-bold shadow-xs'
              : 'text-slate-600 hover:text-blue-900 hover:bg-slate-50'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          <span>Corbeille</span>
        </button>

        <button
          type="button"
          onClick={() => setOngletActif('exports')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer shrink-0 ${
            ongletActif === 'exports'
              ? 'bg-blue-900 text-white font-bold shadow-xs'
              : 'text-slate-600 hover:text-blue-900 hover:bg-slate-50'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Sauvegardes & Exports</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* VUE 1 : ÉTABLISSEMENTS & CARTE */}
      {/* ========================================================= */}
      {ongletActif === 'centres' && (
        <div className="space-y-4">
          {/* Statistiques rapides */}
          <Statistiques statistiques={statistiques} modeAdmin={true} />

          {/* Recherche et filtres */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex-1 max-w-xl">
                <BarreRecherche
                  valeur={filtres.recherche}
                  surChangement={(v) => surChangementFiltre('recherche', v)}
                  surReinitialiser={() => surChangementFiltre('recherche', '')}
                  placeholder="Rechercher par nom, nom officiel, commune, formation, filière..."
                />
              </div>

              {/* Sélecteur de vue (Tableau / Mixte / Carte) */}
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600">
                  <button
                    id="bouton-vue-tableau"
                    type="button"
                    onClick={() => setModeVue('tableau')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                      modeVue === 'tableau'
                        ? 'bg-white text-blue-900 shadow-xs font-bold'
                        : 'hover:text-blue-900'
                    }`}
                  >
                    <LayoutList className="w-3.5 h-3.5" />
                    <span>Tableau</span>
                  </button>

                  <button
                    id="bouton-vue-mixte"
                    type="button"
                    onClick={() => setModeVue('mixte')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                      modeVue === 'mixte'
                        ? 'bg-white text-blue-900 shadow-xs font-bold'
                        : 'hover:text-blue-900'
                    }`}
                  >
                    <Columns className="w-3.5 h-3.5" />
                    <span>Tableau + Carte</span>
                  </button>

                  <button
                    id="bouton-vue-carte"
                    type="button"
                    onClick={() => setModeVue('carte')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                      modeVue === 'carte'
                        ? 'bg-white text-blue-900 shadow-xs font-bold'
                        : 'hover:text-blue-900'
                    }`}
                  >
                    <MapIcon className="w-3.5 h-3.5" />
                    <span>Carte</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setFiltresAvancesOuverts(!filtresAvancesOuverts)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-blue-900" />
                  <span>{filtresAvancesOuverts ? 'Masquer filtres' : 'Filtres'}</span>
                </button>
              </div>
            </div>

            {filtresAvancesOuverts && (
              <div className="pt-2 border-t border-slate-100">
                <PanneauFiltres
                  filtres={filtres}
                  surChangementFiltre={surChangementFiltre}
                  surReinitialiser={surReinitialiserFiltres}
                  optionsCommunes={optionsFiltres.communes}
                  optionsTypes={optionsFiltres.types}
                  optionsFilieres={optionsFiltres.filieres}
                  optionsDiplomes={optionsFiltres.diplomes}
                  optionsStatuts={optionsFiltres.statuts}
                  optionsFormations={optionsFiltres.formations}
                  totalTrouves={centresFiltres.length}
                  dispositionHorizontale={true}
                />
              </div>
            )}
          </div>

            {/* Zone principale : Tableau et/ou Carte synchronisée */}
          <div id="zone-gestion-contenu">
            {modeVue === 'tableau' && (
              <TableauCentres
                centres={centresFiltres}
                centreSelectionne={centreSelectionne}
                surSelectionner={surSelectionnerCentre}
                surVoir={surVoirCentre}
                surModifier={surModifierCentre}
                surDeplacer={(centre) => {
                  setModeVue('mixte');
                  surDeplacerCentre(centre);
                }}
                surDemanderSuppression={surDemanderSuppression}
                surAjouter={surOuvrirAjout}
                surImporter={surOuvrirImport}
                surModifierEnMasse={(selection) => setCentresPourModificationMasse(selection)}
                surExporterSelection={(selection, fmt) =>
                  gererExport(selection, fmt, 'fpt_selection')
                }
              />
            )}

            {modeVue === 'mixte' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch min-h-[580px]">
                <div className="lg:col-span-6 flex flex-col min-h-0">
                  <TableauCentres
                    centres={centresFiltres}
                    centreSelectionne={centreSelectionne}
                    surSelectionner={surSelectionnerCentre}
                    surVoir={surVoirCentre}
                    surModifier={surModifierCentre}
                    surDeplacer={(centre) => surDeplacerCentre(centre)}
                    surDemanderSuppression={surDemanderSuppression}
                    surAjouter={surOuvrirAjout}
                    surImporter={surOuvrirImport}
                    surModifierEnMasse={(selection) =>
                      setCentresPourModificationMasse(selection)
                    }
                    surExporterSelection={(selection, fmt) =>
                      gererExport(selection, fmt, 'fpt_selection')
                    }
                  />
                </div>

                <div className="lg:col-span-6 h-[460px] lg:h-auto min-h-[460px] flex flex-col">
                  <Carte
                    centres={centresFiltres}
                    centreSelectionne={centreSelectionne}
                    surSelectionnerCentre={surSelectionnerCentre}
                    surOuvrirFiche={surVoirCentre}
                    centreEnDeplacement={centreEnDeplacement}
                    surValiderDeplacement={surValiderDeplacement}
                    surAnnulerDeplacement={surAnnulerDeplacement}
                  />
                </div>
              </div>
            )}

            {modeVue === 'carte' && (
              <div className="h-[600px] flex flex-col">
                <Carte
                  centres={centresFiltres}
                  centreSelectionne={centreSelectionne}
                  surSelectionnerCentre={surSelectionnerCentre}
                  surOuvrirFiche={surVoirCentre}
                  centreEnDeplacement={centreEnDeplacement}
                  surValiderDeplacement={surValiderDeplacement}
                  surAnnulerDeplacement={surAnnulerDeplacement}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VUE 2 : CONTRÔLE QUALITÉ DES DONNÉES */}
      {/* ========================================================= */}
      {ongletActif === 'qualite' && (
        <PageQualiteDonnees
          centres={centres}
          surVoirCentre={surVoirCentre}
          surModifierCentre={surModifierCentre}
        />
      )}

      {/* ========================================================= */}
      {/* VUE 3 : JOURNAL D'AUDIT ET RESTAURATION */}
      {/* ========================================================= */}
      {ongletActif === 'audit' && (
        <PageHistorique
          utilisateur={utilisateur}
          surNotification={afficherNotification}
          surCentresModifies={() => surCentresModifies?.()}
        />
      )}

      {/* ========================================================= */}
      {/* VUE 4 : CORBEILLE ET SUPPRESSION DÉFINITIVE */}
      {/* ========================================================= */}
      {ongletActif === 'corbeille' && (
        <PageCorbeille
          utilisateur={utilisateur}
          surNotification={afficherNotification}
          surCentresModifies={() => surCentresModifies?.()}
        />
      )}

      {/* ========================================================= */}
      {/* VUE 5 : SAUVEGARDES & EXPORTS SIG */}
      {/* ========================================================= */}
      {ongletActif === 'exports' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              Exportations et Sauvegardes de Données
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Téléchargez la totalité ou une sélection des établissements dans les formats standards
              utilisés par les SIG (QGIS) et les tableurs (Excel, Calc).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Carte Export GeoJSON */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Format GeoJSON (.geojson)</h4>
                    <span className="text-[11px] text-slate-400">Recommandé pour QGIS, ArcGIS, Mapbox</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Génère un fichier <code>FeatureCollection</code> conforme à la spécification RFC 7946,
                  avec toutes les géométries en WGS84 EPSG:4326 et l'ensemble des métadonnées associées.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => gererExport(centres, 'geojson', 'fpt_dakar_complet')}
                  disabled={centres.length === 0}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 transition-colors shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exporter tous les {centres.length} centres</span>
                </button>

                {centresFiltres.length !== centres.length && (
                  <button
                    type="button"
                    onClick={() => gererExport(centresFiltres, 'geojson', 'fpt_dakar_filtres')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Filtre actif ({centresFiltres.length})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Carte Export CSV */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-900 flex items-center justify-center">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Format Tabulaire CSV (.csv)</h4>
                    <span className="text-[11px] text-slate-400">Recommandé pour Excel, Google Sheets, LibreOffice</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Fichier encodé en UTF-8 avec séparateur virgule, compatible avec tous les tableurs.
                  Comprend les colonnes d'identification, administratives, de contact et les coordonnées GPS.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => gererExport(centres, 'csv', 'fpt_dakar_complet')}
                  disabled={centres.length === 0}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exporter tous les {centres.length} centres</span>
                </button>

                {centresFiltres.length !== centres.length && (
                  <button
                    type="button"
                    onClick={() => gererExport(centresFiltres, 'csv', 'fpt_dakar_filtres')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Filtre actif ({centresFiltres.length})</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de modification en masse */}
      {centresPourModificationMasse && (
        <ModalModificationMasse
          centresSelectionnes={centresPourModificationMasse}
          optionsCommunes={optionsFiltres.communes}
          optionsTypes={optionsFiltres.types}
          optionsStatuts={optionsFiltres.statuts}
          utilisateur={utilisateur}
          surFermer={() => setCentresPourModificationMasse(null)}
          surSucces={(nb) => {
            afficherNotification(
              `${nb} établissement${nb > 1 ? 's ont été mis' : ' a été mis'} à jour avec succès.`
            );
            surCentresModifies?.();
          }}
        />
      )}
    </div>
  );
};
