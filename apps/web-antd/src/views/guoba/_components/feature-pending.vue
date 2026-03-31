<script setup lang="ts">
interface Props {
  description?: string;
  title: string;
}

defineProps<Props>();
</script>

<template>
  <div class="p-6">
    <h1 class="text-xl font-semibold">{{ title }}</h1>
    <p class="mt-2 text-sm text-muted-foreground">
      {{
        description ??
        'This module is temporarily scaffolded for Guoba Fork 1.0.0. Business components will be migrated in the next step.'
      }}
    </p>
  </div>
</template>
