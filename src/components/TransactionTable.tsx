import { useMemo, useState } from 'react';
import {
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Printer,
  Edit3,
  Trash2,
  Ban,
  ShieldCheck,
  RotateCcw,
  UserCheck,
  AlertCircle,
  BadgeCheck,
} from 'lucide-react';
import {
  canApproveTransaction,
  canEditOrDeleteTransaction,
  canInputOrProcessTransaction,
  filterTransactions,
  formatRupiah,
  getCategoryLabel,
  getStatusLabel,
  type Gender,
  type IdentitasNamaFilter,
  type TransferCategory,
  type TransferStatus,
  type TransferTransaction,
  type UserRole,
} from '../lib/domain';

interface TransactionTableProps {
  transactions: TransferTransaction[];
  userRole: UserRole;
  lockedGender?: Gender;
  lockedCategory?: TransferCategory;
  lockedStatus?: TransferStatus;
  lockedIdentitasNama?: 'SUDAH_ADA_NAMA' | 'BELUM_ADA_NAMA';
  hideFilters?: boolean;
  emptyMessage?: string;
  onSelectSantri: (santriId: number) => void;
  onIdentify?: (tx: TransferTransaction) => void;
  onApprove?: (tx: TransferTransaction) => void;
  onPickup: (tx: TransferTransaction) => void;
  onPrintReceipt: (tx: TransferTransaction) => void;
  onEdit: (tx: TransferTransaction) => void;
  onCancel: (tx: TransferTransaction) => void;
  onDelete: (tx: TransferTransaction) => void;
}

function StatusCell({ status }: { status: TransferStatus }) {
  if (status === 'SUDAH_DIAMBIL') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
        <span>{getStatusLabel(status)}</span>
      </span>
    );
  }
  if (status === 'SPP_SUDAH_DIPROSES') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0D4F35] dark:text-emerald-300 whitespace-nowrap">
        <ShieldCheck className="w-3.5 h-3.5 text-[#0D4F35] dark:text-emerald-400 shrink-0" aria-hidden="true" />
        <span>{getStatusLabel(status)}</span>
      </span>
    );
  }
  if (status === 'BELUM_DIAMBIL') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 whitespace-nowrap">
        <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
        <span>{getStatusLabel(status)}</span>
      </span>
    );
  }
  if (status === 'SPP_BELUM_DIPROSES') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-800 dark:text-sky-300 whitespace-nowrap">
        <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" aria-hidden="true" />
        <span>{getStatusLabel(status)}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 whitespace-nowrap">
      <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
      <span>{getStatusLabel(status)}</span>
    </span>
  );
}

