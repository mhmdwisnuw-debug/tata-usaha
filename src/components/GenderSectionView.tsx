import { useMemo } from 'react';
import { FileSpreadsheet, FileText, Users, Wallet, Clock, CheckCircle2, GraduationCap } from 'lucide-react';
import {
  computeDashboardStats,
  formatRupiah,
  getTodayIsoDate,
  type Gender,
  type PesantrenSettings,
  type Santri,
  type TransferTransaction,
  type UserRole,
} from '../lib/domain';
import { exportTransactionsToExcel, exportTransactionsToPdf } from '../lib/export';
import { TransactionTable } from './TransactionTable';

interface GenderSectionViewProps {
  gender: Gender;
  transactions: TransferTransaction[];
  santriList: Santri[];
  settings: PesantrenSettings;
  userRole: UserRole;
  onSelectSantri: (santriId: number) => void;
  onIdentify?: (tx: TransferTransaction) => void;
  onApprove?: (tx: TransferTransaction) => void;
  onPickup: (tx: TransferTransaction) => void;
  onPrintReceipt: (tx: TransferTransaction) => void;
  onEdit: (tx: TransferTransaction) => void;
  onCancel: (tx: TransferTransaction) => void;
  onDelete: (tx: TransferTransaction) => void;
}

export function GenderSectionView({
  gender,
  transactions,
  santriList,
  settings,
  userRole,
  onSelectSantri,
  onIdentify,
  onApprove,
  onPickup,
  onPrintReceipt,
  onEdit,
  onCancel,
  onDelete,
}: GenderSectionViewProps) {
  const today = getTodayIsoDate();
  const isPutra = gender === 'PUTRA';
  const label = isPutra ? 'Santri Putra' : 'Santri Putri';

  const scopedTransactions = useMemo(
    () => transactions.filter((t) => t.jenisKelamin === gender),
    [transactions, gender]
  );

  const activeScoped = useMemo(
    () => scopedTransactions.filter((t) => t.status !== 'DIBATALKAN'),
    [scopedTransactions]
  );

  const scopedSantriCount = useMemo(
    () => santriList.filter((s) => s.jenisKelamin === gender && s.aktif).length,
    [santriList, gender]
  );

  const stats = useMemo(
    () => computeDashboardStats(scopedTransactions, today),
    [scopedTransactions, today]
  );

  const reportTitle = `Laporan Transfer ${label}`;
  const reportSubtitle = `Data khusus asrama ${label} · Terpisah sepenuhnya dari data ${isPutra ? 'Putri' : 'Putra'}`;

  return (
    <div className="space-y-6">
      <div
        className={`rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border ${
          isPutra
            ? 'bg-[#0D4F35] text-white border-[#093825] islamic-pattern'
            : 'bg-[#FAF6EA] dark:bg-[#1E1A11] text-slate-900 dark:text-slate-100 border-[#E5C158]/60 dark:border-[#E5C158]/35'
        }`}
      >
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wider ${isPutra ? 'text-[#E5C158]' : 'text-[#9A6F04] dark:text-[#E5C158]'}`}>
            Data Terpisah · Asrama {label}
          </p>
          <h2 className={`text-2xl font-bold mt-1 ${isPutra ? 'text-white' : 'text-[#0D4F35] dark:text-emerald-300'}`}>
            Data Transfer {label}
          </h2>
          <p className={`text-sm mt-1 ${isPutra ? 'text-emerald-100/85' : 'text-slate-600 dark:text-slate-300'}`}>
            Dashboard, daftar transaksi, filter kelas/kamar, dan laporan khusus {label} tanpa tercampur.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() =>
              exportTransactionsToPdf(reportTitle, reportSubtitle, activeScoped, stats.totalSeluruhTransfer, settings)
            }
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              isPutra
                ? 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
                : 'bg-[#0D4F35] hover:bg-[#093825] text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Unduh PDF {label}</span>
          </button>

          <button
            type="button"
            onClick={() =>
              exportTransactionsToExcel(reportTitle, reportSubtitle, activeScoped, stats.totalSeluruhTransfer, settings)
            }
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              isPutra
                ? 'bg-[#E5C158] hover:bg-[#d8b244] text-[#093825]'
                : 'bg-white dark:bg-[#111F19] hover:bg-slate-50 dark:hover:bg-[#1A2F26] text-[#0D4F35] dark:text-emerald-300 border border-[#0D4F35]/30 dark:border-emerald-500/40'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Unduh Excel {label}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-[#111F19] border border-[#DCE4DF] dark:border-[#243B31] rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
            <span>Total Transfer {label}</span>
            <Wallet className="w-4 h-4 text-[#0D4F35] dark:text-emerald-400" aria-hidden="true" />
          </div>
          <p className="mt-2 text-xl font-bold font-mono-num text-[#0D4F35] dark:text-emerald-300">
            {formatRupiah(stats.totalSeluruhTransfer)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Hari ini: {formatRupiah(stats.totalMasukHariIni)} · Bulan ini: {formatRupiah(stats.totalMasukBulanIni)}
          </p>
        </div>

        <div className="bg-white dark:bg-[#111F19] border border-[#DCE4DF] dark:border-[#243B31] rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
            <span>Sudah Diambil Santri</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
          </div>
          <p className="mt-2 text-xl font-bold font-mono-num text-emerald-800 dark:text-emerald-300">
            {formatRupiah(stats.totalSudahDiambil)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Uang bekal & keperluan sudah diserahkan</p>
        </div>

        <div className="bg-white dark:bg-[#111F19] border border-[#DCE4DF] dark:border-[#243B31] rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
            <span>Belum Diambil Santri</span>
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          </div>
          <p className="mt-2 text-xl font-bold font-mono-num text-amber-700 dark:text-amber-300">
            {formatRupiah(stats.totalBelumDiambil)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {stats.jumlahSantriBelumMengambil} {label.toLowerCase()} belum mengambil
          </p>
        </div>

        <div className="bg-white dark:bg-[#111F19] border border-[#DCE4DF] dark:border-[#243B31] rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
            <span>Pembayaran SPP & Santri Aktif</span>
            <GraduationCap className="w-4 h-4 text-[#B8860B] dark:text-[#E5C158]" aria-hidden="true" />
          </div>
          <p className="mt-2 text-xl font-bold font-mono-num text-[#9A6F04] dark:text-[#E5C158]">
            {formatRupiah(stats.totalSpp)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
            <Users className="w-3 h-3" aria-hidden="true" />
            <span>{scopedSantriCount} santri aktif · {stats.jumlahTransaksiHariIni} trx hari ini</span>
          </p>
        </div>
      </div>

      <TransactionTable
        transactions={scopedTransactions}
        userRole={userRole}
        lockedGender={gender}
        emptyMessage={`Belum ada transaksi transfer untuk ${label}.`}
        onSelectSantri={onSelectSantri}
        onIdentify={onIdentify}
        onApprove={onApprove}
        onPickup={onPickup}
        onPrintReceipt={onPrintReceipt}
        onEdit={onEdit}
        onCancel={onCancel}
        onDelete={onDelete}
      />
    </div>
  );
}
