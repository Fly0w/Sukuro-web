import { defineStore } from 'pinia'
import type { Flashcard, FlashcardExample } from '~/types/flashcard'
import { useAppConfigStore } from './app-config'

// Constantes pour les catégories (basées sur l'app Flutter)
export const CATEGORIES = {
  vocabulary: 'Vocabulaire',
  grammar: 'Grammaire',
  kanji: 'Kanji',
  other: 'Autres',
  quizz: 'Quizz',
  hiragana: 'Hiragana',
  katakana: 'Katakana',
} as const

// Constantes pour les niveaux JLPT (basées sur l'app Flutter)
export const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const

const CARDS_PER_PAGE = 50

// Convertit un niveau d'affichage (ex: "N5") en valeurs possibles pour la DB
// La DB peut stocker soit "N5" soit "5" (integer), donc on cherche les deux
function convertDisplayLevelToDb(displayLevel: string): string[] {
  if (displayLevel.startsWith('N') && displayLevel.length >= 2) {
    const number = displayLevel.substring(1)
    return [displayLevel, number] // Chercher "N5" et "5"
  }
  return [displayLevel]
}

export const useFlashcardsStore = defineStore('flashcards', {
  state: () => ({
    flashcards: [] as Flashcard[],
    totalCount: 0,
    currentPage: 1,
    loading: false,
    error: null as string | null,
    currentFlashcard: null as Flashcard | null,
    filters: {
      searchQuery: '',
      category: 'all',
      level: 'all',
      reportedOnly: false
    }
  }),

  getters: {
    totalPages: (state) => Math.ceil(state.totalCount / CARDS_PER_PAGE),
    
    // Les flashcards sont déjà filtrées côté serveur (recherche incluse)
    paginatedFlashcards: (state) => {
      return state.flashcards
    },

    // Catégories disponibles avec leurs traductions
    availableCategories: () => {
      return Object.entries(CATEGORIES).map(([key, label]) => ({
        value: key,
        label
      }))
    },
    
    // Niveaux disponibles (dans l'ordre JLPT)
    availableLevels: () => {
      return [...LEVELS]
    }
  },

  actions: {
    setSearchQuery(query: string) {
      this.filters.searchQuery = query
    },
    performSearch() {
      this.currentPage = 1 // Reset à la première page lors d'une nouvelle recherche
      this.fetchFlashcards()
    },
    setCategoryFilter(category: string) {
      this.filters.category = category
      this.currentPage = 1 // Reset à la première page lors d'un changement de filtre
    },
    setLevelFilter(level: string) {
      this.filters.level = level
      this.currentPage = 1 // Reset à la première page lors d'un changement de filtre
    },
    setReportedOnlyFilter(value: boolean) {
      this.filters.reportedOnly = value
      this.currentPage = 1 // Reset à la première page lors d'un changement de filtre
    },
    setPage(page: number) {
      this.currentPage = page
    },

    async fetchFlashcards() {
      const appConfig = useAppConfigStore()
      const supabase = appConfig.getSupabaseClient()
      this.loading = true
      this.error = null

      try {
        // Construire la requête avec filtres
        let query = supabase
          .from('flashcards')
          .select(`
            id,
            category,
            level,
            reports,
            vocabulary_flashcards (
              front, pronunciation, hiragana_reading
            ),
            kanji_flashcards (
              kanji, stroke_count, on_readings, kun_readings
            ),
            grammar_flashcards (
              pattern, hiragana_reading
            ),
            kana_flashcards (
              character, pronunciation
            ),
            translations:flashcard_translations_fr (
              back, usage_notes
            ),
            examples:flashcard_examples (
              text,
              hiragana,
              translations:flashcard_translations_fr (
                translation
              )
            )
          `, { count: 'exact' })

        // Appliquer les filtres côté serveur
        if (this.filters.category && this.filters.category !== 'all') {
          query = query.eq('category', this.filters.category)
        }

        if (this.filters.level && this.filters.level !== 'all') {
          // Convertir le niveau d'affichage (ex: "N5") en valeurs DB possibles ("N5", "5")
          const dbLevels = convertDisplayLevelToDb(this.filters.level)
          query = query.in('level', dbLevels)
        }

        if (this.filters.reportedOnly) {
          query = query.neq('reports', '{}')
        }

        // Recherche texte côté serveur
        // Pour la recherche, on doit chercher dans les relations (vocabulary_flashcards.front, translations.back, etc.)
        // Supabase ne permet pas facilement les OR sur différentes relations, donc on va :
        // 1. Charger toutes les données correspondant aux filtres (catégorie/niveau) si recherche active
        // 2. Filtrer par texte après récupération
        // 3. Paginer côté client sur les résultats filtrés
        const searchQuery = this.filters.searchQuery?.trim().toLowerCase()
        const hasSearch = searchQuery && searchQuery.length > 0
        
        let data: any[] = []
        let totalCount = 0

        if (hasSearch) {
          // Si recherche active, charger TOUTES les données correspondant aux filtres
          // (sans limite de pagination) puis filtrer et paginer côté client
          const { data: allData, error, count } = await query

          if (error) throw error

          if (allData) {
            // Mapper toutes les cartes
            let mappedCards = allData.map(this.mapSupabaseToFlashcard)
            
            // Filtrer par recherche texte
            mappedCards = mappedCards.filter(card => 
              card.front.toLowerCase().includes(searchQuery) || 
              card.back.toLowerCase().includes(searchQuery) ||
              (card.pronunciation && card.pronunciation.toLowerCase().includes(searchQuery)) ||
              (card.hiraganaReading && card.hiraganaReading.toLowerCase().includes(searchQuery)) ||
              (card.examples && card.examples.some(ex => 
                ex.text.toLowerCase().includes(searchQuery) ||
                (ex.translation && ex.translation.toLowerCase().includes(searchQuery))
              ))
            )
            
            // Le total après filtrage
            totalCount = mappedCards.length
            
            // Paginer côté client
            const offset = (this.currentPage - 1) * CARDS_PER_PAGE
            data = mappedCards.slice(offset, offset + CARDS_PER_PAGE)
          }
        } else {
          // Pas de recherche : pagination normale côté serveur
          const offset = (this.currentPage - 1) * CARDS_PER_PAGE
          const { data: pageData, error, count } = await query
            .range(offset, offset + CARDS_PER_PAGE - 1)

          if (error) throw error

          if (pageData) {
            data = pageData
            totalCount = count || 0
          }
        }

        if (data) {
          this.flashcards = data.map(this.mapSupabaseToFlashcard)
          this.totalCount = totalCount
        }
      } catch (e: any) {
        this.error = e.message || 'Erreur lors du chargement des cartes'
        console.error('Erreur Supabase:', e)
      } finally {
        this.loading = false
      }
    },

    async fetchFlashcardById(id: string) {
      const appConfig = useAppConfigStore()
      const supabase = appConfig.getSupabaseClient()
      this.loading = true
      this.error = null
      this.currentFlashcard = null

      try {
        const { data, error } = await supabase
          .from('flashcards')
          .select(`
            id,
            category,
            level,
            reports,
            vocabulary_flashcards (
              front, pronunciation, hiragana_reading
            ),
            kanji_flashcards (
              kanji, stroke_count, on_readings, kun_readings
            ),
            grammar_flashcards (
              pattern, hiragana_reading
            ),
            kana_flashcards (
              character, pronunciation
            ),
            translations_fr:flashcard_translations_fr (
              back, usage_notes
            ),
            translations_en:flashcard_translations_en (
              back, usage_notes
            ),
            examples:flashcard_examples (
              text,
              hiragana,
              trans_fr:flashcard_translations_fr (
                translation
              ),
              trans_en:flashcard_translations_en (
                translation
              )
            )
          `)
          .eq('id', id)
          .single()

        if (error) throw error

        if (data) {
          this.currentFlashcard = this.mapSupabaseToDetailedFlashcard(data)
        }
      } catch (e: any) {
        this.error = e.message || 'Erreur lors du chargement de la carte'
        console.error('Erreur Supabase:', e)
      } finally {
        this.loading = false
      }
    },

    mapSupabaseToDetailedFlashcard(json: any): Flashcard {
      // Réutiliser la logique de base pour les champs communs
      const baseCard = this.mapSupabaseToFlashcard({
        ...json,
        translations: json.translations_fr // Simuler pour mapSupabaseToFlashcard
      })

      // Construire les détails pour chaque langue
      const frData = Array.isArray(json.translations_fr) ? json.translations_fr[0] : json.translations_fr
      const enData = Array.isArray(json.translations_en) ? json.translations_en[0] : json.translations_en

      const allTranslations: Flashcard['allTranslations'] = {}

      if (frData) {
        allTranslations.fr = {
          back: frData.back || '',
          usageNotes: frData.usage_notes,
          examples: (json.examples || []).map((ex: any) => ({
            text: ex.text,
            hiragana: ex.hiragana,
            translation: Array.isArray(ex.trans_fr) ? ex.trans_fr[0]?.translation : ex.trans_fr?.translation
          })).filter((ex: any) => ex.translation) // Garder les exemples qui ont une traduction dans cette langue
        }
      }

      if (enData) {
        allTranslations.en = {
          back: enData.back || '',
          usageNotes: enData.usage_notes,
          examples: (json.examples || []).map((ex: any) => ({
            text: ex.text,
            hiragana: ex.hiragana,
            translation: Array.isArray(ex.trans_en) ? ex.trans_en[0]?.translation : ex.trans_en?.translation
          })).filter((ex: any) => ex.translation)
        }
      }

      return {
        ...baseCard,
        allTranslations
      }
    },

    mapSupabaseToFlashcard(json: any): Flashcard {
      const category = json.category || 'vocabulary'
      let front = ''
      let pronunciation = ''
      let hiraganaReading = undefined
      let strokeCount = undefined
      let onyomiReadings = undefined
      let kunyomiReadings = undefined

      // Extraction des données spécifiques à la catégorie
      const vocabData = json.vocabulary_flashcards
      const kanjiData = json.kanji_flashcards
      const grammarData = json.grammar_flashcards
      const kanaData = json.kana_flashcards

      switch (category) {
        case 'vocabulary':
          if (vocabData) {
            front = vocabData.front || ''
            pronunciation = vocabData.pronunciation || ''
            hiraganaReading = vocabData.hiragana_reading
          }
          break
        case 'kanji':
          if (kanjiData) {
            front = kanjiData.kanji || ''
            strokeCount = kanjiData.stroke_count
            onyomiReadings = kanjiData.on_readings
            kunyomiReadings = kanjiData.kun_readings
          }
          break
        case 'grammar':
          if (grammarData) {
            front = grammarData.pattern || ''
            hiraganaReading = grammarData.hiragana_reading
          }
          break
        case 'kana':
        case 'hiragana':
        case 'katakana':
          if (kanaData) {
            front = kanaData.character || ''
            pronunciation = kanaData.pronunciation || ''
          }
          break
      }

      // Traductions
      const translationData = Array.isArray(json.translations) ? json.translations[0] : json.translations
      const back = translationData?.back || ''
      const usageNotes = translationData?.usage_notes

      // Exemples
      const examples: FlashcardExample[] = (json.examples || []).map((ex: any) => {
        const exTrans = Array.isArray(ex.translations) ? ex.translations[0] : ex.translations
        return {
          text: ex.text || '',
          hiragana: ex.hiragana,
          translation: exTrans?.translation
        }
      })

      return {
        id: json.id,
        front,
        back,
        pronunciation,
        hiraganaReading,
        category,
        level: json.level ? (json.level.toString().startsWith('N') ? json.level.toString() : `N${json.level}`) : 'N5',
        usageNotes,
        examples,
        strokeCount,
        onyomiReadings,
        kunyomiReadings,
        reports: json.reports
      }
    },

    addFlashcard(card: Flashcard) {
      this.flashcards.push(card)
    },

    deleteFlashcard(id: string) {
      this.flashcards = this.flashcards.filter(c => c.id !== id)
    }
  }
})
