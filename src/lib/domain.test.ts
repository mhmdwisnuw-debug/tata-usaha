import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatRupiah,
  formatRupiahDigits,
  parseRupiahInput,
  getInitialStatusForCategory,
  hasDuplicateReference,
  computeDashboardStats,
  computeChartSeries,
  buildReportData,
  computeSantriSummary,
  canEditOrDeleteTransaction,
  canInputOrProcessTransaction,
  canManageUsersAndAudit,
  canApproveTransaction,
  canAccessMenuForRole,
  filterTransactions,
  type TransferTransaction,
} from './domain';

const sampleTx = (overrides: Partial<TransferTransaction>): TransferTransaction => ({
  id: 1,
  kodeTransaksi: 'TRF-2026-001',
  tanggalTransfer: '2026-11-12',
  santriId: 101,
  santriNis: '2026001',
  santriNama: 'Ahmad Zaki',
  jenisKelamin: 'PUTRA',
  kelas: 'VII A',
  kamar: 'Al-Fatih 01',
  namaPengirim: 'Bpk. Sulaiman',
  nominal: 500000,
  kategori: 'BEKAL',
  subKategori: 'Uang Bekal',
  metodeTransfer: 'BSI',
  nomorReferensi: 'REF-001',
  catatan: '',
  status: 'BELUM_DIAMBIL',
  belumAdaNama: false,
  inputOlehId: 1,
  inputOlehNama: 'Admin',
  disetujuiOlehId: null,
  disetujuiOlehNama: null,
  tanggalDisetujui: null,
  jamDisetujui: null,
  tanggalPengambilan: null,
  jamPengambilan: null,
  petugasSerahId: null,
  petugasSerahNama: null,
  nominalDiserahkan: null,
  keteranganSerah: null,
  catatanAudit: null,
  createdAt: '2026-11-12T08:00:00Z',
  updatedAt: '2026-11-12T08:00:00Z',
  ...overrides,
});

test('formatRupiah formats Indonesian Rupiah with automatic dots', () => {
  assert.equal(formatRupiah(0), 'Rp 0');
  assert.equal(formatRupiah(500000), 'Rp 500.000');
  assert.equal(formatRupiah(12500000), 'Rp 12.500.000');
  assert.equal(formatRupiahDigits('001500000'), '1.500.000');
  assert.equal(parseRupiahInput('Rp 1.500.000'), 1500000);
});

test('SPP has independent status and is excluded from uncollected Bekal/Lainnya pool', () => {
  assert.equal(getInitialStatusForCategory('BEKAL'), 'BELUM_DIAMBIL');
  assert.equal(getInitialStatusForCategory('LAINNYA'), 'BELUM_DIAMBIL');
  assert.equal(getInitialStatusForCategory('SPP'), 'SPP_BELUM_DIPROSES');

  const txs: TransferTransaction[] = [
    sampleTx({ id: 1, santriId: 1, jenisKelamin: 'PUTRA', kategori: 'BEKAL', nominal: 300000, status: 'BELUM_DIAMBIL' }),
    sampleTx({
      id: 2,
      santriId: 2,
      jenisKelamin: 'PUTRI',
      kategori: 'BEKAL',
      nominal: 200000,
      status: 'SUDAH_DIAMBIL',
      nominalDiserahkan: 200000,
    }),
    sampleTx({
      id: 3,
      santriId: 3,
      jenisKelamin: 'PUTRA',
      kategori: 'SPP',
      nominal: 750000,
      status: 'SPP_BELUM_DIPROSES',
    }),
    sampleTx({
      id: 4,
      santriId: 4,
      jenisKelamin: 'PUTRI',
      kategori: 'LAINNYA',
      nominal: 150000,
      status: 'DIBATALKAN',
    }),
  ];

  const stats = computeDashboardStats(txs, '2026-11-12');
  assert.equal(stats.totalSeluruhTransfer, 1250000);
  assert.equal(stats.totalBelumDiambil, 300000);
  assert.equal(stats.totalSudahDiambil, 200000);
  assert.equal(stats.totalBekal, 500000);
  assert.equal(stats.totalSpp, 750000);
  assert.equal(stats.sppPutra, 750000);
  assert.equal(stats.sppPutri, 0);
  assert.equal(stats.sppBelumDiproses, 750000);
  assert.equal(stats.jumlahSantriBelumMengambil, 1);
  assert.equal(stats.jumlahOrangDitransferHariIni, 3);
  assert.equal(stats.jumlahPutraDitransferHariIni, 2);
  assert.equal(stats.jumlahPutriDitransferHariIni, 1);
  assert.equal(stats.jumlahTransaksiHariIni, 3);
});

