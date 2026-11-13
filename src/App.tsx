import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  ArrowDownLeft,
  UserCheck,
  Users,
  Clock,
  CheckCircle2,
  Wallet,
  GraduationCap,
  History,
  FileBarChart2,
  BookUser,
  Settings,
  LogOut,
  Menu,
  X,
  Eye,
} from 'lucide-react';
import {
  canAccessMenuForRole,
  getRoleDisplayLabel,
  type AuditLog,
  type CustomCategory,
  type PesantrenSettings,
  type Santri,
  type TransferTransaction,
  type UserAccount,
} from './lib/domain';
import { api, getStoredToken, setStoredToken } from './lib/api';
import { ThemeProvider, ThemeToggleButton } from './lib/theme';
import { PesantrenEmblem } from './components/Emblem';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { TransferFormView } from './components/TransferFormView';
import { GenderSectionView } from './components/GenderSectionView';
import { CategoryBekalView, CategorySppView } from './components/CategoryViews';
import { TransactionTable } from './components/TransactionTable';
import { SantriListView, SantriProfileView } from './components/SantriViews';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallBanner';
import {
  CancelDeleteModal,
  EditTransactionModal,
  IdentifySantriModal,
  PickupModal,
  ReceiptModal,
  SantriFormModal,
} from './components/Modals';

type MenuKey =
  | 'dashboard'
  | 'transfer-masuk'
  | 'santri-putra'
  | 'santri-putri'
  | 'belum-diambil'
  | 'sudah-diambil'
  | 'kategori-bekal'
  | 'kategori-spp'
  | 'riwayat-transaksi'
  | 'laporan-keuangan'
  | 'data-santri'
  | 'pengaturan';

const SIDEBAR_ITEMS: { key: MenuKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'transfer-masuk', label: 'Transfer Masuk', icon: ArrowDownLeft },
  { key: 'santri-putra', label: 'Santri Putra', icon: UserCheck },
  { key: 'santri-putri', label: 'Santri Putri', icon: Users },
  { key: 'belum-diambil', label: 'Uang Belum Diambil', icon: Clock },
  { key: 'sudah-diambil', label: 'Uang Sudah Diambil', icon: CheckCircle2 },
  { key: 'kategori-bekal', label: 'Kategori Bekal', icon: Wallet },
  { key: 'kategori-spp', label: 'Kategori SPP', icon: GraduationCap },
  { key: 'riwayat-transaksi', label: 'Riwayat Transaksi', icon: History },
  { key: 'laporan-keuangan', label: 'Laporan Keuangan', icon: FileBarChart2 },
  { key: 'data-santri', label: 'Data Santri', icon: BookUser },
  { key: 'pengaturan', label: 'Pengaturan', icon: Settings },
];

