<script lang="ts" setup>
defineProps<{
  meta: string;
  title: string;
}>();
</script>

<template>
  <div class="file-manager">
    <aside class="file-manager__side">
      <slot name="side" />
    </aside>
    <section class="file-manager__main">
      <div class="file-manager__toolbar">
        <div class="file-manager__current">
          <div class="file-manager__title">{{ title }}</div>
          <div class="file-manager__path">{{ meta }}</div>
        </div>
        <slot name="toolbar" />
      </div>
      <slot />
    </section>
  </div>
</template>

<style scoped>
.file-manager {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  min-height: calc(100vh - 180px);
  overflow: hidden;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.file-manager__side,
.file-manager__main {
  min-width: 0;
}

.file-manager__main {
  display: flex;
  flex-direction: column;
}

.file-manager__toolbar {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid hsl(var(--border));
}

.file-manager__current {
  min-width: 180px;
}

.file-manager__title {
  font-size: 16px;
  font-weight: 600;
}

.file-manager__path {
  overflow: hidden;
  color: hsl(var(--muted-foreground));
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .file-manager {
    grid-template-columns: 1fr;
  }

  .file-manager__side {
    border-bottom: 1px solid hsl(var(--border));
  }

  .file-manager__toolbar {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