test('hasDuplicateReference prevents duplicate active references while ignoring cancelled ones', () => {
  const txs = [
    sampleTx({ id: 1, nomorReferensi: 'BSI-998877', status: 'BELUM_DIAMBIL' }),
    sampleTx({ id: 2, nomorReferensi: 'BRI-112233', status: 'DIBATALKAN' }),
  ];
  assert.equal(hasDuplicateReference(txs, 'bsi-998877'), true);
  assert.equal(hasDuplicateReference(txs, 'BSI-998877', 1), false);
  assert.equal(hasDuplicateReference(txs, 'BRI-112233'), false);
  assert.equal(hasDuplicateReference(txs, ''), false);
});

test('gender separation and report totals are strictly isolated', () => {
  const txs = [
    sampleTx({ id: 1, jenisKelamin: 'PUTRA', nominal: 400000, tanggalTransfer: '2026-11-12' }),
    sampleTx({ id: 2, jenisKelamin: 'PUTRI', nominal: 600000, tanggalTransfer: '2026-11-12' }),
    sampleTx({ id: 3, jenisKelamin: 'PUTRA', nominal: 250000, tanggalTransfer: '2026-10-05' }),
  ];

  const putraReport = buildReportData(txs, 'SANTRI_PUTRA', 'SEMUA', '2026-11-12');
  assert.equal(putraReport.rows.length, 2);
  assert.equal(putraReport.totalNominal, 650000);
  assert.ok(putraReport.rows.every((r) => r.jenisKelamin === 'PUTRA'));

  const putriReport = buildReportData(txs, 'SANTRI_PUTRI', 'SEMUA', '2026-11-12');
  assert.equal(putriReport.rows.length, 1);
  assert.equal(putriReport.totalNominal, 600000);
  assert.ok(putriReport.rows.every((r) => r.jenisKelamin === 'PUTRI'));

  const monthlyReport = buildReportData(txs, 'SEMUA_TRANSFER', 'BULANAN', '2026-11-12');
  assert.equal(monthlyReport.rows.length, 2);
  assert.equal(monthlyReport.totalNominal, 1000000);
});

test('chart series computes daily, monthly, and yearly breakdowns accurately', () => {
  const txs = [
    sampleTx({ id: 1, jenisKelamin: 'PUTRA', nominal: 300000, tanggalTransfer: '2026-11-12' }),
    sampleTx({ id: 2, jenisKelamin: 'PUTRI', nominal: 200000, tanggalTransfer: '2026-11-12' }),
    sampleTx({ id: 3, jenisKelamin: 'PUTRA', nominal: 500000, tanggalTransfer: '2025-06-15' }),
  ];

  const daily = computeChartSeries(txs, 'hari', '2026-11-12');
  assert.equal(daily.length, 14);
  assert.equal(daily[13].total, 500000);

  const monthly = computeChartSeries(txs, 'bulan', '2026-11-12');
  assert.equal(monthly.length, 12);
  assert.equal(monthly[10].total, 500000);

  const yearly = computeChartSeries(txs, 'tahun', '2026-11-12');
  assert.equal(yearly.length, 5);
  assert.equal(yearly[3].total, 500000);
  assert.equal(yearly[4].total, 500000);
});

