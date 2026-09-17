import { apiFetch, apiUpload } from './client';
import type {
  ApiProject,
  ApiProjectDetail,
  CreateProjectPayload,
  UpdateProjectPayload,
} from '../types/project';
import type { ImportResultSummary } from '../components/common/ImportResultDialog';

export function fetchProjects(): Promise<ApiProject[]> {
  return apiFetch<ApiProject[]>('/projects');
}

export function fetchProject(id: string): Promise<ApiProjectDetail> {
  return apiFetch<ApiProjectDetail>(`/projects/${id}`);
}

export function createProject(data: CreateProjectPayload): Promise<ApiProject> {
  return apiFetch<ApiProject>('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateProject(
  id: string,
  data: UpdateProjectPayload,
): Promise<ApiProject> {
  return apiFetch<ApiProject>(`/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteProject(id: string): Promise<void> {
  return apiFetch<void>(`/projects/${id}`, { method: 'DELETE' });
}

export function importProjects(file: File): Promise<ImportResultSummary> {
  const formData = new FormData();
  formData.append('file', file);
  return apiUpload<ImportResultSummary>('/projects/import', formData);
}
