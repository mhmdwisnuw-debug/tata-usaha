import { useMemo } from 'react';
import { Wallet, CheckCircle2, Clock, ShieldCheck, Info } from 'lucide-react';
import {
  computeDashboardStats,
  formatRupiah,
  getTodayIsoDate,
  type CustomCategory,
  type TransferTransaction,
  type UserRole,
} from '../lib/domain';
import { TransactionTable } from './TransactionTable';

interface CategoryViewProps {
  transactions: TransferTransaction[];
  userRole: UserRole;
  customCategories?: CustomCategory[];
  onSelectSantri: (santriId: number) => void;
  onIdentify?: (tx: TransferTransaction) => void;
  onApprove?: (tx: TransferTransaction) => void;
  onPickup: (tx: TransferTransaction) => void;
  onPrintReceipt: (tx: TransferTransaction) => void;
  onEdit: (tx: TransferTransaction) => void;
  onCancel: (tx: TransferTransaction) => void;
  onDelete: (tx: TransferTransaction) => void;
}

export function CategoryBekalView({
  transactions,
  userRole,
  onSelectSantri,
  onIdentify,
  onApprove,
  onPickup,
  onPrintReceipt,
  onEdit,
  onCancel,
  onDelete,
}: CategoryViewProps) {
  const today = getTodayIsoDate();
  const stats = useMemo(() => computeDashboardStats(transactions, today), [transactions, today]);

  const bekalTransactions = useMemo(
    () => transactions.filter((t) => t.kategori === 'BEKAL'),
    [transactions]
  );

  const lainnyaTransactions = useMemo(
    () => transactions.filter((t) => t.kategori === 'LAINNYA'),
    [transactions]
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Kategori Uang Bekal & Keperluan Santri</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Pemantauan khusus uang bekal santri yang masuk, sudah diambil, dan masih tersimpan di Tata Usaha.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#111F19] border border-[#DCE4DF] dark:border-[#243B31] rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span>Total Uang Bekal Masuk</span>
            <Wallet className="w-4 h-4 text-[#0D4F35] dark:text-emerald-400" aria-hidden="true" />
          </div>
          <p className="mt-2.5 text-2xl font-bold font-mono-num text-slate-900 dark:text-white">
            {formatRupiah(stats.bekalMasuk)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Akumulasi seluruh transfer kategori Uang Bekal aktif
          </p>
        </div>

        <div className="bg-white dark:bg-[#111F19] border border-[#DCE4DF] dark:border-[#243B31] rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span>Total Uang Bekal Sudah Diambil</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
          </div>
          <p className="mt-2.5 text-2xl font-bold font-mono-num text-emerald-800 dark:text-emerald-300">
            {formatRupiah(stats.bekalSudahDiambil)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Telah diserahkan langsung kepada santri</p>
        </div>

        <div className="bg-white dark:bg-[#111F19] border border-[#DCE4DF] dark:border-[#243B31] rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span>Total Uang Bekal Belum Diambil</span>
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          </div>
          <p className="mt-2.5 text-2xl font-bold font-mono-num text-amber-700 dark:text-amber-300">
            {formatRupiah(stats.bekalBelumDiambil)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Masih tersimpan aman di kas Tata Usaha</p>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Daftar Transaksi Uang Bekal ({bekalTransactions.length})</h3>
        <TransactionTable
          transactions={bekalTransactions}
          userRole={userRole}
          lockedCategory="BEKAL"
          emptyMessage="Belum ada transaksi Uang Bekal."
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

      {lainnyaTransactions.length > 0 && (
        <div className="bg-[#FAFBF9] dark:bg-[#15261E] border border-[#DCE4DF] dark:border-[#243B31] rounded-xl p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Uang Lainnya ({lainnyaTransactions.length} transaksi)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Kebutuhan pribadi, uang kesehatan, keperluan sekolah, dan kategori tambahan admin · Total masuk{' '}
                <strong className="font-mono-num text-[#0D4F35] dark:text-emerald-300">{formatRupiah(stats.lainnyaMasuk)}</strong> · Belum diambil{' '}
                <strong className="font-mono-num text-amber-700 dark:text-amber-300">{formatRupiah(stats.lainnyaBelumDiambil)}</strong>
              </p>
            </div>
          </div>
          <TransactionTable
            transactions={lainnyaTransactions}
            userRole={userRole}
            lockedCategory="LAINNYA"
            emptyMessage="Belum ada transaksi Uang Lainnya."
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
      )}
    </div>
  );
}

export function CategorySppView({
  transactions,
  userRole,
  onSelectSantri,
  onIdentify,
  onApprove,
  onPickup,
  onPrintReceipt,
  onEdit,
  onCancel,
  onDelete,
}: CategoryViewProps) {
  const today = getTodayIsoDate();
  const stats = useMemo(() => computeDashboardStats(transactions, today), [transactions, today]);

  const sppTransactions = useMemo(
    () => transactions.filter((t) => t.kategori === 'SPP'),
    [transactions]
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Kategori Pembayaran SPP</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Pengelolaan transfer khusus pembayaran SPP santri dengan status pemrosesan tersendiri.
        </p>
      </div>

      <div className="bg-[#FBF6E6] dark:bg-amber-950/35 border border-[#E5C158]/70 dark:border-amber-700/60 rounded-xl p-4 flex items-start gap-3 text-sm text-amber-950 dark:text-amber-200">
        <Info className="w-5 h-5 text-[#B8860B] dark:text-[#E5C158] shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="font-semibold">Status SPP Terpisah dari Uang Bekal</p>
          <p className="text-xs text-amber-900 dark:text-amber-200/85 mt-0.5">
            Pembayaran SPP tidak dianggap sebagai uang bekal yang harus diambil santri. Uang SPP dicatat menggunakan
            status <strong>SPP Belum Diproses</strong> dan <strong>SPP Sudah Diproses</strong> agar saldo uang tunai
            santri tetap akurat.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#111F19] border border-[#DCE4DF] dark:border-[#243B31] rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span>Total Pembayaran SPP Masuk</span>
            <ShieldCheck className="w-4 h-4 text-[#0D4F35] dark:text-emerald-400" aria-hidden="true" />
          </div>
          <p className="mt-2.5 text-2xl font-bold font-mono-num text-slate-900 dark:text-white">
            {formatRupiah(stats.sppMasuk)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Total transfer SPP aktif dari wali santri</p>
        </div>

        <div className="bg-white dark:bg-[#111F19] border border-[#DCE4DF] dark:border-[#243B31] rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span>SPP Sudah Diserahkan / Diproses</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
          </div>
          <p className="mt-2.5 text-2xl font-bold font-mono-num text-emerald-800 dark:text-emerald-300">
            {formatRupiah(stats.sppSudahDiproses)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Telah disetorkan dan diverifikasi bendahara</p>
        </div>

        <div className="bg-white dark:bg-[#111F19] border border-[#DCE4DF] dark:border-[#243B31] rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span>SPP Belum Diproses</span>
            <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
          </div>
          <p className="mt-2.5 text-2xl font-bold font-mono-num text-sky-800 dark:text-sky-300">
            {formatRupiah(stats.sppBelumDiproses)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Menunggu verifikasi / penyetoran SPP</p>
        </div>
      </div>

      <TransactionTable
        transactions={sppTransactions}
        userRole={userRole}
        lockedCategory="SPP"
        emptyMessage="Belum ada transaksi pembayaran SPP."
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
