<script setup lang="ts">
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Flashcard } from "@/types/flashcard";
import { AlertTriangle } from "lucide-vue-next";
import { computed } from "vue";

const props = defineProps<{
  card: Flashcard;
}>();

const totalReports = computed(() => {
  if (!props.card.reports) return 0;
  return Object.values(props.card.reports).reduce(
    (acc, val) => acc + (typeof val === "number" ? val : 0),
    0,
  );
});

// Helper pour les couleurs de catégorie
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
</script>

<template>
  <NuxtLink :to="`/flashcards/${card.id}`" class="block h-full">
    <Card
      class="flex flex-col h-full hover:border-primary transition-all cursor-pointer relative"
    >
      <CardHeader>
        <div class="flex justify-between items-start mb-2">
          <Badge :variant="getCategoryColor(card.category)">{{
            card.category
          }}</Badge>
          <div class="flex items-center gap-2">
            <Badge variant="outline">{{ card.level }}</Badge>
          </div>
        </div>
        <CardTitle class="text-2xl mb-1">{{ card.front }}</CardTitle>
        <p v-if="card.pronunciation" class="text-sm text-muted-foreground">
          {{ card.pronunciation }}
        </p>
        <p v-if="card.hiraganaReading" class="text-xs text-muted-foreground/80">
          {{ card.hiraganaReading }}
        </p>
        <div
          v-if="totalReports > 0"
          class="flex items-center w-fit text-yellow-900 bg-yellow-50 p-2 rounded-full text-xs font-medium border border-yellow-200 absolute -top-2 -left-2"
          title="Signalements"
        >
          <AlertTriangle class="h-3 w-3 mr-1" />
          {{ totalReports }}
        </div>
      </CardHeader>
    </Card>
  </NuxtLink>
</template>
