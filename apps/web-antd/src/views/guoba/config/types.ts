import type { GuobaConfigCard } from '#/api/guoba';
import type { Recordable } from '@vben/types';

export interface CardState {
  loaded: boolean;
  loading: boolean;
  saving: boolean;
}

export interface KeyFormEntry {
  displayKey: string;
  rawKey: string;
  saving: boolean;
  value: Recordable<any>;
}

export interface GroupRulePlugin {
  description: string;
  key: string;
  moduleCount: number;
  name: string;
  ruleCount: number;
  ruleNames: string[];
}

export interface GroupSettingSection {
  key: string;
  schemas: Recordable<any>[];
  title: string;
}

export interface OicqGroupItem {
  group_id: number | string;
  group_name?: string;
}

export interface OicqPageResult<T = Recordable<any>> {
  maxNum?: number;
  pageNum?: number;
  pageSize?: number;
  records?: T[];
  total?: number;
}

export type GroupRecordKind = 'discord' | 'official-qq-bot' | 'other' | 'qq';
export type GroupPickerFilter = 'all' | GroupRecordKind;
export type GroupRuleField = 'disable' | 'enable';
export type GroupDetailView = 'rules' | 'settings';

export interface GroupSelectOption {
  label: string;
  value: string;
}

export interface GroupEntryTools {
  getSubtitle: (entry: KeyFormEntry) => string;
  getTitle: (card: GuobaConfigCard, entry: KeyFormEntry) => string;
  isDefault: (entry: KeyFormEntry) => boolean;
}

export interface GroupSchemaTools {
  getComponent: (schema: Recordable<any>) => string;
  getComponentProps: (schema: Recordable<any>) => Recordable<any>;
  getHelp: (schema: Recordable<any>) => string;
  getKeyEntryFieldValue: (entry: KeyFormEntry, fieldPath: string) => any;
  getLabel: (schema: Recordable<any>) => string;
  getOptions: (schema: Recordable<any>) => Array<{ label: any; value: any }>;
  getSettingTags: (entry: KeyFormEntry, schema: Recordable<any>) => string[];
  getSettingValue: (entry: KeyFormEntry, schema: Recordable<any>) => any;
  isSwitchChecked: (entry: KeyFormEntry, schema: Recordable<any>) => boolean;
  normalizeStringArray: (value: any) => string[];
  setKeyEntryFieldValue: (entry: KeyFormEntry, fieldPath: string, value: any) => void;
  setSettingValue: (entry: KeyFormEntry, schema: Recordable<any>, value: any) => void;
  setSwitchValue: (
    entry: KeyFormEntry,
    schema: Recordable<any>,
    checked: boolean | number | string,
  ) => void;
}

export interface GroupRuleTools {
  addPluginToField: (entry: KeyFormEntry, field: GroupRuleField, plugin: GroupRulePlugin) => void;
  getFieldMeta: (
    card: GuobaConfigCard,
    field: GroupRuleField,
  ) => { help: any; label: string };
  getFieldValue: (entry: KeyFormEntry, field: GroupRuleField) => string[];
  getPluginActionText: (
    entry: KeyFormEntry,
    field: GroupRuleField,
    plugin: GroupRulePlugin,
  ) => string;
  getPluginActiveCount: (
    entry: KeyFormEntry,
    field: GroupRuleField,
    plugin: GroupRulePlugin,
  ) => number;
  getPluginRemoveText: (field: GroupRuleField) => string;
  isPluginFullyActive: (
    entry: KeyFormEntry,
    field: GroupRuleField,
    plugin: GroupRulePlugin,
  ) => boolean;
  removePluginFromField: (entry: KeyFormEntry, field: GroupRuleField, plugin: GroupRulePlugin) => void;
  setFieldValues: (entry: KeyFormEntry, field: GroupRuleField, values: any) => void;
}
