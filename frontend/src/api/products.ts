import { apiFetch, apiUpload } from './client';
import type {
  ApiProduct,
  ApiProductComponent,
  ApiProductDashboardSummary,
  ApiProductTeamMember,
  CreateProductComponentPayload,
  CreateProductPayload,
  CreateProductTeamMemberPayload,
  UpdateProductPayload,
} from '../types/product';
import type { ImportResultSummary } from '../components/common/ImportResultDialog';

export function fetchProducts(): Promise<ApiProduct[]> {
  return apiFetch<ApiProduct[]>('/products');
}

export function fetchProduct(id: string): Promise<ApiProduct> {
  return apiFetch<ApiProduct>(`/products/${id}`);
}

export function fetchProductDashboardSummary(
  id: string,
): Promise<ApiProductDashboardSummary> {
  return apiFetch<ApiProductDashboardSummary>(`/products/${id}/dashboard-summary`);
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

export function importProducts(file: File): Promise<ImportResultSummary> {
  const formData = new FormData();
  formData.append('file', file);
  return apiUpload<ImportResultSummary>('/products/import', formData);
}

export function fetchProductComponents(productId: string): Promise<ApiProductComponent[]> {
  return apiFetch<ApiProductComponent[]>(`/product-components?productId=${productId}`);
}

export function createProductComponent(
  data: CreateProductComponentPayload,
): Promise<ApiProductComponent> {
  return apiFetch<ApiProductComponent>('/product-components', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteProductComponent(id: string): Promise<void> {
  return apiFetch<void>(`/product-components/${id}`, { method: 'DELETE' });
}

export function fetchProductTeamMembers(productId: string): Promise<ApiProductTeamMember[]> {
  return apiFetch<ApiProductTeamMember[]>(`/product-team-members?productId=${productId}`);
}

export function createProductTeamMember(
  data: CreateProductTeamMemberPayload,
): Promise<ApiProductTeamMember> {
  return apiFetch<ApiProductTeamMember>('/product-team-members', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteProductTeamMember(id: string): Promise<void> {
  return apiFetch<void>(`/product-team-members/${id}`, { method: 'DELETE' });
}
