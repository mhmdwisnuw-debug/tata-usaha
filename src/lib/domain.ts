export type Gender = 'PUTRA' | 'PUTRI';

export type TransferCategory = 'BEKAL' | 'SPP' | 'LAINNYA';

export type TransferStatus =
  | 'BELUM_DIAMBIL'
  | 'SUDAH_DIAMBIL'
  | 'SPP_BELUM_DIPROSES'
  | 'SPP_SUDAH_DIPROSES'
  | 'DIBATALKAN';

export type UserRole = 'ADMIN' | 'OPERATOR' | 'KEPALA_PESANTREN';

export type PaymentMethod = 'BSI' | 'BRI' | 'BCA' | 'Mandiri' | 'Bank Lainnya' | 'Tunai';

export interface UserAccount {
  id: number;
  username: string;
  namaLengkap: string;
  role: UserRole;
  aktif: boolean;
  createdAt: string;
}

export interface Santri {
  id: number;
  nis: string;
  namaLengkap: string;
  jenisKelamin: Gender;
  kelas: string;
  kamar: string;
  namaWali: string;
  noHpWali: string;
  aktif: boolean;
  createdAt: string;
}

export interface TransferTransaction {
  id: number;
  kodeTransaksi: string;
  tanggalTransfer: string; // YYYY-MM-DD
  santriId: number;
  santriNis: string;
  santriNama: string;
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
  status: TransferStatus;
  belumAdaNama: boolean;
  inputOlehId: number;
  inputOlehNama: string;
  disetujuiOlehId: number | null;
  disetujuiOlehNama: string | null;
  tanggalDisetujui: string | null;
  jamDisetujui: string | null;
  tanggalPengambilan: string | null;
  jamPengambilan: string | null;
  petugasSerahId: number | null;
  petugasSerahNama: string | null;
  nominalDiserahkan: number | null;
  keteranganSerah: string | null;
  catatanAudit: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomCategory {
  id: number;
  nama: string;
  deskripsi: string;
}

export interface AuditLog {
  id: number;
  transactionId: number | null;
  kodeTransaksi: string | null;
  userId: number;
  userName: string;
  action: string;
  reason: string;
  details: string;
  createdAt: string;
}

export interface PesantrenSettings {
  namaPesantren: string;
  alamatPesantren: string;
  namaBendahara: string;
  kota: string;
}

export interface DashboardStats {
  totalMasukHariIni: number;
  totalMasukBulanIni: number;
  totalPutra: number;
  totalPutri: number;
  totalSeluruhTransfer: number;
  jumlahOrangDitransferHariIni: number;
  jumlahPutraDitransferHariIni: number;
  jumlahPutriDitransferHariIni: number;
  totalSudahDiambil: number;
  totalBelumDiambil: number;
  totalBekal: number;
  totalSpp: number;
  jumlahTransaksiHariIni: number;
  jumlahSantriBelumMengambil: number;
  bekalMasuk: number;
  bekalSudahDiambil: number;
  bekalBelumDiambil: number;
  sppMasuk: number;
  sppPutra: number;
  sppPutri: number;
  sppSudahDiproses: number;
  sppBelumDiproses: number;
  sppPutraBelumDiproses: number;
  sppPutriBelumDiproses: number;
  lainnyaMasuk: number;
  lainnyaSudahDiambil: number;
  lainnyaBelumDiambil: number;
  totalSudahAdaNama: number;
  totalBelumAdaNama: number;
  jumlahSudahAdaNama: number;
  jumlahBelumAdaNama: number;
}

export interface ChartDataPoint {
  key: string;
  label: string;
  putra: number;
  putri: number;
  total: number;
  count: number;
}

export type ChartGranularity = 'hari' | 'bulan' | 'tahun';

export type ReportType =
  | 'SEMUA_TRANSFER'
  | 'SANTRI_PUTRA'
  | 'SANTRI_PUTRI'
  | 'UANG_BEKAL'
  | 'UANG_SPP'
  | 'SUDAH_DIAMBIL'
  | 'BELUM_DIAMBIL'
  | 'PER_SANTRI';

export type ReportPeriod = 'SEMUA' | 'HARIAN' | 'MINGGUAN' | 'BULANAN' | 'TAHUNAN' | 'RENTANG';

export type IdentitasNamaFilter = 'SEMUA' | 'SUDAH_ADA_NAMA' | 'BELUM_ADA_NAMA';

export interface TransferFilterCriteria {
  search?: string;
  jenisKelamin?: Gender | 'SEMUA';
  kelas?: string;
  kamar?: string;
  kategori?: TransferCategory | 'SEMUA';
  status?: TransferStatus | 'SEMUA' | 'AKTIF_BELUM_DIAMBIL';
  identitasNama?: IdentitasNamaFilter;
  startDate?: string;
  endDate?: string;
  santriId?: number;
}

export function formatRupiah(amount: number | null | undefined): string {
  const num = typeof amount === 'number' && Number.isFinite(amount) ? Math.round(amount) : 0;
  const isNegative = num < 0;
  const abs = Math.abs(num);
  const formatted = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return isNegative ? `-Rp ${formatted}` : `Rp ${formatted}`;
}

export function formatRupiahDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const clean = digits.replace(/^0+(?=\d)/, '');
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function parseRupiahInput(raw: string): number {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return 0;
  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatTanggalIndonesia(isoDate: string | null | undefined): string {
  if (!isoDate) return '-';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const months = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  const year = parts[0];
  const monthIdx = Number.parseInt(parts[1], 10) - 1;
  const day = Number.parseInt(parts[2], 10);
  if (monthIdx < 0 || monthIdx > 11 || Number.isNaN(day)) return isoDate;
  return `${day} ${months[monthIdx]} ${year}`;
}

export function getTodayIsoDate(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getCurrentTimeHHMM(now = new Date()): string {
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function getInitialStatusForCategory(kategori: TransferCategory): TransferStatus {
  return kategori === 'SPP' ? 'SPP_BELUM_DIPROSES' : 'BELUM_DIAMBIL';
}

export function getStatusLabel(status: TransferStatus): string {
  switch (status) {
    case 'BELUM_DIAMBIL':
      return 'Belum Diambil';
    case 'SUDAH_DIAMBIL':
      return 'Sudah Diambil';
    case 'SPP_BELUM_DIPROSES':
      return 'SPP Belum Diproses';
    case 'SPP_SUDAH_DIPROSES':
      return 'SPP Sudah Diproses';
    case 'DIBATALKAN':
      return 'Dibatalkan';
  }
}

export function getCategoryLabel(kategori: TransferCategory, subKategori?: string): string {
  if (kategori === 'BEKAL') return 'Uang Bekal';
  if (kategori === 'SPP') return 'Uang SPP';
  return subKategori ? `Uang Lainnya (${subKategori})` : 'Uang Lainnya';
}

export function hasDuplicateReference(
  transactions: Pick<TransferTransaction, 'id' | 'nomorReferensi' | 'status'>[],
  nomorReferensi: string,
  excludeTransactionId?: number
): boolean {
  const normalized = nomorReferensi.trim().toLowerCase();
  if (!normalized) return false;
  return transactions.some(
    (tx) =>
      tx.id !== excludeTransactionId &&
      tx.status !== 'DIBATALKAN' &&
      tx.nomorReferensi.trim().toLowerCase() === normalized
  );
}

export function computeDashboardStats(
  transactions: TransferTransaction[],
  todayIso: string
): DashboardStats {
  const monthPrefix = todayIso.slice(0, 7);

  let totalMasukHariIni = 0;
  let totalMasukBulanIni = 0;
  let totalPutra = 0;
  let totalPutri = 0;
  let totalSeluruhTransfer = 0;

  const orangHariIni = new Set<number>();
  const putraHariIni = new Set<number>();
  const putriHariIni = new Set<number>();
  const santriBelumAmbil = new Set<number>();

  let totalSudahDiambil = 0;
  let totalBelumDiambil = 0;
  let totalBekal = 0;
  let totalSpp = 0;
  let jumlahTransaksiHariIni = 0;

  let bekalMasuk = 0;
  let bekalSudahDiambil = 0;
  let bekalBelumDiambil = 0;
  let sppMasuk = 0;
  let sppPutra = 0;
  let sppPutri = 0;
  let sppSudahDiproses = 0;
  let sppBelumDiproses = 0;
  let sppPutraBelumDiproses = 0;
  let sppPutriBelumDiproses = 0;
  let lainnyaMasuk = 0;
  let lainnyaSudahDiambil = 0;
  let lainnyaBelumDiambil = 0;
  let totalSudahAdaNama = 0;
  let totalBelumAdaNama = 0;
  let jumlahSudahAdaNama = 0;
  let jumlahBelumAdaNama = 0;

  for (const tx of transactions) {
    if (tx.status === 'DIBATALKAN') continue;

    const personKey = tx.belumAdaNama ? -tx.id : tx.santriId;
    totalSeluruhTransfer += tx.nominal;

    if (tx.belumAdaNama) {
      totalBelumAdaNama += tx.nominal;
      jumlahBelumAdaNama += 1;
    } else {
      totalSudahAdaNama += tx.nominal;
      jumlahSudahAdaNama += 1;
    }

    if (tx.jenisKelamin === 'PUTRA') {
      totalPutra += tx.nominal;
    } else {
      totalPutri += tx.nominal;
    }

    if (tx.tanggalTransfer === todayIso) {
      totalMasukHariIni += tx.nominal;
      jumlahTransaksiHariIni += 1;
      orangHariIni.add(personKey);
      if (tx.jenisKelamin === 'PUTRA') {
        putraHariIni.add(personKey);
      } else {
        putriHariIni.add(personKey);
      }
    }

    if (tx.tanggalTransfer.startsWith(monthPrefix)) {
      totalMasukBulanIni += tx.nominal;
    }

    if (tx.kategori === 'BEKAL') {
      totalBekal += tx.nominal;
      bekalMasuk += tx.nominal;
      if (tx.status === 'SUDAH_DIAMBIL') {
        const diserahkan = tx.nominalDiserahkan ?? tx.nominal;
        totalSudahDiambil += diserahkan;
        bekalSudahDiambil += diserahkan;
      } else if (tx.status === 'BELUM_DIAMBIL') {
        totalBelumDiambil += tx.nominal;
        bekalBelumDiambil += tx.nominal;
        santriBelumAmbil.add(personKey);
      }
    } else if (tx.kategori === 'SPP') {
      totalSpp += tx.nominal;
      sppMasuk += tx.nominal;
      if (tx.jenisKelamin === 'PUTRA') {
        sppPutra += tx.nominal;
      } else {
        sppPutri += tx.nominal;
      }
      if (tx.status === 'SPP_SUDAH_DIPROSES') {
        sppSudahDiproses += tx.nominal;
      } else if (tx.status === 'SPP_BELUM_DIPROSES') {
        sppBelumDiproses += tx.nominal;
        if (tx.jenisKelamin === 'PUTRA') sppPutraBelumDiproses += tx.nominal;
        else sppPutriBelumDiproses += tx.nominal;
      }
    } else {
      lainnyaMasuk += tx.nominal;
      if (tx.status === 'SUDAH_DIAMBIL') {
        const diserahkan = tx.nominalDiserahkan ?? tx.nominal;
        totalSudahDiambil += diserahkan;
        lainnyaSudahDiambil += diserahkan;
      } else if (tx.status === 'BELUM_DIAMBIL') {
        totalBelumDiambil += tx.nominal;
        lainnyaBelumDiambil += tx.nominal;
        santriBelumAmbil.add(personKey);
      }
    }
  }

  return {
    totalMasukHariIni,
    totalMasukBulanIni,
    totalPutra,
    totalPutri,
    totalSeluruhTransfer,
    jumlahOrangDitransferHariIni: orangHariIni.size,
    jumlahPutraDitransferHariIni: putraHariIni.size,
    jumlahPutriDitransferHariIni: putriHariIni.size,
    totalSudahDiambil,
    totalBelumDiambil,
    totalBekal,
    totalSpp,
    jumlahTransaksiHariIni,
    jumlahSantriBelumMengambil: santriBelumAmbil.size,
    bekalMasuk,
    bekalSudahDiambil,
    bekalBelumDiambil,
    sppMasuk,
    sppPutra,
    sppPutri,
    sppSudahDiproses,
    sppBelumDiproses,
    sppPutraBelumDiproses,
    sppPutriBelumDiproses,
    lainnyaMasuk,
    lainnyaSudahDiambil,
    lainnyaBelumDiambil,
    totalSudahAdaNama,
    totalBelumAdaNama,
    jumlahSudahAdaNama,
    jumlahBelumAdaNama,
  };
}

export function filterTransactions(
  transactions: TransferTransaction[],
  criteria: TransferFilterCriteria
): TransferTransaction[] {
  const q = (criteria.search ?? '').trim().toLowerCase();
  const qDigits = q.replace(/\D/g, '');
  const qHasNonRpLetters = /[a-z]/i.test(q.replace(/rp/gi, ''));

  return transactions.filter((tx) => {
    if (criteria.jenisKelamin && criteria.jenisKelamin !== 'SEMUA') {
      if (tx.jenisKelamin !== criteria.jenisKelamin) return false;
    }

    if (criteria.santriId && tx.santriId !== criteria.santriId) {
      return false;
    }

    if (criteria.kelas && criteria.kelas !== 'SEMUA') {
      if (tx.kelas !== criteria.kelas) return false;
    }

    if (criteria.kamar && criteria.kamar !== 'SEMUA') {
      if (tx.kamar !== criteria.kamar) return false;
    }

    if (criteria.kategori && criteria.kategori !== 'SEMUA') {
      if (tx.kategori !== criteria.kategori) return false;
    }

    if (criteria.status && criteria.status !== 'SEMUA') {
      if (criteria.status === 'AKTIF_BELUM_DIAMBIL') {
        if (tx.status !== 'BELUM_DIAMBIL') return false;
      } else if (tx.status !== criteria.status) {
        return false;
      }
    }

    if (criteria.identitasNama && criteria.identitasNama !== 'SEMUA') {
      if (criteria.identitasNama === 'BELUM_ADA_NAMA' && !tx.belumAdaNama) return false;
      if (criteria.identitasNama === 'SUDAH_ADA_NAMA' && tx.belumAdaNama) return false;
    }

    if (criteria.startDate && tx.tanggalTransfer < criteria.startDate) {
      return false;
    }

    if (criteria.endDate && tx.tanggalTransfer > criteria.endDate) {
      return false;
    }

    if (q) {
      const hay = [
        tx.kodeTransaksi,
        tx.santriNama,
        tx.santriNis,
        tx.kelas,
        tx.kamar,
        tx.namaPengirim,
        tx.tanggalTransfer,
        tx.nomorReferensi,
        tx.subKategori,
        tx.metodeTransfer,
        tx.catatan,
      ]
        .join(' ')
        .toLowerCase();

      const nominalStr = String(tx.nominal);
      const nominalFormatted = formatRupiah(tx.nominal).toLowerCase();
      const nominalCompact = nominalFormatted.replace(/\s+/g, '');
      const matchesNominal =
        nominalFormatted.includes(q) ||
        nominalCompact.includes(q.replace(/\s+/g, '')) ||
        (qDigits.length > 0 && !qHasNonRpLetters && nominalStr.includes(qDigits));

      if (!hay.includes(q) && !matchesNominal) return false;
    }

    return true;
  });
}

export function computeChartSeries(
  transactions: TransferTransaction[],
  granularity: ChartGranularity,
  referenceDateIso: string
): ChartDataPoint[] {
  const active = transactions.filter((t) => t.status !== 'DIBATALKAN');
  const [refYearStr, refMonthStr, refDayStr] = referenceDateIso.split('-');
  const refYear = Number.parseInt(refYearStr, 10);
  const refMonth = Number.parseInt(refMonthStr, 10) - 1;
  const refDay = Number.parseInt(refDayStr, 10);

  if (granularity === 'hari') {
    const points: ChartDataPoint[] = [];
    const baseDate = new Date(refYear, refMonth, refDay);
    for (let i = 13; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      const key = getTodayIsoDate(d);
      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      points.push({ key, label, putra: 0, putri: 0, total: 0, count: 0 });
    }
    const map = new Map(points.map((p) => [p.key, p]));
    for (const tx of active) {
      const pt = map.get(tx.tanggalTransfer);
      if (!pt) continue;
      if (tx.jenisKelamin === 'PUTRA') pt.putra += tx.nominal;
      else pt.putri += tx.nominal;
      pt.total += tx.nominal;
      pt.count += 1;
    }
    return points;
  }

  if (granularity === 'bulan') {
    const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const points: ChartDataPoint[] = shortMonths.map((label, idx) => {
      const m = String(idx + 1).padStart(2, '0');
      return {
        key: `${refYear}-${m}`,
        label,
        putra: 0,
        putri: 0,
        total: 0,
        count: 0,
      };
    });
    const map = new Map(points.map((p) => [p.key, p]));
    for (const tx of active) {
      const ym = tx.tanggalTransfer.slice(0, 7);
      const pt = map.get(ym);
      if (!pt) continue;
      if (tx.jenisKelamin === 'PUTRA') pt.putra += tx.nominal;
      else pt.putri += tx.nominal;
      pt.total += tx.nominal;
      pt.count += 1;
    }
    return points;
  }

  const points: ChartDataPoint[] = [];
  for (let y = refYear - 4; y <= refYear; y++) {
    const key = String(y);
    points.push({ key, label: key, putra: 0, putri: 0, total: 0, count: 0 });
  }
  const map = new Map(points.map((p) => [p.key, p]));
  for (const tx of active) {
    const y = tx.tanggalTransfer.slice(0, 4);
    const pt = map.get(y);
    if (!pt) continue;
    if (tx.jenisKelamin === 'PUTRA') pt.putra += tx.nominal;
    else pt.putri += tx.nominal;
    pt.total += tx.nominal;
    pt.count += 1;
  }
  return points;
}

export function computeSantriSummary(transactions: TransferTransaction[], santriId: number) {
  const list = transactions.filter((t) => t.santriId === santriId);
  const active = list.filter((t) => t.status !== 'DIBATALKAN');

  let totalTransfer = 0;
  let totalBekalDiambil = 0;
  let totalBekalBelumDiambil = 0;
  let totalSpp = 0;
  let totalSppSudahDiproses = 0;
  let totalSppBelumDiproses = 0;
  let totalLainnyaDiambil = 0;
  let totalLainnyaBelumDiambil = 0;

  for (const tx of active) {
    totalTransfer += tx.nominal;
    if (tx.kategori === 'BEKAL') {
      if (tx.status === 'SUDAH_DIAMBIL') totalBekalDiambil += tx.nominalDiserahkan ?? tx.nominal;
      else if (tx.status === 'BELUM_DIAMBIL') totalBekalBelumDiambil += tx.nominal;
    } else if (tx.kategori === 'SPP') {
      totalSpp += tx.nominal;
      if (tx.status === 'SPP_SUDAH_DIPROSES') totalSppSudahDiproses += tx.nominal;
      else if (tx.status === 'SPP_BELUM_DIPROSES') totalSppBelumDiproses += tx.nominal;
    } else {
      if (tx.status === 'SUDAH_DIAMBIL') totalLainnyaDiambil += tx.nominalDiserahkan ?? tx.nominal;
      else if (tx.status === 'BELUM_DIAMBIL') totalLainnyaBelumDiambil += tx.nominal;
    }
  }

  return {
    totalTransfer,
    totalBekalDiambil,
    totalBekalBelumDiambil,
    totalSpp,
    totalSppSudahDiproses,
    totalSppBelumDiproses,
    totalLainnyaDiambil,
    totalLainnyaBelumDiambil,
    riwayat: list,
  };
}

export function resolveReportPeriodDates(
  period: ReportPeriod,
  referenceDateIso: string,
  customStart?: string,
  customEnd?: string
): { startDate?: string; endDate?: string } {
  if (period === 'SEMUA') return {};
  if (period === 'HARIAN') {
    return { startDate: referenceDateIso, endDate: referenceDateIso };
  }
  if (period === 'MINGGUAN') {
    const [y, m, d] = referenceDateIso.split('-').map((v) => Number.parseInt(v, 10));
    const end = new Date(y, m - 1, d);
    const start = new Date(y, m - 1, d - 6);
    return { startDate: getTodayIsoDate(start), endDate: getTodayIsoDate(end) };
  }
  if (period === 'BULANAN') {
    const ym = referenceDateIso.slice(0, 7);
    const [y, m] = ym.split('-').map((v) => Number.parseInt(v, 10));
    const lastDay = new Date(y, m, 0).getDate();
    return { startDate: `${ym}-01`, endDate: `${ym}-${String(lastDay).padStart(2, '0')}` };
  }
  if (period === 'TAHUNAN') {
    const y = referenceDateIso.slice(0, 4);
    return { startDate: `${y}-01-01`, endDate: `${y}-12-31` };
  }
  return { startDate: customStart || undefined, endDate: customEnd || undefined };
}

export function buildReportData(
  transactions: TransferTransaction[],
  reportType: ReportType,
  period: ReportPeriod,
  referenceDateIso: string,
  options?: { santriId?: number; startDate?: string; endDate?: string }
): { rows: TransferTransaction[]; totalNominal: number } {
  const { startDate, endDate } = resolveReportPeriodDates(
    period,
    referenceDateIso,
    options?.startDate,
    options?.endDate
  );

  const criteria: TransferFilterCriteria = {
    startDate,
    endDate,
  };

  switch (reportType) {
    case 'SANTRI_PUTRA':
      criteria.jenisKelamin = 'PUTRA';
      break;
    case 'SANTRI_PUTRI':
      criteria.jenisKelamin = 'PUTRI';
      break;
    case 'UANG_BEKAL':
      criteria.kategori = 'BEKAL';
      break;
    case 'UANG_SPP':
      criteria.kategori = 'SPP';
      break;
    case 'SUDAH_DIAMBIL':
      criteria.status = 'SUDAH_DIAMBIL';
      break;
    case 'BELUM_DIAMBIL':
      criteria.status = 'BELUM_DIAMBIL';
      break;
    case 'PER_SANTRI':
      criteria.santriId = options?.santriId;
      break;
    case 'SEMUA_TRANSFER':
    default:
      break;
  }

  const rows = filterTransactions(transactions, criteria).filter((tx) => tx.status !== 'DIBATALKAN');
  const totalNominal = rows.reduce((acc, tx) => acc + tx.nominal, 0);

  return { rows, totalNominal };
}

export function canEditOrDeleteTransaction(role: UserRole): boolean {
  return role === 'ADMIN';
}

export function canInputOrProcessTransaction(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'OPERATOR';
}

export function canManageUsersAndAudit(role: UserRole): boolean {
  return role === 'ADMIN';
}

export function canApproveTransaction(role: UserRole): boolean {
  return role === 'ADMIN';
}

export function canAccessMenuForRole(menuKey: string, role: UserRole): boolean {
  if (role === 'ADMIN') return true;
  if (role === 'OPERATOR') return true;
  // KEPALA_PESANTREN: dashboard & reports / read-only monitoring, cannot access input transfer or system settings
  if (menuKey === 'transfer-masuk' || menuKey === 'pengaturan') {
    return false;
  }
  return true;
}

export function getRoleDisplayLabel(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return 'Admin Tata Usaha';
    case 'OPERATOR':
      return 'Operator Keuangan';
    case 'KEPALA_PESANTREN':
      return 'Kepala Pesantren';
  }
}
