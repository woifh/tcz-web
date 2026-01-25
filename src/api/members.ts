import api from './client';
import type { Member } from '../types';

// Profile API (current user)
export async function getProfile(): Promise<Member> {
  const response = await api.get<Member>('/api/members/me');
  return response.data;
}

export interface UpdateProfileData {
  firstname?: string;
  lastname?: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  zip_code?: string;
  notifications_enabled?: boolean;
  notify_own_bookings?: boolean;
  notify_other_bookings?: boolean;
  notify_court_blocked?: boolean;
  notify_booking_overridden?: boolean;
  push_notifications_enabled?: boolean;
  push_notify_own_bookings?: boolean;
  push_notify_other_bookings?: boolean;
  push_notify_court_blocked?: boolean;
  push_notify_booking_overridden?: boolean;
}

export async function updateProfile(data: UpdateProfileData): Promise<Member> {
  const response = await api.patch<Member>('/api/members/me', data);
  return response.data;
}

// Password change
export interface ChangePasswordData {
  current_password: string;
  new_password: string;
}

export async function changePassword(data: ChangePasswordData): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>('/api/members/me/password', data);
  return response.data;
}

// Member search
export type MemberSearchResult = Member;

export async function searchMembers(query: string): Promise<Member[]> {
  const response = await api.get<{ results: Member[]; count: number }>('/api/members/search', {
    params: { q: query },
  });
  return response.data.results;
}

// Favourites API (uses current user)
export async function getFavourites(): Promise<Member[]> {
  const response = await api.get<{ favourites: Member[] }>('/api/members/me/favourites');
  return response.data.favourites;
}

export async function addFavourite(favouriteId: string): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>('/api/members/me/favourites', {
    favourite_id: favouriteId,
  });
  return response.data;
}

export async function removeFavourite(favouriteId: string): Promise<{ message: string }> {
  const response = await api.delete<{ message: string }>(`/api/members/me/favourites/${favouriteId}`);
  return response.data;
}

// Profile picture
export async function uploadProfilePicture(file: File): Promise<{ message: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post<{ message: string }>(
    '/api/members/me/profile-picture',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data;
}

export async function deleteProfilePicture(): Promise<{ message: string }> {
  const response = await api.delete<{ message: string }>('/api/members/me/profile-picture');
  return response.data;
}

// Email verification
export async function resendVerificationEmail(): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>('/auth/resend-verification');
  return response.data;
}

// Member by ID (for admin or detailed view)
export async function getMember(id: string): Promise<Member> {
  const response = await api.get<Member>(`/api/members/${id}`);
  return response.data;
}

// Statistics
export interface StatisticsSummary {
  total_bookings: number;
  bookings_by_others: number;
  cancellation_count: number;
  cancellation_rate: number;
  member_since: string | null;
}

export interface StatisticsPartner {
  member_id: string;
  name: string;
  has_profile_picture: boolean;
  profile_picture_version: number;
  play_count: number;
  last_played: string | null;
}

export interface StatisticsMonthly {
  year: number;
  month: number;
  month_name: string;
  count: number;
}

export interface StatisticsCourtPreference {
  court_number: number;
  count: number;
  percentage: number;
}

export interface StatisticsTimeSlot {
  time: string;
  count: number;
  percentage: number;
}

export interface StatisticsDayPreference {
  day: string;
  day_index: number;
  count: number;
  percentage: number;
}

export interface MemberStatistics {
  member_id: string;
  generated_at: string;
  selected_year: number | null;
  available_years: number[];
  summary: StatisticsSummary;
  partners: {
    top_partners: StatisticsPartner[];
    total_unique_partners: number;
  };
  monthly_breakdown: StatisticsMonthly[];
  court_preferences: StatisticsCourtPreference[];
  time_preferences: {
    favorite_time_slots: StatisticsTimeSlot[];
    favorite_days: StatisticsDayPreference[];
  };
}

export async function getMemberStatistics(memberId: string, year?: number): Promise<MemberStatistics> {
  const params = year ? { year } : {};
  const response = await api.get<MemberStatistics>(`/api/members/${memberId}/statistics`, { params });
  return response.data;
}
