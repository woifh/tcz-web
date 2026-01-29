import { useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Member } from '../types';
import { login as apiLogin, logout as apiLogout } from '../api/auth';
import { getProfile } from '../api/members';
import { AuthContext } from '../hooks/useAuth';
import { clearToken } from '../api/client';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // Use React Query for profile data - shares cache with Profile page
  const { data: user, isLoading } = useQuery<Member | null>({
    queryKey: ['profile'],
    queryFn: async () => {
      try {
        return await getProfile();
      } catch {
        // No valid session - user needs to log in
        return null;
      }
    },
    staleTime: 60 * 1000, // Profile stays fresh for 1 minute
    retry: false, // Don't retry on auth failure
  });

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const response = await apiLogin({ email, password });
      // Update the cache with the logged-in user
      queryClient.setQueryData(['profile'], response.user);
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
      // Clear the token (in case apiLogout failed)
      clearToken();
      // Clear the profile cache
      queryClient.setQueryData(['profile'], null);
      queryClient.removeQueries({ queryKey: ['profile'] });
    }
  };

  const refreshProfile = async () => {
    // Invalidate the cache to trigger a refetch
    await queryClient.invalidateQueries({ queryKey: ['profile'] });
  };

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading, error, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
