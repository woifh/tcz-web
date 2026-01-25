import api from './client';
import type { Reservation, CreateReservationRequest } from '../types';

export interface ReservationsResponse {
  current_time: string;
  reservations: (Reservation & { can_cancel: boolean })[];
  statistics: {
    total_count: number;
    active_count: number;
    past_count: number;
    regular_active_count: number;
    short_notice_active_count: number;
  };
}

export async function getReservations(includePast = false): Promise<ReservationsResponse> {
  const response = await api.get<ReservationsResponse>('/api/reservations/', {
    params: { include_past: includePast },
  });
  return response.data;
}

export interface CreateReservationResponse {
  message: string;
  reservation: Reservation;
}

export interface CreateReservationError {
  error: string;
  active_sessions?: {
    reservation_id: number;
    date: string;
    start_time: string;
    court_number: number;
    booked_by_id?: string;
    booked_by_name?: string;
    is_short_notice: boolean;
  }[];
}

export async function createReservation(data: CreateReservationRequest): Promise<CreateReservationResponse> {
  const response = await api.post<CreateReservationResponse>('/api/reservations/', data);
  return response.data;
}

export async function cancelReservation(id: number): Promise<{ message: string }> {
  const response = await api.delete<{ message: string }>(`/api/reservations/${id}`);
  return response.data;
}

export interface ReservationStatusResponse {
  current_time: string;
  user_id: string;
  limits: {
    regular_reservations: {
      limit: number;
      current: number;
      available: number;
      can_book: boolean;
    };
    short_notice_bookings: {
      limit: number;
      current: number;
      available: number;
      can_book: boolean;
    };
  };
  active_reservations: {
    total: number;
    regular: number;
    short_notice: number;
  };
  payment_deadline?: {
    deadline: string;
    days_until: number;
    is_past: boolean;
  };
}

export async function getReservationStatus(): Promise<ReservationStatusResponse> {
  const response = await api.get<ReservationStatusResponse>('/api/reservations/status');
  return response.data;
}
