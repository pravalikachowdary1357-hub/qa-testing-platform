export type WorkTone = 'default' | 'success' | 'warning' | 'error';

export interface WorkTile {
  key: string;
  label: string;
  value: string | number;
  tone?: WorkTone;
  link?: string;
  hint?: string;
}

export interface WorkListItem {
  id: string;
  title: string;
  meta?: string;
  status?: string;
  link?: string;
}

export interface WorkList {
  key: string;
  title: string;
  link?: string;
  emptyText: string;
  items: WorkListItem[];
}

export interface ApiMyWork {
  role: string;
  roleName: string;
  title: string;
  focus: string;
  responsibilities: string[];
  product: { id: string; name: string } | null;
  notice?: string;
  tiles: WorkTile[];
  lists: WorkList[];
}
