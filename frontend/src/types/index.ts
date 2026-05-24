// ═══════════════════════════════════════════
//  USER TYPES
// ═══════════════════════════════════════════

export interface User {
  id: number;
  name: string;
  username?: string;
  email: string;
  avatar: string | null;
  role: 'user' | 'admin';
  storage_used: number;
  storage_limit: number;
  is_active: boolean;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserStats {
  notes_count: number;
  friends_count: number;
  shared_with_me: number;
  files_count: number;
  storage_used_mb: number;
  storage_limit_mb: number;
}

// ═══════════════════════════════════════════
//  NOTE TYPES
// ═══════════════════════════════════════════

export interface Note {
  id: number;
  user_id: number;
  title: string;
  content: string | null;
  plain_text: string | null;
  color: string;
  is_pinned: boolean;
  is_trashed: boolean;
  share_code?: string | null;
  trashed_at: string | null;
  created_at: string;
  updated_at: string;
  user?: Pick<User, 'id' | 'name' | 'email' | 'avatar'>;
  shares?: NoteShare[];
  files?: FileItem[];
  pivot?: { permission: string; shared_by: number };
}

export interface NoteShare {
  id: number;
  note_id: number;
  shared_by: number;
  shared_with: number;
  permission: 'view' | 'edit';
  created_at: string;
  recipient?: Pick<User, 'id' | 'name' | 'username' | 'email' | 'avatar'>;
  sharer?: Pick<User, 'id' | 'name' | 'username' | 'email' | 'avatar'>;
}

export interface NoteVersion {
  id: number;
  note_id: number;
  user_id: number;
  content: string;
  plain_text: string | null;
  version_number: number;
  created_at: string;
  user?: Pick<User, 'id' | 'name'>;
}

// ═══════════════════════════════════════════
//  FRIENDSHIP TYPES
// ═══════════════════════════════════════════

export interface Friendship {
  id: number;
  sender_id: number;
  receiver_id: number;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  created_at: string;
  sender?: Pick<User, 'id' | 'name' | 'username' | 'email' | 'avatar'>;
  receiver?: Pick<User, 'id' | 'name' | 'username' | 'email' | 'avatar'>;
}

export interface Friend {
  id: number;
  name: string;
  username?: string;
  email: string;
  avatar: string | null;
  is_active?: boolean;
  is_online?: boolean;
}

// ═══════════════════════════════════════════
//  FILE TYPES
// ═══════════════════════════════════════════

export interface FileItem {
  id: number;
  user_id: number;
  note_id: number | null;
  original_name: string;
  stored_name: string;
  path: string;
  mime_type: string;
  size: number;
  r2_key: string;
  r2_url: string | null;
  created_at: string;
  user?: Pick<User, 'id' | 'name' | 'username' | 'email' | 'avatar'>;
  shares?: FileShare[];
  pivot?: { shared_by: number; created_at: string };
}

export interface FileShare {
  id: number;
  file_id: number;
  shared_by: number;
  shared_with: number;
  created_at: string;
  recipient?: Pick<User, 'id' | 'name' | 'username' | 'email' | 'avatar'>;
}

// ═══════════════════════════════════════════
//  ADMIN TYPES
// ═══════════════════════════════════════════

export interface DashboardStats {
  total_users: number;
  active_users: number;
  total_notes: number;
  total_shared_notes: number;
  total_friendships: number;
  total_files: number;
  total_storage_used: string;
  recent_signups: number;
}

export interface SiteSetting {
  id: number;
  key: string;
  value: string | null;
  type: string;
  group: string;
}

// ═══════════════════════════════════════════
//  API RESPONSE TYPES
// ═══════════════════════════════════════════

export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message?: string | string[];
  data?: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
