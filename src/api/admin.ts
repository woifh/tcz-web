import api from './client';
import type { Member } from '../types';

// Block type matching API response
export interface Block {
  id: number;
  court_id: number;
  court_number: number;
  date: string;
  start_time: string;
  end_time: string;
  reason_id: number;
  reason?: string; // Legacy field (same as reason_name)
  reason_name?: string;
  comment?: string;
  details?: string;
  batch_id?: string;
  is_temporary?: boolean;
  created_by_id: string;
  created_by_name: string;
}

export interface BlockReason {
  id: number;
  name: string;
  is_active: boolean;
  teamster_usable: boolean;
  is_temporary: boolean;
  usage_count: number;
  created_by: string;
  created_at: string;
}

// Block API
export async function getBlocks(params?: {
  date?: string;
  start_date?: string;
  end_date?: string;
  court_id?: number;
}): Promise<Block[]> {
  // Map to server parameter names (date_range_start/date_range_end)
  const serverParams: Record<string, string | number> = {};
  if (params?.date) serverParams.date = params.date;
  if (params?.start_date) serverParams.date_range_start = params.start_date;
  if (params?.end_date) serverParams.date_range_end = params.end_date;
  if (params?.court_id) serverParams.court_id = params.court_id;

  const response = await api.get<{ blocks: Block[] }>('/api/admin/blocks', { params: serverParams });
  return response.data.blocks;
}

export interface CreateBlockData {
  court_ids: number[];
  date: string;
  start_time: string;
  end_time: string;
  reason_id: number;
  details?: string;
  confirm?: boolean;
}

export async function createBlocks(data: CreateBlockData): Promise<{ message: string; batch_id: string; blocks: Block[] }> {
  const response = await api.post<{ message: string; batch_id: string; blocks: Block[] }>('/api/admin/blocks/', data);
  return response.data;
}

export interface UpdateBatchData {
  court_ids: number[];
  date: string;
  start_time: string;
  end_time: string;
  reason_id: number;
  details?: string;
  confirm?: boolean;
}

export async function updateBlockBatch(batchId: string, data: UpdateBatchData): Promise<{ message: string }> {
  const response = await api.put<{ message: string }>(`/api/admin/blocks/${batchId}`, data);
  return response.data;
}

export async function deleteBlockBatch(batchId: string): Promise<{ message: string }> {
  const response = await api.delete<{ message: string }>(`/api/admin/blocks/${batchId}`);
  return response.data;
}

export interface ConflictPreviewData {
  court_ids: number[];
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
}

export interface ConflictPreviewResponse {
  conflicts: {
    court_number: number;
    date: string;
    time: string;
    member_name: string;
  }[];
}

export async function getConflictPreview(data: ConflictPreviewData): Promise<ConflictPreviewResponse> {
  const response = await api.post<ConflictPreviewResponse>('/api/admin/blocks/preview', data);
  return response.data;
}

// Block Reasons API
export async function getBlockReasons(): Promise<BlockReason[]> {
  const response = await api.get<{ reasons: BlockReason[] }>('/api/admin/block-reasons');
  return response.data.reasons;
}

export interface CreateBlockReasonData {
  name: string;
  teamster_usable: boolean;
  is_temporary: boolean;
}

export async function createBlockReason(data: CreateBlockReasonData): Promise<BlockReason> {
  const response = await api.post<{ reason: BlockReason }>('/api/admin/block-reasons', data);
  return response.data.reason;
}

export async function updateBlockReason(id: number, data: Partial<BlockReason>): Promise<BlockReason> {
  const response = await api.put<BlockReason>(`/api/admin/block-reasons/${id}`, data);
  return response.data;
}

export async function deleteBlockReason(id: number): Promise<{ message: string }> {
  const response = await api.delete<{ message: string }>(`/api/admin/block-reasons/${id}`);
  return response.data;
}

