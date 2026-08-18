export interface ApiCurrentUser {
  id: string;
  email: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  roleId: string;
  roleName: string;
  permissions: string[];
  emailNotificationsEnabled: boolean;
}

export interface LoginResponse {
  token: string;
  user: ApiCurrentUser;
}

export interface ApiSession {
  id: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  userAgent: string | null;
  current: boolean;
}
