import { useMemo, useState } from 'react';
import { Printer, FileText, FileSpreadsheet } from 'lucide-react';
import {
  buildReportData,
  formatRupiah,
  formatTanggalIndonesia,
  getCategoryLabel,
  getStatusLabel,
  getTodayIsoDate,
  resolveReportPeriodDates,
  type PesantrenSettings,
  type ReportPeriod,
  type ReportType,
  type Santri,
  type TransferTransaction,
} from '../lib/domain';
import { exportTransactionsToExcel, exportTransactionsToPdf } from '../lib/export';
import { PesantrenEmblem } from './Emblem';

interface ReportsViewProps {
  transactions: TransferTransaction[];
  santriList: Santri[];
  settings: PesantrenSettings;
  onSelectSantri: (santriId: number) => void;
}

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'SEMUA_TRANSFER', label: '1. Laporan Semua Transfer Masuk' },
  { value: 'SANTRI_PUTRA', label: '2. Laporan Transfer Santri Putra' },
  { value: 'SANTRI_PUTRI', label: '3. Laporan Transfer Santri Putri' },
  { value: 'UANG_BEKAL', label: '4. Laporan Uang Bekal' },
  { value: 'UANG_SPP', label: '5. Laporan Uang SPP' },
  { value: 'SUDAH_DIAMBIL', label: '6. Laporan Uang yang Sudah Diambil' },
  { value: 'BELUM_DIAMBIL', label: '7. Laporan Uang yang Belum Diambil' },
  { value: 'PER_SANTRI', label: '8. Laporan Per Santri' },
];

const REPORT_PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: 'SEMUA', label: 'Semua Waktu' },
  { value: 'HARIAN', label: 'Harian' },
  { value: 'MINGGUAN', label: 'Mingguan (7 Hari)' },
  { value: 'BULANAN', label: 'Bulanan' },
  { value: 'TAHUNAN', label: 'Tahunan' },
  { value: 'RENTANG', label: 'Rentang Tanggal' },
];

