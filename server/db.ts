import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import {
  getInitialStatusForCategory,
  getTodayIsoDate,
  type AuditLog,
  type CustomCategory,
  type Gender,
  type PaymentMethod,
  type PesantrenSettings,
  type Santri,
  type TransferCategory,
  type TransferStatus,
  type TransferTransaction,
  type UserAccount,
  type UserRole,
} from '../src/lib/domain';

const DATA_DIR = path.resolve(process.cwd(), 'data');
export const DB_PATH = path.join(DATA_DIR, 'pesantren.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      nama_lengkap TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('ADMIN', 'OPERATOR', 'KEPALA_PESANTREN')),
      aktif INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS santri (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nis TEXT NOT NULL UNIQUE,
      nama_lengkap TEXT NOT NULL,
      jenis_kelamin TEXT NOT NULL CHECK (jenis_kelamin IN ('PUTRA', 'PUTRI')),
      kelas TEXT NOT NULL,
      kamar TEXT NOT NULL,
      nama_wali TEXT NOT NULL,
      no_hp_wali TEXT NOT NULL,
      aktif INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS custom_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL UNIQUE,
      deskripsi TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kode_transaksi TEXT NOT NULL UNIQUE,
      tanggal_transfer TEXT NOT NULL,
      santri_id INTEGER NOT NULL,
      santri_nis TEXT NOT NULL,
      santri_nama TEXT NOT NULL,
      jenis_kelamin TEXT NOT NULL CHECK (jenis_kelamin IN ('PUTRA', 'PUTRI')),
      kelas TEXT NOT NULL,
      kamar TEXT NOT NULL,
      nama_pengirim TEXT NOT NULL,
      nominal INTEGER NOT NULL,
      kategori TEXT NOT NULL CHECK (kategori IN ('BEKAL', 'SPP', 'LAINNYA')),
      sub_kategori TEXT NOT NULL DEFAULT '',
      metode_transfer TEXT NOT NULL,
      nomor_referensi TEXT NOT NULL DEFAULT '',
      catatan TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL CHECK (status IN ('BELUM_DIAMBIL', 'SUDAH_DIAMBIL', 'SPP_BELUM_DIPROSES', 'SPP_SUDAH_DIPROSES', 'DIBATALKAN')),
      belum_ada_nama INTEGER NOT NULL DEFAULT 0,
      input_oleh_id INTEGER NOT NULL,
      input_oleh_nama TEXT NOT NULL,
      disetujui_oleh_id INTEGER,
      disetujui_oleh_nama TEXT,
      tanggal_disetujui TEXT,
      jam_disetujui TEXT,
      tanggal_pengambilan TEXT,
      jam_pengambilan TEXT,
      petugas_serah_id INTEGER,
      petugas_serah_nama TEXT,
      nominal_diserahkan INTEGER,
      keterangan_serah TEXT,
      catatan_audit TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (santri_id) REFERENCES santri(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER,
      kode_transaksi TEXT,
      user_id INTEGER NOT NULL,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      reason TEXT NOT NULL DEFAULT '',
      details TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const txCols = db.prepare('PRAGMA table_info(transactions)').all() as Array<{ name: string }>;
  if (!txCols.some((c) => c.name === 'belum_ada_nama')) {
    db.exec('ALTER TABLE transactions ADD COLUMN belum_ada_nama INTEGER NOT NULL DEFAULT 0');
  }
  const addedApprovalCol = !txCols.some((c) => c.name === 'disetujui_oleh_id');
  if (addedApprovalCol) {
    db.exec('ALTER TABLE transactions ADD COLUMN disetujui_oleh_id INTEGER');
  }
  if (!txCols.some((c) => c.name === 'disetujui_oleh_nama')) {
    db.exec('ALTER TABLE transactions ADD COLUMN disetujui_oleh_nama TEXT');
  }
  if (!txCols.some((c) => c.name === 'tanggal_disetujui')) {
    db.exec('ALTER TABLE transactions ADD COLUMN tanggal_disetujui TEXT');
  }
  if (!txCols.some((c) => c.name === 'jam_disetujui')) {
    db.exec('ALTER TABLE transactions ADD COLUMN jam_disetujui TEXT');
  }
  if (addedApprovalCol) {
    const adminRow = db.prepare("SELECT id, nama_lengkap FROM users WHERE role = 'ADMIN' LIMIT 1").get() as
      | { id: number; nama_lengkap: string }
      | undefined;
    if (adminRow) {
      db.prepare(
        `UPDATE transactions
         SET disetujui_oleh_id = ?, disetujui_oleh_nama = ?,
             tanggal_disetujui = COALESCE(tanggal_pengambilan, tanggal_transfer),
             jam_disetujui = COALESCE(jam_pengambilan, '10:00')
         WHERE status IN ('SUDAH_DIAMBIL', 'SPP_SUDAH_DIPROSES')
           AND disetujui_oleh_id IS NULL`
      ).run(adminRow.id, adminRow.nama_lengkap);
    }
  }

  seedInitialData();
}

export function getOrCreateAnonSantriId(): number {
  const existing = db.prepare("SELECT id FROM santri WHERE nis = 'TEMP-ANON'").get() as { id: number } | undefined;
  if (existing) return existing.id;
  const nowIso = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO santri (nis, nama_lengkap, jenis_kelamin, kelas, kamar, nama_wali, no_hp_wali, aktif, created_at)
       VALUES ('TEMP-ANON', 'Belum Ada Nama', 'PUTRA', '-', '-', '-', '', 0, ?)`
    )
    .run(nowIso);
  return Number(info.lastInsertRowid);
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return getTodayIsoDate(d);
}

function monthsAgoIso(months: number, day = 10): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setDate(Math.min(day, 28));
  return getTodayIsoDate(d);
}

export const SEED_SANTRI_NIS = [
  '2026001',
  '2026002',
  '2026003',
  '2026004',
  '2026005',
  '2026006',
  '2026007',
  '2026008',
  '2026009',
  '2026010',
  '2026011',
  '2026012',
] as const;

export const SEED_TX_REFS = [
  'BSI-20261112-001',
  'BRI-20261112-002',
  'BCA-20261112-003',
  'MDR-20261112-004',
  'BSI-20261112-005',
  'BSI-20261111-006',
  'BRI-20261110-007',
  'BCA-20261109-008',
  'MDR-20261108-009',
  'BSI-20261107-010',
  'BRI-20261106-011',
  'BSI-20261104-012',
  'BSI-PREV1-013',
  'BCA-PREV1-014',
  'BRI-PREV2-015',
  'MDR-PREV2-016',
  'BSI-PREV3-017',
] as const;

function seedInitialData(): void {
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  const nowIso = new Date().toISOString();

  if (userCount === 0) {
    const insertUser = db.prepare(
      'INSERT INTO users (username, password_hash, nama_lengkap, role, aktif, created_at) VALUES (?, ?, ?, ?, 1, ?)'
    );
    insertUser.run('admin', bcrypt.hashSync('admin123', 10), 'Ust. H. Ahmad Fauzi, S.Pd', 'ADMIN', nowIso);
    insertUser.run('operator', bcrypt.hashSync('operator123', 10), 'Muhammad Rizky, S.E', 'OPERATOR', nowIso);
    insertUser.run('kepala', bcrypt.hashSync('kepala123', 10), 'KH. Abdullah Manshur', 'KEPALA_PESANTREN', nowIso);
  }

  const settingsCount = (db.prepare('SELECT COUNT(*) as c FROM settings').get() as { c: number }).c;
  if (settingsCount === 0) {
    const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    insertSetting.run('namaPesantren', 'Pondok Pesantren Darul Hikmah Al-Islamy');
    insertSetting.run('alamatPesantren', 'Jl. KH. Hasyim Asy’ari No. 45, Jawa Timur');
    insertSetting.run('namaBendahara', 'Ust. H. Ahmad Fauzi, S.Pd');
    insertSetting.run('kota', 'Malang');
  }

  const catCount = (db.prepare('SELECT COUNT(*) as c FROM custom_categories').get() as { c: number }).c;
  if (catCount === 0) {
    const insertCat = db.prepare('INSERT INTO custom_categories (nama, deskripsi, created_at) VALUES (?, ?, ?)');
    insertCat.run('Kebutuhan Pribadi', 'Perlengkapan mandi, pakaian, dan kebutuhan harian santri', nowIso);
    insertCat.run('Kesehatan', 'Biaya klinik pesantren, obat-obatan, atau pemeriksaan dokter', nowIso);
    insertCat.run('Keperluan Sekolah', 'Pembelian kitab, buku tulis, seragam, atau alat tulis', nowIso);
    insertCat.run('Kegiatan Ekstrakurikuler', 'Iuran pramuka, hadrah, atau lomba santri', nowIso);
  }

  const skipSeedRow = db.prepare("SELECT value FROM settings WHERE key = 'skipSampleSeed'").get() as
    | { value: string }
    | undefined;
  if (skipSeedRow?.value === 'true') {
    return;
  }

  const santriCount = (db.prepare('SELECT COUNT(*) as c FROM santri').get() as { c: number }).c;
  if (santriCount === 0) {
    const insertSantri = db.prepare(
      `INSERT INTO santri (nis, nama_lengkap, jenis_kelamin, kelas, kamar, nama_wali, no_hp_wali, aktif, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`
    );

    const seedStudents: Array<[string, string, Gender, string, string, string, string]> = [
      ['2026001', 'Ahmad Zaki Mubarak', 'PUTRA', 'VII A', 'Al-Fatih 01', 'H. Sulaiman Hakim', '081234567801'],
      ['2026002', 'Muhammad Farhan Al-Faruq', 'PUTRA', 'VIII B', 'Al-Fatih 03', 'Bpk. Hendra Wijaya', '081234567802'],
      ['2026003', 'Rizki Pratama Hidayat', 'PUTRA', 'IX A', 'Al-Kautsar 02', 'Bpk. Agus Hidayat', '081234567803'],
      ['2026004', 'Abdullah Azzam Ramadhan', 'PUTRA', 'X IPA 1', 'Al-Kautsar 05', 'Ust. Mansur Efendi', '081234567804'],
      ['2026005', 'Fauzan Maulana Siddiq', 'PUTRA', 'XI IPS 2', 'Abu Bakar 01', 'Bpk. Dedi Kurniawan', '081234567805'],
      ['2026006', 'Naufal Fadhil Rahman', 'PUTRA', 'XII IPA 1', 'Umar 02', 'H. Wahyu Rahman', '081234567806'],
      ['2026007', 'Siti Aisyah Nurhaliza', 'PUTRI', 'VII B', 'Khadijah 01', 'Ibu Hj. Aminah Zahra', '081345678901'],
      ['2026008', 'Fatimah Az-Zahra Putri', 'PUTRI', 'VIII A', 'Khadijah 04', 'Bpk. Bambang Sutrisno', '081345678902'],
      ['2026009', 'Nayla Rahmawati', 'PUTRI', 'IX B', 'Aisyah 02', 'Ibu Ratna Dewi', '081345678903'],
      ['2026010', 'Hana Khairunnisa', 'PUTRI', 'X IPA 2', 'Aisyah 05', 'H. Ridwan Kamiluddin', '081345678904'],
      ['2026011', 'Salma Salsabila', 'PUTRI', 'XI IPA 1', 'Hafshah 01', 'Bpk. Arif Budiman', '081345678905'],
      ['2026012', 'Zahira Maulida', 'PUTRI', 'XII IPS 1', 'Fatimah 03', 'Ibu Siti Mariyam', '081345678906'],
    ];

    for (const s of seedStudents) {
      insertSantri.run(...s, nowIso);
    }
  }

  const txCount = (db.prepare('SELECT COUNT(*) as c FROM transactions').get() as { c: number }).c;
  if (txCount === 0) {
    const students = db.prepare('SELECT * FROM santri ORDER BY id ASC').all() as Array<{
      id: number;
      nis: string;
      nama_lengkap: string;
      jenis_kelamin: Gender;
      kelas: string;
      kamar: string;
      nama_wali: string;
    }>;

    const adminUser = db.prepare("SELECT id, nama_lengkap FROM users WHERE role = 'ADMIN' LIMIT 1").get() as {
      id: number;
      nama_lengkap: string;
    };
    const opUser = db.prepare("SELECT id, nama_lengkap FROM users WHERE role = 'OPERATOR' LIMIT 1").get() as {
      id: number;
      nama_lengkap: string;
    };

    const insertTx = db.prepare(`
      INSERT INTO transactions (
        kode_transaksi, tanggal_transfer, santri_id, santri_nis, santri_nama,
        jenis_kelamin, kelas, kamar, nama_pengirim, nominal, kategori, sub_kategori,
        metode_transfer, nomor_referensi, catatan, status, input_oleh_id, input_oleh_nama,
        disetujui_oleh_id, disetujui_oleh_nama, tanggal_disetujui, jam_disetujui,
        tanggal_pengambilan, jam_pengambilan, petugas_serah_id, petugas_serah_nama,
        nominal_diserahkan, keterangan_serah, catatan_audit, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const today = getTodayIsoDate();
    const currentYear = Number.parseInt(today.slice(0, 4), 10);

    interface SeedTxSpec {
      idx: number;
      tanggal: string;
      nominal: number;
      kategori: TransferCategory;
      subKategori: string;
      metode: PaymentMethod;
      ref: string;
      catatan: string;
      status: TransferStatus;
      serahTanggal?: string;
      serahJam?: string;
      keteranganSerah?: string;
    }

    const specs: SeedTxSpec[] = [
      {
        idx: 0,
        tanggal: today,
        nominal: 450000,
        kategori: 'BEKAL',
        subKategori: 'Uang Bekal',
        metode: 'BSI',
        ref: 'BSI-20261112-001',
        catatan: 'Bekal mingguan bulan ini',
        status: 'BELUM_DIAMBIL',
      },
      {
        idx: 6,
        tanggal: today,
        nominal: 500000,
        kategori: 'BEKAL',
        subKategori: 'Uang Bekal',
        metode: 'BRI',
        ref: 'BRI-20261112-002',
        catatan: 'Transfer bekal + jajan',
        status: 'BELUM_DIAMBIL',
      },
      {
        idx: 1,
        tanggal: today,
        nominal: 750000,
        kategori: 'SPP',
        subKategori: 'Uang SPP',
        metode: 'BCA',
        ref: 'BCA-20261112-003',
        catatan: 'SPP Bulan Berjalan',
        status: 'SPP_BELUM_DIPROSES',
      },
      {
        idx: 7,
        tanggal: today,
        nominal: 300000,
        kategori: 'BEKAL',
        subKategori: 'Uang Bekal',
        metode: 'Mandiri',
        ref: 'MDR-20261112-004',
        catatan: 'Sudah konfirmasi ke wali kamar',
        status: 'SUDAH_DIAMBIL',
        serahTanggal: today,
        serahJam: '10:15',
        keteranganSerah: 'Diserahkan tunai langsung kepada santri',
      },
      {
        idx: 2,
        tanggal: today,
        nominal: 200000,
        kategori: 'LAINNYA',
        subKategori: 'Keperluan Sekolah',
        metode: 'BSI',
        ref: 'BSI-20261112-005',
        catatan: 'Untuk pembelian kitab fiqih',
        status: 'BELUM_DIAMBIL',
      },
      {
        idx: 8,
        tanggal: daysAgoIso(1),
        nominal: 750000,
        kategori: 'SPP',
        subKategori: 'Uang SPP',
        metode: 'BSI',
        ref: 'BSI-20261111-006',
        catatan: 'Pembayaran syahriah bulanan',
        status: 'SPP_SUDAH_DIPROSES',
        serahTanggal: daysAgoIso(1),
        serahJam: '14:20',
        keteranganSerah: 'Dicatat lunas pada buku SPP bendahara',
      },
      {
        idx: 3,
        tanggal: daysAgoIso(2),
        nominal: 600000,
        kategori: 'BEKAL',
        subKategori: 'Uang Bekal',
        metode: 'BRI',
        ref: 'BRI-20261110-007',
        catatan: 'Bekal 2 minggu',
        status: 'SUDAH_DIAMBIL',
        serahTanggal: daysAgoIso(1),
        serahJam: '09:30',
        keteranganSerah: 'Diambil saat jam istirahat',
      },
      {
        idx: 9,
        tanggal: daysAgoIso(3),
        nominal: 250000,
        kategori: 'LAINNYA',
        subKategori: 'Kesehatan',
        metode: 'BCA',
        ref: 'BCA-20261109-008',
        catatan: 'Biaya tebus resep vitamin & obat',
        status: 'BELUM_DIAMBIL',
      },
      {
        idx: 4,
        tanggal: daysAgoIso(4),
        nominal: 800000,
        kategori: 'SPP',
        subKategori: 'Uang SPP',
        metode: 'Mandiri',
        ref: 'MDR-20261108-009',
        catatan: 'SPP kelas XI',
        status: 'SPP_SUDAH_DIPROSES',
        serahTanggal: daysAgoIso(3),
        serahJam: '11:05',
        keteranganSerah: 'Diverifikasi bendahara pesantren',
      },
      {
        idx: 10,
        tanggal: daysAgoIso(5),
        nominal: 400000,
        kategori: 'BEKAL',
        subKategori: 'Uang Bekal',
        metode: 'BSI',
        ref: 'BSI-20261107-010',
        catatan: 'Uang saku bulanan',
        status: 'BELUM_DIAMBIL',
      },
      {
        idx: 5,
        tanggal: daysAgoIso(6),
        nominal: 350000,
        kategori: 'BEKAL',
        subKategori: 'Uang Bekal',
        metode: 'BRI',
        ref: 'BRI-20261106-011',
        catatan: 'Bekal tambahan ujian',
        status: 'SUDAH_DIAMBIL',
        serahTanggal: daysAgoIso(5),
        serahJam: '15:40',
        keteranganSerah: 'Diserahkan tunai dengan tanda terima',
      },
      {
        idx: 11,
        tanggal: daysAgoIso(8),
        nominal: 750000,
        kategori: 'SPP',
        subKategori: 'Uang SPP',
        metode: 'BSI',
        ref: 'BSI-20261104-012',
        catatan: 'SPP Bulan Berjalan',
        status: 'SPP_BELUM_DIPROSES',
      },
      {
        idx: 0,
        tanggal: monthsAgoIso(1, 12),
        nominal: 750000,
        kategori: 'SPP',
        subKategori: 'Uang SPP',
        metode: 'BSI',
        ref: 'BSI-PREV1-013',
        catatan: 'SPP bulan lalu',
        status: 'SPP_SUDAH_DIPROSES',
        serahTanggal: monthsAgoIso(1, 13),
        serahJam: '10:00',
        keteranganSerah: 'Lunas',
      },
      {
        idx: 7,
        tanggal: monthsAgoIso(1, 15),
        nominal: 500000,
        kategori: 'BEKAL',
        subKategori: 'Uang Bekal',
        metode: 'BCA',
        ref: 'BCA-PREV1-014',
        catatan: 'Bekal bulanan',
        status: 'SUDAH_DIAMBIL',
        serahTanggal: monthsAgoIso(1, 16),
        serahJam: '13:10',
        keteranganSerah: 'Sudah diterima santri',
      },
      {
        idx: 2,
        tanggal: monthsAgoIso(2, 10),
        nominal: 450000,
        kategori: 'BEKAL',
        subKategori: 'Uang Bekal',
        metode: 'BRI',
        ref: 'BRI-PREV2-015',
        catatan: 'Bekal bulanan',
        status: 'SUDAH_DIAMBIL',
        serahTanggal: monthsAgoIso(2, 11),
        serahJam: '09:15',
        keteranganSerah: 'Sudah diterima santri',
      },
      {
        idx: 8,
        tanggal: monthsAgoIso(2, 18),
        nominal: 850000,
        kategori: 'SPP',
        subKategori: 'Uang SPP',
        metode: 'Mandiri',
        ref: 'MDR-PREV2-016',
        catatan: 'SPP + Asrama',
        status: 'SPP_SUDAH_DIPROSES',
        serahTanggal: monthsAgoIso(2, 19),
        serahJam: '11:30',
        keteranganSerah: 'Diproses ke kas pesantren',
      },
      {
        idx: 4,
        tanggal: monthsAgoIso(3, 9),
        nominal: 650000,
        kategori: 'BEKAL',
        subKategori: 'Uang Bekal',
        metode: 'BSI',
        ref: 'BSI-PREV3-017',
        catatan: 'Bekal awal semester',
        status: 'SUDAH_DIAMBIL',
        serahTanggal: monthsAgoIso(3, 10),
        serahJam: '16:00',
        keteranganSerah: 'Diterima oleh santri',
      },
      {
        idx: 1,
        tanggal: `${currentYear - 1}-09-14`,
        nominal: 1200000,
        kategori: 'SPP',
        subKategori: 'Uang SPP',
        metode: 'BSI',
        ref: `BSI-${currentYear - 1}-018`,
        catatan: 'Pelunasan SPP tahun lalu',
        status: 'SPP_SUDAH_DIPROSES',
        serahTanggal: `${currentYear - 1}-09-15`,
        serahJam: '09:00',
        keteranganSerah: 'Arsip tahun sebelumnya',
      },
      {
        idx: 9,
        tanggal: `${currentYear - 2}-08-20`,
        nominal: 900000,
        kategori: 'BEKAL',
        subKategori: 'Uang Bekal',
        metode: 'BRI',
        ref: `BRI-${currentYear - 2}-019`,
        catatan: 'Arsip tahun ajaran terdahulu',
        status: 'SUDAH_DIAMBIL',
        serahTanggal: `${currentYear - 2}-08-21`,
        serahJam: '10:30',
        keteranganSerah: 'Arsip selesai',
      },
    ];

    specs.forEach((spec, index) => {
      const s = students[spec.idx % students.length];
      const kode = `TRF-${spec.tanggal.replace(/-/g, '')}-${String(index + 1).padStart(3, '0')}`;
      const isProcessed = spec.status === 'SUDAH_DIAMBIL' || spec.status === 'SPP_SUDAH_DIPROSES';
      insertTx.run(
        kode,
        spec.tanggal,
        s.id,
        s.nis,
        s.nama_lengkap,
        s.jenis_kelamin,
        s.kelas,
        s.kamar,
        s.nama_wali,
        spec.nominal,
        spec.kategori,
        spec.subKategori,
        spec.metode,
        spec.ref,
        spec.catatan,
        spec.status,
        opUser.id,
        opUser.nama_lengkap,
        isProcessed ? adminUser.id : null,
        isProcessed ? adminUser.nama_lengkap : null,
        isProcessed ? spec.serahTanggal ?? spec.tanggal : null,
        isProcessed ? spec.serahJam ?? '10:00' : null,
        isProcessed ? spec.serahTanggal ?? spec.tanggal : null,
        isProcessed ? spec.serahJam ?? '10:00' : null,
        isProcessed ? adminUser.id : null,
        isProcessed ? adminUser.nama_lengkap : null,
        isProcessed ? spec.nominal : null,
        isProcessed ? spec.keteranganSerah ?? 'Diproses' : null,
        null,
        nowIso,
        nowIso
      );
    });

    db.prepare(
      'INSERT INTO audit_logs (transaction_id, kode_transaksi, user_id, user_name, action, reason, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      null,
      null,
      adminUser.id,
      adminUser.nama_lengkap,
      'INISIALISASI_DATABASE',
      'Setup awal data pesantren',
      'Database Tata Usaha berhasil diinisialisasi dengan data awal santri dan transaksi.',
      nowIso
    );
  }

  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('skipSampleSeed', 'true')").run();
}

export function mapUserRow(row: any): UserAccount {
  return {
    id: row.id,
    username: row.username,
    namaLengkap: row.nama_lengkap,
    role: row.role as UserRole,
    aktif: Boolean(row.aktif),
    createdAt: row.created_at,
  };
}

export function mapSantriRow(row: any): Santri {
  return {
    id: row.id,
    nis: row.nis,
    namaLengkap: row.nama_lengkap,
    jenisKelamin: row.jenis_kelamin as Gender,
    kelas: row.kelas,
    kamar: row.kamar,
    namaWali: row.nama_wali,
    noHpWali: row.no_hp_wali,
    aktif: Boolean(row.aktif),
    createdAt: row.created_at,
  };
}

export function mapTransactionRow(row: any): TransferTransaction {
  return {
    id: row.id,
    kodeTransaksi: row.kode_transaksi,
    tanggalTransfer: row.tanggal_transfer,
    santriId: row.santri_id,
    santriNis: row.santri_nis,
    santriNama: row.santri_nama,
    jenisKelamin: row.jenis_kelamin as Gender,
    kelas: row.kelas,
    kamar: row.kamar,
    namaPengirim: row.nama_pengirim,
    nominal: row.nominal,
    kategori: row.kategori as TransferCategory,
    subKategori: row.sub_kategori,
    metodeTransfer: row.metode_transfer as PaymentMethod,
    nomorReferensi: row.nomor_referensi,
    catatan: row.catatan,
    status: row.status as TransferStatus,
    belumAdaNama: Boolean(row.belum_ada_nama),
    inputOlehId: row.input_oleh_id,
    inputOlehNama: row.input_oleh_nama,
    disetujuiOlehId: row.disetujui_oleh_id ?? null,
    disetujuiOlehNama: row.disetujui_oleh_nama ?? null,
    tanggalDisetujui: row.tanggal_disetujui ?? null,
    jamDisetujui: row.jam_disetujui ?? null,
    tanggalPengambilan: row.tanggal_pengambilan,
    jamPengambilan: row.jam_pengambilan,
    petugasSerahId: row.petugas_serah_id,
    petugasSerahNama: row.petugas_serah_nama,
    nominalDiserahkan: row.nominal_diserahkan,
    keteranganSerah: row.keterangan_serah,
    catatanAudit: row.catatan_audit,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCategoryRow(row: any): CustomCategory {
  return {
    id: row.id,
    nama: row.nama,
    deskripsi: row.deskripsi,
  };
}

export function mapAuditRow(row: any): AuditLog {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    kodeTransaksi: row.kode_transaksi,
    userId: row.user_id,
    userName: row.user_name,
    action: row.action,
    reason: row.reason,
    details: row.details,
    createdAt: row.created_at,
  };
}

export function getSettingsObject(): PesantrenSettings {
  const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    namaPesantren: map.get('namaPesantren') ?? 'Pondok Pesantren Darul Hikmah Al-Islamy',
    alamatPesantren: map.get('alamatPesantren') ?? 'Jl. KH. Hasyim Asy’ari No. 45',
    namaBendahara: map.get('namaBendahara') ?? 'Bendahara Tata Usaha',
    kota: map.get('kota') ?? 'Malang',
  };
}

export function nextTransactionCode(tanggalTransfer: string): string {
  const compact = tanggalTransfer.replace(/-/g, '');
  const prefix = `TRF-${compact}-`;
  const existing = db
    .prepare('SELECT kode_transaksi FROM transactions WHERE kode_transaksi LIKE ? ORDER BY id DESC LIMIT 1')
    .get(`${prefix}%`) as { kode_transaksi: string } | undefined;
  let seq = 1;
  if (existing) {
    const tail = existing.kode_transaksi.split('-').pop() ?? '0';
    const parsed = Number.parseInt(tail, 10);
    if (Number.isFinite(parsed)) seq = parsed + 1;
  }
  return `${prefix}${String(seq).padStart(3, '0')}`;
}
