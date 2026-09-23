import { apiFetch } from './client';
import type {
  AddTeamMemberPayload,
  ApiTeam,
  ApiTeamDetail,
  ApiTeamMember,
  CreateTeamPayload,
  UpdateTeamPayload,
} from '../types/team';

export function fetchTeams(organizationId?: string): Promise<ApiTeam[]> {
  const query = organizationId ? `?organizationId=${organizationId}` : '';
  return apiFetch<ApiTeam[]>(`/teams${query}`);
}

export function fetchTeam(id: string): Promise<ApiTeamDetail> {
  return apiFetch<ApiTeamDetail>(`/teams/${id}`);
}

export function createTeam(data: CreateTeamPayload): Promise<ApiTeam> {
  return apiFetch<ApiTeam>('/teams', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateTeam(id: string, data: UpdateTeamPayload): Promise<ApiTeam> {
  return apiFetch<ApiTeam>(`/teams/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteTeam(id: string): Promise<void> {
  return apiFetch<void>(`/teams/${id}`, { method: 'DELETE' });
}

export function addTeamMember(
  teamId: string,
  data: AddTeamMemberPayload,
): Promise<ApiTeamMember> {
  return apiFetch<ApiTeamMember>(`/teams/${teamId}/members`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function removeTeamMember(teamId: string, memberId: string): Promise<void> {
  return apiFetch<void>(`/teams/${teamId}/members/${memberId}`, { method: 'DELETE' });
}
