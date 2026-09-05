import React, { useState, useRef } from 'react';
import {
  X,
  Save,
  MapPin,
  Upload,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2,
  Navigation,
} from 'lucide-react';
import { CentreFormation } from '../types';
import { ajouterCentre, modifierCentre } from '../services/centresService';
import { televerserPhotoCentre } from '../services/storageService';

interface FormulaireCentreProps {
  centrePourEdition?: CentreFormation | null;
  ouvert: boolean;
  surFermer: () => void;
  surSucces: (message: string) => void;
  surActiverPlacementCarte?: (positionActuelle?: { latitude: number; longitude: number }) => void;
  positionProvisoire?: { latitude: number; longitude: number } | null;
}

export const FormulaireCentre: React.FC<FormulaireCentreProps> = ({
  centrePourEdition,
  ouvert,
  surFermer,
  surSucces,
  surActiverPlacementCarte,
  positionProvisoire,
}) => {
  const estEdition = Boolean(centrePourEdition);

  // État local des champs du formulaire
  const [nom, setNom] = useState(centrePourEdition?.nom || '');
  const [nomOfficiel, setNomOfficiel] = useState(centrePourEdition?.nom_officiel || '');
  const [type, setType] = useState(centrePourEdition?.type || 'Public');
  const [statut, setStatut] = useState(centrePourEdition?.statut || 'Homologué');
  const [commune, setCommune] = useState(centrePourEdition?.commune || '');
  const [adresse, setAdresse] = useState(centrePourEdition?.adresse || '');
  const [telephone, setTelephone] = useState(centrePourEdition?.telephone || '');
  const [email, setEmail] = useState(centrePourEdition?.email || '');
  const [siteWeb, setSiteWeb] = useState(centrePourEdition?.site_web || '');
  const [formation, setFormation] = useState(centrePourEdition?.formation || '');
  const [filiere, setFiliere] = useState(centrePourEdition?.filiere || '');
  const [diplomes, setDiplomes] = useState(centrePourEdition?.diplomes || '');
  const [dateCreation, setDateCreation] = useState(centrePourEdition?.date_creation || '');
  const [description, setDescription] = useState(centrePourEdition?.description || '');
  const [capacite, setCapacite] = useState<string>(
    centrePourEdition?.capacite !== undefined ? String(centrePourEdition.capacite) : ''
  );
  const [photoUrl, setPhotoUrl] = useState(centrePourEdition?.photo || '');
  const [source, setSource] = useState(centrePourEdition?.source || 'CEDT Le G15 - SIG');

  // Coordonnées (soit de l'édition, soit de la position provisoire cliquée sur la carte, soit 14.72 / -17.38)
  const [latitude, setLatitude] = useState<string>(
    positionProvisoire
      ? String(positionProvisoire.latitude)
      : centrePourEdition
      ? String(centrePourEdition.latitude)
      : '14.7200'
  );
  const [longitude, setLongitude] = useState<string>(
    positionProvisoire
      ? String(positionProvisoire.longitude)
      : centrePourEdition
      ? String(centrePourEdition.longitude)
      : '-17.3800'
  );

  // Synchronisation si une position provisoire a été cliquée sur la carte
  React.useEffect(() => {
    if (positionProvisoire) {
      setLatitude(String(positionProvisoire.latitude));
      setLongitude(String(positionProvisoire.longitude));
    }
  }, [positionProvisoire]);

  // État de chargement et messages
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [televersementEnCours, setTeleversementEnCours] = useState(false);
  const refFileInput = useRef<HTMLInputElement>(null);

  if (!ouvert) return null;

  // Gestion du téléversement de la photo
  const gererSelectionFichier = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichiers = e.target.files;
    if (!fichiers || fichiers.length === 0) return;
    const fichier = fichiers[0];

    const tempId = centrePourEdition ? centrePourEdition.id : `nouveau_${Date.now()}`;
    setTeleversementEnCours(true);
    setErreur(null);

    try {
      const url = await televerserPhotoCentre(tempId, fichier);
      setPhotoUrl(url);
    } catch (err) {
      console.error('Erreur photo:', err);
      setErreur('Impossible de téléverser la photo sur Firebase Storage.');
    } finally {
      setTeleversementEnCours(false);
    }
  };

  const gererSoumission = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);

    if (!nom.trim()) {
      setErreur('Le nom de l’établissement est obligatoire.');
      return;
    }

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    if (isNaN(latNum) || isNaN(lngNum)) {
      setErreur('Les coordonnées géographiques (latitude et longitude) doivent être des nombres valides.');
      return;
    }

    setChargement(true);

    try {
      if (estEdition && centrePourEdition) {
        // Modification d'un établissement existant
        await modifierCentre(centrePourEdition.id, {
          nom: nom.trim(),
          nom_officiel: nomOfficiel.trim() || undefined,
          type: type.trim() || undefined,
          statut: statut.trim() || undefined,
          commune: commune.trim() || undefined,
          adresse: adresse.trim() || undefined,
          telephone: telephone.trim() || undefined,
          email: email.trim() || undefined,
          site_web: siteWeb.trim() || undefined,
          formation: formation.trim() || undefined,
          filiere: filiere.trim() || undefined,
          diplomes: diplomes.trim() || undefined,
          date_creation: dateCreation.trim() || undefined,
          description: description.trim() || undefined,
          capacite: capacite.trim() ? Number(capacite) : undefined,
          photo: photoUrl.trim() || undefined,
          source: source.trim() || undefined,
          latitude: latNum,
          longitude: lngNum,
        });
        surSucces('Modifications enregistrées avec succès.');
      } else {
        // Ajout d'un nouvel établissement
        // On génère un id basé sur le timestamp ou un ID numérique unique
        const nouvelId = Date.now();
        await ajouterCentre({
          id: nouvelId,
          nom: nom.trim(),
          nom_officiel: nomOfficiel.trim() || undefined,
          type: type.trim() || undefined,
          statut: statut.trim() || undefined,
          commune: commune.trim() || undefined,
          adresse: adresse.trim() || undefined,
          telephone: telephone.trim() || undefined,
          email: email.trim() || undefined,
          site_web: siteWeb.trim() || undefined,
          formation: formation.trim() || undefined,
          filiere: filiere.trim() || undefined,
          diplomes: diplomes.trim() || undefined,
          date_creation: dateCreation.trim() || undefined,
          description: description.trim() || undefined,
          capacite: capacite.trim() ? Number(capacite) : undefined,
          photo: photoUrl.trim() || undefined,
          source: source.trim() || undefined,
          latitude: latNum,
          longitude: lngNum,
        });
        surSucces('Modifications enregistrées avec succès.');
      }
      surFermer();
    } catch (err: any) {
      console.error("Erreur lors de l'enregistrement :", err);
      setErreur("Impossible d'enregistrer les modifications.");
    } finally {
      setChargement(false);
    }
  };

  return (
    <div
      id="modal-formulaire-centre-overlay"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn"
      onClick={surFermer}
    >
      <div
        id="modal-formulaire-centre-contenu"
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative max-h-[92vh] flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 relative shrink-0">
          <button
            id="bouton-fermer-formulaire"
            type="button"
            onClick={surFermer}
            aria-label="Fermer le formulaire"
            className="absolute top-4 right-4 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-blue-400 mb-2 border border-slate-700">
            <MapPin className="w-3.5 h-3.5" />
            <span>{estEdition ? 'Modification de la fiche SIG' : 'Nouvel établissement'}</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            {estEdition ? `Modifier : ${centrePourEdition?.nom}` : 'Ajouter un établissement FPT'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Les données saisies seront enregistrées de manière persistante dans Firestore.
          </p>
        </div>

        {/* Corps formulaire */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {erreur && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{erreur}</span>
            </div>
          )}

          <form id="form-centre-fpt" onSubmit={gererSoumission} className="space-y-4">
            {/* Ligne 1 : Nom et Nom officiel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Nom de l'établissement *
                </label>
                <input
                  type="text"
                  required
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="ex: CEDT Le G15"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Nom officiel complet
                </label>
                <input
                  type="text"
                  value={nomOfficiel}
                  onChange={(e) => setNomOfficiel(e.target.value)}
                  placeholder="ex: Centre d'Enseignement et de Développement Technique"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Ligne 2 : Type, Statut, Commune */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                >
                  <option value="Public">Public</option>
                  <option value="Privé">Privé</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Statut
                </label>
                <input
                  type="text"
                  value={statut}
                  onChange={(e) => setStatut(e.target.value)}
                  placeholder="ex: Homologué, Public, etc."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Commune
                </label>
                <input
                  type="text"
                  value={commune}
                  onChange={(e) => setCommune(e.target.value)}
                  placeholder="ex: Dakar Plateau, Pikine, etc."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Ligne 3 : Adresse, Téléphone, Email */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Adresse physique
                </label>
                <input
                  type="text"
                  value={adresse}
                  onChange={(e) => setAdresse(e.target.value)}
                  placeholder="ex: Avenue Malick Sy prolongée"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Téléphone
                </label>
                <input
                  type="text"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  placeholder="ex: +221 33 821 28 35"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@cedt-leg15.sn"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Ligne 4 : Site Web, Date création, Capacité */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Site Web
                </label>
                <input
                  type="url"
                  value={siteWeb}
                  onChange={(e) => setSiteWeb(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Date de création
                </label>
                <input
                  type="text"
                  value={dateCreation}
                  onChange={(e) => setDateCreation(e.target.value)}
                  placeholder="ex: 1994"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Capacité d'accueil
                </label>
                <input
                  type="number"
                  value={capacite}
                  onChange={(e) => setCapacite(e.target.value)}
                  placeholder="ex: 650"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Ligne 5 : Formation, Filière, Diplômes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Formation
                </label>
                <input
                  type="text"
                  value={formation}
                  onChange={(e) => setFormation(e.target.value)}
                  placeholder="Formation Initiale / Continue"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Filière / Domaine
                </label>
                <input
                  type="text"
                  value={filiere}
                  onChange={(e) => setFiliere(e.target.value)}
                  placeholder="Électronique, Numérique, etc."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Diplômes
                </label>
                <input
                  type="text"
                  value={diplomes}
                  onChange={(e) => setDiplomes(e.target.value)}
                  placeholder="CAP, BT, BTS, Licence Pro"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Description de l'établissement
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Présentation des filières, ateliers, équipements..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Source & Photo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Source des données
                </label>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="ex: CEDT Le G15 - SIG 2024"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Photo (Firebase Storage)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={refFileInput}
                    accept="image/*"
                    onChange={gererSelectionFichier}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => refFileInput.current?.click()}
                    disabled={televersementEnCours}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-900" />
                    <span>{televersementEnCours ? 'Téléversement...' : 'Téléverser photo'}</span>
                  </button>
                  {photoUrl && (
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Photo liée
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION LOCALISATION : Latitude & Longitude & Placer sur la carte */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-blue-900" />
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Localisation géographique (WGS84)
                  </span>
                </div>

                {surActiverPlacementCarte && (
                  <button
                    type="button"
                    onClick={() => {
                      const latNum = parseFloat(latitude);
                      const lngNum = parseFloat(longitude);
                      surActiverPlacementCarte(!isNaN(latNum) && !isNaN(lngNum) ? { latitude: latNum, longitude: lngNum } : undefined);
                    }}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold text-blue-900 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 mr-1 text-blue-700" />
                    Placer sur la carte
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Latitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="14.7200"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Longitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="-17.3800"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Pied de formulaire avec [Enregistrer] et [Annuler] */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={surFermer}
            disabled={chargement}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            Annuler
          </button>

          <button
            type="submit"
            form="form-centre-fpt"
            disabled={chargement}
            className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{chargement ? 'Enregistrement...' : 'Enregistrer'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
