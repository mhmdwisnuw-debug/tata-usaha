import { useState } from 'react';
import { Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { PesantrenEmblem } from './Emblem';
import { PWAInstallButton } from './PWAInstallBanner';
import { api } from '../lib/api';
import { ThemeToggleButton } from '../lib/theme';
import type { UserAccount } from '../lib/domain';

interface LoginViewProps {
  onSuccess: (token: string, user: UserAccount) => void;
}

const DEMO_ACCOUNTS = [
  {
    label: 'Admin Tata Usaha',
    username: 'admin',
    pass: 'admin123',
    desc: 'Akses penuh, edit & audit, kelola pengguna, backup database',
  },
  {
    label: 'Operator Keuangan',
    username: 'operator',
    pass: 'operator123',
    desc: 'Input transfer masuk, serah terima uang, cetak bukti',
  },
  {
    label: 'Kepala Pesantren',
    username: 'kepala',
    pass: 'kepala123',
    desc: 'Pantau dashboard & seluruh laporan keuangan (hanya baca)',
  },
];

export function LoginView({ onSuccess }: LoginViewProps) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Masukkan username dan kata sandi.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.login(username.trim(), password);
      onSuccess(res.token, res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk ke sistem.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F7F5] dark:bg-[#0B1410] flex flex-col lg:flex-row transition-colors">
      {/* Left Brand Panel */}
      <div className="lg:w-[46%] bg-[#0B422C] text-white p-8 lg:p-14 flex flex-col justify-between islamic-pattern relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3.5">
            <PesantrenEmblem className="w-14 h-14 shrink-0" />
            <div>
              <p className="text-xs tracking-widest text-[#E5C158] font-semibold uppercase">Sistem Administrasi</p>
              <h1 className="text-xl font-bold tracking-tight text-white">Tata Usaha Pesantren</h1>
            </div>
          </div>

          <div className="mt-10 lg:mt-16 max-w-md">
            <h2 className="text-3xl lg:text-4xl font-bold leading-tight text-white [text-wrap:balance]">
              Data dan Informasi Transfer Santri
            </h2>
            <p className="mt-4 text-emerald-100/85 text-base leading-relaxed">
              Pencatatan amanah transfer wali santri secara tertib, transparan, dan terpisah antara santri putra,
              santri putri, uang bekal, dan pembayaran SPP.
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-10 pt-6 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-[#E5C158] font-semibold">Putra & Putri Terpisah</p>
            <p className="text-emerald-100/75 text-xs mt-1">Dashboard, daftar transaksi, dan laporan mandiri.</p>
          </div>
          <div>
            <p className="text-[#E5C158] font-semibold">Kontrol Pengambilan</p>
            <p className="text-emerald-100/75 text-xs mt-1">Tercatat tanggal, jam, dan petugas penyerah.</p>
          </div>
          <div>
            <p className="text-[#E5C158] font-semibold">Pemisahan SPP & Bekal</p>
            <p className="text-emerald-100/75 text-xs mt-1">Status SPP terpisah agar perhitungan saldo akurat.</p>
          </div>
        </div>
      </div>

      {/* Right Login Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-16">
        <div className="w-full max-w-md bg-white dark:bg-[#111F19] border border-[#DCE4DF] dark:border-[#243B31] rounded-xl p-7 sm:p-9">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-medium text-[#0D4F35] dark:text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-[#B8860B] dark:text-[#E5C158]" aria-hidden="true" />
              <span>Akses Terotentikasi · Database Aktif</span>
            </div>
            <ThemeToggleButton variant="login" />
          </div>
          <h2 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">Masuk ke Tata Usaha</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Silakan masuk menggunakan akun Admin, Operator, atau Kepala Pesantren.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="login-username" className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  autoComplete="username"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white dark:bg-[#15261E] border border-slate-300 dark:border-[#2D473B] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D4F35]/25 dark:focus:ring-emerald-400/25 focus:border-[#0D4F35] dark:focus:border-emerald-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white dark:bg-[#15261E] border border-slate-300 dark:border-[#2D473B] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D4F35]/25 dark:focus:ring-emerald-400/25 focus:border-[#0D4F35] dark:focus:border-emerald-400"
                />
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="p-3 text-sm text-rose-800 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#0D4F35] hover:bg-[#093825] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <span>{loading ? 'Memeriksa Akun...' : 'Masuk Sistem'}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </form>

          <div className="mt-4 flex justify-center">
            <PWAInstallButton variant="login" />
          </div>

          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-[#243B31]">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2.5">
              Akun Bawaan Berdasarkan Hak Akses:
            </p>
            <div className="space-y-2">
              {DEMO_ACCOUNTS.map((acc) => {
                const selected = username === acc.username;
                return (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => {
                      setUsername(acc.username);
                      setPassword(acc.pass);
                      setError('');
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                      selected
                        ? 'border-[#0D4F35] dark:border-emerald-400 bg-[#EFF6F2] dark:bg-emerald-950/40'
                        : 'border-slate-200 dark:border-[#243B31] hover:border-slate-300 dark:hover:border-[#37594A] bg-slate-50/70 dark:bg-[#15261E]/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{acc.label}</span>
                      <span className="font-mono-num text-slate-500 dark:text-slate-400">
                        {acc.username} / {acc.pass}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 mt-0.5">{acc.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
