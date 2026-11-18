<script setup lang="ts">
import { onMounted, watch } from "vue";
import { useFlashcardsStore } from "@/stores/flashcards";
import { useAppConfigStore } from "@/stores/app-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FlashcardItem from "@/components/FlashcardItem.vue";
import FlashcardPagination from "@/components/FlashcardPagination.vue";
import { Search, AlertTriangle, Database } from "lucide-vue-next";

const store = useFlashcardsStore();
const appConfig = useAppConfigStore();

onMounted(() => {
  store.fetchFlashcards();
});

// Recharger les flashcards quand la page, l'environnement ou les filtres changent
// (un seul watcher évite le double appel quand un filtre réinitialise currentPage à 1)
watch(
  () => [
    store.currentPage,
    appConfig.environment,
    store.filters.category,
    store.filters.level,
    store.filters.reportedOnly,
  ],
  () => {
    store.fetchFlashcards();
  },
);

// Permettre la recherche avec la touche Entrée
const handleSearchKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter") {
    store.performSearch();
  }
};

const handlePageChange = (page: number) => {
  store.setPage(page);
};
</script>

<template>
  <div class="container mx-auto py-8 px-4">
    <!-- Switch Environnement -->
    <div class="flex justify-end mb-4">
      <div class="flex items-center gap-3 bg-card border p-1.5 rounded-lg shadow-sm">
        <div class="text-xs font-medium text-muted-foreground flex items-center gap-1.5 px-2">
           <Database class="h-3.5 w-3.5" /> Env
        </div>
        <div class="flex items-center bg-muted/50 rounded-md p-0.5">
          <button 
            class="px-3 py-1 text-xs font-medium rounded-sm transition-all duration-200"
            :class="appConfig.environment === 'dev' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
            @click="appConfig.setEnvironment('dev')"
          >
            DEV
          </button>
          <button 
            class="px-3 py-1 text-xs font-medium rounded-sm transition-all duration-200"
            :class="appConfig.environment === 'prod' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
            @click="appConfig.setEnvironment('prod')"
          >
            PROD
          </button>
        </div>
      </div>
    </div>

    <!-- En-tête -->
    <div
      class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
    >
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-foreground">
          Mes Flashcards
        </h1>
        <p class="text-muted-foreground mt-2">
          {{ store.paginatedFlashcards.length }} affichées sur
          {{ store.totalCount }} cartes
          <span v-if="store.totalPages > 1"
            >(Page {{ store.currentPage }} / {{ store.totalPages }})</span
          >
        </p>
      </div>
      <Button> Ajouter une carte </Button>
    </div>

    <!-- Barre de recherche et Filtres -->
    <div
      class="bg-card border rounded-lg p-4 mb-8 shadow-sm space-y-4 md:space-y-0 md:flex md:items-center md:gap-4"
    >
      <!-- Recherche -->
      <div class="relative flex-1 flex gap-2">
        <div class="relative flex-1">
          <Search
            class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
          />
          <Input
            type="search"
            placeholder="Rechercher (japonais, traduction...)"
            class="pl-9"
            v-model="store.filters.searchQuery"
            @keydown="handleSearchKeydown"
          />
        </div>
        <Button @click="store.performSearch" :disabled="store.loading">
          Rechercher
        </Button>
      </div>

      <!-- Filtre Catégorie -->
      <div class="w-full md:w-48">
        <Select
          :model-value="store.filters.category"
          @update:model-value="store.setCategoryFilter"
        >
          <SelectTrigger>
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Catégories</SelectLabel>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem
                v-for="cat in store.availableCategories"
                :key="cat.value"
                :value="cat.value"
              >
                {{ cat.label }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <!-- Filtre Niveau -->
      <div class="w-full md:w-32">
        <Select
          :model-value="store.filters.level"
          @update:model-value="store.setLevelFilter"
        >
          <SelectTrigger>
            <SelectValue placeholder="Niveau" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Niveaux</SelectLabel>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem
                v-for="level in store.availableLevels"
                :key="level"
                :value="level"
              >
                {{ level }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <!-- Filtre Signalées uniquement -->
      <div class="flex items-center">
        <Button
          variant="outline"
          :class="{
            'bg-yellow-50 border-yellow-200 text-yellow-500 hover:bg-yellow-100 hover:text-yellow-600':
              store.filters.reportedOnly,
          }"
          @click="store.setReportedOnlyFilter(!store.filters.reportedOnly)"
        >
          <AlertTriangle
            class="mr-2 h-4 w-4"
            :class="{ ' text-yellow-500': store.filters.reportedOnly }"
          />
          Signalées
        </Button>
      </div>
    </div>

    <!-- État de chargement -->
    <div v-if="store.loading" class="flex justify-center py-12">
      <div class="flex flex-col items-center gap-2">
        <div
          class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
        ></div>
        <p class="text-muted-foreground">Chargement des cartes...</p>
      </div>
    </div>

    <!-- État d'erreur -->
    <div
      v-else-if="store.error"
      class="bg-destructive/10 text-destructive p-4 rounded-md text-center py-12"
    >
      {{ store.error }}
    </div>

    <!-- Liste vide -->
    <div
      v-else-if="store.paginatedFlashcards.length === 0"
      class="text-center py-16 bg-muted/20 rounded-lg border border-dashed"
    >
      <p class="text-xl font-medium text-muted-foreground">
        Aucune carte trouvée
      </p>
      <p class="text-sm text-muted-foreground mt-2">
        Essayez de modifier vos filtres de recherche.
      </p>
    </div>

    <!-- Grille de cartes -->
    <div
      v-else
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8"
    >
      <FlashcardItem
        v-for="card in store.paginatedFlashcards"
        :key="card.id"
        :card="card"
      />
    </div>

    <!-- Pagination -->
    <div v-if="store.totalPages > 1" class="flex justify-center mt-8">
      <FlashcardPagination
        :current-page="store.currentPage"
        :total-pages="store.totalPages"
        @page-change="handlePageChange"
      />
    </div>
  </div>
</template>
