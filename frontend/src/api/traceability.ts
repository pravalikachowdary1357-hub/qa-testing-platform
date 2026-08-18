import { apiFetch } from './client';
import type { TraceabilityMatrix } from '../types/traceability';

export function fetchTraceabilityMatrix(productId?: string): Promise<TraceabilityMatrix> {
  const qs = productId ? `?productId=${productId}` : '';
  return apiFetch<TraceabilityMatrix>(`/traceability${qs}`);
}
