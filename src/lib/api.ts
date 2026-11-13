import type {
  AuditLog,
  CustomCategory,
  Gender,
  PaymentMethod,
  PesantrenSettings,
  Santri,
  TransferCategory,
  TransferTransaction,
  UserAccount,
  UserRole,
} from './domain';

const TOKEN_KEY = 'tata_usaha_santri_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore storage errors
  }
}

async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Terjadi kesalahan server (${res.status})`);
  }
  return data as T;
}

export interface BootstrapResponse {
  user: UserAccount;
  santri: Santri[];
  transactions: TransferTransaction[];
  customCategories: CustomCategory[];
  settings: PesantrenSettings;
  users: UserAccount[];
  auditLogs: AuditLog[];
}

export const api = {
  login: (username: string, password: string) =>
    requestJson<{ token: string; user: UserAccount }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  logout: () =>
    requestJson<{ ok: boolean }>('/api/auth/logout', {
      method: 'POST',
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    requestJson<{ ok: boolean }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  bootstrap: () => requestJson<BootstrapResponse>('/api/bootstrap'),

  createSantri: (payload: {
    nis: string;
    namaLengkap: string;
    jenisKelamin: Gender;
    kelas: string;
    kamar: string;
    namaWali: string;
    noHpWali: string;
  }) =>
    requestJson<{ santri: Santri }>('/api/santri', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateSantri: (
    id: number,
    payload: {
      nis: string;
      namaLengkap: string;
      jenisKelamin: Gender;
      kelas: string;
      kamar: string;
      namaWali: string;
      noHpWali: string;
      aktif: boolean;
    }
  ) =>
    requestJson<{ santri: Santri }>(`/api/santri/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteSantri: (id: number) =>
    requestJson<{ ok: boolean }>(`/api/santri/${id}`, {
      method: 'DELETE',
    }),

  createTransaction: (payload: {
    tanggalTransfer: string;
    santriNama: string;
    santriNis?: string;
    jenisKelamin: Gender;
    kelas: string;
    kamar: string;
    namaPengirim: string;
    nominal: number;
    kategori: TransferCategory;
    subKategori: string;
    metodeTransfer: PaymentMethod;
    nomorReferensi: string;
    catatan: string;
    belumAdaNama?: boolean;
  }) =>
    requestJson<{ transaction: TransferTransaction }>('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  identifyTransaction: (
    id: number,
    payload: {
      santriNama: string;
      santriNis?: string;
      jenisKelamin: Gender;
      kelas: string;
      kamar: string;
      namaPengirim: string;
      catatanKoreksi?: string;
    }
  ) =>
    requestJson<{ transaction: TransferTransaction }>(`/api/transactions/${id}/identify`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  markPickedUp: (
    id: number,
    payload: {
      tanggalPengambilan: string;
      jamPengambilan: string;
      nominalDiserahkan: number;
      keteranganSerah: string;
    }
  ) =>
    requestJson<{ transaction: TransferTransaction }>(`/api/transactions/${id}/pickup`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  approveTransaction: (id: number) =>
    requestJson<{ transaction: TransferTransaction }>(`/api/transactions/${id}/approve`, {
      method: 'POST',
    }),

  updateTransaction: (
    id: number,
    payload: {
      tanggalTransfer: string;
      santriNama?: string;
      jenisKelamin?: Gender;
      kelas?: string;
      kamar?: string;
      namaPengirim: string;
      nominal: number;
      kategori: TransferCategory;
      subKategori: string;
      metodeTransfer: PaymentMethod;
      nomorReferensi: string;
      catatan: string;
      catatanAudit: string;
    }
  ) =>
    requestJson<{ transaction: TransferTransaction }>(`/api/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  cancelTransaction: (id: number, reason: string) =>
    requestJson<{ transaction: TransferTransaction }>(`/api/transactions/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  deleteTransaction: (id: number, reason: string) =>
    requestJson<{ ok: boolean }>(`/api/transactions/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    }),

  createUser: (payload: { username: string; password: string; namaLengkap: string; role: UserRole }) =>
    requestJson<{ user: UserAccount }>('/api/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateUser: (
    id: number,
    payload: { namaLengkap?: string; role?: UserRole; aktif?: boolean; password?: string }
  ) =>
    requestJson<{ user: UserAccount }>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  createCategory: (payload: { nama: string; deskripsi: string }) =>
    requestJson<{ category: CustomCategory }>('/api/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteCategory: (id: number) =>
    requestJson<{ ok: boolean }>(`/api/categories/${id}`, {
      method: 'DELETE',
    }),

  updateSettings: (payload: PesantrenSettings) =>
    requestJson<{ settings: PesantrenSettings }>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  restoreBackup: (backupData: unknown) =>
    requestJson<{ ok: boolean }>('/api/backup/restore', {
      method: 'POST',
      body: JSON.stringify(backupData),
    }),

  clearData: (scope: 'SAMPLE_ONLY' | 'ALL', reason: string) =>
    requestJson<{ ok: boolean; deletedTransactions: number; deletedSantri: number }>('/api/admin/clear-data', {
      method: 'POST',
      body: JSON.stringify({ scope, reason }),
    }),

  getDownloadUrl: (endpoint: string) => {
    const token = getStoredToken() ?? '';
    return `${endpoint}?token=${encodeURIComponent(token)}`;
  },
};
