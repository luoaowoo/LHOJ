import type { HydroUser } from '../types';

export function isSuperUser(user: Pick<HydroUser, 'role' | 'priv'> | null | undefined): boolean {
  if (!user) return false;
  const role = user.role?.trim().toLowerCase();
  return role === 'root'
    || role === 'su'
    || role === 'admin'
    || String(user.priv ?? '') === '-1';
}