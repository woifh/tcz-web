import api from './client';
import type { DayAvailability } from '../types';

export interface AvailabilityResponse {
  date: string;
  current_hour: number;
  courts: {
    court_id: number;
    court_number: number;
    occupied: {
      time: string;
      status: 'reserved' | 'blocked' | 'blocked_temporary' | 'short_notice';
      details: {
        // Reservation details
        reservation_id?: number;
        booked_for_id?: string;
        booked_for?: string;
        booked_for_has_profile_picture?: boolean;
        booked_for_profile_picture_version?: number;
        is_short_notice?: boolean;
        is_own?: boolean;
        can_cancel?: boolean;
        // Block details
        block_id?: number;
        reason?: string;
        is_temporary?: boolean;
      } | null;
    }[];
  }[];
  metadata: {
    generated_at: string;
    timezone: string;
  };
}

export async function getAvailability(date: string): Promise<AvailabilityResponse> {
  const response = await api.get<AvailabilityResponse>('/api/courts/availability', {
    params: { date },
  });
  return response.data;
}

export async function getAvailabilityRange(
  start: string,
  days: number
): Promise<{ days: DayAvailability[] }> {
  const response = await api.get<{ days: DayAvailability[] }>('/api/courts/availability/range', {
    params: { start, days },
  });
  return response.data;
}

export interface Court {
  id: number;
  number: number;
  status: 'available' | 'blocked';
}

export async function getCourts(): Promise<Court[]> {
  const response = await api.get<{ courts: Court[] }>('/api/courts');
  return response.data.courts;
}
