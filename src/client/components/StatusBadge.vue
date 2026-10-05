<script setup lang="ts">
defineProps<{
  status: 'PAID' | 'PENDING' | 'EXPIRED' | string;
}>();
</script>

<template>
  <span :class="[
    'badge',
    status === 'PAID' ? 'badge-paid' :
    status === 'PENDING' ? 'badge-pending' : 'badge-expired'
  ]">
    <span class="badge-dot"></span>
    {{ status }}
  </span>
</template>
