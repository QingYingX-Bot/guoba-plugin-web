<script setup lang="ts">
import type { GroupSchemaTools, GroupSettingSection, KeyFormEntry } from '../types';

import { Form, InputNumber, Radio, Select, Switch } from 'ant-design-vue';

import SchemaField from '#/views/guoba/_components/schema-field.vue';

defineProps<{
  entry: KeyFormEntry;
  schemaTools: GroupSchemaTools;
  sections: GroupSettingSection[];
}>();
</script>

<template>
  <Form class="group-settings-form" layout="vertical">
    <section
      v-for="section in sections"
      :key="section.key"
      class="group-setting-section"
    >
      <div class="group-setting-section-head">
        <strong>{{ section.title }}</strong>
        <span>{{ section.schemas.length }} 项</span>
      </div>

      <div class="group-setting-fields">
        <div
          v-for="schema in section.schemas"
          :key="`${entry.rawKey}-${schema.field || schema.label}`"
          class="group-setting-field"
        >
          <Form.Item
            :extra="schemaTools.getHelp(schema)"
            :label="schemaTools.getLabel(schema)"
          >
            <InputNumber
              v-if="schemaTools.getComponent(schema) === 'InputNumber'"
              v-bind="schemaTools.getComponentProps(schema)"
              class="group-field-control"
              :value="schemaTools.getSettingValue(entry, schema)"
              @update:value="schemaTools.setSettingValue(entry, schema, $event)"
            />
            <Switch
              v-else-if="schemaTools.getComponent(schema) === 'Switch'"
              :checked="schemaTools.isSwitchChecked(entry, schema)"
              @update:checked="schemaTools.setSwitchValue(entry, schema, $event)"
            />
            <Radio.Group
              v-else-if="schemaTools.getComponent(schema) === 'RadioGroup'"
              :options="schemaTools.getOptions(schema)"
              :value="schemaTools.getSettingValue(entry, schema)"
              @update:value="schemaTools.setSettingValue(entry, schema, $event)"
            />
            <Select
              v-else-if="schemaTools.getComponent(schema) === 'GTags'"
              allow-clear
              class="group-field-control"
              :max-tag-count="4"
              mode="tags"
              placeholder="输入后回车添加"
              :value="schemaTools.getSettingTags(entry, schema)"
              @update:value="schemaTools.setSettingValue(entry, schema, schemaTools.normalizeStringArray($event))"
            />
            <SchemaField
              v-else
              :model="entry.value"
              :schema="schema"
              :value="schemaTools.getKeyEntryFieldValue(entry, String(schema.field ?? ''))"
              @update:value="schemaTools.setKeyEntryFieldValue(entry, String(schema.field ?? ''), $event)"
            />
          </Form.Item>
        </div>
      </div>
    </section>
  </Form>
</template>
