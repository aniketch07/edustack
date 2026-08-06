import { User, UserRole } from '@/types';
import { disconnectSocket } from './socket';

const TOKEN_KEY = 'edustack_auth_token';
const USER_KEY = 'edustack_user_data';

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
    // Set cookie for middleware
    document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Lax`;
  }
};

export const removeToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    // Drop the old socket so the next login connects with the fresh token
    disconnectSocket();
  }
};

export const getUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

export const setUser = (user: User): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
};

export const isTokenExpired = (): boolean => {
  const token = getToken();
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

export const getRoleDashboard = (role: UserRole | string): string => {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return '/admin';
    case UserRole.INSTITUTE_ADMIN:
      return '/dashboard';
    case UserRole.TEACHER:
      return '/teacher/dashboard';
    case UserRole.STUDENT:
      return '/student/dashboard';
    default:
      return '/login';
  }
};
