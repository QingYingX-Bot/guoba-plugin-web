# Guoba Schema 兼容清单

这份清单对应当前 `guoba-plugin-web` 实现，目标是让旧版 `guoba.support.js` 在新版锅巴里尽量“不改也能跑”。

核对入口：

- `apps/web-antd/src/views/guoba/_components/schema-field.vue`
- `apps/web-antd/src/api/guoba/plugin.ts`
- `server/service/interface/IPluginService.js`
- `server/utils/schemaCompat.js`

## 1. Guoba 专属组件

- `EasyCron`
- `GTags`
- `GSelectFriend`
- `GSelectGroup`
- `GSubForm`
- `GButtons`
- `GColorPicker`

补充说明：

- `GButtons` 已支持 `args`、`confirm`、`tooltip`、按钮图标，以及 `#{field.path}` 插值。
- `GColorPicker` 使用原生取色器 + 文本输入双向同步。
- `GSubForm` 仍兼容 `schemas` / `schema` / 外层直写等旧写法。

## 2. 旧版组件兼容

新版已直接兼容或通过适配层兼容下列旧组件：

- `Input`
- `InputGroup`
- `InputSearch`
- `InputPassword`
- `InputTextArea`
- `Textarea`
- `Input.TextArea`
- `InputNumber`
- `InputCountDown`
- `Select`
- `ApiSelect`
- `TreeSelect`
- `ApiTree`
- `ApiTreeSelect`
- `RadioGroup`
- `ApiRadioGroup`
- `RadioButtonGroup`
- `Checkbox`
- `CheckboxGroup`
- `AutoComplete`
- `Cascader`
- `ApiCascader`
- `DatePicker`
- `MonthPicker`
- `RangePicker`
- `WeekPicker`
- `TimePicker`
- `Switch`
- `StrengthMeter`
- `Upload`
- `IconPicker`
- `Rate`
- `Slider`
- `Divider`
- `SOFT_GROUP_BEGIN`
- `Render`
- `ApiTransfer`

此外，当前 schema 层也已经可以直接接入一些非旧版专属的新组件：

- `Mentions`
- `Segmented`
- `IconPicker`
- `Upload`
- `ApiCascader`

## 3. 兼容策略

部分旧组件不是 1:1 原生复刻，而是做了安全回退：

- `InputGroup` / `InputSearch` / `InputCountDown`：
  回退为 `Input`
- `ApiTree`：
  回退为树选择兼容渲染
- `ApiTransfer`：
  回退为多选下拉渲染
- `StrengthMeter`：
  回退为密码输入，并额外显示强度条
- `Render`：
  回退为展示块；如果提供了可恢复的 `render` 函数，会执行并显示结果

## 4. 函数与正则兼容

旧版 schema 里常见的以下配置，现在会经过后端序列化并在前端恢复：

- `componentProps.api`
- `componentProps.render`
- `componentProps.valueFormatter`
- `rules[].pattern`（`RegExp`）
- 其他可 JSON 遍历到的函数/正则字段

这意味着旧插件里很多依赖函数的 `Api*`、自定义渲染、正则校验，已经不再因为 `JSON` 传输被直接丢掉。

## 5. 当前限制

以下行为仍建议插件作者尽量写成“纯数据 + 轻函数”模式：

- 极度依赖浏览器上下文或闭包变量的 `render/api` 函数，不保证完全可恢复。
- `ApiTransfer` 目前是兼容回退，不是原版双栏穿梭框体验。
- `Render` 更适合做说明、预览、调试信息，不建议承担复杂交互。

## 6. 推荐实践

- 新插件优先继续使用 Ant Design Vue 风格 schema。
- 旧插件无需着急批量改名；常见旧组件已由兼容层兜底。
- 如果要验证兼容效果，可直接查看 `guoba-example/guoba.support.js` 里的新版示例；其中已经覆盖常见旧输入别名、日期别名、`Mentions` / `Segmented` / `ApiCascader` 等扩展组件，以及 `GButtons` / `Render` 等兼容场景。
