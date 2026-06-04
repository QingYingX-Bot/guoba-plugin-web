import type { GuobaSandboxChatInput } from '#/api';

export const defaultSandboxCode = `console.log(e.message_type, e.msg);
e.reply(\`收到：\${e.msg}\`);
return { user: e.user_id, group: e.group_id || '' };`;

export const defaultSandboxChat: GuobaSandboxChatInput = {
  groupId: '10000',
  groupName: '锅巴测试群',
  message: '#锅巴沙盒测试',
  messageType: 'group',
  rawMessage: '#锅巴沙盒测试',
  selfId: '10000',
  senderName: '测试用户',
  userId: '10001',
};
