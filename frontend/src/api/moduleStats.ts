import { apiFetch } from './client';

export type ModuleStatTone = 'primary' | 'success' | 'warning' | 'error' | 'info';

export interface ApiModuleStat {
  key: string;
  label: string;
  value: number | string;
  hint?: string;
  tone: ModuleStatTone;
}

export const fetchModuleStats = (module: string, productId?: string) =>
  apiFetch<ApiModuleStat[]>(
    `/dashboard/module-stats?module=${encodeURIComponent(module)}${productId ? `&productId=${encodeURIComponent(productId)}` : ''}`,
  );