test('santri summary and three-tier RBAC permissions behave correctly', () => {
  const txs = [
    sampleTx({ id: 1, santriId: 55, kategori: 'BEKAL', nominal: 300000, status: 'BELUM_DIAMBIL' }),
    sampleTx({
      id: 2,
      santriId: 55,
      kategori: 'BEKAL',
      nominal: 200000,
      status: 'SUDAH_DIAMBIL',
      nominalDiserahkan: 200000,
    }),
    sampleTx({ id: 3, santriId: 55, kategori: 'SPP', nominal: 650000, status: 'SPP_SUDAH_DIPROSES' }),
  ];

  const summary = computeSantriSummary(txs, 55);
  assert.equal(summary.totalTransfer, 1150000);
  assert.equal(summary.totalBekalBelumDiambil, 300000);
  assert.equal(summary.totalBekalDiambil, 200000);
  assert.equal(summary.totalSpp, 650000);

  assert.equal(canEditOrDeleteTransaction('ADMIN'), true);
  assert.equal(canEditOrDeleteTransaction('OPERATOR'), false);
  assert.equal(canEditOrDeleteTransaction('KEPALA_PESANTREN'), false);

  assert.equal(canInputOrProcessTransaction('ADMIN'), true);
  assert.equal(canInputOrProcessTransaction('OPERATOR'), true);
  assert.equal(canInputOrProcessTransaction('KEPALA_PESANTREN'), false);

  assert.equal(canManageUsersAndAudit('ADMIN'), true);
  assert.equal(canManageUsersAndAudit('OPERATOR'), false);
  assert.equal(canManageUsersAndAudit('KEPALA_PESANTREN'), false);

  assert.equal(canAccessMenuForRole('dashboard', 'KEPALA_PESANTREN'), true);
  assert.equal(canAccessMenuForRole('laporan-keuangan', 'KEPALA_PESANTREN'), true);
  assert.equal(canAccessMenuForRole('transfer-masuk', 'KEPALA_PESANTREN'), false);
  assert.equal(canAccessMenuForRole('pengaturan', 'KEPALA_PESANTREN'), false);
  assert.equal(canAccessMenuForRole('transfer-masuk', 'OPERATOR'), true);
});

test('nominal search and named vs unnamed incoming transfers work accurately', () => {
  const txs = [
    sampleTx({ id: 1, santriId: 10, santriNama: 'Ahmad Zaki', nominal: 500000, belumAdaNama: false }),
    sampleTx({
      id: 2,
      santriId: 999,
      santriNama: 'Belum Ada Nama',
      nominal: 375000,
      belumAdaNama: true,
    }),
    sampleTx({
      id: 3,
      santriId: 999,
      santriNama: 'Belum Ada Nama',
      nominal: 225000,
      belumAdaNama: true,
    }),
  ];

  assert.equal(filterTransactions(txs, { search: '500000' }).length, 1);
  assert.equal(filterTransactions(txs, { search: '500.000' }).length, 1);
  assert.equal(filterTransactions(txs, { search: 'Rp 375.000' }).length, 1);
  assert.equal(filterTransactions(txs, { search: '375' }).length, 1);
  assert.equal(filterTransactions(txs, { identitasNama: 'SUDAH_ADA_NAMA' }).length, 1);
  assert.equal(filterTransactions(txs, { identitasNama: 'BELUM_ADA_NAMA' }).length, 2);

  const stats = computeDashboardStats(txs, '2026-11-12');
  assert.equal(stats.totalSudahAdaNama, 500000);
  assert.equal(stats.jumlahSudahAdaNama, 1);
  assert.equal(stats.totalBelumAdaNama, 600000);
  assert.equal(stats.jumlahBelumAdaNama, 2);
  assert.equal(stats.jumlahOrangDitransferHariIni, 3);
  assert.equal(stats.jumlahSantriBelumMengambil, 3);
});

test('only ADMIN role can approve incoming transfer transactions', () => {
  assert.equal(canApproveTransaction('ADMIN'), true);
  assert.equal(canApproveTransaction('OPERATOR'), false);
  assert.equal(canApproveTransaction('KEPALA_PESANTREN'), false);
});
