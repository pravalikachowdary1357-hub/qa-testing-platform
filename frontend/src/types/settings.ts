export interface ApiRoleRef {
  id: string;
  name: string;
}

export interface ApiUserOrganizationRef {
  id: string;
  name: string;
}

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  role: ApiRoleRef;
  organization: ApiUserOrganizationRef | null;
  emailNotificationsEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  email: string;
  name: string;
  password: string;
  roleId: string;
  organizationId?: string;
}

export interface UpdateUserPayload {
  name?: string;
  roleId?: string;
  // null explicitly clears an existing assignment; undefined leaves it
  // untouched (the backend/Prisma distinguish the two -- an absent key is a
  // no-op, so "None" in the picker must send null, not just omit the field).
  organizationId?: string | null;
}

export interface ApiPermission {
  id: string;
  key: string;
  resource: string;
  action: string;
  description: string | null;
  createdAt: string;
}

export interface ApiRole {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  userCount: number;
  permissions: ApiPermission[];
}

export interface ApiAppSettings {
  id: string;
  defaultEnvironmentType: string | null;
  defaultTestCasePriority: string;
  defaultDefectSeverity: string;
  notifyOnDefectCreated: boolean;
  notifyOnReleaseReadinessChange: boolean;
  notifyOnTestExecutionFailure: boolean;
  updatedAt: string;
  updatedByUserId: string | null;
}

export type UpdateAppSettingsPayload = Partial<
  Omit<ApiAppSettings, 'id' | 'updatedAt' | 'updatedByUserId'>
>;

export interface ApiAuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; name: string; email: string } | null;
}
