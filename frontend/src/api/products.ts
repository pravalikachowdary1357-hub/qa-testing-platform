import { apiFetch } from './client';
import type { ApiProduct, CreateProductPayload, UpdateProductPayload } from '../types/product';

export function fetchProducts(): Promise<ApiProduct[]> {
  return apiFetch<ApiProduct[]>('/products');
}

export function fetchProduct(id: string): Promise<ApiProduct> {
  return apiFetch<ApiProduct>(`/products/${id}`);
}

export function createProduct(data: CreateProductPayload): Promise<ApiProduct> {
  return apiFetch<ApiProduct>('/products', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateProduct(id: string, data: UpdateProductPayload): Promise<ApiProduct> {
  return apiFetch<ApiProduct>(`/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteProduct(id: string): Promise<void> {
  return apiFetch<void>(`/products/${id}`, { method: 'DELETE' });
}
