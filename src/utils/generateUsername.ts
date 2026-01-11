import { nanoid } from 'nanoid';

export function generateUsername(base: string) {
  const normalized = base.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${normalized}_${nanoid(5)}`;
}
