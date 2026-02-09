export interface FlashcardExample {
  text: string;
  hiragana?: string;
  translation?: string;
}

export interface DetailedTranslation {
  back: string;
  usageNotes?: string;
  examples: FlashcardExample[];
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  imageUrl?: string;
  examples: FlashcardExample[];
  pronunciation: string;
  hiraganaReading?: string;
  category: 'vocabulary' | 'kanji' | 'grammar' | 'other' | string;
  level: string;
  usageNotes?: string;
  
  // Données spécifiques aux kanji
  strokeCount?: number;
  onyomiReadings?: string[];
  kunyomiReadings?: string[];
  
  // Signalements
  reports?: Record<string, number>;

  // Toutes les traductions disponibles (pour la vue détaillée)
  allTranslations?: {
    fr?: DetailedTranslation;
    en?: DetailedTranslation;
    [key: string]: DetailedTranslation | undefined;
  };
}
