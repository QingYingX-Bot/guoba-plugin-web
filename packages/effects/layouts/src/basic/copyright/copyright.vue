<script lang="ts" setup>
interface Props {
  companyName?: string;
  companySiteLink?: string;
  date?: string;
  icp?: string;
  icpLink?: string;
}

defineOptions({
  name: 'Copyright',
});

withDefaults(defineProps<Props>(), {
  companyName: 'Vben Admin',
  companySiteLink: '',
  date: '2024',
  icp: '',
  icpLink: '',
});

const authorName = 'QingYingX(HInXe)';
const authorLink = 'https://github.com/QingYingX';
</script>

<template>
  <div class="text-md flex-center">
    Copyright © {{ date }}

    <template v-if="companyName">
      <a
        v-if="companySiteLink"
        :href="companySiteLink"
        class="mx-1 hover:text-primary-hover"
        rel="noopener noreferrer"
        target="_blank"
      >
        {{ companyName }}
      </a>
      <span v-else class="mx-1">{{ companyName }}</span>
    </template>

    <span v-if="companyName" class="mx-1">by</span>

    <a
      :href="authorLink"
      class="mx-1 hover:text-primary-hover"
      rel="noopener noreferrer"
      target="_blank"
    >
      {{ authorName }}
    </a>

    <template v-if="icp">
      <span class="mx-1">|</span>
      <a
        v-if="icpLink"
        :href="icpLink"
        class="mx-1 hover:text-primary-hover"
        rel="noopener noreferrer"
        target="_blank"
      >
        {{ icp }}
      </a>
      <span v-else class="mx-1">{{ icp }}</span>
    </template>
  </div>
</template>
