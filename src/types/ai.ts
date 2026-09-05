export type NiveauConfiance = 'low' | 'medium' | 'high' | number;

export interface SourceProposition {
  nom: string;
  url?: string;
}

export interface SuggestionIA {
  champ: string;
  valeurProposee: string;
  valeurActuelle?: string | null;
  niveauConfiance?: NiveauConfiance;
  source?: SourceProposition;
  justification?: string;
}