export function ReportsView({ transactions, santriList, settings, onSelectSantri }: ReportsViewProps) {
  const today = getTodayIsoDate();
  const [reportType, setReportType] = useState<ReportType>('SEMUA_TRANSFER');
  const [period, setPeriod] = useState<ReportPeriod>('SEMUA');
  const [referenceDate, setReferenceDate] = useState(today);
  const [startDate, setStartDate] = useState(today.slice(0, 8) + '01');
  const [endDate, setEndDate] = useState(today);
  const [selectedSantriId, setSelectedSantriId] = useState<number>(santriList[0]?.id ?? 0);

  const reportData = useMemo(
    () =>
      buildReportData(transactions, reportType, period, referenceDate, {
        santriId: selectedSantriId,
        startDate,
        endDate,
      }),
    [transactions, reportType, period, referenceDate, selectedSantriId, startDate, endDate]
  );

  const selectedSantri = useMemo(
    () => santriList.find((s) => s.id === selectedSantriId) ?? null,
    [santriList, selectedSantriId]
  );

  const activeTitle = useMemo(() => {
    const found = REPORT_TYPES.find((r) => r.value === reportType);
    const base = found ? found.label.replace(/^\d+\.\s*/, '') : 'Laporan Keuangan';
    if (reportType === 'PER_SANTRI' && selectedSantri) {
      return `${base} — ${selectedSantri.namaLengkap} (${selectedSantri.nis})`;
    }
    return base;
  }, [reportType, selectedSantri]);

  const activeSubtitle = useMemo(() => {
    if (period === 'SEMUA') return 'Periode: Seluruh Waktu Tercatat';
    const range = resolveReportPeriodDates(period, referenceDate, startDate, endDate);
    if (range.startDate && range.endDate) {
      if (range.startDate === range.endDate) {
        return `Periode Harian: ${formatTanggalIndonesia(range.startDate)}`;
      }
      return `Periode: ${formatTanggalIndonesia(range.startDate)} s/d ${formatTanggalIndonesia(range.endDate)}`;
    }
    return `Periode: ${period}`;
  }, [period, referenceDate, startDate, endDate]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Laporan Keuangan Transfer Santri</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Susun, cetak, dan unduh laporan PDF atau Excel dengan total nominal otomatis di bagian bawah laporan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white dark:bg-[#15261E] border border-slate-300 dark:border-[#2D473B] text-slate-800 dark:text-slate-100 rounded-lg hover:bg-slate-50 dark:hover:bg-[#1C3228] cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Cetak Laporan</span>
          </button>

          <button
            type="button"
            onClick={() =>
              exportTransactionsToPdf(
                activeTitle,
                activeSubtitle,
                reportData.rows,
                reportData.totalNominal,
                settings
              )
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#0D4F35] hover:bg-[#093825] text-white rounded-lg cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Unduh PDF</span>
          </button>

          <button
            type="button"
            onClick={() =>
              exportTransactionsToExcel(
                activeTitle,
                activeSubtitle,
                reportData.rows,
                reportData.totalNominal,
                settings
              )
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#E5C158] hover:bg-[#d8b244] text-[#093825] rounded-lg cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Unduh Excel</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111F19] border border-[#DCE4DF] dark:border-[#243B31] rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 no-print">
        <div>
          <label htmlFor="report-type" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Jenis Laporan
          </label>
          <select
            id="report-type"
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg"
          >
            {REPORT_TYPES.map((rt) => (
              <option key={rt.value} value={rt.value}>
                {rt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="report-period" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Periode Laporan
          </label>
          <select
            id="report-period"
            value={period}
            onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg"
          >
            {REPORT_PERIODS.map((rp) => (
              <option key={rp.value} value={rp.value}>
                {rp.label}
              </option>
            ))}
          </select>
        </div>

        {period !== 'SEMUA' && period !== 'RENTANG' && (
          <div>
            <label htmlFor="report-ref-date" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tanggal Acuan
            </label>
            <input
              id="report-ref-date"
              type="date"
              value={referenceDate}
              onChange={(e) => setReferenceDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg"
            />
          </div>
        )}

        {period === 'RENTANG' && (
          <>
            <div>
              <label htmlFor="report-start" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Dari Tanggal
              </label>
              <input
                id="report-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="report-end" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Sampai Tanggal
              </label>
              <input
                id="report-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg"
              />
            </div>
          </>
        )}

        {reportType === 'PER_SANTRI' && (
          <div>
            <label htmlFor="report-santri" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Pilih Santri
            </label>
            <select
              id="report-santri"
              value={selectedSantriId}
              onChange={(e) => setSelectedSantriId(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg"
            >
              {santriList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.namaLengkap} ({s.nis}) — {s.jenisKelamin}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Printable Report Sheet */}
      <div className="bg-white dark:bg-[#111F19] border border-[#DCE4DF] dark:border-[#243B31] rounded-xl overflow-hidden print-sheet">
        <div className="p-6 border-b-2 border-[#0D4F35] dark:border-emerald-500 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <PesantrenEmblem className="w-14 h-14 shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#B8860B] dark:text-[#E5C158]">{settings.namaPesantren}</p>
              <h3 className="text-lg font-bold text-[#0D4F35] dark:text-emerald-300">{activeTitle}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">{activeSubtitle}</p>
            </div>
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-400 sm:text-right">
            <p>Tanggal Cetak: {formatTanggalIndonesia(today)}</p>
            <p className="font-mono-num font-bold text-base text-[#0D4F35] dark:text-emerald-300 mt-0.5">
              Total: {formatRupiah(reportData.totalNominal)}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#DCE4DF] dark:border-[#243B31] bg-[#F3F6F4] dark:bg-[#182C23] text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                <th className="py-3 px-4 w-10 text-center">No</th>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Santri</th>
                <th className="py-3 px-4">Putra/Putri</th>
                <th className="py-3 px-4">Pengirim & Metode</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Admin Input & Persetujuan</th>
                <th className="py-3 px-4 text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF1EE] dark:divide-[#1F342B] text-sm">
              {reportData.rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 px-4 text-center text-slate-500 dark:text-slate-400">
                    Tidak ada transaksi aktif untuk kriteria laporan ini.
                  </td>
                </tr>
              ) : (
                reportData.rows.map((tx, idx) => (
                  <tr key={tx.id} className="hover:bg-[#F8FBF9] dark:hover:bg-[#172A22]">
                    <td className="py-2.5 px-4 text-center text-xs font-mono-num text-slate-500 dark:text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-4 text-xs font-mono-num whitespace-nowrap text-slate-800 dark:text-slate-200">
                      <div>{tx.tanggalTransfer}</div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500">{tx.kodeTransaksi}</div>
                    </td>
                    <td className="py-2.5 px-4">
                      <button
                        type="button"
                        onClick={() => onSelectSantri(tx.santriId)}
                        className="font-semibold text-[#0D4F35] dark:text-emerald-300 hover:underline text-left cursor-pointer"
                      >
                        {tx.santriNama}
                      </button>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {tx.kelas} · {tx.kamar}
                      </p>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-700 dark:text-slate-300">
                      {tx.jenisKelamin === 'PUTRA' ? 'Putra' : 'Putri'}
                    </td>
                    <td className="py-2.5 px-4 text-xs">
                      <p className="text-slate-800 dark:text-slate-200">{tx.namaPengirim}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{tx.metodeTransfer}</p>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-800 dark:text-slate-200">
                      {getCategoryLabel(tx.kategori, tx.subKategori)}
                    </td>
                    <td className="py-2.5 px-4 text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {getStatusLabel(tx.status)}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                      <div>Diinput: <strong>{tx.inputOlehNama}</strong></div>
                      <div className={tx.disetujuiOlehNama ? 'text-[#0D4F35] dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}>
                        Disetujui Admin: <strong>{tx.disetujuiOlehNama || 'Menunggu Admin'}</strong>
                      </div>
                      {tx.petugasSerahNama && <div>Serah: {tx.petugasSerahNama}</div>}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-num font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {formatRupiah(tx.nominal)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-[#EFF6F2] dark:bg-[#182C23] border-t-2 border-[#0D4F35] dark:border-emerald-500 text-sm font-bold text-[#0D4F35] dark:text-emerald-300">
                <td colSpan={7} className="py-3.5 px-4">
                  TOTAL NOMINAL LAPORAN ({reportData.rows.length} Transaksi Aktif)
                </td>
                <td className="py-3.5 px-4 text-right text-xs text-slate-600 dark:text-slate-400 font-normal">
                  Otomatis
                </td>
                <td className="py-3.5 px-4 text-right font-mono-num text-base whitespace-nowrap">
                  {formatRupiah(reportData.totalNominal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
