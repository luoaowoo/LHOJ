import type { HydroUser } from '../types';

export function isSuperUser(user: Pick<HydroUser, 'role' | 'priv'> | null | undefined): boolean {
  if (!user) return false;
  const role = user.role?.trim().toLowerCase();
  return role === 'root'
    || role === 'su'
    || role === 'admin'
    || String(user.priv ?? '') === '-1';
}

export const PRIVILEGE_FLAGS = [
  [1 << 0, '编辑系统'],
  [1 << 1, '设置权限'],
  [1 << 2, '用户资料'],
  [1 << 3, '注册用户'],
  [1 << 4, '读取题目数据'],
  [1 << 7, '读取评测代码'],
  [1 << 8, '查看隐藏记录'],
  [1 << 9, '评测'],
  [1 << 10, '创建域'],
  [1 << 11, '查看所有域'],
  [1 << 12, '管理所有域'],
  [1 << 13, '重测'],
  [1 << 14, '查看用户机密'],
  [1 << 15, '查看评测统计'],
  [1 << 16, '创建文件'],
  [1 << 17, '无限配额'],
  [1 << 18, '删除文件'],
  [1 << 20, '禁止访问'],
  [1 << 22, '不受限访问'],
  [1 << 23, '查看系统通知'],
  [1 << 24, '发送消息'],
  [1 << 25, '管理徽章'],
] as const;

export function privilegeNames(value: number | string | undefined): string[] {
  const priv = Number(value);
  if (!Number.isSafeInteger(priv)) return [];
  if (priv === -1) return ['全部权限'];
  if (priv === 0) return ['已封禁'];
  return PRIVILEGE_FLAGS.filter(([flag]) => (priv & flag) === flag).map(([, label]) => label);
}
