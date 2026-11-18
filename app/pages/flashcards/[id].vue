<script setup lang="ts">
import { onMounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useFlashcardsStore } from "@/stores/flashcards";
import { useAppConfigStore } from "@/stores/app-config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, AlertTriangle } from "lucide-vue-next";

const route = useRoute();
const router = useRouter();
const store = useFlashcardsStore();
const appConfig = useAppConfigStore();

const loadCard = () => {
  const id = route.params.id as string;
  if (id) {
    store.fetchFlashcardById(id);
  }
};

onMounted(loadCard);

watch(() => [route.params.id, appConfig.environment], loadCard);

const card = computed(() => store.currentFlashcard);

const goBack = () => {
  router.back();
};

// Helper pour les couleurs
const getCategoryColor = (category: string) => {
  switch (category) {
    case "vocabulary":
      return "default";
    case "kanji":
      return "secondary";
    case "grammar":
      return "destructive";
    default:
      return "outline";
  }
};

const languages: Record<string, string> = {
  fr: "Français",
  en: "Anglais",
};
</script>

<template>
  <div class="container mx-auto py-8 px-4">
    <Button
      variant="ghost"
      class="mb-6 pl-0 hover:pl-2 transition-all"
      @click="goBack"
    >
      <ArrowLeft class="mr-2 h-4 w-4" />
      Retour
    </Button>

    <div v-if="store.loading" class="flex justify-center py-12">
      <div
        class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
      ></div>
    </div>

    <div
      v-else-if="store.error"
      class="bg-destructive/10 text-destructive p-4 rounded-md"
    >
      {{ store.error }}
    </div>

    <div v-else-if="card" class="space-y-8">
      <!-- En-tête principal -->
      <div class="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <div class="flex gap-2 mb-2">
            <Badge :variant="getCategoryColor(card.category)">{{
              card.category
            }}</Badge>
            <Badge variant="outline">{{ card.level }}</Badge>
          </div>
          <h1 class="text-4xl md:text-6xl font-bold mb-2">{{ card.front }}</h1>
          <p class="text-xl text-muted-foreground">{{ card.pronunciation }}</p>
          <p
            v-if="card.hiraganaReading"
            class="text-lg text-muted-foreground/80"
          >
            {{ card.hiraganaReading }}
          </p>
        </div>
      </div>

      <!-- Signalements -->
      <Card
        v-if="card.reports && Object.keys(card.reports).length > 0"
        class="border-yellow-200"
      >
        <CardHeader class="pb-2">
          <CardTitle class="text-lg flex items-center">
            <AlertTriangle class="mr-2 h-5 w-5 text-yellow-600" />
            Signalements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div class="flex flex-wrap gap-4">
            <div
              v-for="(count, type) in card.reports"
              :key="type"
              class="flex items-center bg-white px-3 py-1.5 rounded-md border border-yellow-100 shadow-sm"
            >
              <span class="font-medium text-yellow-900 mr-2 capitalize"
                >{{ type.replace(/_/g, " ") }} :</span
              >
              <Badge
                variant="secondary"
                class="bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                >{{ count }}</Badge
              >
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Informations Kanji spécifiques -->
      <div
        v-if="card.category === 'kanji'"
        class="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <Card>
          <CardHeader><CardTitle>Lecture Onyomi</CardTitle></CardHeader>
          <CardContent>
            <div class="flex flex-wrap gap-2">
              <Badge
                v-for="reading in card.onyomiReadings"
                :key="reading"
                variant="secondary"
                >{{ reading }}</Badge
              >
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Lecture Kunyomi</CardTitle></CardHeader>
          <CardContent>
            <div class="flex flex-wrap gap-2">
              <Badge
                v-for="reading in card.kunyomiReadings"
                :key="reading"
                variant="outline"
                >{{ reading }}</Badge
              >
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Traductions -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          v-for="(details, langKey) in card.allTranslations"
          :key="langKey"
          class="contents"
        >
          <Card v-if="details" class="h-full">
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <span class="text-2xl">{{
                  languages[langKey] || langKey.toUpperCase()
                }}</span>
              </CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
              <div>
                <h3 class="font-semibold text-lg mb-1">Signification</h3>
                <p class="text-xl">{{ details.back }}</p>
              </div>

              <div v-if="details.usageNotes">
                <h3 class="font-semibold text-muted-foreground mb-1">
                  Notes d'usage
                </h3>
                <p>{{ details.usageNotes }}</p>
              </div>

              <div v-if="details.examples && details.examples.length > 0">
                <h3 class="font-semibold text-muted-foreground mb-2">
                  Exemples
                </h3>
                <ul class="space-y-4">
                  <li
                    v-for="(ex, idx) in details.examples"
                    :key="idx"
                    class="bg-muted/30 p-3 rounded-md"
                  >
                    <p class="font-medium text-lg">{{ ex.text }}</p>
                    <p
                      v-if="ex.hiragana"
                      class="text-sm text-muted-foreground mb-1"
                    >
                      {{ ex.hiragana }}
                    </p>
                    <p class="italic text-muted-foreground">
                      {{ ex.translation }}
                    </p>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>
