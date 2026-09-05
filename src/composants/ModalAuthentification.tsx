import React, { useState } from 'react';
import { X, Lock, Mail, ShieldCheck, LogIn, AlertCircle, Info } from 'lucide-react';
import {
  connecterEmail,
  connecterGoogle,
  EMAIL_ADMIN_PRINCIPAL,
  EMAIL_INVITE_OFFICIEL,
} from '../services/authentificationService';
import { UtilisateurConnecte } from '../types';

interface ModalAuthentificationProps {
  ouvert: boolean;
  surFermer: () => void;
  surSucces: (utilisateur: UtilisateurConnecte) => void;
}

export const ModalAuthentification: React.FC<ModalAuthentificationProps> = ({
  ouvert,
  surFermer,
  surSucces,
}) => {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  if (!ouvert) return null;

  const gererSoumission = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);
    setChargement(true);

    try {
      const utilisateur = await connecterEmail(email.trim(), motDePasse);
      surSucces(utilisateur);
      surFermer();
    } catch (err: any) {
      if (
        err?.code === 'auth/invalid-credential' ||
        err?.code === 'auth/user-not-found' ||
        err?.code === 'auth/wrong-password' ||
        err?.code === 'auth/invalid-email' ||
        err?.message?.includes('Adresse e-mail ou mot de passe incorrect')
      ) {
        setErreur('Adresse e-mail ou mot de passe incorrect.');
      } else if (err?.code === 'auth/operation-not-allowed') {
        setErreur(
          "Le fournisseur Email/Mot de passe doit être activé dans la console Firebase (Authentication > Sign-in method). En attendant, l'administrateur principal peut utiliser la Connexion Google."
        );
      } else {
        setErreur(err?.message || 'Adresse e-mail ou mot de passe incorrect.');
      }
    } finally {
      setChargement(false);
    }
  };

  const gererConnexionGoogle = async () => {
    setErreur(null);
    setChargement(true);
    try {
      const utilisateur = await connecterGoogle();
      surSucces(utilisateur);
      surFermer();
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        setErreur('La fenêtre de connexion Google a été fermée.');
      } else {
        setErreur(err?.message || 'Erreur lors de la connexion Google.');
      }
    } finally {
      setChargement(false);
    }
  };

  return (
    <div
      id="modal-authentification-overlay"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
      onClick={surFermer}
    >
      <div
        id="modal-authentification-contenu"
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="bg-slate-900 text-white p-6 relative">
          <button
            id="bouton-fermer-auth"
            type="button"
            onClick={surFermer}
            aria-label="Fermer la boîte de connexion"
            className="absolute top-4 right-4 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-blue-400 mb-2 border border-slate-700">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Accès Sécurisé • FPT DAKAR V1</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Connexion
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Mode édition réservé aux comptes autorisés (Principal & Invité)
          </p>
        </div>

        {/* Formulaire */}
        <div className="p-6 space-y-4">
          <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200/60 text-blue-900 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Info className="w-4 h-4 text-blue-700 shrink-0" />
              <span>Comptes habilités au mode édition :</span>
            </div>
            <div className="pl-5 space-y-0.5 text-[11px] text-slate-700">
              <div>• Principal (Admin) : <strong className="font-mono text-blue-950">{EMAIL_ADMIN_PRINCIPAL}</strong></div>
              <div>• Invité (Éditeur) : <strong className="font-mono text-blue-950">{EMAIL_INVITE_OFFICIEL}</strong></div>
            </div>
          </div>

          {erreur && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{erreur}</span>
            </div>
          )}

          <form onSubmit={gererSoumission} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  id="champ-email-connexion"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  id="champ-motdepasse-connexion"
                  type="password"
                  required
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              </div>
            </div>

            <button
              id="bouton-soumettre-connexion"
              type="submit"
              disabled={chargement}
              className="w-full py-2.5 px-4 rounded-lg bg-blue-900 text-white text-xs font-bold hover:bg-blue-800 transition-colors shadow-2xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>
                {chargement ? 'Connexion en cours...' : 'Se connecter'}
              </span>
            </button>
          </form>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">ou</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <button
            id="bouton-connexion-google"
            type="button"
            onClick={gererConnexionGoogle}
            disabled={chargement}
            className="w-full py-2.5 px-4 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Connexion Google ({EMAIL_ADMIN_PRINCIPAL})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