function AppContent() {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [transactions, setTransactions] = useState<TransferTransaction[]>([]);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [settings, setSettings] = useState<PesantrenSettings>({
    namaPesantren: 'Pondok Pesantren Darul Hikmah Al-Islami',
    alamatPesantren: 'Jl. KH. Ahmad Dahlan No. 45, Jawa Timur',
    namaBendahara: 'H. Sulaiman, S.E.',
    kota: 'Kediri',
  });
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [booting, setBooting] = useState(true);

  const [activeMenu, setActiveMenu] = useState<MenuKey>('dashboard');
  const [selectedSantriId, setSelectedSantriId] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Active modals
  const [pickupTarget, setPickupTarget] = useState<TransferTransaction | null>(null);
  const [identifyTarget, setIdentifyTarget] = useState<TransferTransaction | null>(null);
  const [receiptTarget, setReceiptTarget] = useState<TransferTransaction | null>(null);
  const [editTarget, setEditTarget] = useState<TransferTransaction | null>(null);
  const [cancelDeleteTarget, setCancelDeleteTarget] = useState<{
    mode: 'cancel' | 'delete';
    tx: TransferTransaction;
  } | null>(null);
  const [santriModal, setSantriModal] = useState<{ open: boolean; initial?: Santri | null }>({
    open: false,
    initial: null,
  });

  const [toast, setToast] = useState<string>('');

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => {
      setToast((curr) => (curr === msg ? '' : curr));
    }, 4000);
  }, []);

  const loadBootstrap = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setBooting(false);
      return;
    }
    try {
      const data = await api.bootstrap();
      setUser(data.user);
      setSantriList(data.santri);
      setTransactions(data.transactions);
      setCustomCategories(data.customCategories);
      setSettings(data.settings);
      setUsers(data.users);
      setAuditLogs(data.auditLogs);
    } catch {
      setStoredToken(null);
      setUser(null);
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    loadBootstrap();
  }, [loadBootstrap]);

  async function handleLoginSuccess(token: string, loggedUser: UserAccount) {
    setStoredToken(token);
    setUser(loggedUser);
    setActiveMenu('dashboard');
    setSelectedSantriId(null);
    await loadBootstrap();
  }

  async function handleLogout() {
    try {
      await api.logout();
    } catch {
      // ignore logout error
    } finally {
      setStoredToken(null);
      setUser(null);
      setSelectedSantriId(null);
      setActiveMenu('dashboard');
    }
  }

  async function handleApproveTransaction(tx: TransferTransaction) {
    try {
      const res = await api.approveTransaction(tx.id);
      await loadBootstrap();
      showToast(
        `Transaksi ${res.transaction.kodeTransaksi} disetujui oleh Admin (${res.transaction.disetujuiOlehNama ?? user?.namaLengkap ?? ''}).`
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyetujui transaksi.');
    }
  }

  function navigateTo(menu: string) {
    if (!user) return;
    const key = menu as MenuKey;
    if (!canAccessMenuForRole(key, user.role)) {
      showToast('Menu tersebut tidak tersedia untuk hak akses Anda.');
      return;
    }
    setActiveMenu(key);
    setSelectedSantriId(null);
    setMobileMenuOpen(false);
  }

  const visibleMenuItems = useMemo(() => {
    if (!user) return [];
    return SIDEBAR_ITEMS.filter((item) => canAccessMenuForRole(item.key, user.role));
  }, [user]);

  const pendingPickupList = useMemo(
    () => transactions.filter((t) => t.kategori !== 'SPP' && t.status === 'BELUM_DIAMBIL'),
    [transactions]
  );

  const pickedUpList = useMemo(
    () => transactions.filter((t) => t.status === 'SUDAH_DIAMBIL' || t.status === 'SPP_SUDAH_DIPROSES'),
    [transactions]
  );

  const selectedSantri = useMemo(
    () => santriList.find((s) => s.id === selectedSantriId) ?? null,
    [santriList, selectedSantriId]
  );

  if (booting) {
    return (
      <div className="min-h-screen bg-[#F5F7F5] dark:bg-[#0B1410] flex items-center justify-center p-6 transition-colors">
        <div className="text-center space-y-3">
          <PesantrenEmblem className="w-20 h-20 mx-auto" />
          <p className="text-sm font-semibold text-[#0D4F35] dark:text-emerald-300">
            Memuat Sistem Tata Usaha Pesantren...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginView onSuccess={handleLoginSuccess} />
        <OfflineIndicator />
      </>
    );
  }

  const activeNavLabel = selectedSantri
    ? `Profil Santri: ${selectedSantri.namaLengkap}`
    : SIDEBAR_ITEMS.find((i) => i.key === activeMenu)?.label ?? 'Dashboard';

  return (
    <div className="min-h-screen bg-[#F5F7F5] dark:bg-[#0B1410] text-slate-900 dark:text-slate-100 flex transition-colors">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 dark:bg-black/65 lg:hidden no-print"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Left Sidebar Navigation */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-[#0B422C] text-white flex flex-col shrink-0 transition-transform duration-200 no-print ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <PesantrenEmblem className="w-11 h-11 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-widest text-[#E5C158] uppercase">Tata Usaha</p>
              <h1 className="text-sm font-bold text-white truncate">Transfer Santri</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Tutup menu navigasi"
            className="lg:hidden p-1 rounded hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav aria-label="Menu Navigasi Tata Usaha" className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = !selectedSantriId && activeMenu === item.key;
            const badgeCount =
              item.key === 'belum-diambil' && pendingPickupList.length > 0
                ? pendingPickupList.length
                : null;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => navigateTo(item.key)}
                className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#E5C158] text-[#093825] font-bold'
                    : 'text-emerald-100/85 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </span>
                {badgeCount !== null && (
                  <span
                    className={`font-mono-num text-[11px] font-bold px-1.5 py-0.5 rounded ${
                      isActive ? 'bg-[#093825] text-[#E5C158]' : 'bg-white/15 text-[#E5C158]'
                    }`}
                  >
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-2 mt-2 border-t border-white/10">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium text-rose-200 hover:bg-rose-950/50 hover:text-white transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Logout</span>
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-white/10 space-y-3 bg-[#093825]">
          <PWAInstallButton variant="sidebar" />
          <div className="text-xs">
            <p className="font-semibold text-white truncate">{user.namaLengkap}</p>
            <p className="text-[11px] text-[#E5C158] truncate">{getRoleDisplayLabel(user.role)}</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white/95 dark:bg-[#0F1C16]/95 backdrop-blur border-b border-[#DCE4DF] dark:border-[#243B31] px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka menu navigasi"
              className="lg:hidden p-2 -ml-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1B3127] rounded-lg cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{settings.namaPesantren}</p>
              <p className="text-sm font-bold text-[#0D4F35] dark:text-emerald-300 truncate">{activeNavLabel}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {user.role === 'KEPALA_PESANTREN' && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-[#9A6F04] dark:text-[#E5C158]">
                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Mode Pengawasan (Hanya Baca)</span>
              </span>
            )}
            <ThemeToggleButton variant="header" />
            <div className="lg:hidden">
              <PWAInstallButton variant="topbar" />
            </div>
            <div className="hidden md:block text-right text-xs">
              <p className="font-semibold text-slate-900 dark:text-slate-100">{user.namaLengkap}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{getRoleDisplayLabel(user.role)}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {selectedSantri ? (
            <SantriProfileView
              santri={selectedSantri}
              transactions={transactions}
              settings={settings}
              userRole={user.role}
              onBack={() => setSelectedSantriId(null)}
              onEditSantri={(s) => setSantriModal({ open: true, initial: s })}
              onSelectSantri={(id) => setSelectedSantriId(id)}
              onPickup={(tx) => setPickupTarget(tx)}
              onApprove={handleApproveTransaction}
              onPrintReceipt={(tx) => setReceiptTarget(tx)}
              onEdit={(tx) => setEditTarget(tx)}
              onCancel={(tx) => setCancelDeleteTarget({ mode: 'cancel', tx })}
              onDelete={(tx) => setCancelDeleteTarget({ mode: 'delete', tx })}
            />
          ) : activeMenu === 'dashboard' ? (
            <DashboardView
              transactions={transactions}
              userRole={user.role}
              onSelectSantri={(id) => setSelectedSantriId(id)}
              onIdentify={(tx) => setIdentifyTarget(tx)}
              onPickup={(tx) => setPickupTarget(tx)}
              onApprove={handleApproveTransaction}
              onPrintReceipt={(tx) => setReceiptTarget(tx)}
              onEdit={(tx) => setEditTarget(tx)}
              onCancel={(tx) => setCancelDeleteTarget({ mode: 'cancel', tx })}
              onDelete={(tx) => setCancelDeleteTarget({ mode: 'delete', tx })}
              onNavigate={navigateTo}
            />
          ) : activeMenu === 'transfer-masuk' ? (
            <TransferFormView
              transactions={transactions}
              customCategories={customCategories}
              userRole={user.role}
              onSubmitTransfer={async (payload) => {
                const res = await api.createTransaction(payload);
                await loadBootstrap();
                return res.transaction;
              }}
              onSelectSantri={(id) => setSelectedSantriId(id)}
              onIdentify={(tx) => setIdentifyTarget(tx)}
              onPickup={(tx) => setPickupTarget(tx)}
              onApprove={handleApproveTransaction}
              onPrintReceipt={(tx) => setReceiptTarget(tx)}
              onEdit={(tx) => setEditTarget(tx)}
              onCancel={(tx) => setCancelDeleteTarget({ mode: 'cancel', tx })}
              onDelete={(tx) => setCancelDeleteTarget({ mode: 'delete', tx })}
            />
          ) : activeMenu === 'santri-putra' ? (
            <GenderSectionView
              gender="PUTRA"
              transactions={transactions}
              santriList={santriList}
              settings={settings}
              userRole={user.role}
              onSelectSantri={(id) => setSelectedSantriId(id)}
              onIdentify={(tx) => setIdentifyTarget(tx)}
              onPickup={(tx) => setPickupTarget(tx)}
              onApprove={handleApproveTransaction}
              onPrintReceipt={(tx) => setReceiptTarget(tx)}
              onEdit={(tx) => setEditTarget(tx)}
              onCancel={(tx) => setCancelDeleteTarget({ mode: 'cancel', tx })}
              onDelete={(tx) => setCancelDeleteTarget({ mode: 'delete', tx })}
            />
          ) : activeMenu === 'santri-putri' ? (
            <GenderSectionView
              gender="PUTRI"
              transactions={transactions}
              santriList={santriList}
              settings={settings}
              userRole={user.role}
              onSelectSantri={(id) => setSelectedSantriId(id)}
              onIdentify={(tx) => setIdentifyTarget(tx)}
              onPickup={(tx) => setPickupTarget(tx)}
              onApprove={handleApproveTransaction}
              onPrintReceipt={(tx) => setReceiptTarget(tx)}
              onEdit={(tx) => setEditTarget(tx)}
              onCancel={(tx) => setCancelDeleteTarget({ mode: 'cancel', tx })}
              onDelete={(tx) => setCancelDeleteTarget({ mode: 'delete', tx })}
            />
          ) : activeMenu === 'belum-diambil' ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Uang Belum Diambil Santri</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Daftar uang bekal & keperluan santri yang masih tersimpan di Tata Usaha dan menunggu penyerahan (tidak
                  termasuk pembayaran SPP).
                </p>
              </div>
              <TransactionTable
                transactions={pendingPickupList}
                userRole={user.role}
                lockedStatus="BELUM_DIAMBIL"
                emptyMessage="Alhamdulillah, seluruh uang bekal santri sudah diambil."
                onSelectSantri={(id) => setSelectedSantriId(id)}
                onIdentify={(tx) => setIdentifyTarget(tx)}
                onPickup={(tx) => setPickupTarget(tx)}
                onApprove={handleApproveTransaction}
                onPrintReceipt={(tx) => setReceiptTarget(tx)}
                onEdit={(tx) => setEditTarget(tx)}
                onCancel={(tx) => setCancelDeleteTarget({ mode: 'cancel', tx })}
                onDelete={(tx) => setCancelDeleteTarget({ mode: 'delete', tx })}
              />
            </div>
          ) : activeMenu === 'sudah-diambil' ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Uang Sudah Diambil & Diproses</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Rekap transaksi yang telah diserahkan kepada santri maupun pembayaran SPP yang sudah diproses.
                </p>
              </div>
              <TransactionTable
                transactions={pickedUpList}
                userRole={user.role}
                emptyMessage="Belum ada transaksi yang selesai diserahkan atau diproses."
                onSelectSantri={(id) => setSelectedSantriId(id)}
                onIdentify={(tx) => setIdentifyTarget(tx)}
                onPickup={(tx) => setPickupTarget(tx)}
                onApprove={handleApproveTransaction}
                onPrintReceipt={(tx) => setReceiptTarget(tx)}
                onEdit={(tx) => setEditTarget(tx)}
                onCancel={(tx) => setCancelDeleteTarget({ mode: 'cancel', tx })}
                onDelete={(tx) => setCancelDeleteTarget({ mode: 'delete', tx })}
              />
            </div>
          ) : activeMenu === 'kategori-bekal' ? (
            <CategoryBekalView
              transactions={transactions}
              userRole={user.role}
              customCategories={customCategories}
              onSelectSantri={(id) => setSelectedSantriId(id)}
              onIdentify={(tx) => setIdentifyTarget(tx)}
              onPickup={(tx) => setPickupTarget(tx)}
              onApprove={handleApproveTransaction}
              onPrintReceipt={(tx) => setReceiptTarget(tx)}
              onEdit={(tx) => setEditTarget(tx)}
              onCancel={(tx) => setCancelDeleteTarget({ mode: 'cancel', tx })}
              onDelete={(tx) => setCancelDeleteTarget({ mode: 'delete', tx })}
            />
          ) : activeMenu === 'kategori-spp' ? (
            <CategorySppView
              transactions={transactions}
              userRole={user.role}
              onSelectSantri={(id) => setSelectedSantriId(id)}
              onIdentify={(tx) => setIdentifyTarget(tx)}
              onPickup={(tx) => setPickupTarget(tx)}
              onApprove={handleApproveTransaction}
              onPrintReceipt={(tx) => setReceiptTarget(tx)}
              onEdit={(tx) => setEditTarget(tx)}
              onCancel={(tx) => setCancelDeleteTarget({ mode: 'cancel', tx })}
              onDelete={(tx) => setCancelDeleteTarget({ mode: 'delete', tx })}
            />
          ) : activeMenu === 'riwayat-transaksi' ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Riwayat Seluruh Transaksi</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Pencarian dan filter lengkap seluruh transfer masuk, pengambilan, dan transaksi yang dibatalkan.
                </p>
              </div>
              <TransactionTable
                transactions={transactions}
                userRole={user.role}
                emptyMessage="Belum ada riwayat transaksi tercatat."
                onSelectSantri={(id) => setSelectedSantriId(id)}
                onIdentify={(tx) => setIdentifyTarget(tx)}
                onPickup={(tx) => setPickupTarget(tx)}
                onApprove={handleApproveTransaction}
                onPrintReceipt={(tx) => setReceiptTarget(tx)}
                onEdit={(tx) => setEditTarget(tx)}
                onCancel={(tx) => setCancelDeleteTarget({ mode: 'cancel', tx })}
                onDelete={(tx) => setCancelDeleteTarget({ mode: 'delete', tx })}
              />
            </div>
          ) : activeMenu === 'laporan-keuangan' ? (
            <ReportsView
              transactions={transactions}
              santriList={santriList}
              settings={settings}
              onSelectSantri={(id) => setSelectedSantriId(id)}
            />
          ) : activeMenu === 'data-santri' ? (
            <SantriListView
              santriList={santriList}
              transactions={transactions}
              userRole={user.role}
              onSelectSantri={(id) => setSelectedSantriId(id)}
              onAddSantri={() => setSantriModal({ open: true, initial: null })}
              onEditSantri={(s) => setSantriModal({ open: true, initial: s })}
              onDeleteSantri={async (s) => {
                try {
                  await api.deleteSantri(s.id);
                  await loadBootstrap();
                  showToast(`Data santri ${s.namaLengkap} berhasil dihapus.`);
                } catch (err) {
                  showToast(err instanceof Error ? err.message : 'Gagal menghapus santri.');
                }
              }}
            />
          ) : (
            <SettingsView
              currentUser={user}
              settings={settings}
              users={users}
              customCategories={customCategories}
              auditLogs={auditLogs}
              transactionCount={transactions.length}
              santriCount={santriList.length}
              onRefresh={loadBootstrap}
              onToast={showToast}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      {pickupTarget && (
        <PickupModal
          transaction={pickupTarget}
          currentUser={user}
          onClose={() => setPickupTarget(null)}
          onConfirm={async (payload) => {
            const res = await api.markPickedUp(pickupTarget.id, payload);
            setPickupTarget(null);
            await loadBootstrap();
            showToast(
              res.transaction.kategori === 'SPP'
                ? `Pembayaran SPP ${res.transaction.kodeTransaksi} berhasil diproses.`
                : `Uang ${res.transaction.santriNama} (${res.transaction.kodeTransaksi}) ditandai SUDAH DIAMBIL.`
            );
            setReceiptTarget(res.transaction);
          }}
        />
      )}

      {identifyTarget && (
        <IdentifySantriModal
          transaction={identifyTarget}
          onClose={() => setIdentifyTarget(null)}
          onSave={async (payload) => {
            const res = await api.identifyTransaction(identifyTarget.id, payload);
            setIdentifyTarget(null);
            await loadBootstrap();
            showToast(
              `Identitas transaksi ${res.transaction.kodeTransaksi} dikoreksi menjadi ${res.transaction.santriNama}.`
            );
          }}
        />
      )}

      {receiptTarget && (
        <ReceiptModal
          transaction={receiptTarget}
          settings={settings}
          onClose={() => setReceiptTarget(null)}
        />
      )}

      {editTarget && (
        <EditTransactionModal
          transaction={editTarget}
          customCategories={customCategories}
          onClose={() => setEditTarget(null)}
          onSave={async (payload) => {
            const res = await api.updateTransaction(editTarget.id, payload);
            setEditTarget(null);
            await loadBootstrap();
            showToast(`Transaksi ${res.transaction.kodeTransaksi} berhasil diperbarui.`);
          }}
        />
      )}

      {cancelDeleteTarget && (
        <CancelDeleteModal
          mode={cancelDeleteTarget.mode}
          transaction={cancelDeleteTarget.tx}
          onClose={() => setCancelDeleteTarget(null)}
          onConfirm={async (reason) => {
            const tx = cancelDeleteTarget.tx;
            if (cancelDeleteTarget.mode === 'cancel') {
              await api.cancelTransaction(tx.id, reason);
              showToast(`Transaksi ${tx.kodeTransaksi} dibatalkan dan riwayat tetap tersimpan.`);
            } else {
              await api.deleteTransaction(tx.id, reason);
              showToast(`Transaksi ${tx.kodeTransaksi} dihapus dari sistem dengan catatan audit.`);
            }
            setCancelDeleteTarget(null);
            await loadBootstrap();
          }}
        />
      )}

      {santriModal.open && (
        <SantriFormModal
          initial={santriModal.initial}
          onClose={() => setSantriModal({ open: false, initial: null })}
          onSave={async (payload) => {
            if (santriModal.initial) {
              await api.updateSantri(santriModal.initial.id, payload);
              showToast(`Data santri ${payload.namaLengkap} berhasil diperbarui.`);
            } else {
              await api.createSantri(payload);
              showToast(`Santri baru ${payload.namaLengkap} berhasil ditambahkan.`);
            }
            setSantriModal({ open: false, initial: null });
            await loadBootstrap();
          }}
        />
      )}

      {/* Toast Feedback */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 max-w-md bg-[#0D4F35] text-white px-4 py-3 rounded-xl shadow-lg border border-[#E5C158]/50 text-xs font-medium flex items-center gap-2.5 no-print"
        >
          <CheckCircle2 className="w-4 h-4 text-[#E5C158] shrink-0" aria-hidden="true" />
          <span>{toast}</span>
        </div>
      )}

      <OfflineIndicator />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
