import { useMemo, useState } from 'react';
import { ChevronRight, X, ArrowUpRight, Wallet, Users, Clock, CheckCircle2 } from 'lucide-react';
import {
  computeChartSeries,
  computeDashboardStats,
  formatRupiah,
  formatTanggalIndonesia,
  getTodayIsoDate,
  type ChartGranularity,
  type TransferTransaction,
  type UserRole,
} from '../lib/domain';
import { TransactionTable } from './TransactionTable';

interface DashboardViewProps {
  transactions: TransferTransaction[];
  userRole: UserRole;
  onSelectSantri: (santriId: number) => void;
  onIdentify: (tx: TransferTransaction) => void;
  onApprove?: (tx: TransferTransaction) => void;
  onPickup: (tx: TransferTransaction) => void;
  onPrintReceipt: (tx: TransferTransaction) => void;
  onEdit: (tx: TransferTransaction) => void;
  onCancel: (tx: TransferTransaction) => void;
  onDelete: (tx: TransferTransaction) => void;
  onNavigate: (menu: string) => void;
}

interface StatCardItem {
  id: string;
  label: string;
  value: string;
  sublabel: string;
  accent?: 'emerald' | 'gold' | 'amber' | 'neutral';
  filterFn: (tx: TransferTransaction, today: string) => boolean;
}

