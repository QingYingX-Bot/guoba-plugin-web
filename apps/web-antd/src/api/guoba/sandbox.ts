import { requestClient } from '#/api/request';

import type { GuobaPage } from '../core/user';

export type GuobaSandboxMessageRole = 'bot' | 'log' | 'user';
export type GuobaSandboxRecordMode = 'chat' | 'code';
export type GuobaSandboxRecordStatus =
  | 'failed'
  | 'running'
  | 'success'
  | 'timeout';
export type GuobaSandboxChatType = 'group' | 'private';

export interface GuobaSandboxChatInput {
  atBot?: boolean;
  groupId?: string;
  groupName?: string;
  isMaster?: boolean;
  message: string;
  messageType: GuobaSandboxChatType;
  rawMessage?: string;
  selfId: string;
  senderName?: string;
  userId: string;
}

export interface GuobaSandboxReply {
  content: string;
  createdAt: string;
  messageId: string;
  quote?: boolean;
}

export interface GuobaSandboxConversationMessage {
  content: string;
  createdAt: string;
  id: string;
  level?: string;
  meta?: Record<string, unknown>;
  role: GuobaSandboxMessageRole;
  type?: string;
}

export interface GuobaSandboxConversation {
  chat: GuobaSandboxChatInput;
  createdAt: string;
  environmentId: string;
  environmentName: string;
  id: string;
  messages: GuobaSandboxConversationMessage[];
  title: string;
  updatedAt: string;
}

export interface GuobaSandboxEnvironment {
  allowedCommands: string[];
  allowedDirs: string[];
  createdAt: string;
  description: string;
  enabled: boolean;
  id: string;
  locked?: boolean;
  maxOutputLength: number;
  name: string;
  timeoutMs: number;
  updatedAt: string;
}

export interface GuobaSandboxRecord {
  chat?: GuobaSandboxChatInput;
  codePreview: string;
  duration: number;
  environmentId: string;
  environmentName: string;
  error: string;
  exitCode?: null | number;
  finishedAt: string;
  id: string;
  logs?: GuobaSandboxConversationMessage[];
  mode?: GuobaSandboxRecordMode;
  output: string;
  replies?: GuobaSandboxReply[];
  result: string;
  sessionId?: string;
  startedAt: string;
  status: GuobaSandboxRecordStatus;
}

export interface GuobaSandboxEnvironmentPayload {
  allowedCommands?: string[];
  allowedDirs?: string[];
  description?: string;
  enabled?: boolean;
  maxOutputLength?: number;
  name: string;
  timeoutMs?: number;
}

export async function getGuobaSandboxEnvironmentsApi() {
  return requestClient.get<GuobaSandboxEnvironment[]>('/sandbox/environments');
}

export async function createGuobaSandboxEnvironmentApi(
  data: GuobaSandboxEnvironmentPayload,
) {
  return requestClient.post<GuobaSandboxEnvironment>(
    '/sandbox/environments',
    data,
  );
}

export async function updateGuobaSandboxEnvironmentApi(
  id: string,
  data: GuobaSandboxEnvironmentPayload,
) {
  return requestClient.put<GuobaSandboxEnvironment>(
    `/sandbox/environments/${encodeURIComponent(id)}`,
    data,
  );
}

export async function deleteGuobaSandboxEnvironmentApi(id: string) {
  return requestClient.delete<{ id: string }>(
    `/sandbox/environments/${encodeURIComponent(id)}`,
  );
}

export async function toggleGuobaSandboxEnvironmentApi(
  id: string,
  enabled: boolean,
) {
  return requestClient.post<GuobaSandboxEnvironment>(
    `/sandbox/environments/${encodeURIComponent(id)}/toggle`,
    { enabled },
  );
}

export async function runGuobaSandboxApi(data: {
  chat?: GuobaSandboxChatInput;
  code: string;
  environmentId: string;
}) {
  return requestClient.post<GuobaSandboxRecord>('/sandbox/run', data);
}

export async function runGuobaSandboxCodeApi(data: {
  chat?: GuobaSandboxChatInput;
  code: string;
  environmentId: string;
}) {
  return requestClient.post<GuobaSandboxRecord>('/sandbox/code/run', data);
}

export async function getGuobaSandboxConversationsApi() {
  return requestClient.get<GuobaSandboxConversation[]>(
    '/sandbox/conversations',
  );
}

export async function createGuobaSandboxConversationApi(data: {
  chat: GuobaSandboxChatInput;
  environmentId: string;
  title?: string;
}) {
  return requestClient.post<GuobaSandboxConversation>(
    '/sandbox/conversations',
    data,
  );
}

export async function deleteGuobaSandboxConversationApi(id: string) {
  return requestClient.delete<{ id: string }>(
    `/sandbox/conversations/${encodeURIComponent(id)}`,
  );
}

export async function sendGuobaSandboxConversationMessageApi(
  id: string,
  data: {
    chat: GuobaSandboxChatInput;
    environmentId: string;
    message: string;
  },
) {
  return requestClient.post<{
    conversation: GuobaSandboxConversation;
    messages: GuobaSandboxConversationMessage[];
    record: GuobaSandboxRecord;
  }>(`/sandbox/conversations/${encodeURIComponent(id)}/messages`, data);
}

export async function getGuobaSandboxRecordsApi(params?: {
  environmentId?: string;
  keyword?: string;
  mode?: GuobaSandboxRecordMode | '';
  page?: number;
  pageSize?: number;
  status?: GuobaSandboxRecordStatus | '';
}) {
  return requestClient.get<GuobaPage<GuobaSandboxRecord>>('/sandbox/records', {
    params,
  });
}

export async function getGuobaSandboxRecordApi(id: string) {
  return requestClient.get<GuobaSandboxRecord>(
    `/sandbox/records/${encodeURIComponent(id)}`,
  );
}
