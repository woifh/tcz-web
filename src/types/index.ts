// Member types
export interface Member {
  id: string;
  firstname: string;
  lastname: string;
  name: string;
  email: string;
  email_verified: boolean;
  has_profile_picture: boolean;
  profile_picture_version: number;
  member_since?: string;
  // Optional fields (own profile)
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
  // Admin-only fields
  role?: 'member' | 'teamster' | 'administrator';
  membership_type?: 'full' | 'sustaining';
  is_active?: boolean;
  fee_paid?: boolean;
  payment_confirmation_requested?: boolean;
  payment_confirmation_requested_at?: string;
  email_verified_at?: string;
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: Member;
}

// Court types
export interface Court {
  id: number;
  number: number;
  status: 'available' | 'blocked';
}

// Reservation types
export interface Reservation {
  id: number;
  court_id: number;
  court_number: number;
  date: string; // ISO date string YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  booked_for_id: string;
  booked_for?: string; // Full name string from API (e.g., "John Doe")
  booked_for_name?: string; // Alias for booked_for
  booked_for_has_profile_picture: boolean;
  booked_for_profile_picture_version: number;
  booked_by_id: string;
  booked_by?: string; // Full name string from API (e.g., "John Doe")
  booked_by_name?: string; // Alias for booked_by
  booked_by_has_profile_picture: boolean;
  booked_by_profile_picture_version: number;
  status: 'active' | 'cancelled' | 'suspended';
  is_short_notice: boolean;
  is_suspended: boolean;
  reason?: string;
}

export interface CreateReservationRequest {
  court_id: number;
  date: string;
  start_time: string;
  booked_for_id?: string; // Optional, defaults to current user
}

// Block types
export interface BlockReason {
  id: number;
  name: string;
  description?: string;
  color: string;
  is_temporary: boolean;
  teamster_allowed: boolean;
}

export interface Block {
  id: number;
  court_id: number;
  court_number: number;
  date: string;
  start_time: string;
  end_time: string;
  reason_id: number;
  reason_name: string;
  reason_color: string;
  is_temporary: boolean;
  note?: string;
  batch_id?: string;
  created_by_id: string;
  created_by_name: string;
}

// Availability types (for dashboard)
export interface SlotAvailability {
  status: 'available' | 'reserved' | 'blocked' | 'own' | 'past';
  reservation?: Reservation;
  block?: Block;
}

export interface CourtAvailability {
  court_number: number;
  slots: Record<string, SlotAvailability>; // key is time like "08:00"
}

export interface DayAvailability {
  date: string;
  courts: CourtAvailability[];
}

// API response types
export interface ApiError {
  error: string;
  details?: Record<string, string>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}
