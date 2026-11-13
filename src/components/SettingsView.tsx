import { useMemo, useState } from 'react';
import {
  Shield,
  Database,
  Download,
  Upload,
  Plus,
  Trash2,
  KeyRound,
  Building2,
  ClipboardList,
  CheckCircle2,
  Search,
  Smartphone,
  AlertTriangle,
  Sun,
  Moon,
} from 'lucide-react';
import {
  canManageUsersAndAudit,
  getRoleDisplayLabel,
  type AuditLog,
  type CustomCategory,
  type PesantrenSettings,
  type UserAccount,
  type UserRole,
} from '../lib/domain';
import { api } from '../lib/api';
import { useTheme } from '../lib/theme';
import { PWAInstallButton } from './PWAInstallBanner';

interface SettingsViewProps {
  currentUser: UserAccount;
  settings: PesantrenSettings;
  users: UserAccount[];
  customCategories: CustomCategory[];
  auditLogs: AuditLog[];
  transactionCount: number;
  santriCount: number;
  onRefresh: () => Promise<void>;
  onToast: (msg: string) => void;
}

export function SettingsView({
  currentUser,
  settings,
  users,
  customCategories,
  auditLogs,
  transactionCount,
  santriCount,
  onRefresh,
  onToast,
}: SettingsViewProps) {
  const isAdmin = canManageUsersAndAudit(currentUser.role);
  const { theme, setTheme } = useTheme();

  // Password self-change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  // Pesantren identity state
  const [namaPesantren, setNamaPesantren] = useState(settings.namaPesantren);
  const [alamatPesantren, setAlamatPesantren] = useState(settings.alamatPesantren);
  const [namaBendahara, setNamaBendahara] = useState(settings.namaBendahara);
  const [kota, setKota] = useState(settings.kota);
  const [savingSettings, setSavingSettings] = useState(false);

  // Custom category state
  const [catNama, setCatNama] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catError, setCatError] = useState('');

  // New user form state
  const [newUsername, setNewUsername] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('OPERATOR');
  const [userError, setUserError] = useState('');
  const [resetPassTargetId, setResetPassTargetId] = useState<number | null>(null);
  const [resetPassValue, setResetPassValue] = useState('');

  // Audit search
  const [auditSearch, setAuditSearch] = useState('');

  // Backup restore & clear sample data
  const [restoreStatus, setRestoreStatus] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const [clearModalScope, setClearModalScope] = useState<'SAMPLE_ONLY' | 'ALL' | null>(null);
  const [clearReason, setClearReason] = useState('');
  const [clearingData, setClearingData] = useState(false);

  const filteredAudits = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    if (!q) return auditLogs;
    return auditLogs.filter((a) =>
      `${a.userName} ${a.action} ${a.kodeTransaksi ?? ''} ${a.reason} ${a.details}`
        .toLowerCase()
        .includes(q)
    );
  }, [auditLogs, auditSearch]);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    if (newPassword.length < 4) {
      setPwError('Kata sandi baru minimal 4 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }
    setPwSaving(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onToast('Kata sandi Anda berhasil diperbarui.');
      await onRefresh();
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Gagal mengubah kata sandi.');
    } finally {
      setPwSaving(false);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await api.updateSettings({ namaPesantren, alamatPesantren, namaBendahara, kota });
      await onRefresh();
      onToast('Pengaturan identitas pesantren berhasil disimpan.');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.');
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    setCatError('');
    if (!catNama.trim()) {
      setCatError('Nama kategori tambahan wajib diisi.');
      return;
    }
    try {
      await api.createCategory({ nama: catNama.trim(), deskripsi: catDesc.trim() });
      setCatNama('');
      setCatDesc('');
      await onRefresh();
      onToast('Kategori tambahan berhasil ditambahkan.');
    } catch (err) {
      setCatError(err instanceof Error ? err.message : 'Gagal menambahkan kategori.');
    }
  }

  async function handleDeleteCategory(id: number) {
    try {
      await api.deleteCategory(id);
      await onRefresh();
      onToast('Kategori tambahan dihapus.');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Gagal menghapus kategori.');
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setUserError('');
    try {
      await api.createUser({
        username: newUsername.trim(),
        password: newUserPass,
        namaLengkap: newNama.trim(),
        role: newRole,
      });
      setNewUsername('');
      setNewNama('');
      setNewUserPass('');
      await onRefresh();
      onToast('Akun pengguna baru berhasil dibuat.');
    } catch (err) {
      setUserError(err instanceof Error ? err.message : 'Gagal membuat akun pengguna.');
    }
  }

  async function handleToggleUserActive(u: UserAccount) {
    try {
      await api.updateUser(u.id, { aktif: !u.aktif });
      await onRefresh();
      onToast(`Status akun ${u.username} diperbarui.`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Gagal memperbarui status pengguna.');
    }
  }

  async function handleChangeUserRole(u: UserAccount, role: UserRole) {
    try {
      await api.updateUser(u.id, { role });
      await onRefresh();
      onToast(`Hak akses ${u.username} diubah menjadi ${getRoleDisplayLabel(role)}.`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Gagal mengubah hak akses.');
    }
  }

  async function handleAdminResetPassword(userId: number) {
    if (resetPassValue.length < 4) {
      onToast('Kata sandi baru minimal 4 karakter.');
      return;
    }
    try {
      await api.updateUser(userId, { password: resetPassValue });
      setResetPassTargetId(null);
      setResetPassValue('');
      await onRefresh();
      onToast('Kata sandi pengguna berhasil direset.');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Gagal mereset kata sandi.');
    }
  }

  async function handleRestoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreError('');
    setRestoreStatus('');
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await api.restoreBackup(parsed);
      await onRefresh();
      setRestoreStatus(`Database berhasil dipulihkan dari ${file.name}.`);
      onToast('Database berhasil dipulihkan dari file backup JSON.');
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : 'File backup JSON tidak valid.');
    } finally {
      e.target.value = '';
    }
  }

  const inputClass =
    'w-full px-3 py-2 text-sm bg-white dark:bg-[#15261E] border border-slate-300 dark:border-[#2D473B] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D4F35]/20 dark:focus:ring-emerald-400/25';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Pengaturan Sistem & Keamanan</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Kelola tema tampilan, kata sandi, aplikasi mobile (PWA), identitas pesantren, pengguna, dan audit sistem.
        </p>
      </div>

      {/* Preferensi Tampilan (Mode Terang & Mode Gelap) */}
      <section className="bg-white dark:bg-[#111F19] border border-[#DCE4DF] dark:border-[#243B31] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {theme === 'dark' ? (
            <Moon className="w-5 h-5 text-[#E5C158] shrink-0" aria-hidden="true" />
          ) : (
            <Sun className="w-5 h-5 text-[#0D4F35] shrink-0" aria-hidden="true" />
          )}
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Tampilan Aplikasi (Tema)</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Pilih Mode Terang atau Mode Gelap sesuai kenyamanan kerja petugas. Bukti cetak tetap berlatar putih bersih.
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border cursor-pointer transition-colors ${
              theme === 'light'
                ? 'bg-[#0D4F35] text-white border-[#0D4F35]'
                : 'bg-white dark:bg-[#15261E] text-slate-700 dark:text-slate-200 border-slate-300 dark:border-[#2D473B] hover:bg-slate-50 dark:hover:bg-[#1C3228]'
            }`}
          >
            <Sun className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Mode Terang</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border cursor-pointer transition-colors ${
              theme === 'dark'
                ? 'bg-[#E5C158] text-[#093825] border-[#E5C158]'
                : 'bg-white dark:bg-[#15261E] text-slate-700 dark:text-slate-200 border-slate-300 dark:border-[#2D473B] hover:bg-slate-50 dark:hover:bg-[#1C3228]'
            }`}
          >
            <Moon className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Mode Gelap</span>
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Keamanan Akun Saya */}
        <section className="bg-white dark:bg-[#111F19] border border-[#DCE4DF] dark:border-[#243B31] rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-5 h-5 text-[#0D4F35] dark:text-emerald-300" aria-hidden="true" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Ubah Kata Sandi Akun Saya</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Masuk sebagai <strong>{currentUser.namaLengkap}</strong> ({currentUser.username} ·{' '}
                {getRoleDisplayLabel(currentUser.role)})
              </p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label htmlFor="pw-curr" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kata Sandi Saat Ini
              </label>
              <input
                id="pw-curr"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="pw-new" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kata Sandi Baru
                </label>
                <input
                  id="pw-new"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="pw-confirm" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Konfirmasi Sandi Baru
                </label>
                <input
                  id="pw-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
            </div>

            {pwError && (
              <p className="text-xs text-rose-700 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 p-2.5 rounded-lg">
                {pwError}
              </p>
            )}

            <button
              type="submit"
              disabled={pwSaving}
              className="px-4 py-2 text-xs font-semibold bg-[#0D4F35] hover:bg-[#093825] text-white rounded-lg cursor-pointer"
            >
              {pwSaving ? 'Menyimpan...' : 'Perbarui Kata Sandi'}
            </button>
          </form>
        </section>

        {/* Instalasi Aplikasi Mobile (PWA) */}
        <section className="bg-white dark:bg-[#111F19] border border-[#DCE4DF] dark:border-[#243B31] rounded-xl p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-5 h-5 text-[#B8860B] dark:text-[#E5C158]" aria-hidden="true" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Aplikasi Mobile & Desktop (PWA)</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Aplikasi <strong>Tata Usaha</strong> dapat dipasang langsung di HP Android, iPhone, maupun laptop sehingga
              berjalan dalam layar penuh seperti aplikasi terpasang dan tetap menampilkan data cache saat jaringan tidak stabil.
            </p>
          </div>
          <div className="pt-2">
            <PWAInstallButton variant="login" />
          </div>
        </section>
      </div>

      {isAdmin && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Identitas Pesantren */}
            <section className="bg-white dark:bg-[#111F19] border border-[#DCE4DF] dark:border-[#243B31] rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-[#0D4F35] dark:text-emerald-300" aria-hidden="true" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Identitas Pesantren & Bukti Cetak</h3>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-3">
                <div>
                  <label htmlFor="set-nama" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Pondok Pesantren
                  </label>
                  <input
                    id="set-nama"
                    type="text"
                    value={namaPesantren}
                    onChange={(e) => setNamaPesantren(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="set-alamat" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Alamat Pesantren
                  </label>
                  <input
                    id="set-alamat"
                    type="text"
                    value={alamatPesantren}
                    onChange={(e) => setAlamatPesantren(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="set-bendahara" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nama Bendahara
                    </label>
                    <input
                      id="set-bendahara"
                      type="text"
                      value={namaBendahara}
                      onChange={(e) => setNamaBendahara(e.target.value)}
                      required
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="set-kota" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Kota (Kop Cetak)
                    </label>
                    <input
                      id="set-kota"
                      type="text"
                      value={kota}
                      onChange={(e) => setKota(e.target.value)}
                      required
                      className={inputClass}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-4 py-2 text-xs font-semibold bg-[#0D4F35] hover:bg-[#093825] text-white rounded-lg cursor-pointer"
                >
                  {savingSettings ? 'Menyimpan...' : 'Simpan Identitas'}
                </button>
              </form>
            </section>

            {/* Kategori Tambahan Uang Lainnya */}
            <section className="bg-white dark:bg-[#111F19] border border-[#DCE4DF] dark:border-[#243B31] rounded-xl p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Kategori Tambahan (Uang Lainnya)</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Sub-kategori tambahan yang muncul pada pilihan jenis Uang Lainnya saat pencatatan transfer.
                </p>
              </div>

              <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={catNama}
                  onChange={(e) => setCatNama(e.target.value)}
                  placeholder="Nama kategori (mis: Uang Kitab)"
                  className="flex-1 px-3 py-2 text-sm bg-white dark:bg-[#15261E] border border-slate-300 dark:border-[#2D473B] text-slate-900 dark:text-slate-100 rounded-lg"
                />
                <input
                  type="text"
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Deskripsi singkat"
                  className="flex-1 px-3 py-2 text-sm bg-white dark:bg-[#15261E] border border-slate-300 dark:border-[#2D473B] text-slate-900 dark:text-slate-100 rounded-lg"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1 px-3.5 py-2 text-xs font-semibold bg-[#0D4F35] text-white rounded-lg hover:bg-[#093825] cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Tambah</span>
                </button>
              </form>
              {catError && <p className="text-xs text-rose-700 dark:text-rose-300">{catError}</p>}

              <div className="divide-y divide-slate-100 dark:divide-[#20352B] border border-slate-200 dark:border-[#243B31] rounded-lg">
                {customCategories.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-3.5 py-2.5 text-sm">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{c.nama}</p>
                      {c.deskripsi && <p className="text-xs text-slate-500 dark:text-slate-400">{c.deskripsi}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(c.id)}
                      aria-label={`Hapus kategori ${c.nama}`}
                      className="p-1.5 text-slate-400 hover:text-rose-700 dark:hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Manajemen Pengguna & Hak Akses */}
          <section className="bg-white dark:bg-[#111F19] border border-[#DCE4DF] dark:border-[#243B31] rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-2.5">
              <Shield className="w-5 h-5 text-[#0D4F35] dark:text-emerald-300" aria-hidden="true" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Manajemen Pengguna & Hak Akses</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Kelola akun Admin, Operator Keuangan, dan Kepala Pesantren beserta status keaktifan.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleCreateUser}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 bg-[#FAFBF9] dark:bg-[#15261E] border border-[#DCE4DF] dark:border-[#243B31] p-4 rounded-xl"
            >
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Username baru"
                required
                className="px-3 py-2 text-sm bg-white dark:bg-[#0F1C16] border border-slate-300 dark:border-[#2D473B] text-slate-900 dark:text-slate-100 rounded-lg"
              />
              <input
                type="text"
                value={newNama}
                onChange={(e) => setNewNama(e.target.value)}
                placeholder="Nama lengkap petugas"
                required
                className="px-3 py-2 text-sm bg-white dark:bg-[#0F1C16] border border-slate-300 dark:border-[#2D473B] text-slate-900 dark:text-slate-100 rounded-lg"
              />
              <input
                type="password"
                value={newUserPass}
                onChange={(e) => setNewUserPass(e.target.value)}
                placeholder="Kata sandi (min 4)"
                required
                className="px-3 py-2 text-sm bg-white dark:bg-[#0F1C16] border border-slate-300 dark:border-[#2D473B] text-slate-900 dark:text-slate-100 rounded-lg"
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                aria-label="Hak akses pengguna baru"
                className="px-3 py-2 text-sm bg-white dark:bg-[#0F1C16] border border-slate-300 dark:border-[#2D473B] text-slate-900 dark:text-slate-100 rounded-lg"
              >
                <option value="OPERATOR">Operator Keuangan</option>
                <option value="ADMIN">Admin Tata Usaha</option>
                <option value="KEPALA_PESANTREN">Kepala Pesantren</option>
              </select>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#0D4F35] hover:bg-[#093825] text-white rounded-lg cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Tambah Pengguna</span>
              </button>
            </form>
            {userError && <p className="text-xs text-rose-700 dark:text-rose-300">{userError}</p>}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#DCE4DF] dark:border-[#243B31] bg-[#F3F6F4] dark:bg-[#15261E] text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    <th className="py-2.5 px-4">Username</th>
                    <th className="py-2.5 px-4">Nama Lengkap</th>
                    <th className="py-2.5 px-4">Level Hak Akses</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Pengaturan Akun</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF1EE] dark:divide-[#20352B]">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="py-2.5 px-4 font-mono-num font-semibold text-slate-900 dark:text-slate-100">
                        {u.username}
                      </td>
                      <td className="py-2.5 px-4 text-slate-800 dark:text-slate-200">{u.namaLengkap}</td>
                      <td className="py-2.5 px-4">
                        <select
                          value={u.role}
                          onChange={(e) => handleChangeUserRole(u, e.target.value as UserRole)}
                          aria-label={`Ubah role ${u.username}`}
                          className="px-2.5 py-1 text-xs bg-white dark:bg-[#15261E] border border-slate-300 dark:border-[#2D473B] text-slate-900 dark:text-slate-100 rounded-md"
                        >
                          <option value="ADMIN">Admin Tata Usaha</option>
                          <option value="OPERATOR">Operator Keuangan</option>
                          <option value="KEPALA_PESANTREN">Kepala Pesantren</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-4 text-xs font-semibold">
                        <span className={u.aktif ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}>
                          {u.aktif ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          {resetPassTargetId === u.id ? (
                            <div className="inline-flex items-center gap-1">
                              <input
                                type="password"
                                value={resetPassValue}
                                onChange={(e) => setResetPassValue(e.target.value)}
                                placeholder="Sandi baru"
                                className="w-28 px-2 py-1 text-xs bg-white dark:bg-[#15261E] border border-slate-300 dark:border-[#2D473B] text-slate-900 dark:text-slate-100 rounded"
                              />
                              <button
                                type="button"
                                onClick={() => handleAdminResetPassword(u.id)}
                                className="px-2 py-1 text-xs font-semibold bg-[#0D4F35] text-white rounded cursor-pointer"
                              >
                                Simpan
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setResetPassTargetId(null);
                                  setResetPassValue('');
                                }}
                                className="px-2 py-1 text-xs text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-[#2D473B] rounded cursor-pointer"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setResetPassTargetId(u.id);
                                setResetPassValue('');
                              }}
                              className="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-[#2D473B] rounded-md hover:bg-slate-50 dark:hover:bg-[#1B3127] cursor-pointer"
                            >
                              Reset Sandi
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleToggleUserActive(u)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md border cursor-pointer ${
                              u.aktif
                                ? 'text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                                : 'text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            }`}
                          >
                            {u.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Backup & Restore Database */}
          <section className="bg-white dark:bg-[#111F19] border border-[#DCE4DF] dark:border-[#243B31] rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <Database className="w-5 h-5 text-[#0D4F35] dark:text-emerald-300" aria-hidden="true" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Backup & Pemulihan Database</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Unduh salinan cadangan seluruh data santri dan transaksi ke komputer/HP secara berkala.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href={api.getDownloadUrl('/api/backup/export')}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[#0D4F35] hover:bg-[#093825] text-white rounded-lg"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Unduh Backup JSON</span>
              </a>

              <a
                href={api.getDownloadUrl('/api/backup/sqlite')}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-white dark:bg-[#15261E] border border-[#0D4F35]/30 dark:border-[#2D473B] text-[#0D4F35] dark:text-emerald-300 hover:bg-[#EFF6F2] dark:hover:bg-[#1C3228] rounded-lg"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Unduh Database SQLite (.db)</span>
              </a>

              <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[#FAF6EA] dark:bg-amber-950/40 border border-[#E5C158] dark:border-amber-700/60 text-[#9A6F04] dark:text-amber-300 hover:bg-[#f5ecd2] dark:hover:bg-amber-950/60 rounded-lg cursor-pointer">
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Pulihkan dari File JSON</span>
                <input type="file" accept="application/json,.json" onChange={handleRestoreFile} className="hidden" />
              </label>
            </div>

            {restoreStatus && (
              <p className="text-xs text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 p-2.5 rounded-lg inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                <span>{restoreStatus}</span>
              </p>
            )}
            {restoreError && (
              <p className="text-xs text-rose-700 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 p-2.5 rounded-lg">
                {restoreError}
              </p>
            )}

            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-[#243B31] space-y-3">
              <div>
                <h4 className="text-sm font-bold text-rose-800 dark:text-rose-300">
                  Bersihkan Data Contoh / Reset Transaksi
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Saat ini tercatat <strong className="font-mono-num">{transactionCount}</strong> transaksi dan{' '}
                  <strong className="font-mono-num">{santriCount}</strong> data santri. Gunakan tombol di bawah untuk
                  menghapus semua data contoh bawaan sebelum mulai mencatat data asli pesantren.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setClearModalScope('SAMPLE_ONLY');
                    setClearReason('Menghapus semua data contoh bawaan untuk mulai pencatatan resmi');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-rose-700 hover:bg-rose-800 text-white rounded-lg cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Hapus Semua Data Contoh</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setClearModalScope('ALL');
                    setClearReason('Reset total seluruh transaksi dan data santri ke nol');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-white dark:bg-[#15261E] border border-rose-300 dark:border-rose-800/70 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Kosongkan Semua Transaksi & Santri</span>
                </button>
              </div>

              {clearModalScope && (
                <div
                  role="dialog"
                  aria-modal="true"
                  className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-black/70 flex items-center justify-center p-4"
                >
                  <div className="bg-white dark:bg-[#111F19] border border-slate-200 dark:border-[#243B31] rounded-xl w-full max-w-md overflow-hidden">
                    <div className="px-6 py-4 bg-rose-700 text-white flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
                      <h3 className="text-base font-bold">
                        {clearModalScope === 'ALL'
                          ? 'Konfirmasi Kosongkan Semua Data'
                          : 'Konfirmasi Hapus Semua Data Contoh'}
                      </h3>
                    </div>

                    <div className="p-6 space-y-4">
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {clearModalScope === 'ALL'
                          ? 'PERHATIAN: Seluruh transaksi dan seluruh data santri akan dihapus permanen agar sistem bersih dari nol. Akun petugas, pengaturan pesantren, dan catatan audit tetap tersimpan.'
                          : 'Seluruh transaksi contoh bawaan beserta data santri contoh yang tidak memiliki transaksi asli akan dihapus permanen. Data asli yang sudah Anda input tetap aman.'}
                      </p>

                      <div>
                        <label
                          htmlFor="clear-audit-reason"
                          className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                        >
                          Catatan Audit *
                        </label>
                        <input
                          id="clear-audit-reason"
                          type="text"
                          value={clearReason}
                          onChange={(e) => setClearReason(e.target.value)}
                          className={inputClass}
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => setClearModalScope(null)}
                          disabled={clearingData}
                          className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-[#2D473B] rounded-lg cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          disabled={clearingData || !clearReason.trim()}
                          onClick={async () => {
                            setClearingData(true);
                            try {
                              const res = await api.clearData(clearModalScope, clearReason.trim());
                              setClearModalScope(null);
                              await onRefresh();
                              onToast(
                                `Berhasil menghapus ${res.deletedTransactions} transaksi dan ${res.deletedSantri} data santri.`
                              );
                            } catch (err) {
                              onToast(err instanceof Error ? err.message : 'Gagal menghapus data contoh.');
                            } finally {
                              setClearingData(false);
                            }
                          }}
                          className="px-4 py-2 text-sm font-semibold text-white bg-rose-700 hover:bg-rose-800 disabled:opacity-60 rounded-lg cursor-pointer"
                        >
                          {clearingData
                            ? 'Menghapus...'
                            : clearModalScope === 'ALL'
                              ? 'Ya, Kosongkan Semua'
                              : 'Ya, Hapus Data Contoh'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Log Audit Aktivitas */}
          <section className="bg-white dark:bg-[#111F19] border border-[#DCE4DF] dark:border-[#243B31] rounded-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <ClipboardList className="w-5 h-5 text-[#0D4F35] dark:text-emerald-300" aria-hidden="true" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Catatan Audit Aktivitas Sistem</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Merekam setiap login, pencatatan transfer, persetujuan admin, penyerahan uang, edit, pembatalan, dan penghapusan.
                  </p>
                </div>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Cari log audit..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-[#15261E] border border-slate-300 dark:border-[#2D473B] text-slate-900 dark:text-slate-100 rounded-lg"
                />
              </div>
            </div>

            <div className="overflow-x-auto max-h-96 overflow-y-auto border border-slate-200 dark:border-[#243B31] rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-[#F3F6F4] dark:bg-[#15261E] border-b border-[#DCE4DF] dark:border-[#243B31] text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Waktu</th>
                    <th className="py-2.5 px-3">Petugas</th>
                    <th className="py-2.5 px-3">Aksi</th>
                    <th className="py-2.5 px-3">Kode</th>
                    <th className="py-2.5 px-3">Alasan & Rincian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#20352B]">
                  {filteredAudits.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 dark:text-slate-400">
                        Belum ada catatan audit yang cocok.
                      </td>
                    </tr>
                  ) : (
                    filteredAudits.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-[#15261E]">
                        <td className="py-2 px-3 font-mono-num text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {log.createdAt.slice(0, 16).replace('T', ' ')}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                          {log.userName}
                        </td>
                        <td className="py-2 px-3 font-mono-num font-semibold text-[#0D4F35] dark:text-emerald-300 whitespace-nowrap">
                          {log.action}
                        </td>
                        <td className="py-2 px-3 font-mono-num text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {log.kodeTransaksi || '-'}
                        </td>
                        <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                          <span className="font-medium">{log.reason}</span>
                          {log.details ? ` — ${log.details}` : ''}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
