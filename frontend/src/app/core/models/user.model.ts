export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  password_confirm: string;
}

export interface PasswordChangePayload {
  current_password: string;
  new_password: string;
  new_password_confirm: string;
}
