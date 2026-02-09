<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps<{
  currentPage: number
  totalPages: number
}>()

const emits = defineEmits<{
  (e: 'page-change', page: number): void
}>()

const pagesToShow = computed(() => {
  const pages: (number | string)[] = []
  const total = props.totalPages
  const current = props.currentPage

  if (total <= 7) {
    // Afficher toutes les pages si moins de 7
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    // Toujours afficher la première page
    pages.push(1)

    if (current > 3) {
      pages.push('...')
    }

    // Pages autour de la page actuelle
    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    if (current < total - 2) {
      pages.push('...')
    }

    // Toujours afficher la dernière page
    pages.push(total)
  }

  return pages
})

const goToPage = (page: number) => {
  if (page >= 1 && page <= props.totalPages && page !== props.currentPage) {
    emits('page-change', page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}
</script>

<template>
  <div class="flex items-center justify-center gap-2">
    <Button
      variant="outline"
      size="sm"
      :disabled="currentPage === 1"
      @click="goToPage(currentPage - 1)"
    >
      <ChevronLeft class="h-4 w-4" />
      Précédent
    </Button>

    <div class="flex items-center gap-1">
      <Button
        v-for="page in pagesToShow"
        :key="page"
        variant="outline"
        size="sm"
        :class="[
          page === currentPage ? 'bg-primary text-primary-foreground' : '',
          typeof page === 'string' ? 'border-none cursor-default' : ''
        ]"
        :disabled="typeof page === 'string'"
        @click="typeof page === 'number' && goToPage(page)"
      >
        {{ page }}
      </Button>
    </div>

    <Button
      variant="outline"
      size="sm"
      :disabled="currentPage === totalPages"
      @click="goToPage(currentPage + 1)"
    >
      Suivant
      <ChevronRight class="h-4 w-4" />
    </Button>
  </div>
</template>
