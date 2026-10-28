<script setup lang="ts">
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Confirmation } from "@/composables/useConfirmation";
defineProps<{ request: Confirmation | null }>();
const emit = defineEmits<{ answer: [result: boolean] }>();
</script>
<template>
  <Dialog :open="Boolean(request)" @update:open="!$event && emit('answer', false)">
    <DialogContent v-if="request" class="max-w-md">
      <DialogHeader
        ><DialogTitle>{{ request.title }}</DialogTitle
        ><DialogDescription>{{ request.description }}</DialogDescription></DialogHeader
      >
      <DialogFooter
        ><Button variant="outline" @click="emit('answer', false)">取消</Button
        ><Button
          :variant="request.destructive ? 'destructive' : 'default'"
          @click="emit('answer', true)"
          >{{ request.action }}</Button
        ></DialogFooter
      >
    </DialogContent>
  </Dialog>
</template>