export function TransactionTable({
  transactions,
  userRole,
  lockedGender,
  lockedCategory,
  lockedStatus,
  lockedIdentitasNama,
  hideFilters = false,
  emptyMessage = 'Belum ada transaksi yang sesuai filter.',
  onSelectSantri,
  onIdentify,
  onApprove,
  onPickup,
  onPrintReceipt,
  onEdit,
  onCancel,
  onDelete,
}: TransactionTableProps) {
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<Gender | 'SEMUA'>(lockedGender ?? 'SEMUA');
  const [kelasFilter, setKelasFilter] = useState('SEMUA');
  const [kamarFilter, setKamarFilter] = useState('SEMUA');
  const [kategoriFilter, setKategoriFilter] = useState<TransferCategory | 'SEMUA'>(lockedCategory ?? 'SEMUA');
  const [statusFilter, setStatusFilter] = useState<TransferStatus | 'SEMUA'>(lockedStatus ?? 'SEMUA');
  const [identitasFilter, setIdentitasFilter] = useState<IdentitasNamaFilter>(lockedIdentitasNama ?? 'SEMUA');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const uniqueKelas = useMemo(() => {
    const base = lockedGender ? transactions.filter((t) => t.jenisKelamin === lockedGender) : transactions;
    return Array.from(new Set(base.map((t) => t.kelas).filter((k) => k && k !== '-'))).sort();
  }, [transactions, lockedGender]);

  const uniqueKamar = useMemo(() => {
    const base = lockedGender ? transactions.filter((t) => t.jenisKelamin === lockedGender) : transactions;
    return Array.from(new Set(base.map((t) => t.kamar).filter((km) => km && km !== '-'))).sort();
  }, [transactions, lockedGender]);

  const filtered = useMemo(() => {
    return filterTransactions(transactions, {
      search,
      jenisKelamin: lockedGender ?? genderFilter,
      kelas: kelasFilter,
      kamar: kamarFilter,
      kategori: lockedCategory ?? kategoriFilter,
      status: lockedStatus ?? statusFilter,
      identitasNama: lockedIdentitasNama ?? identitasFilter,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  }, [
    transactions,
    search,
    lockedGender,
    genderFilter,
    kelasFilter,
    kamarFilter,
    lockedCategory,
    kategoriFilter,
    lockedStatus,
    statusFilter,
    lockedIdentitasNama,
    identitasFilter,
    startDate,
    endDate,
  ]);

  const activeTotalNominal = useMemo(
    () => filtered.filter((t) => t.status !== 'DIBATALKAN').reduce((sum, t) => sum + t.nominal, 0),
    [filtered]
  );

  const canProcess = canInputOrProcessTransaction(userRole);
  const canModify = canEditOrDeleteTransaction(userRole);
  const canApprove = canApproveTransaction(userRole);

  function resetFilters() {
    setSearch('');
    if (!lockedGender) setGenderFilter('SEMUA');
    setKelasFilter('SEMUA');
    setKamarFilter('SEMUA');
    if (!lockedCategory) setKategoriFilter('SEMUA');
    if (!lockedStatus) setStatusFilter('SEMUA');
    if (!lockedIdentitasNama) setIdentitasFilter('SEMUA');
    setStartDate('');
    setEndDate('');
  }

  return (
    <div className="bg-white dark:bg-[#111F19] border border-[#DCE4DF] dark:border-[#243B31] rounded-xl overflow-hidden">
      {!hideFilters && (
        <div className="p-4 border-b border-[#E5ECE7] dark:border-[#243B31] space-y-3 bg-[#FAFBF9] dark:bg-[#15261E]">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Cari transaksi berdasarkan nama santri, nominal transfer, NIS, kelas, kamar, pengirim, atau tanggal"
                placeholder="Cari nama santri, nominal (mis. 500000 / 500.000), NIS, kelas, kamar, pengirim, atau tanggal..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-[#2D473B] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D4F35]/20 dark:focus:ring-emerald-400/25 focus:border-[#0D4F35] dark:focus:border-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                aria-label="Tanggal mulai"
                className="px-2.5 py-2 text-xs bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg"
              />
              <span className="text-xs text-slate-400 dark:text-slate-500">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                aria-label="Tanggal akhir"
                className="px-2.5 py-2 text-xs bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg"
              />
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-[#0D1914] border border-slate-300 dark:border-[#2D473B] rounded-lg hover:bg-slate-50 dark:hover:bg-[#1A2F26] cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {!lockedGender && (
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value as Gender | 'SEMUA')}
                aria-label="Filter Putra atau Putri"
                className="px-3 py-1.5 text-xs bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg"
              >
                <option value="SEMUA">Semua (Putra & Putri)</option>
                <option value="PUTRA">Santri Putra</option>
                <option value="PUTRI">Santri Putri</option>
              </select>
            )}

            <select
              value={kelasFilter}
              onChange={(e) => setKelasFilter(e.target.value)}
              aria-label="Filter Kelas"
              className="px-3 py-1.5 text-xs bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg"
            >
              <option value="SEMUA">Semua Kelas</option>
              {uniqueKelas.map((k) => (
                <option key={k} value={k}>
                  Kelas {k}
                </option>
              ))}
            </select>

            <select
              value={kamarFilter}
              onChange={(e) => setKamarFilter(e.target.value)}
              aria-label="Filter Kamar"
              className="px-3 py-1.5 text-xs bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg"
            >
              <option value="SEMUA">Semua Kamar</option>
              {uniqueKamar.map((km) => (
                <option key={km} value={km}>
                  {km}
                </option>
              ))}
            </select>

            {!lockedCategory && (
              <select
                value={kategoriFilter}
                onChange={(e) => setKategoriFilter(e.target.value as TransferCategory | 'SEMUA')}
                aria-label="Filter Jenis Uang"
                className="px-3 py-1.5 text-xs bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg"
              >
                <option value="SEMUA">Semua Jenis Uang</option>
                <option value="BEKAL">Uang Bekal</option>
                <option value="SPP">Uang SPP</option>
                <option value="LAINNYA">Uang Lainnya</option>
              </select>
            )}

            {!lockedStatus && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as TransferStatus | 'SEMUA')}
                aria-label="Filter Status Pengambilan"
                className="px-3 py-1.5 text-xs bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg"
              >
                <option value="SEMUA">Semua Status</option>
                <option value="BELUM_DIAMBIL">Belum Diambil</option>
                <option value="SUDAH_DIAMBIL">Sudah Diambil</option>
                <option value="SPP_BELUM_DIPROSES">SPP Belum Diproses</option>
                <option value="SPP_SUDAH_DIPROSES">SPP Sudah Diproses</option>
                <option value="DIBATALKAN">Dibatalkan</option>
              </select>
            )}

            {!lockedIdentitasNama && (
              <select
                value={identitasFilter}
                onChange={(e) => setIdentitasFilter(e.target.value as IdentitasNamaFilter)}
                aria-label="Filter Identitas Nama Santri"
                className="px-3 py-1.5 text-xs bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg"
              >
                <option value="SEMUA">Semua Identitas Nama</option>
                <option value="SUDAH_ADA_NAMA">Sudah Ada Namanya</option>
                <option value="BELUM_ADA_NAMA">Belum Ada Namanya</option>
              </select>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#DCE4DF] dark:border-[#243B31] bg-[#F3F6F4] dark:bg-[#182C23] text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              <th className="py-3 px-4 whitespace-nowrap">Tanggal / Kode</th>
              <th className="py-3 px-4 whitespace-nowrap">Nama Santri</th>
              <th className="py-3 px-4 whitespace-nowrap">Kelas & Kamar</th>
              <th className="py-3 px-4 whitespace-nowrap">Pengirim & Metode</th>
              <th className="py-3 px-4 whitespace-nowrap">Kategori</th>
              <th className="py-3 px-4 whitespace-nowrap text-right">Nominal</th>
              <th className="py-3 px-4 whitespace-nowrap">Status & Admin (Input / Setujui)</th>
              <th className="py-3 px-4 whitespace-nowrap text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EDF1EE] dark:divide-[#1F342B] text-sm">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 px-4 text-center text-slate-500 dark:text-slate-400 text-sm">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              filtered.map((tx) => {
                const isPendingPickup = tx.status === 'BELUM_DIAMBIL';
                const isPendingSpp = tx.status === 'SPP_BELUM_DIPROSES';
                const isCancelled = tx.status === 'DIBATALKAN';

                return (
                  <tr
                    key={tx.id}
                    className={`hover:bg-[#F8FBF9] dark:hover:bg-[#172A22] transition-colors ${isCancelled ? 'opacity-60' : ''}`}
                  >
                    <td className="py-3 px-4 align-top whitespace-nowrap">
                      <p className="font-mono-num text-xs font-semibold text-slate-900 dark:text-slate-100">{tx.tanggalTransfer}</p>
                      <p className="font-mono-num text-[11px] text-slate-500 dark:text-slate-400">{tx.kodeTransaksi}</p>
                    </td>

                    <td className="py-3 px-4 align-top">
                      {tx.belumAdaNama ? (
                        <div>
                          {canProcess && onIdentify && !isCancelled ? (
                            <button
                              type="button"
                              onClick={() => onIdentify(tx)}
                              className="inline-flex items-center gap-1 text-left font-semibold text-amber-800 dark:text-amber-300 hover:underline cursor-pointer"
                            >
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
                              <span>Belum Ada Nama</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-semibold text-amber-800 dark:text-amber-300">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
                              <span>Belum Ada Nama</span>
                            </span>
                          )}
                          <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">Perlu koreksi identitas santri</p>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => onSelectSantri(tx.santriId)}
                            className="text-left font-semibold text-[#0D4F35] dark:text-emerald-300 hover:underline cursor-pointer"
                          >
                            {tx.santriNama}
                          </button>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            NIS <span className="font-mono-num">{tx.santriNis}</span> ·{' '}
                            {tx.jenisKelamin === 'PUTRA' ? 'Putra' : 'Putri'}
                          </p>
                        </>
                      )}
                    </td>

                    <td className="py-3 px-4 align-top whitespace-nowrap">
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{tx.kelas}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{tx.kamar}</p>
                    </td>

                    <td className="py-3 px-4 align-top">
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{tx.namaPengirim}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {tx.metodeTransfer}
                        {tx.nomorReferensi ? ` · Ref ${tx.nomorReferensi}` : ''}
                      </p>
                    </td>

                    <td className="py-3 px-4 align-top">
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                        {getCategoryLabel(tx.kategori, tx.subKategori)}
                      </p>
                      {tx.catatan && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[180px] truncate">{tx.catatan}</p>
                      )}
                    </td>

                    <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                      <p
                        className={`font-mono-num font-bold text-sm ${
                          isCancelled ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {formatRupiah(tx.nominal)}
                      </p>
                    </td>

                    <td className="py-3 px-4 align-top">
                      <StatusCell status={tx.status} />
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                        Diinput: <strong className="font-semibold">{tx.inputOlehNama}</strong>
                      </p>
                      {tx.disetujuiOlehNama ? (
                        <p className="text-[11px] text-[#0D4F35] dark:text-emerald-300 mt-0.5">
                          Disetujui Admin: <strong className="font-semibold">{tx.disetujuiOlehNama}</strong>
                          {tx.tanggalDisetujui ? ` (${tx.tanggalDisetujui}${tx.jamDisetujui ? ` ${tx.jamDisetujui}` : ''})` : ''}
                        </p>
                      ) : (
                        !isCancelled && (
                          <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                            Disetujui Admin: Menunggu persetujuan Admin
                          </p>
                        )
                      )}
                      {tx.petugasSerahNama && (
                        <p className="text-[11px] text-emerald-800 dark:text-emerald-400 mt-0.5">
                          Serah: {tx.petugasSerahNama} ({tx.tanggalPengambilan} {tx.jamPengambilan})
                        </p>
                      )}
                      {tx.catatanAudit && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">Audit: {tx.catatanAudit}</p>
                      )}
                    </td>

                    <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {canApprove && !tx.disetujuiOlehNama && !isCancelled && onApprove && (
                          <button
                            type="button"
                            onClick={() => onApprove(tx)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-md transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Setujui</span>
                          </button>
                        )}

                        {canProcess && !isCancelled && tx.belumAdaNama && onIdentify && (
                          <button
                            type="button"
                            onClick={() => onIdentify(tx)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-md transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Koreksi Nama</span>
                          </button>
                        )}

                        {canProcess && isPendingPickup && (
                          <button
                            type="button"
                            onClick={() => onPickup(tx)}
                            className="px-2.5 py-1.5 text-xs font-semibold bg-[#0D4F35] hover:bg-[#093825] text-white rounded-md transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Tandai Sudah Diambil
                          </button>
                        )}

                        {canProcess && isPendingSpp && (
                          <button
                            type="button"
                            onClick={() => onPickup(tx)}
                            className="px-2.5 py-1.5 text-xs font-semibold bg-[#B8860B] hover:bg-[#996F09] text-white rounded-md transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Proses SPP
                          </button>
                        )}

                        {!isCancelled && (
                          <button
                            type="button"
                            onClick={() => onPrintReceipt(tx)}
                            aria-label={`Cetak bukti transaksi ${tx.kodeTransaksi}`}
                            title="Cetak Bukti"
                            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-[#0D4F35] dark:hover:text-emerald-300 border border-slate-200 dark:border-[#2D473B] rounded-md hover:bg-slate-50 dark:hover:bg-[#1B3127] cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {canModify && !isCancelled && (
                          <>
                            <button
                              type="button"
                              onClick={() => onEdit(tx)}
                              aria-label={`Edit transaksi ${tx.kodeTransaksi}`}
                              title="Edit Transaksi"
                              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300 border border-slate-200 dark:border-[#2D473B] rounded-md hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onCancel(tx)}
                              aria-label={`Batalkan transaksi ${tx.kodeTransaksi}`}
                              title="Batalkan Transaksi"
                              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-400 border border-slate-200 dark:border-[#2D473B] rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {canModify && (
                          <button
                            type="button"
                            onClick={() => onDelete(tx)}
                            aria-label={`Hapus transaksi ${tx.kodeTransaksi}`}
                            title="Hapus Transaksi"
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-400 border border-slate-200 dark:border-[#2D473B] rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
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
          <tfoot>
            <tr className="bg-[#F3F6F4] dark:bg-[#182C23] border-t border-[#DCE4DF] dark:border-[#243B31] text-sm font-bold text-slate-900 dark:text-slate-100">
              <td colSpan={5} className="py-3 px-4">
                Total Nominal Aktif ({filtered.filter((t) => t.status !== 'DIBATALKAN').length} transaksi)
              </td>
              <td className="py-3 px-4 text-right font-mono-num text-[#0D4F35] dark:text-emerald-300">
                {formatRupiah(activeTotalNominal)}
              </td>
              <td colSpan={2} className="py-3 px-4" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
