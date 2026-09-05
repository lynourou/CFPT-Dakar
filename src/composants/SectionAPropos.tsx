import React from 'react';
import { X, Map, Compass, GraduationCap, Database, CheckCircle2, HeartHandshake } from 'lucide-react';

interface SectionAProposProps {
  surFermer: () => void;
}

export const SectionAPropos: React.FC<SectionAProposProps> = ({ surFermer }) => {
  return (
    <div
      id="modal-apropos-overlay"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={surFermer}
    >
      <div
        id="modal-apropos-contenu"
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="bg-slate-900 text-white p-6 relative">
          <button
            id="bouton-fermer-apropos"
            type="button"
            onClick={surFermer}
            className="absolute top-4 right-4 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-blue-400 mb-2 border border-slate-700">
            <Compass className="w-3.5 h-3.5" />
            <span>Initiative CEDT Le G15 • Sénégal</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">À propos de FPT DAKAR</h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Cartographie et orientation vers la Formation Professionnelle et Technique
          </p>
        </div>

        {/* Corps */}
        <div className="p-6 space-y-5 text-slate-700 text-sm leading-relaxed overflow-y-auto max-h-[70vh]">
          <div>
            <h3 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-900" />
              Contexte & Mission
            </h3>
            <p className="text-xs sm:text-sm text-slate-600">
              Le projet <strong>FPT DAKAR</strong> est initié et développé par le{' '}
              <strong>CEDT Le G15</strong> (Centre d'Enseignement et de Développement Technique) au
              Sénégal.
            </p>
            <p className="mt-2 text-xs sm:text-sm text-slate-600">
              L'objectif fondamental est de cartographier l'ensemble des établissements de Formation
              Professionnelle et Technique (FPT) de la région de Dakar et de mettre à disposition des
              jeunes, des apprenants, des parents et des professionnels une plateforme numérique
              intuitive et géoréférencée pour trouver rapidement un établissement et une filière
              adaptés à leurs aspirations.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-900" />
              Base de données SIG & QGIS
            </h3>
            <p className="text-xs text-slate-600">
              La base de connaissances du projet recense actuellement environ <strong>190 établissements</strong>{' '}
              de FPT dans la presqu'île de Dakar et ses départements (Dakar, Pikine, Guédiawaye, Keur Massar,
              Rufisque).
            </p>
            <p className="text-xs text-slate-600">
              Issu d'un travail géomatique rigoureux sous <strong>QGIS</strong>, le géoréférencement repose sur des
              coordonnées géographiques WGS84 précises et des attributs normalisés compatibles GeoJSON et
              GeoPackage.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm mb-2">Axes prioritaires de la plateforme :</h3>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Cartographie interactive :</strong> Visualisation spatiale des établissements publics et privés.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Orientation multicritère :</strong> Recherche croisée par filière (BTP, Numérique, Énergie, Artisanat...), diplôme (CAP, BT, BTS, Licence Pro) et commune.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Accompagnement de la jeunesse :</strong> Faciliter l'accès aux opportunités d'insertion et aux métiers porteurs de l'économie sénégalaise.
                </span>
              </li>
            </ul>
          </div>

          <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500 gap-2">
            <div>
              <p className="font-semibold text-slate-800">CEDT « Le G15 » Dakar, Sénégal</p>
              <p className="text-slate-500">Section Géomatique & Systèmes d'Information</p>
            </div>
            <span className="text-[11px] bg-slate-100 px-2.5 py-1 rounded-md text-slate-600 font-mono">
              Version MVP 1.0 (Cartographie)
            </span>
          </div>
        </div>

        {/* Pied */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={surFermer}
            className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
