# Guoba 可视化配置组件清单（当前版本）

本清单按旧版锅巴组件命名规范整理，供 `guoba.support.js` 的 `schemas` 使用。

## 1. 标准组件（推荐直接使用）

- `Input`：单行文本输入
- `InputPassword`：密码输入
- `InputTextArea`：多行文本输入
- `InputNumber`：数字输入
- `Select`：下拉选择（支持 `mode: 'multiple'`）
- `RadioGroup`：单选组
- `Switch`：开关
- `Alert`：提示信息块（展示型）
- `Divider`：分割线
- `SOFT_GROUP_BEGIN`：软分组标题
- `EasyCron`：cron 可视化配置
- `GTags`：标签输入（可增删）
- `GSelectFriend`：好友选择器
- `GSelectGroup`：群聊选择器
- `GSubForm`：子表单

## 2. 兼容写法（建议逐步迁移到标准组件名）

- `Textarea` -> `InputTextArea`
- `Input.TextArea` -> `InputTextArea`

## 3. 子表单（`GSubForm`）字段写法

建议写法（推荐）：

```js
{
  component: 'GSubForm',
  componentProps: {
    multiple: true,
    alwaysArray: true,
    modalProps: { title: '子表单' },
    listModalProps: { title: '列表' },
    schemas: [/* 子项 schema */]
  }
}
```

兼容写法（也可用）：

- `schemas` 可写在组件外层（非 `componentProps`）
- `schema`（单数）也会被识别为子表单项数组

## 4. 对 `miao-plugin` / `endfield-plugin` 的适配结论

已覆盖你当前这两套配置里用到的组件：

- `Alert`
- `Divider`
- `EasyCron`
- `GTags`
- `Input`
- `InputNumber`
- `InputTextArea`
- `SOFT_GROUP_BEGIN`
- `Select`
- `Switch`