// Members Admin API
export interface MemberListItem {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  role: 'member' | 'teamster' | 'administrator';
  is_active: boolean;
  fee_paid: boolean;
  membership_type: 'full' | 'sustaining';
}

export async function getMembers(): Promise<MemberListItem[]> {
  const response = await api.get<{ members: MemberListItem[] }>('/api/members/');
  return response.data.members;
}

export async function getMember(id: string): Promise<Member> {
  const response = await api.get<Member>(`/api/members/${id}`);
  return response.data;
}

export async function updateMember(id: string, data: Partial<Member>): Promise<Member> {
  const response = await api.put<Member>(`/api/members/${id}`, data);
  return response.data;
}

export async function deactivateMember(id: string): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>(`/api/members/${id}/deactivate`);
  return response.data;
}

export async function reactivateMember(id: string): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>(`/api/members/${id}/reactivate`);
  return response.data;
}

// Audit Log API
export interface AuditLogEntry {
  timestamp: string;
  action: string;
  user: string;
  details: Record<string, unknown>;
  type: 'block' | 'member' | 'reason' | 'reservation';
  performer_role: string;
  is_admin_action?: boolean;
}

export async function getAuditLog(params?: {
  type?: string;
  limit?: number;
}): Promise<AuditLogEntry[]> {
  const response = await api.get<{ success: boolean; logs: AuditLogEntry[] }>('/api/admin/blocks/audit-log', { params });
  return response.data.logs;
}

// Payment Deadline API
export interface PaymentDeadline {
  deadline: string | null;
  days_until: number | null;
  is_past: boolean;
  unpaid_count?: number;
}

export async function getPaymentDeadline(): Promise<PaymentDeadline> {
  const response = await api.get<PaymentDeadline>('/api/admin/settings/payment-deadline');
  return response.data;
}

export async function setPaymentDeadline(deadline: string): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>('/api/admin/settings/payment-deadline', { deadline });
  return response.data;
}

export async function clearPaymentDeadline(): Promise<{ message: string }> {
  const response = await api.delete<{ message: string }>('/api/admin/settings/payment-deadline');
  return response.data;
}

// Feature Flags API
export interface FeatureFlag {
  id: number;
  key: string;
  name: string;
  description?: string;
  is_enabled: boolean;
  allowed_roles: string[];
  updated_at: string | null;
}

export async function getFeatureFlags(): Promise<FeatureFlag[]> {
  const response = await api.get<{ flags: FeatureFlag[] }>('/api/admin/feature-flags');
  return response.data.flags;
}

export async function updateFeatureFlag(id: number, data: Partial<FeatureFlag>): Promise<{ message: string }> {
  const response = await api.put<{ message: string }>(`/api/admin/feature-flags/${id}`, data);
  return response.data;
}

// Pending Payment Confirmations API
export interface PendingConfirmationMember {
  id: string;
  name: string;
  email: string;
  payment_confirmation_requested_at: string | null;
}

export async function getPendingPaymentConfirmations(): Promise<{ count: number; members: PendingConfirmationMember[] }> {
  const response = await api.get<{ count: number; members: PendingConfirmationMember[] }>('/api/admin/members/pending-confirmations');
  return response.data;
}

export async function rejectPaymentConfirmation(id: string): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>(`/api/admin/members/${id}/reject-payment-confirmation`);
  return response.data;
}

// Member CRUD (Admin)
export interface CreateMemberData {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  phone?: string;
  street?: string;
  city?: string;
  zip_code?: string;
  role?: 'member' | 'teamster' | 'administrator';
  membership_type?: 'full' | 'sustaining';
  fee_paid?: boolean;
}

export async function createMember(data: CreateMemberData): Promise<Member> {
  const response = await api.post<Member>('/api/members/', data);
  return response.data;
}

export async function deleteMember(id: string): Promise<{ message: string }> {
  const response = await api.delete<{ message: string }>(`/api/members/${id}`);
  return response.data;
}

export async function resendMemberVerification(id: string): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>(`/api/members/${id}/resend-verification`);
  return response.data;
}
