import React from 'react';
import {
  Compass,
  Info,
  Download,
  Plus,
  Database,
  Shield,
  ShieldCheck,
  LogOut,
  LogIn,
} from 'lucide-react';
import { CentreFormation, UtilisateurConnecte } from '../types';
import { telechargerGeoJSON } from '../utilitaires/geojson';

interface EnTeteProps {
  centresFiltres: CentreFormation[];
  vueActuelle: 'carte' | 'liste' | 'statistiques' | 'apropos' | 'admin';
  surChangerVue: (vue: 'carte' | 'liste' | 'statistiques' | 'apropos' | 'admin') => void;
  surOuvrirAPropos: () => void;
  utilisateur: UtilisateurConnecte | null;
  surOuvrirConnexion: () => void;
  surDeconnexion: () => void;
  surOuvrirAjoutCentre?: () => void;
  surOuvrirImportGeoJSON?: () => void;
}

export const EnTete: React.FC<EnTeteProps> = ({
  centresFiltres,
  vueActuelle,
  surChangerVue,
  surOuvrirAPropos,
  utilisateur,
  surOuvrirConnexion,
  surDeconnexion,
  surOuvrirAjoutCentre,
  surOuvrirImportGeoJSON,
}) => {
  const estAdminPrincipal = utilisateur?.role === 'ADMINISTRATEUR';
  const estEditeur = utilisateur?.role === 'ADMINISTRATEUR' || utilisateur?.role === 'EDITOR';

  const gererTelechargementGeoJSON = () => {
    telechargerGeoJSON(centresFiltres, 'fpt_dakar_etablissements.geojson');
  };

  return (
    <header
      id="en-tete-principal"
      className="flex items-center justify-between px-3 sm:px-6 lg:px-8 py-3 bg-white border-b border-slate-200 shrink-0 shadow-xs z-30"
    >
      {/* Logo & Identité */}
      <div
        className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer"
        onClick={() => surChangerVue('carte')}
      >
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-900 flex items-center justify-center text-white shadow-xs shrink-0">
          <Compass className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-blue-900 leading-tight">
              FPT DAKAR
            </h1>
            <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200/60">
              CEDT Le G15
            </span>
          </div>
          <p className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:block">
            Cartographie et orientation vers la Formation Professionnelle et Technique
          </p>
        </div>
      </div>

      {/* Navigation Desktop */}
      <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
        <button
          id="menu-accueil"
          onClick={() => surChangerVue('carte')}
          className={`text-xs sm:text-sm transition-colors cursor-pointer ${
            vueActuelle === 'carte'
              ? 'font-bold text-blue-900 border-b-2 border-blue-900 pb-1'
              : 'font-medium text-slate-600 hover:text-blue-900'
          }`}
        >
          Accueil (Carte)
        </button>

        <button
          id="menu-centres"
          onClick={() => surChangerVue('liste')}
          className={`text-xs sm:text-sm transition-colors cursor-pointer ${
            vueActuelle === 'liste'
              ? 'font-bold text-blue-900 border-b-2 border-blue-900 pb-1'
              : 'font-medium text-slate-600 hover:text-blue-900'
          }`}
        >
          Centres ({centresFiltres.length})
        </button>

        <button
          id="menu-stats"
          onClick={() => surChangerVue('statistiques')}
          className={`text-xs sm:text-sm transition-colors cursor-pointer ${
            vueActuelle === 'statistiques'
              ? 'font-bold text-blue-900 border-b-2 border-blue-900 pb-1'
              : 'font-medium text-slate-600 hover:text-blue-900'
          }`}
        >
          Statistiques
        </button>

        {estEditeur && (
          <button
            id="menu-admin-dashboard"
            onClick={() => surChangerVue('admin')}
            className={`text-xs sm:text-sm transition-colors cursor-pointer flex items-center gap-1 ${
              vueActuelle === 'admin'
                ? 'font-bold text-blue-900 border-b-2 border-blue-900 pb-1'
                : 'font-medium text-emerald-800 hover:text-emerald-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{estAdminPrincipal ? 'Dashboard Admin' : 'Dashboard Édition'}</span>
          </button>
        )}

        <button
          id="menu-apropos"
          onClick={surOuvrirAPropos}
          className="text-xs sm:text-sm font-medium text-slate-600 hover:text-blue-900 transition-colors flex items-center space-x-1 cursor-pointer"
        >
          <Info className="w-4 h-4 text-slate-400" />
          <span>À propos</span>
        </button>
      </nav>

      {/* Barre d'outils et Espace Admin */}
      <div className="flex items-center space-x-2">
        {/* Actions réservées aux Administrateurs et Éditeurs */}
        {estEditeur && (
          <div className="hidden sm:flex items-center space-x-2 mr-1">
            {surOuvrirAjoutCentre && (
              <button
                id="bouton-ajouter-centre-en-tete"
                type="button"
                onClick={surOuvrirAjoutCentre}
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 transition-colors shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span>+ Ajouter un centre</span>
              </button>
            )}

            {surOuvrirImportGeoJSON && (
              <button
                id="bouton-import-geojson-en-tete"
                type="button"
                onClick={surOuvrirImportGeoJSON}
                title="Importer le GeoPackage / GeoJSON officiel dans Firestore"
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 mr-1 text-blue-900" />
                <span>Importer GeoJSON</span>
              </button>
            )}
          </div>
        )}

        {/* Export SIG GeoJSON */}
        <button
          id="bouton-telecharger-geojson"
          onClick={gererTelechargementGeoJSON}
          title="Exporter les données au format GeoJSON pour QGIS / SIG"
          className="hidden xl:inline-flex items-center px-3 py-1.5 border border-slate-200 text-xs font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 mr-1.5 text-blue-900" />
          SIG GeoJSON
        </button>

        {/* Bouton de statut Authentification / Admin */}
        {estEditeur ? (
          <div className="flex items-center space-x-2">
            <span
              id="indicateur-mode-edition"
              className="hidden md:inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Mode édition</span>
            </span>
            <button
              id="badge-mode-administration"
              type="button"
              onClick={() => surChangerVue('admin')}
              title="Accéder au tableau de bord"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold shadow-2xs cursor-pointer transition-colors ${
                vueActuelle === 'admin'
                  ? 'bg-blue-900 text-white border-blue-900'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>{estAdminPrincipal ? 'Admin' : 'Éditeur'}</span>
            </button>
            <button
              id="bouton-deconnexion-admin"
              type="button"
              onClick={surDeconnexion}
              title="Quitter le mode édition"
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50 border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Se déconnecter</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <span
              id="indicateur-mode-visiteur"
              className="hidden md:inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200"
            >
              <span>Mode visiteur</span>
            </span>
            <button
              id="bouton-connexion-admin"
              type="button"
              onClick={surOuvrirConnexion}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer gap-1.5"
            >
              <Shield className="w-3.5 h-3.5 text-slate-500" />
              <span>Connexion</span>
            </button>
          </div>
        )}

        {/* Sélecteur de vue pour mobile */}
        <div className="flex lg:hidden bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => surChangerVue('carte')}
            className={`px-2 py-1 text-xs rounded-md transition-all ${
              vueActuelle === 'carte'
                ? 'bg-white text-blue-900 shadow-xs font-bold'
                : 'text-slate-600 font-medium'
            }`}
          >
            Carte
          </button>
          <button
            onClick={() => surChangerVue('liste')}
            className={`px-2 py-1 text-xs rounded-md transition-all ${
              vueActuelle === 'liste'
                ? 'bg-white text-blue-900 shadow-xs font-bold'
                : 'text-slate-600 font-medium'
            }`}
          >
            Liste
          </button>
          {estEditeur && (
            <button
              onClick={() => surChangerVue('admin')}
              className={`px-2 py-1 text-xs rounded-md transition-all ${
                vueActuelle === 'admin'
                  ? 'bg-white text-blue-900 shadow-xs font-bold'
                  : 'text-emerald-800 font-medium'
              }`}
            >
              Admin
            </button>
          )}
          <button
            onClick={() => surChangerVue('statistiques')}
            className={`px-2 py-1 text-xs rounded-md transition-all ${
              vueActuelle === 'statistiques'
                ? 'bg-white text-blue-900 shadow-xs font-bold'
                : 'text-slate-600 font-medium'
            }`}
          >
            Stats
          </button>
        </div>
      </div>
    </header>
  );
};
