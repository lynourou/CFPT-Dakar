import React, { useState } from 'react';
import {
  X,
  MapPin,
  Building,
  GraduationCap,
  Award,
  Phone,
  Mail,
  Globe,
  Calendar,
  Users,
  Database,
  Navigation,
  ExternalLink,
  Edit,
  Trash2,
  Move,
  AlertTriangle,
  Share2,
  Check,
  Bot,
} from 'lucide-react';
import { CentreFormation } from '../types';
import AssistantIA from './AssistantIA';

interface FicheCentreProps {
  centre: CentreFormation | null;
  estAdmin: boolean;
  surFermer: () => void;
  surLocaliserSurCarte?: (centre: CentreFormation) => void;
  surModifier?: (centre: CentreFormation) => void;
  surDeplacer?: (centre: CentreFormation) => void;
  surSupprimer?: (centre: CentreFormation) => Promise<void>;
}

export const FicheCentre: React.FC<FicheCentreProps> = ({
  centre,
  estAdmin,
  surFermer,
  surLocaliserSurCarte,
  surModifier,
  surDeplacer,
  surSupprimer,
}) => {
  const [confirmationSuppression, setConfirmationSuppression] =
    useState(false);

  const [suppressionEnCours, setSuppressionEnCours] =
    useState(false);

  const [lienCopie, setLienCopie] =
    useState(false);

  const [assistantIAOuvert, setAssistantIAOuvert] =
    useState(false);

  if (!centre) return null;

  const gererPartage = () => {
    const url = new URL(window.location.href);

    url.searchParams.set(
      'centre',
      String(centre.id)
    );

    navigator.clipboard.writeText(url.toString());

    setLienCopie(true);

    setTimeout(
      () => setLienCopie(false),
      2500
    );
  };

  // Validation des champs pour éviter tout affichage de undefined, null ou NaN
  const valeurValide = (v: any): boolean => {
    if (v === undefined || v === null) return false;

    if (
      typeof v === 'string' &&
      (
        v.trim() === '' ||
        v.trim().toLowerCase() === 'null' ||
        v.trim().toLowerCase() === 'undefined'
      )
    ) {
      return false;
    }

    if (
      typeof v === 'number' &&
      isNaN(v)
    ) {
      return false;
    }

    return true;
  };

  const gererConfirmationSuppression = async () => {
    if (!surSupprimer) return;

    setSuppressionEnCours(true);

    try {
      await surSupprimer(centre);
      surFermer();
    } catch (err) {
      console.error(
        'Erreur suppression:',
        err
      );
    } finally {
      setSuppressionEnCours(false);
    }
  };

  return (
    <>
      {/* =========================================================
          FICHE CENTRE
          ========================================================= */}

      <div
        id="fiche-centre-modal-overlay"
        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn"
        onClick={surFermer}
      >
        <div
          id="fiche-centre-modal-contenu"
          className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative max-h-[90vh] flex flex-col my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* =====================================================
              EN-TÊTE
              ===================================================== */}

          <div className="bg-slate-900 text-white p-5 sm:p-6 relative shrink-0">

            <button
              id="bouton-fermer-fiche-haut"
              type="button"
              onClick={surFermer}
              aria-label="Fermer la fiche détaillée"
              className="absolute top-4 right-4 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Badges Type, Statut, Commune */}

            <div className="flex flex-wrap items-center gap-2 mb-2 pr-10">

              {valeurValide(centre.type) && (
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    centre.type === 'Public'
                      ? 'bg-blue-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {centre.type}
                </span>
              )}

              {valeurValide(centre.statut) && (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  {centre.statut}
                </span>
              )}

              {valeurValide(centre.commune) && (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-blue-400" />
                  {centre.commune}
                </span>
              )}

            </div>

            {/* Nom du centre */}

            <h2
              id="fiche-titre-centre"
              className="text-lg sm:text-xl font-bold tracking-tight text-white leading-tight"
            >
              {centre.nom}
            </h2>

            {/* Nom officiel */}

            {valeurValide(centre.nom_officiel) &&
              centre.nom_officiel !== centre.nom && (
                <p className="text-xs sm:text-sm text-slate-400 mt-1 italic">
                  {centre.nom_officiel}
                </p>
              )}

          </div>

          {/* =====================================================
              CORPS DE LA FICHE
              ===================================================== */}

          <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-800">

            {/* Photo */}

            {valeurValide(centre.photo) && (
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 max-h-56">

                <img
                  src={centre.photo}
                  alt={centre.nom}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />

              </div>
            )}

            {/* =================================================
                CONFIRMATION SUPPRESSION
                ================================================= */}

            {confirmationSuppression && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 space-y-3">

                <div className="flex items-start gap-2">

                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />

                  <div>

                    <h4 className="font-bold text-sm text-red-900">
                      Voulez-vous vraiment supprimer cet établissement ?
                    </h4>

                    <p className="text-xs text-red-700 mt-0.5">
                      Cette action supprimera définitivement
                      « {centre.nom} » de la base Firestore.
                    </p>

                  </div>

                </div>

                <div className="flex items-center justify-end gap-2 pt-1">

                  <button
                    type="button"
                    onClick={() =>
                      setConfirmationSuppression(false)
                    }
                    disabled={suppressionEnCours}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 cursor-pointer"
                  >
                    Annuler
                  </button>

                  <button
                    type="button"
                    onClick={gererConfirmationSuppression}
                    disabled={suppressionEnCours}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    {suppressionEnCours
                      ? 'Suppression...'
                      : 'Supprimer'}
                  </button>

                </div>

              </div>
            )}

            {/* =================================================
                DESCRIPTION
                ================================================= */}

            {valeurValide(centre.description) && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">

                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Présentation de l'établissement
                </h3>

                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {centre.description}
                </p>

              </div>
            )}

            {/* =================================================
                FORMATIONS / FILIÈRES / DIPLÔMES
                ================================================= */}

            {(
              valeurValide(centre.formation) ||
              valeurValide(centre.filiere) ||
              valeurValide(centre.diplomes)
            ) && (

              <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white shadow-2xs">

                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">

                  <GraduationCap className="w-3.5 h-3.5 text-blue-900" />

                  Offre pédagogique & Diplômes

                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">

                  {valeurValide(centre.formation) && (
                    <div className="space-y-0.5">

                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Type de formation
                      </span>

                      <p className="font-semibold text-slate-800">
                        {centre.formation}
                      </p>

                    </div>
                  )}

                  {valeurValide(centre.filiere) && (
                    <div className="space-y-0.5">

                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Filière / Spécialité
                      </span>

                      <p className="font-semibold text-blue-900">
                        {centre.filiere}
                      </p>

                    </div>
                  )}

                  {valeurValide(centre.diplomes) && (
                    <div className="sm:col-span-2 space-y-0.5">

                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Diplômes délivrés
                      </span>

                      <div className="flex flex-wrap gap-1.5 mt-1">

                        {centre.diplomes
                          ?.split(',')
                          .map((diplome, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/60"
                            >
                              <Award className="w-3 h-3 mr-1 text-blue-600" />
                              {diplome.trim()}
                            </span>
                          ))}

                      </div>

                    </div>
                  )}

                </div>

              </div>
            )}

            {/* =================================================
                CONTACTS
                ================================================= */}

            {(
              valeurValide(centre.adresse) ||
              valeurValide(centre.telephone) ||
              valeurValide(centre.email) ||
              valeurValide(centre.site_web)
            ) && (

              <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white shadow-2xs">

                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">

                  <Building className="w-3.5 h-3.5 text-blue-900" />

                  Contacts & Localisation

                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">

                  {valeurValide(centre.adresse) && (
                    <div className="sm:col-span-2 flex items-start gap-2">

                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />

                      <div>

                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          Adresse physique
                        </span>

                        <span className="text-slate-800 font-medium">
                          {centre.adresse}
                        </span>

                      </div>

                    </div>
                  )}

                  {valeurValide(centre.telephone) && (
                    <div className="flex items-center gap-2">

                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />

                      <div>

                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          Téléphone
                        </span>

                        <a
                          href={`tel:${centre.telephone?.replace(/\s+/g, '')}`}
                          className="text-blue-600 font-semibold hover:underline"
                        >
                          {centre.telephone}
                        </a>

                      </div>

                    </div>
                  )}

                  {valeurValide(centre.email) && (
                    <div className="flex items-center gap-2">

                      <Mail className="w-4 h-4 text-slate-400 shrink-0" />

                      <div className="min-w-0">

                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          Courriel
                        </span>

                        <a
                          href={`mailto:${centre.email}`}
                          className="text-blue-600 font-medium hover:underline truncate block"
                        >
                          {centre.email}
                        </a>

                      </div>

                    </div>
                  )}

                  {valeurValide(centre.site_web) && (
                    <div className="sm:col-span-2 flex items-center gap-2">

                      <Globe className="w-4 h-4 text-slate-400 shrink-0" />

                      <div>

                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          Site Internet officiel
                        </span>

                        <a
                          href={centre.site_web}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-blue-600 font-medium hover:underline inline-flex items-center gap-1"
                        >
                          {centre.site_web}

                          <ExternalLink className="w-3 h-3" />
                        </a>

                      </div>

                    </div>
                  )}

                </div>

              </div>
            )}

            {/* =================================================
                RENSEIGNEMENTS COMPLÉMENTAIRES
                ================================================= */}

            {(
              valeurValide(centre.capacite) ||
              valeurValide(centre.date_creation) ||
              valeurValide(centre.source)
            ) && (

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                {valeurValide(centre.capacite) && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">

                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">

                      <Users className="w-3.5 h-3.5 text-slate-400" />

                      Capacité d'accueil

                    </span>

                    <span className="text-sm font-bold text-slate-900 block mt-0.5">
                      {centre.capacite} apprenants
                    </span>

                  </div>
                )}

                {valeurValide(centre.date_creation) && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">

                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">

                      <Calendar className="w-3.5 h-3.5 text-slate-400" />

                      Année de création

                    </span>

                    <span className="text-sm font-bold text-slate-900 block mt-0.5">
                      {centre.date_creation}
                    </span>

                  </div>
                )}

                {valeurValide(centre.source) && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">

                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">

                      <Database className="w-3.5 h-3.5 text-slate-400" />

                      Source SIG

                    </span>

                    <span
                      className="text-xs font-semibold text-slate-800 block mt-0.5 truncate"
                      title={centre.source}
                    >
                      {centre.source}
                    </span>

                  </div>
                )}

              </div>
            )}

            {/* =================================================
                COORDONNÉES
                ================================================= */}

            {valeurValide(centre.latitude) &&
              valeurValide(centre.longitude) && (

                <div className="p-3 rounded-xl bg-slate-900 text-slate-200 text-xs flex flex-wrap items-center justify-between gap-2">

                  <div className="flex items-center space-x-2">

                    <Navigation className="w-4 h-4 text-blue-400 shrink-0" />

                    <span>
                      <strong>Coordonnées GPS :</strong>{' '}
                      {Number(centre.latitude).toFixed(5)}° N,{' '}
                      {Number(centre.longitude).toFixed(5)}° O
                    </span>

                  </div>

                  <span className="text-[10px] text-slate-400 font-mono">
                    Système WGS84 (EPSG:4326)
                  </span>

                </div>
              )}

          </div>

          {/* =====================================================
              BARRE D'ACTIONS
              ===================================================== */}

          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">

            <div className="flex flex-wrap items-center gap-2">

              {/* Centrer sur la carte */}

              {surLocaliserSurCarte && (
                <button
                  id="bouton-localiser-carte-depuis-fiche"
                  type="button"
                  onClick={() => {
                    surLocaliserSurCarte(centre);
                    surFermer();
                  }}
                  className="inline-flex items-center px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5 mr-1.5" />
                  Centrer sur la carte
                </button>
              )}

              {/* Partager */}

              <button
                id="bouton-partager-fiche"
                type="button"
                onClick={gererPartage}
                className="inline-flex items-center px-3 py-2 rounded-lg text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Copier le lien direct vers cette fiche"
              >
                {lienCopie ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                    <span className="text-emerald-700">
                      Lien copié !
                    </span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 mr-1.5 text-blue-900" />
                    <span>Partager</span>
                  </>
                )}
              </button>

              {/* =================================================
                  ACTIONS ADMINISTRATEUR
                  ================================================= */}

              {estAdmin && (
                <>

                  {/* Assistant IA */}

                  <button
                    id="bouton-assistant-ia-fiche"
                    type="button"
                    onClick={() =>
                      setAssistantIAOuvert(true)
                    }
                    className="inline-flex items-center px-3 py-2 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer shadow-sm"
                    title="Rechercher et vérifier les informations de cet établissement avec l'IA"
                  >
                    <Bot className="w-3.5 h-3.5 mr-1.5" />
                    Assistant IA
                  </button>

                  {/* Modifier */}

                  {surModifier && (
                    <button
                      id="bouton-modifier-centre-fiche"
                      type="button"
                      onClick={() => surModifier(centre)}
                      className="inline-flex items-center px-3 py-2 rounded-lg text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5 mr-1.5 text-blue-900" />
                      Modifier
                    </button>
                  )}

                  {/* Déplacer */}

                  {surDeplacer && (
                    <button
                      id="bouton-deplacer-centre-fiche"
                      type="button"
                      onClick={() => {
                        surDeplacer(centre);
                        surFermer();
                      }}
                      className="inline-flex items-center px-3 py-2 rounded-lg text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <Move className="w-3.5 h-3.5 mr-1.5 text-blue-900" />
                      Déplacer sur la carte
                    </button>
                  )}

                  {/* Supprimer */}

                  {surSupprimer && (
                    <button
                      id="bouton-supprimer-centre-fiche"
                      type="button"
                      onClick={() =>
                        setConfirmationSuppression(true)
                      }
                      className="inline-flex items-center px-3 py-2 rounded-lg text-xs font-bold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5 text-red-600" />
                      Supprimer
                    </button>
                  )}

                </>
              )}

            </div>

            {/* Fermer */}

            <button
              id="bouton-fermer-fiche-bas"
              type="button"
              onClick={surFermer}
              className="ml-auto px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Fermer
            </button>

          </div>

        </div>
      </div>

      {/* =========================================================
          ASSISTANT IA
          ========================================================= */}

      {assistantIAOuvert && (
        <AssistantIA
          centre={centre}
          surFermer={() =>
            setAssistantIAOuvert(false)
          }
        />
      )}
    </>
  );
};
