export interface ApiRoleRef {
  id: string;
  name: string;
}

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  role: ApiRoleRef;
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
}

export interface UpdateUserPayload {
  name?: string;
  roleId?: string;
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
