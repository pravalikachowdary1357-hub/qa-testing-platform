export interface ApiTeamOrganizationRef {
  id: string;
  name: string;
}

export interface ApiTeamMemberUserRef {
  id: string;
  name: string;
  email: string;
  status: string;
}

export interface ApiTeamMember {
  id: string;
  teamId: string;
  userId: string;
  responsibility: string | null;
  createdAt: string;
  user: ApiTeamMemberUserRef;
}

export interface ApiTeam {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  organization: ApiTeamOrganizationRef;
  _count: { members: number };
  createdAt: string;
  updatedAt: string;
}

export interface ApiTeamDetail extends Omit<ApiTeam, '_count'> {
  members: ApiTeamMember[];
}

export interface CreateTeamPayload {
  organizationId: string;
  name: string;
  description?: string;
}

export type UpdateTeamPayload = Partial<Omit<CreateTeamPayload, 'organizationId'>>;

export interface AddTeamMemberPayload {
  userId: string;
  responsibility?: string;
}
