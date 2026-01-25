import { useState, useEffect, type ReactNode } from 'react';
import type { Member } from '../types';
import { getCurrentUser, login as apiLogin, logout as apiLogout } from '../api/auth';
import { AuthContext } from '../hooks/useAuth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const member = await getCurrentUser();
        setUser(member);
      } catch {
        // No valid session - user needs to log in
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const response = await apiLogin({ email, password });
      setUser(response.user);
    } catch (err: unknown) {
      const errorMessage =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Anmeldung fehlgeschlagen';
      setError(errorMessage);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
    }
  };

  const refreshProfile = async () => {
    try {
      const member = await getCurrentUser();
      setUser(member);
    } catch {
      // Ignore errors - user might have been logged out
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