export function DashboardView({
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
  onNavigate,
}: DashboardViewProps) {
  const today = getTodayIsoDate();
  const monthPrefix = today.slice(0, 7);
  const stats = useMemo(() => computeDashboardStats(transactions, today), [transactions, today]);

  const [granularity, setGranularity] = useState<ChartGranularity>('hari');
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);
  const [selectedChartKey, setSelectedChartKey] = useState<string | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const chartSeries = useMemo(
    () => computeChartSeries(transactions, granularity, today),
    [transactions, granularity, today]
  );

  const maxChartTotal = useMemo(
    () => Math.max(1, ...chartSeries.map((pt) => pt.total)),
    [chartSeries]
  );

  const statCards: StatCardItem[] = useMemo(
    () => [
      {
        id: 'masuk_hari_ini',
        label: 'Total Uang Transfer Masuk Hari Ini',
        value: formatRupiah(stats.totalMasukHariIni),
        sublabel: `${stats.jumlahTransaksiHariIni} transaksi hari ini`,
        accent: 'emerald',
        filterFn: (tx, t) => tx.status !== 'DIBATALKAN' && tx.tanggalTransfer === t,
      },
      {
        id: 'masuk_bulan_ini',
        label: 'Total Uang Transfer Masuk Bulan Ini',
        value: formatRupiah(stats.totalMasukBulanIni),
        sublabel: 'Akumulasi bulan berjalan',
        accent: 'emerald',
        filterFn: (tx) => tx.status !== 'DIBATALKAN' && tx.tanggalTransfer.startsWith(monthPrefix),
      },
      {
        id: 'total_putra',
        label: 'Total Uang Transfer Santri Putra',
        value: formatRupiah(stats.totalPutra),
        sublabel: 'Seluruh transfer aktif Putra',
        accent: 'neutral',
        filterFn: (tx) => tx.status !== 'DIBATALKAN' && tx.jenisKelamin === 'PUTRA',
      },
      {
        id: 'total_putri',
        label: 'Total Uang Transfer Santri Putri',
        value: formatRupiah(stats.totalPutri),
        sublabel: 'Seluruh transfer aktif Putri',
        accent: 'neutral',
        filterFn: (tx) => tx.status !== 'DIBATALKAN' && tx.jenisKelamin === 'PUTRI',
      },
      {
        id: 'total_seluruh',
        label: 'Total Seluruh Uang Transfer',
        value: formatRupiah(stats.totalSeluruhTransfer),
        sublabel: 'Semua kategori & asrama aktif',
        accent: 'gold',
        filterFn: (tx) => tx.status !== 'DIBATALKAN',
      },
      {
        id: 'orang_hari_ini',
        label: 'Jumlah Orang yang Ditransfer Hari Ini',
        value: `${stats.jumlahOrangDitransferHariIni} Santri`,
        sublabel: 'Santri unik penerima hari ini',
        accent: 'neutral',
        filterFn: (tx, t) => tx.status !== 'DIBATALKAN' && tx.tanggalTransfer === t,
      },
      {
        id: 'putra_hari_ini',
        label: 'Jumlah Santri Putra yang Ditransfer Hari Ini',
        value: `${stats.jumlahPutraDitransferHariIni} Putra`,
        sublabel: 'Santri putra hari ini',
        accent: 'neutral',
        filterFn: (tx, t) => tx.status !== 'DIBATALKAN' && tx.tanggalTransfer === t && tx.jenisKelamin === 'PUTRA',
      },
      {
        id: 'putri_hari_ini',
        label: 'Jumlah Santri Putri yang Ditransfer Hari Ini',
        value: `${stats.jumlahPutriDitransferHariIni} Putri`,
        sublabel: 'Santri putri hari ini',
        accent: 'neutral',
        filterFn: (tx, t) => tx.status !== 'DIBATALKAN' && tx.tanggalTransfer === t && tx.jenisKelamin === 'PUTRI',
      },
      {
        id: 'sudah_diambil',
        label: 'Total Uang yang Sudah Diambil Santri',
        value: formatRupiah(stats.totalSudahDiambil),
        sublabel: 'Bekal & keperluan telah diserahkan',
        accent: 'emerald',
        filterFn: (tx) => tx.kategori !== 'SPP' && tx.status === 'SUDAH_DIAMBIL',
      },
      {
        id: 'belum_diambil',
        label: 'Total Uang yang Belum Diambil Santri',
        value: formatRupiah(stats.totalBelumDiambil),
        sublabel: 'Tersimpan di Tata Usaha (tanpa SPP)',
        accent: 'amber',
        filterFn: (tx) => tx.kategori !== 'SPP' && tx.status === 'BELUM_DIAMBIL',
      },
      {
        id: 'total_bekal',
        label: 'Total Uang untuk Bekal',
        value: formatRupiah(stats.totalBekal),
        sublabel: `Belum diambil: ${formatRupiah(stats.bekalBelumDiambil)}`,
        accent: 'neutral',
        filterFn: (tx) => tx.status !== 'DIBATALKAN' && tx.kategori === 'BEKAL',
      },
      {
        id: 'total_spp',
        label: 'Total Uang untuk Pembayaran SPP',
        value: formatRupiah(stats.totalSpp),
        sublabel: `Belum diproses: ${formatRupiah(stats.sppBelumDiproses)}`,
        accent: 'gold',
        filterFn: (tx) => tx.status !== 'DIBATALKAN' && tx.kategori === 'SPP',
      },
      {
        id: 'spp_putra',
        label: 'Total Uang SPP Santri Putra',
        value: formatRupiah(stats.sppPutra),
        sublabel: `Belum diproses: ${formatRupiah(stats.sppPutraBelumDiproses)}`,
        accent: 'emerald',
        filterFn: (tx) => tx.status !== 'DIBATALKAN' && tx.kategori === 'SPP' && tx.jenisKelamin === 'PUTRA',
      },
      {
        id: 'spp_putri',
        label: 'Total Uang SPP Santri Putri',
        value: formatRupiah(stats.sppPutri),
        sublabel: `Belum diproses: ${formatRupiah(stats.sppPutriBelumDiproses)}`,
        accent: 'gold',
        filterFn: (tx) => tx.status !== 'DIBATALKAN' && tx.kategori === 'SPP' && tx.jenisKelamin === 'PUTRI',
      },
      {
        id: 'trx_hari_ini',
        label: 'Jumlah Transaksi Hari Ini',
        value: `${stats.jumlahTransaksiHariIni} Transaksi`,
        sublabel: formatTanggalIndonesia(today),
        accent: 'neutral',
        filterFn: (tx, t) => tx.status !== 'DIBATALKAN' && tx.tanggalTransfer === t,
      },
      {
        id: 'santri_belum_ambil',
        label: 'Jumlah Santri yang Belum Mengambil Uang',
        value: `${stats.jumlahSantriBelumMengambil} Santri`,
        sublabel: 'Menunggu penyerahan uang bekal/lainnya',
        accent: 'amber',
        filterFn: (tx) => tx.kategori !== 'SPP' && tx.status === 'BELUM_DIAMBIL',
      },
      {
        id: 'sudah_ada_nama',
        label: 'Uang Masuk Sudah Ada Namanya',
        value: formatRupiah(stats.totalSudahAdaNama),
        sublabel: `${stats.jumlahSudahAdaNama} transaksi teridentifikasi`,
        accent: 'emerald',
        filterFn: (tx) => tx.status !== 'DIBATALKAN' && !tx.belumAdaNama,
      },
      {
        id: 'belum_ada_nama',
        label: 'Uang Masuk Belum Ada Namanya',
        value: formatRupiah(stats.totalBelumAdaNama),
        sublabel: `${stats.jumlahBelumAdaNama} transaksi perlu koreksi nama`,
        accent: 'amber',
        filterFn: (tx) => tx.status !== 'DIBATALKAN' && tx.belumAdaNama,
      },
    ],
    [stats, monthPrefix, today]
  );

  const activeMetric = statCards.find((c) => c.id === selectedMetricId) ?? null;

  const drilldownTransactions = useMemo(() => {
    if (activeMetric) {
      return transactions.filter((tx) => activeMetric.filterFn(tx, today));
    }
    if (selectedChartKey) {
      return transactions.filter((tx) => {
        if (tx.status === 'DIBATALKAN') return false;
        if (granularity === 'hari') return tx.tanggalTransfer === selectedChartKey;
        if (granularity === 'bulan') return tx.tanggalTransfer.startsWith(selectedChartKey);
        return tx.tanggalTransfer.startsWith(selectedChartKey);
      });
    }
    return [];
  }, [activeMetric, selectedChartKey, transactions, today, granularity]);

  const hoveredPoint = chartSeries.find((p) => p.key === hoveredKey) ?? null;

  return (
    <div className="space-y-6">
      <div className="bg-[#0D4F35] text-white rounded-xl p-6 islamic-pattern flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#E5C158]">
            Ringkasan Keuangan Pesantren · {formatTanggalIndonesia(today)}
          </p>
          <h2 className="text-2xl font-bold mt-1">Dashboard Utama Tata Usaha</h2>
          <p className="text-sm text-emerald-100/80 mt-1">
            Klik kartu statistik atau batang grafik di bawah untuk melihat rincian transaksi secara langsung.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {userRole !== 'KEPALA_PESANTREN' && (
            <button
              type="button"
              onClick={() => onNavigate('transfer-masuk')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#E5C158] hover:bg-[#d8b244] text-[#093825] text-sm font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Wallet className="w-4 h-4" aria-hidden="true" />
              <span>Catat Transfer Masuk</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate('belum-diambil')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-sm font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Clock className="w-4 h-4 text-[#E5C158]" aria-hidden="true" />
            <span>Antrean Belum Diambil ({stats.jumlahSantriBelumMengambil})</span>
          </button>
        </div>
      </div>

      <section aria-label="Statistik Utama Transfer Santri">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {statCards.map((card) => {
            const isSelected = selectedMetricId === card.id;
            const valueColor =
              card.accent === 'emerald'
                ? 'text-[#0D4F35] dark:text-emerald-300'
                : card.accent === 'gold'
                  ? 'text-[#9A6F04] dark:text-[#E5C158]'
                  : card.accent === 'amber'
                    ? 'text-amber-700 dark:text-amber-300'
                    : 'text-slate-900 dark:text-white';

            return (
              <button
                key={card.id}
                type="button"
                onClick={() => {
                  setSelectedChartKey(null);
                  setSelectedMetricId((prev) => (prev === card.id ? null : card.id));
                }}
                className={`text-left p-4 rounded-xl border transition-all cursor-pointer group ${
                  isSelected
                    ? 'bg-[#EFF6F2] dark:bg-[#163125] border-[#0D4F35] dark:border-emerald-400 ring-2 ring-[#0D4F35]/20 dark:ring-emerald-400/20'
                    : 'bg-white dark:bg-[#111F19] border-[#DCE4DF] dark:border-[#243B31] hover:border-[#0D4F35]/50 dark:hover:border-emerald-500/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-snug">{card.label}</p>
                  <ArrowUpRight
                    className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-[#0D4F35] dark:group-hover:text-emerald-300 shrink-0 transition-colors"
                    aria-hidden="true"
                  />
                </div>
                <p className={`mt-2.5 text-xl font-bold font-mono-num tracking-tight ${valueColor}`}>
                  {card.value}
                </p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{card.sublabel}</p>
              </button>
            );
          })}
        </div>
      </section>

      {(activeMetric || selectedChartKey) && (
        <section
          aria-label="Rincian Statistik Terpilih"
          className="bg-[#FAFBF9] dark:bg-[#15261E] border border-[#0D4F35]/30 dark:border-emerald-500/40 rounded-xl p-5 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[#B8860B] dark:text-[#E5C158] uppercase tracking-wider">Rincian Data Terpilih</p>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {activeMetric ? activeMetric.label : `Pemasukan Transfer Periode ${selectedChartKey}`}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Menampilkan {drilldownTransactions.length} transaksi terkait. Klik nama santri untuk melihat profil lengkap.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedMetricId(null);
                setSelectedChartKey(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#111F19] border border-slate-300 dark:border-[#2D473B] rounded-lg hover:bg-slate-50 dark:hover:bg-[#1B3127] cursor-pointer self-start"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Tutup Rincian</span>
            </button>
          </div>

          <TransactionTable
            transactions={drilldownTransactions}
            userRole={userRole}
            hideFilters={true}
            emptyMessage="Tidak ada transaksi pada rincian ini."
            onSelectSantri={onSelectSantri}
            onIdentify={onIdentify}
            onApprove={onApprove}
            onPickup={onPickup}
            onPrintReceipt={onPrintReceipt}
            onEdit={onEdit}
            onCancel={onCancel}
            onDelete={onDelete}
          />
        </section>
      )}

      <section className="bg-white dark:bg-[#111F19] border border-[#DCE4DF] dark:border-[#243B31] rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Grafik Pemasukan Transfer Santri</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Perbandingan nominal transfer Santri Putra dan Santri Putri · Klik batang grafik untuk melihat rincian
            </p>
          </div>

          <div className="inline-flex items-center gap-1 p-1 bg-[#F1F5F2] dark:bg-[#0D1914] rounded-lg self-start">
            {(['hari', 'bulan', 'tahun'] as ChartGranularity[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setGranularity(mode);
                  setSelectedChartKey(null);
                }}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  granularity === mode
                    ? 'bg-[#0D4F35] text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {mode === 'hari' ? 'Per Hari (14 Hari)' : mode === 'bulan' ? 'Per Bulan' : 'Per Tahun'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-100 dark:border-[#243B31] pb-3">
          <div className="flex items-center gap-5">
            <span className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
              <span className="w-3 h-3 rounded-sm bg-[#0D4F35] dark:bg-emerald-500 inline-block" aria-hidden="true" />
              Santri Putra
            </span>
            <span className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
              <span className="w-3 h-3 rounded-sm bg-[#C99A2E] dark:bg-[#E5C158] inline-block" aria-hidden="true" />
              Santri Putri
            </span>
          </div>

          <div className="font-mono-num text-slate-700 dark:text-slate-200 min-h-[18px]">
            {hoveredPoint ? (
              <span>
                <strong>{hoveredPoint.label}</strong>: Total {formatRupiah(hoveredPoint.total)} ({hoveredPoint.count} trx)
                · Putra {formatRupiah(hoveredPoint.putra)} · Putri {formatRupiah(hoveredPoint.putri)}
              </span>
            ) : (
              <span className="text-slate-400 dark:text-slate-500">Arahkan kursor atau klik batang grafik untuk rincian</span>
            )}
          </div>
        </div>

        <div className="pt-2">
          <div className="h-64 flex items-end gap-2 sm:gap-3 border-b border-slate-200 dark:border-[#243B31] pb-2">
            {chartSeries.map((pt) => {
              const putraPct = Math.round((pt.putra / maxChartTotal) * 100);
              const putriPct = Math.round((pt.putri / maxChartTotal) * 100);
              const isActive = selectedChartKey === pt.key;
              return (
                <button
                  key={pt.key}
                  type="button"
                  onMouseEnter={() => setHoveredKey(pt.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  onClick={() => {
                    setSelectedMetricId(null);
                    setSelectedChartKey((prev) => (prev === pt.key ? null : pt.key));
                  }}
                  aria-label={`Periode ${pt.label}, total ${formatRupiah(pt.total)}`}
                  className={`flex-1 h-full flex flex-col justify-end items-center group cursor-pointer rounded-t-md px-0.5 transition-colors ${
                    isActive ? 'bg-[#EFF6F2] dark:bg-[#163125]' : 'hover:bg-slate-50 dark:hover:bg-[#172A22]'
                  }`}
                >
                  <div className="w-full max-w-[34px] flex flex-col justify-end h-full gap-0.5 pt-4">
                    {pt.putri > 0 && (
                      <div
                        style={{ height: `${Math.max(4, putriPct)}%` }}
                        className="w-full bg-[#C99A2E] dark:bg-[#E5C158] group-hover:bg-[#b58720] rounded-t-sm transition-all"
                      />
                    )}
                    {pt.putra > 0 && (
                      <div
                        style={{ height: `${Math.max(4, putraPct)}%` }}
                        className={`w-full bg-[#0D4F35] dark:bg-emerald-500 group-hover:bg-[#093825] dark:group-hover:bg-emerald-400 transition-all ${
                          pt.putri === 0 ? 'rounded-t-sm' : ''
                        }`}
                      />
                    )}
                    {pt.total === 0 && <div className="w-full h-[2px] bg-slate-200 dark:bg-[#243B31]" />}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 pt-2">
            {chartSeries.map((pt) => (
              <div key={pt.key} className="flex-1 text-center text-[11px] font-mono-num text-slate-600 dark:text-slate-400 truncate">
                {pt.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#111F19] border border-[#DCE4DF] dark:border-[#243B31] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 dark:text-white">Ringkasan Uang Bekal</h4>
              <Wallet className="w-4 h-4 text-[#0D4F35] dark:text-emerald-400" aria-hidden="true" />
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Total Bekal Masuk</span>
                <span className="font-mono-num font-semibold text-slate-900 dark:text-white">{formatRupiah(stats.bekalMasuk)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Sudah Diambil Santri</span>
                <span className="font-mono-num font-semibold text-emerald-700 dark:text-emerald-400">{formatRupiah(stats.bekalSudahDiambil)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Belum Diambil (Tersimpan)</span>
                <span className="font-mono-num font-semibold text-amber-700 dark:text-amber-300">{formatRupiah(stats.bekalBelumDiambil)}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('kategori-bekal')}
            className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-[#0D4F35] dark:text-emerald-300 hover:underline cursor-pointer"
          >
            <span>Buka Kategori Bekal</span>
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="bg-white dark:bg-[#111F19] border border-[#DCE4DF] dark:border-[#243B31] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 dark:text-white">Ringkasan Pembayaran SPP</h4>
              <CheckCircle2 className="w-4 h-4 text-[#B8860B] dark:text-[#E5C158]" aria-hidden="true" />
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">SPP Santri Putra</span>
                <span className="font-mono-num font-semibold text-[#0D4F35] dark:text-emerald-300">{formatRupiah(stats.sppPutra)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">SPP Santri Putri</span>
                <span className="font-mono-num font-semibold text-[#9A6F04] dark:text-[#E5C158]">{formatRupiah(stats.sppPutri)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Sudah Diproses / Diserahkan</span>
                <span className="font-mono-num font-semibold text-emerald-700 dark:text-emerald-400">{formatRupiah(stats.sppSudahDiproses)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Belum Diproses</span>
                <span className="font-mono-num font-semibold text-sky-700 dark:text-sky-300">{formatRupiah(stats.sppBelumDiproses)}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('kategori-spp')}
            className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-[#0D4F35] dark:text-emerald-300 hover:underline cursor-pointer"
          >
            <span>Buka Kategori SPP</span>
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="bg-white dark:bg-[#111F19] border border-[#DCE4DF] dark:border-[#243B31] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 dark:text-white">Pemisahan Asrama Putra & Putri</h4>
              <Users className="w-4 h-4 text-[#0D4F35] dark:text-emerald-400" aria-hidden="true" />
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Total Transfer Santri Putra</span>
                <span className="font-mono-num font-semibold text-slate-900 dark:text-white">{formatRupiah(stats.totalPutra)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Total Transfer Santri Putri</span>
                <span className="font-mono-num font-semibold text-slate-900 dark:text-white">{formatRupiah(stats.totalPutri)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Keperluan Lainnya Masuk</span>
                <span className="font-mono-num font-semibold text-slate-900 dark:text-white">{formatRupiah(stats.lainnyaMasuk)}</span>
              </div>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-4">
            <button
              type="button"
              onClick={() => onNavigate('santri-putra')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0D4F35] dark:text-emerald-300 hover:underline cursor-pointer"
            >
              <span>Data Putra</span>
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('santri-putri')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#B8860B] dark:text-[#E5C158] hover:underline cursor-pointer"
            >
              <span>Data Putri</span>
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
