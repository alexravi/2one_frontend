// ── Centralized API Client ──────────────────────────────────
// All backend calls go through this module.
// JWT token is stored in localStorage + cookie and auto-attached to requests.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

console.log('✅ API_BASE from env:', API_BASE || '(not set)');

// ── Token helpers ───────────────────────────────────────────
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

export function setToken(token: string): void {
  localStorage.setItem('auth_token', token);
  // Also set as cookie so middleware can read it for server-side auth
  document.cookie = `auth_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function clearToken(): void {
  localStorage.removeItem('auth_token');
  document.cookie = 'auth_token=; path=/; max-age=0';
}

// ── Generic fetch wrapper ───────────────────────────────────
async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!API_BASE) {
    console.error('🚨 NEXT_PUBLIC_API_URL is not set! API calls will fail.');
    throw new Error('NEXT_PUBLIC_API_URL is missing — cannot make API calls');
  }

  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${path}`;
  const method = (options.method || 'GET').toUpperCase();
  console.log(`[API] ${method} ${url}`);

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    // ── 401 Interceptor: redirect to login on token expiry ──
    if (res.status === 401) {
      clearToken();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      }
    }

    const body = await res.json().catch(() => ({}));
    const message = body.message || body.error || `Request failed (${res.status})`;
    throw new ApiError(res.status, Array.isArray(message) ? message.join(', ') : message);
  }

  // Handle 204 No Content
  if (res.status === 204) return {} as T;

  return res.json();
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Types ───────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  access_token: string;
  user: AuthUser;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  country?: string;
  primary_language?: string;
  secondary_language?: string;
}

export interface PresignedUrlResponse {
  upload_url: string;
  file_id: string;
}

export interface Recording {
  id: string;
  file_name: string;
  blob_url: string;
  duration: number | null;
  sample_rate: number | null;
  language: string | null;
  speaker_count: number | null;
  upload_date: string;
  validation_status: 'processing' | 'approved' | 'rejected';
  payment_status: string;
}

export interface Transaction {
  id: string;
  recording: Recording | null;
  amount: number;
  status: string;
  created_at: string;
}

export interface PayoutRequest {
  id: string;
  amount: number;
  bank_account_name: string;
  account_number: string;
  ifsc_code: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  created_at: string;
}

export interface RequestPayoutData {
  amount: number;
  bank_account_name: string;
  account_number: string;
  ifsc_code: string;
}

// ── Auth endpoints ──────────────────────────────────────────
export function authLogin(email: string, password: string) {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function authRegister(data: RegisterData) {
  return apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function authGoogleLogin(token: string) {
  return apiFetch<AuthResponse>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

// ── Upload endpoints ────────────────────────────────────────
export function getPresignedUrl(filename: string) {
  return apiFetch<PresignedUrlResponse>('/upload/presigned-url', {
    method: 'POST',
    body: JSON.stringify({ filename }),
  });
}

export async function uploadFileToBlob(uploadUrl: string, file: File) {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'x-ms-blob-type': 'BlockBlob',
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`Blob upload failed (${res.status})`);
  }
}

// ── Recording endpoints ─────────────────────────────────────
export function registerRecording(data: { file_id: string; filename: string; size: number }) {
  return apiFetch<Recording>('/recordings/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getMyRecordings() {
  return apiFetch<Recording[]>('/recordings');
}

export function getRecordingById(id: string) {
  return apiFetch<Recording>(`/recordings/${id}`);
}

// ── Payout / Wallet endpoints ───────────────────────────────
export function getBalance() {
  return apiFetch<{ balance: number }>('/payouts/balance');
}

export function getTransactions() {
  return apiFetch<Transaction[]>('/payouts/transactions');
}

export function getPayoutHistory() {
  return apiFetch<PayoutRequest[]>('/payouts/history');
}

export function requestPayout(data: RequestPayoutData) {
  return apiFetch<PayoutRequest>('/payouts/request', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Users / Profile endpoints ──────────────────────────────
export function getProfile() {
  return apiFetch<AuthUser & {
    country?: string;
    primary_language?: string;
    secondary_language?: string;
    phone?: string;
    age_range?: string;
    gender?: string;
    created_at: string;
  }>('/users/profile');
}

export function updateProfile(data: Partial<RegisterData & {
  phone?: string;
  age_range?: string;
  gender?: string;
}>) {
  return apiFetch<AuthUser>('/users/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

