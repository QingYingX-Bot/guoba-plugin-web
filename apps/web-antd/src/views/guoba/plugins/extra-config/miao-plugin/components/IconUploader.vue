<script lang="ts" setup>
import { ref } from 'vue';

import { Button, Modal, message } from 'ant-design-vue';

const props = defineProps<{
  iconB64List: string[];
  open: boolean;
  selected: number;
}>();

const emit = defineEmits<{
  'update:open': [boolean];
}>();

const pic = ref('');
const loading = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

function closeModal() {
  emit('update:open', false);
  pic.value = '';
}

function chooseFile() {
  fileInputRef.value?.click();
}

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (!files || files.length === 0) {
    return;
  }

  const file = files[0]!;
  const reader = new FileReader();
  reader.onload = () => {
    pic.value = String(reader.result ?? '');
  };
  reader.readAsDataURL(file);

  target.value = '';
}

async function submit() {
  if (!pic.value) {
    message.warning('请先选择图片');
    return;
  }
  if (!props.selected || props.selected < 1) {
    message.warning('图标位无效');
    return;
  }

  loading.value = true;
  try {
    const image = new Image();
    image.src = pic.value;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('图片加载失败'));
    });

    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('画布不可用');
    }

    ctx.clearRect(0, 0, 100, 100);

    const side = Math.min(image.width, image.height);
    const sx = Math.floor((image.width - side) / 2);
    const sy = Math.floor((image.height - side) / 2);

    ctx.drawImage(image, sx, sy, side, side, 10, 6, 80, 80);
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(0,0,0,0.65)';
    ctx.lineWidth = 3;
    ctx.strokeText(String(props.selected), 50, 95);
    ctx.fillText(String(props.selected), 50, 95);

    props.iconB64List[props.selected] = canvas.toDataURL();
    message.success('图标替换成功');
    closeModal();
  } catch (error) {
    message.error((error as Error)?.message || '图标替换失败');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <Modal
    :open="open"
    :confirm-loading="loading"
    title="替换图标"
    width="420px"
    @cancel="closeModal"
    @ok="submit"
  >
    <div class="frame">
      <div class="preview-wrap" v-if="pic">
        <img :src="pic" alt="preview" class="preview-img" />
      </div>
      <div class="preview-wrap" v-else>
        <div class="placeholder">将自动居中裁切为 1:1</div>
      </div>

      <input
        ref="fileInputRef"
        type="file"
        accept="image/bmp,image/jpeg,image/png"
        class="hidden-file"
        @change="onFileChange"
      />
      <Button block @click="chooseFile">选择图片</Button>
    </div>
  </Modal>
</template>

<style scoped>
.frame {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-wrap {
  width: 100%;
  min-height: 180px;
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.preview-img {
  max-width: 100%;
  max-height: 260px;
  object-fit: contain;
}

.placeholder {
  color: #999;
  font-size: 12px;
}

.hidden-file {
  display: none;
}
</style>
