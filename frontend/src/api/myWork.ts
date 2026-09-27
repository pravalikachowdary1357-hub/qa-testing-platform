import { apiFetch } from './client';
import type { ApiMyWork } from '../types/myWork';

export const fetchMyWork = (productId?: string) =>
  apiFetch<ApiMyWork>(`/dashboard/my-work${productId ? `?productId=${encodeURIComponent(productId)}` : ''}`);
