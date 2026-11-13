import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Search,
  UserPlus,
  Edit3,
  Trash2,
  Phone,
  FileText,
  FileSpreadsheet,
  User,
} from 'lucide-react';
import {
  canEditOrDeleteTransaction,
  canInputOrProcessTransaction,
  computeSantriSummary,
  formatRupiah,
  type Gender,
  type PesantrenSettings,
  type Santri,
  type TransferTransaction,
  type UserRole,
} from '../lib/domain';
import { exportTransactionsToExcel, exportTransactionsToPdf } from '../lib/export';
import { TransactionTable } from './TransactionTable';

interface SantriListViewProps {
  santriList: Santri[];
  transactions: TransferTransaction[];
  userRole: UserRole;
  onSelectSantri: (santriId: number) => void;
  onAddSantri: () => void;
  onEditSantri: (santri: Santri) => void;
  onDeleteSantri: (santri: Santri) => void;
}

export function SantriListView({
  santriList,
  transactions,
  userRole,
  onSelectSantri,
  onAddSantri,
  onEditSantri,
  onDeleteSantri,
}: SantriListViewProps) {
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<Gender | 'SEMUA'>('SEMUA');
  const [kelasFilter, setKelasFilter] = useState('SEMUA');

  const uniqueKelas = useMemo(
    () => Array.from(new Set(santriList.map((s) => s.kelas))).sort(),
    [santriList]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return santriList.filter((s) => {
      if (genderFilter !== 'SEMUA' && s.jenisKelamin !== genderFilter) return false;
      if (kelasFilter !== 'SEMUA' && s.kelas !== kelasFilter) return false;
      if (q) {
        const hay = `${s.nis} ${s.namaLengkap} ${s.kelas} ${s.kamar} ${s.namaWali}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [santriList, search, genderFilter, kelasFilter]);

  const canCreateOrEdit = canInputOrProcessTransaction(userRole);
  const canDelete = canEditOrDeleteTransaction(userRole);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Data Induk & Profil Santri</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Klik nama santri untuk melihat profil lengkap, kontak wali, dan seluruh riwayat transfernya.
          </p>
        </div>

        {canCreateOrEdit && (
          <button
            type="button"
            onClick={onAddSantri}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0D4F35] hover:bg-[#093825] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer self-start"
          >
            <UserPlus className="w-4 h-4" aria-hidden="true" />
            <span>Tambah Santri Baru</span>
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-[#111F19] border border-[#DCE4DF] dark:border-[#243B31] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#E5ECE7] dark:border-[#243B31] bg-[#FAFBF9] dark:bg-[#15261E] grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama santri, NIS, kelas, kamar, atau nama wali..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-[#2D473B] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D4F35]/20 focus:border-[#0D4F35]"
            />
          </div>

          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value as Gender | 'SEMUA')}
            aria-label="Filter Putra/Putri"
            className="px-3 py-2 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg"
          >
            <option value="SEMUA">Semua (Putra & Putri)</option>
            <option value="PUTRA">Santri Putra</option>
            <option value="PUTRI">Santri Putri</option>
          </select>

          <select
            value={kelasFilter}
            onChange={(e) => setKelasFilter(e.target.value)}
            aria-label="Filter Kelas Santri"
            className="px-3 py-2 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg"
          >
            <option value="SEMUA">Semua Kelas</option>
            {uniqueKelas.map((k) => (
              <option key={k} value={k}>
                Kelas {k}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#DCE4DF] dark:border-[#243B31] bg-[#F3F6F4] dark:bg-[#182C23] text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                <th className="py-3 px-4">NIS & Nama Santri</th>
                <th className="py-3 px-4">Asrama / Kelas / Kamar</th>
                <th className="py-3 px-4">Orang Tua / Wali</th>
                <th className="py-3 px-4 text-right">Total Transfer</th>
                <th className="py-3 px-4 text-right">Bekal Belum Diambil</th>
                <th className="py-3 px-4 text-right">Total SPP</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF1EE] dark:divide-[#1F342B] text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 px-4 text-center text-slate-500 dark:text-slate-400">
                    Tidak ada data santri yang sesuai pencarian.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => {
                  const summary = computeSantriSummary(transactions, s.id);
                  return (
                    <tr key={s.id} className={`hover:bg-[#F8FBF9] dark:hover:bg-[#172A22] ${!s.aktif ? 'opacity-60' : ''}`}>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => onSelectSantri(s.id)}
                          className="text-left font-semibold text-[#0D4F35] dark:text-emerald-300 hover:underline cursor-pointer"
                        >
                          {s.namaLengkap}
                        </button>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono-num">
                          NIS {s.nis} {!s.aktif ? '· Nonaktif' : ''}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300">
                        <p className="font-semibold">
                          {s.jenisKelamin === 'PUTRA' ? 'Putra' : 'Putri'} · Kelas {s.kelas}
                        </p>
                        <p className="text-slate-500 dark:text-slate-400">{s.kamar}</p>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{s.namaWali}</p>
                        <p className="text-slate-500 dark:text-slate-400 font-mono-num">{s.noHpWali || '-'}</p>
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num font-semibold text-slate-900 dark:text-white">
                        {formatRupiah(summary.totalTransfer)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num font-semibold text-amber-700 dark:text-amber-300">
                        {formatRupiah(summary.totalBekalBelumDiambil)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num font-semibold text-[#0D4F35] dark:text-emerald-300">
                        {formatRupiah(summary.totalSpp)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectSantri(s.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-[#0D4F35] dark:text-emerald-300 bg-[#EFF6F2] dark:bg-[#163125] hover:bg-[#DCECE3] dark:hover:bg-[#1E4031] rounded-md cursor-pointer"
                          >
                            Profil
                          </button>
                          {canCreateOrEdit && (
                            <button
                              type="button"
                              onClick={() => onEditSantri(s)}
                              aria-label={`Edit data ${s.namaLengkap}`}
                              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300 border border-slate-200 dark:border-[#2D473B] rounded-md cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => onDeleteSantri(s)}
                              aria-label={`Hapus data ${s.namaLengkap}`}
                              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-400 border border-slate-200 dark:border-[#2D473B] rounded-md cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface SantriProfileViewProps {
  santri: Santri;
  transactions: TransferTransaction[];
  settings: PesantrenSettings;
  userRole: UserRole;
  onBack: () => void;
  onEditSantri: (santri: Santri) => void;
  onSelectSantri: (santriId: number) => void;
  onApprove?: (tx: TransferTransaction) => void;
  onPickup: (tx: TransferTransaction) => void;
  onPrintReceipt: (tx: TransferTransaction) => void;
  onEdit: (tx: TransferTransaction) => void;
  onCancel: (tx: TransferTransaction) => void;
  onDelete: (tx: TransferTransaction) => void;
}

export function SantriProfileView({
  santri,
  transactions,
  settings,
  userRole,
  onBack,
  onEditSantri,
  onSelectSantri,
  onApprove,
  onPickup,
  onPrintReceipt,
  onEdit,
  onCancel,
  onDelete,
}: SantriProfileViewProps) {
  const summary = useMemo(
    () => computeSantriSummary(transactions, santri.id),
    [transactions, santri.id]
  );

  const activeRows = useMemo(
    () => summary.riwayat.filter((t) => t.status !== 'DIBATALKAN'),
    [summary.riwayat]
  );

  const canEdit = canInputOrProcessTransaction(userRole);
  const reportTitle = `Laporan Transfer Santri - ${santri.namaLengkap}`;
  const reportSubtitle = `NIS ${santri.nis} · ${santri.jenisKelamin === 'PUTRA' ? 'Putra' : 'Putri'} · Kelas ${santri.kelas} · Kamar ${santri.kamar}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#111F19] border border-slate-300 dark:border-[#2D473B] rounded-lg hover:bg-slate-50 dark:hover:bg-[#1B3127] cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Kembali</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              exportTransactionsToPdf(reportTitle, reportSubtitle, activeRows, summary.totalTransfer, settings)
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#0D4F35] text-white rounded-lg hover:bg-[#093825] cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Unduh PDF Santri</span>
          </button>
          <button
            type="button"
            onClick={() =>
              exportTransactionsToExcel(reportTitle, reportSubtitle, activeRows, summary.totalTransfer, settings)
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-[#111F19] text-[#0D4F35] dark:text-emerald-300 border border-[#0D4F35]/30 dark:border-emerald-500/40 rounded-lg hover:bg-[#EFF6F2] dark:hover:bg-[#1B3127] cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Unduh Excel</span>
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => onEditSantri(santri)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#111F19] border border-slate-300 dark:border-[#2D473B] rounded-lg hover:bg-slate-50 dark:hover:bg-[#1B3127] cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Edit Profil</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-[#111F19] border border-[#DCE4DF] dark:border-[#243B31] rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-[#243B31]">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#0D4F35] text-[#E5C158] flex items-center justify-center shrink-0">
              <User className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#B8860B] dark:text-[#E5C158] uppercase tracking-wider">
                Profil Lengkap & Rekap Keuangan Santri
              </p>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{santri.namaLengkap}</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                NIS <span className="font-mono-num font-semibold">{santri.nis}</span> ·{' '}
                {santri.jenisKelamin === 'PUTRA' ? 'Santri Putra' : 'Santri Putri'} · Kelas{' '}
                <strong>{santri.kelas}</strong> · Kamar <strong>{santri.kamar}</strong>
                {!santri.aktif ? ' · (Status Nonaktif)' : ''}
              </p>
            </div>
          </div>

          <div className="bg-[#FAFBF9] dark:bg-[#15261E] border border-[#DCE4DF] dark:border-[#243B31] rounded-lg px-4 py-3 text-xs space-y-1">
            <p className="text-slate-500 dark:text-slate-400">Orang Tua / Wali Santri</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{santri.namaWali}</p>
            <p className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-mono-num">
              <Phone className="w-3.5 h-3.5 text-[#0D4F35] dark:text-emerald-400" aria-hidden="true" />
              <span>{santri.noHpWali || 'Belum tercatat'}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-5">
          <div className="p-4 bg-[#FAFBF9] dark:bg-[#15261E] border border-[#DCE4DF] dark:border-[#243B31] rounded-lg">
            <p className="text-xs text-slate-600 dark:text-slate-400">Total Uang Pernah Ditransfer</p>
            <p className="mt-1.5 text-lg font-bold font-mono-num text-slate-900 dark:text-white">
              {formatRupiah(summary.totalTransfer)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{activeRows.length} transaksi aktif</p>
          </div>

          <div className="p-4 bg-[#FAFBF9] dark:bg-[#15261E] border border-[#DCE4DF] dark:border-[#243B31] rounded-lg">
            <p className="text-xs text-slate-600 dark:text-slate-400">Total Bekal Sudah Diambil</p>
            <p className="mt-1.5 text-lg font-bold font-mono-num text-emerald-800 dark:text-emerald-300">
              {formatRupiah(summary.totalBekalDiambil)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Lainnya diambil: {formatRupiah(summary.totalLainnyaDiambil)}
            </p>
          </div>

          <div className="p-4 bg-[#FAFBF9] dark:bg-[#15261E] border border-[#DCE4DF] dark:border-[#243B31] rounded-lg">
            <p className="text-xs text-slate-600 dark:text-slate-400">Total Bekal Belum Diambil</p>
            <p className="mt-1.5 text-lg font-bold font-mono-num text-amber-700 dark:text-amber-300">
              {formatRupiah(summary.totalBekalBelumDiambil)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Lainnya belum diambil: {formatRupiah(summary.totalLainnyaBelumDiambil)}
            </p>
          </div>

          <div className="p-4 bg-[#FAFBF9] dark:bg-[#15261E] border border-[#DCE4DF] dark:border-[#243B31] rounded-lg">
            <p className="text-xs text-slate-600 dark:text-slate-400">Total Pembayaran SPP</p>
            <p className="mt-1.5 text-lg font-bold font-mono-num text-[#0D4F35] dark:text-emerald-300">
              {formatRupiah(summary.totalSpp)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Sudah diproses: {formatRupiah(summary.totalSppSudahDiproses)}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Riwayat Seluruh Transaksi {santri.namaLengkap} ({summary.riwayat.length})
        </h3>
        <TransactionTable
          transactions={summary.riwayat}
          userRole={userRole}
          emptyMessage="Santri ini belum memiliki riwayat transfer."
          onSelectSantri={onSelectSantri}
          onApprove={onApprove}
          onPickup={onPickup}
          onPrintReceipt={onPrintReceipt}
          onEdit={onEdit}
          onCancel={onCancel}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}
