export interface User {
  id: string;
  email: string;
  name?: string;
  provider: 'apple';
  createdAt: Date;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}