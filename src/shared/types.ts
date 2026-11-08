// User types
export interface User {
  id: string;
  email: string;
  username: string | null;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string | null;
  created_at: string;
}

// Photo types
export interface Photo {
  id: string;
  user_id: string;
  filename: string;
  original_filename: string;
  title: string;
  user_description: string | null;
  ai_description: string | null;
  exif_data: Record<string, unknown> | null;
  file_size: number;
  mime_type: string;
  upload_date: string;
  created_at: string;
  updated_at: string;
}

export interface PhotoDetail extends Photo {
  tags: string[];
}

// Tag types
export interface Tag {
  id: string;
  user_id: string;
  photo_id: string;
  tag_name: string;
  created_at: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

// Auth types
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface JwtPayload {
  user_id: string;
  email: string;
  iat: number;
  exp: number;
}

// Request/Response for auth endpoints
export interface RegisterRequest {
  email: string;
  password: string;
  username?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: UserProfile;
  access_token: string;
}
