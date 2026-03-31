<script setup lang="ts">
import type { PinInputInputProps } from 'reka-ui';

import { computed } from 'vue';

import { cn } from '@vben-core/shared/utils';

import { PinInputInput, useForwardProps } from 'reka-ui';

const props = defineProps<PinInputInputProps & { class?: any }>();

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;
  return delegated;
});

const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <PinInputInput
    v-bind="forwardedProps"
    :class="
      cn(
        'border-input bg-background ring-offset-background relative flex h-10 w-8 items-center justify-center border-y border-r text-center text-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md focus-visible:relative focus-visible:z-10 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden md:w-10',
        props.class,
      )
    "
  />
</template>
