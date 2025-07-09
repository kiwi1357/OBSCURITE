export interface User {
  id: string;
  username?: string; // Username can be optional if not always returned or used
  email: string;
  role: 'user' | 'admin';
  phoneNumber?: string;
}

// Interface for the login response from the backend
export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}
