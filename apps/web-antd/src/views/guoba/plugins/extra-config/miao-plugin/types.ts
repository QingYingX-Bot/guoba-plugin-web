export interface MiaoHelpConfig {
  bgBlur: boolean;
  colCount: number;
  colWidth: number;
  subTitle: string;
  theme: 'all' | string[];
  themeExclude: string[];
  title: string;
}

export interface MiaoThemeConfig {
  contBgBlur: number;
  contBgColor: string;
  descColor: string;
  descShadow: 'none' | string;
  fontColor: string;
  fontShadow: 'none' | string;
  headerBgColor: string;
  rowBgColor1: string;
  rowBgColor2: string;
}

export interface MiaoHelpListItem {
  desc: string;
  icon: number;
  title: string;
}

export type MiaoHelpList = MiaoHelpListItem[];

export interface MiaoHelpGroup {
  auth?: 'master';
  desc?: string;
  group: string;
  list: MiaoHelpList;
}

export type MiaoHelpGroups = MiaoHelpGroup[];

export interface EditModelData {
  cell: MiaoHelpListItem | null;
  cellIndex: number | null;
  group: MiaoHelpGroup | null;
  groupIndex: number | null;
  show: boolean;
}

export type MiaoHelpEditorAction =
  | 'createCell'
  | 'createGroup'
  | 'deleteCell'
  | 'deleteGroup'
  | 'moveCell'
  | 'moveCellCrossGroup'
  | 'moveGroup';

export interface MiaoHelpEditorActionContext {
  action: MiaoHelpEditorAction;
  helpList: MiaoHelpGroups;
  modelData: EditModelData;
  currentCell: MiaoHelpListItem | null;
  currentGroup: MiaoHelpGroup | null;
  offset?: -1 | 1;
}

export interface MiaoHelpEditorAdapter {
  beforeAction?: (
    context: MiaoHelpEditorActionContext,
  ) => boolean | Promise<boolean | void> | void;
  createCellTemplate?: (
    context: MiaoHelpEditorActionContext,
  ) => Partial<MiaoHelpListItem> | Promise<Partial<MiaoHelpListItem> | void> | void;
  createGroupTemplate?: (
    context: MiaoHelpEditorActionContext,
  ) => Partial<MiaoHelpGroup> | Promise<Partial<MiaoHelpGroup> | void> | void;
}

export interface MiaoVersionInfo {
  miao: string;
  yunzai: string;
}

export interface MiaoHelpResponse {
  helpCfg?: Partial<MiaoHelpConfig>;
  helpList?: MiaoHelpGroups;
  miaoVersion?: string;
  themeNames?: string[];
  yunzaiVersion?: string;
}

export interface MiaoBackupItem {
  id: string;
  remark: string;
  time: string;
  version?: number;
}

export interface MiaoThemeItem {
  name: string;
  style: Partial<MiaoThemeConfig>;
}
