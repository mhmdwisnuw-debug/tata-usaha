import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import {
  DB_PATH,
  SEED_SANTRI_NIS,
  SEED_TX_REFS,
  db,
  getOrCreateAnonSantriId,
  getSettingsObject,
  initDatabase,
  mapAuditRow,
  mapCategoryRow,
  mapSantriRow,
  mapTransactionRow,
  mapUserRow,
  nextTransactionCode,
} from './server/db';
import {
  getCurrentTimeHHMM,
  getInitialStatusForCategory,
  getTodayIsoDate,
  type TransferCategory,
  type UserAccount,
  type UserRole,
} from './src/lib/domain';

initDatabase();

const app = express();
app.use(express.json({ limit: '10mb' }));

interface AuthedRequest extends Request {
  user?: UserAccount;
  token?: string;
}

function getBearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  const queryToken = req.query.token;
  if (typeof queryToken === 'string' && queryToken.trim()) {
    return queryToken.trim();
  }
  return null;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Sesi login tidak ditemukan. Silakan masuk terlebih dahulu.' });
    return;
  }

  const session = db
    .prepare(
      `SELECT s.token, s.expires_at, u.*
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`
    )
    .get(token) as any;

  if (!session || new Date(session.expires_at).getTime() < Date.now() || !session.aktif) {
    if (session) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    }
    res.status(401).json({ error: 'Sesi telah berakhir atau akun dinonaktifkan. Silakan login kembali.' });
    return;
  }

  req.user = mapUserRow(session);
  req.token = token;
  next();
}

function requireRole(allowed: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !allowed.includes(req.user.role)) {
      res.status(403).json({ error: 'Anda tidak memiliki hak akses untuk tindakan ini.' });
      return;
    }
    next();
  };
}

function logAudit(
  transactionId: number | null,
  kodeTransaksi: string | null,
  user: UserAccount,
  action: string,
  reason: string,
  details: string
): void {
  db.prepare(
    `INSERT INTO audit_logs (transaction_id, kode_transaksi, user_id, user_name, action, reason, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(transactionId, kodeTransaksi, user.id, user.namaLengkap, action, reason, details, new Date().toISOString());
}

// Auth Endpoints
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
    res.status(400).json({ error: 'Username dan kata sandi wajib diisi.' });
    return;
  }

  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim()) as any;
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    res.status(401).json({ error: 'Username atau kata sandi salah.' });
    return;
  }
  if (!row.aktif) {
    res.status(403).json({ error: 'Akun ini telah dinonaktifkan oleh Admin Tata Usaha.' });
    return;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  db.prepare('INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
    token,
    row.id,
    expires.toISOString(),
    now.toISOString()
  );

  const user = mapUserRow(row);
  logAudit(null, null, user, 'LOGIN_SISTEM', 'Autentikasi berhasil', `Masuk sebagai ${user.role}`);
  res.json({ token, user });
});

app.post('/api/auth/logout', requireAuth, (req: AuthedRequest, res: Response) => {
  if (req.token) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(req.token);
  }
  if (req.user) {
    logAudit(null, null, req.user, 'LOGOUT_SISTEM', 'Keluar dari sistem', `Sesi ${req.user.username} diakhiri`);
  }
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res: Response) => {
  res.json({ user: req.user });
});

app.post('/api/auth/change-password', requireAuth, (req: AuthedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || typeof newPassword !== 'string' || newPassword.length < 4) {
    res.status(400).json({ error: 'Masukkan kata sandi lama dan kata sandi baru (minimal 4 karakter).' });
    return;
  }
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as any;
  if (!row || !bcrypt.compareSync(currentPassword, row.password_hash)) {
    res.status(401).json({ error: 'Kata sandi saat ini tidak sesuai.' });
    return;
  }
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 10), req.user!.id);
  logAudit(null, null, req.user!, 'UBAH_PASSWORD', 'Pembaruan kata sandi mandiri', `Pengguna ${req.user!.username} mengganti kata sandi`);
  res.json({ ok: true });
});

// Bootstrap all operational data
app.get('/api/bootstrap', requireAuth, (req: AuthedRequest, res: Response) => {
  const santriRows = db.prepare("SELECT * FROM santri WHERE nis != 'TEMP-ANON' ORDER BY nama_lengkap ASC").all();
  const txRows = db.prepare('SELECT * FROM transactions ORDER BY tanggal_transfer DESC, id DESC').all();
  const catRows = db.prepare('SELECT * FROM custom_categories ORDER BY id ASC').all();
  const settings = getSettingsObject();

  const isAdmin = req.user?.role === 'ADMIN';
  const users = isAdmin
    ? db.prepare('SELECT * FROM users ORDER BY id ASC').all().map(mapUserRow)
    : [];
  const auditLogs = isAdmin
    ? db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 200').all().map(mapAuditRow)
    : [];

  res.json({
    user: req.user,
    santri: santriRows.map(mapSantriRow),
    transactions: txRows.map(mapTransactionRow),
    customCategories: catRows.map(mapCategoryRow),
    settings,
    users,
    auditLogs,
  });
});

// Santri CRUD
app.post(
  '/api/santri',
  requireAuth,
  requireRole(['ADMIN', 'OPERATOR']),
  (req: AuthedRequest, res: Response) => {
    const { nis, namaLengkap, jenisKelamin, kelas, kamar, namaWali, noHpWali } = req.body ?? {};
    if (!nis?.trim() || !namaLengkap?.trim() || !['PUTRA', 'PUTRI'].includes(jenisKelamin) || !kelas?.trim() || !kamar?.trim() || !namaWali?.trim()) {
      res.status(400).json({ error: 'Lengkapi NIS, nama santri, jenis kelamin, kelas, kamar, dan nama wali.' });
      return;
    }

    const dup = db.prepare('SELECT id FROM santri WHERE nis = ?').get(nis.trim());
    if (dup) {
      res.status(409).json({ error: `Nomor Induk Santri (NIS) "${nis.trim()}" sudah terdaftar.` });
      return;
    }

    const nowIso = new Date().toISOString();
    const info = db
      .prepare(
        `INSERT INTO santri (nis, nama_lengkap, jenis_kelamin, kelas, kamar, nama_wali, no_hp_wali, aktif, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`
      )
      .run(
        nis.trim(),
        namaLengkap.trim(),
        jenisKelamin,
        kelas.trim(),
        kamar.trim(),
        namaWali.trim(),
        (noHpWali ?? '').trim(),
        nowIso
      );

    const created = mapSantriRow(db.prepare('SELECT * FROM santri WHERE id = ?').get(info.lastInsertRowid));
    logAudit(null, null, req.user!, 'TAMBAH_SANTRI', 'Pendaftaran santri baru', `${created.namaLengkap} (${created.nis})`);
    res.status(201).json({ santri: created });
  }
);

app.put(
  '/api/santri/:id',
  requireAuth,
  requireRole(['ADMIN', 'OPERATOR']),
  (req: AuthedRequest, res: Response) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM santri WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Data santri tidak ditemukan.' });
      return;
    }

    const { nis, namaLengkap, jenisKelamin, kelas, kamar, namaWali, noHpWali, aktif } = req.body ?? {};
    if (!nis?.trim() || !namaLengkap?.trim() || !['PUTRA', 'PUTRI'].includes(jenisKelamin) || !kelas?.trim() || !kamar?.trim() || !namaWali?.trim()) {
      res.status(400).json({ error: 'Data santri tidak lengkap.' });
      return;
    }

    const dup = db.prepare('SELECT id FROM santri WHERE nis = ? AND id != ?').get(nis.trim(), id);
    if (dup) {
      res.status(409).json({ error: `NIS "${nis.trim()}" sudah digunakan santri lain.` });
      return;
    }

    db.prepare(
      `UPDATE santri
       SET nis = ?, nama_lengkap = ?, jenis_kelamin = ?, kelas = ?, kamar = ?, nama_wali = ?, no_hp_wali = ?, aktif = ?
       WHERE id = ?`
    ).run(
      nis.trim(),
      namaLengkap.trim(),
      jenisKelamin,
      kelas.trim(),
      kamar.trim(),
      namaWali.trim(),
      (noHpWali ?? '').trim(),
      aktif === false ? 0 : 1,
      id
    );

    const updated = mapSantriRow(db.prepare('SELECT * FROM santri WHERE id = ?').get(id));
    logAudit(null, null, req.user!, 'UBAH_SANTRI', 'Pembaruan profil santri', `${updated.namaLengkap} (${updated.nis})`);
    res.json({ santri: updated });
  }
);

app.delete(
  '/api/santri/:id',
  requireAuth,
  requireRole(['ADMIN']),
  (req: AuthedRequest, res: Response) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM santri WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Data santri tidak ditemukan.' });
      return;
    }

    const txRef = db.prepare('SELECT COUNT(*) as c FROM transactions WHERE santri_id = ?').get(id) as { c: number };
    if (txRef.c > 0) {
      res.status(400).json({
        error: 'Santri memiliki riwayat transaksi keuangan sehingga tidak dapat dihapus permanen. Nonaktifkan status santri jika sudah lulus.',
      });
      return;
    }

    db.prepare('DELETE FROM santri WHERE id = ?').run(id);
    logAudit(null, null, req.user!, 'HAPUS_SANTRI', 'Hapus data santri tanpa transaksi', `${existing.nama_lengkap} (${existing.nis})`);
    res.json({ ok: true });
  }
);

function resolveOrCreateManualSantri(params: {
  santriNama: string;
  santriNis?: string;
  jenisKelamin: 'PUTRA' | 'PUTRI';
  kelas: string;
  kamar: string;
  namaPengirim: string;
  tanggalTransfer: string;
}): any {
  const cleanNama = params.santriNama.trim();
  const cleanNis = (params.santriNis ?? '').trim();
  const cleanKelas = params.kelas.trim();
  const cleanKamar = params.kamar.trim();

  let santri: any = null;
  if (cleanNis && cleanNis !== 'TEMP-ANON' && cleanNis !== '-') {
    santri = db.prepare("SELECT * FROM santri WHERE LOWER(TRIM(nis)) = LOWER(?) AND nis != 'TEMP-ANON'").get(cleanNis);
  }
  if (!santri) {
    santri = db
      .prepare("SELECT * FROM santri WHERE LOWER(TRIM(nama_lengkap)) = LOWER(?) AND jenis_kelamin = ? AND nis != 'TEMP-ANON'")
      .get(cleanNama, params.jenisKelamin);
  }

  if (!santri) {
    const autoNis =
      cleanNis && cleanNis !== '-'
        ? cleanNis
        : `M-${params.tanggalTransfer.replace(/-/g, '').slice(2)}-${String(
            ((db.prepare('SELECT COALESCE(MAX(id), 0) as m FROM santri').get() as { m: number }).m ?? 0) + 1
          ).padStart(3, '0')}`;
    const nowSantriIso = new Date().toISOString();
    const ins = db
      .prepare(
        `INSERT INTO santri (nis, nama_lengkap, jenis_kelamin, kelas, kamar, nama_wali, no_hp_wali, aktif, created_at)
         VALUES (?, ?, ?, ?, ?, ?, '', 1, ?)`
      )
      .run(autoNis, cleanNama, params.jenisKelamin, cleanKelas, cleanKamar, params.namaPengirim.trim() || '-', nowSantriIso);
    santri = db.prepare('SELECT * FROM santri WHERE id = ?').get(ins.lastInsertRowid);
  }

  return santri;
}

// Transactions CRUD & Workflow
app.post(
  '/api/transactions',
  requireAuth,
  requireRole(['ADMIN', 'OPERATOR']),
  (req: AuthedRequest, res: Response) => {
    const {
      tanggalTransfer,
      santriId,
      santriNis,
      santriNama,
      jenisKelamin,
      kelas,
      kamar,
      namaPengirim,
      nominal,
      kategori,
      subKategori,
      metodeTransfer,
      nomorReferensi,
      catatan,
      belumAdaNama,
    } = req.body ?? {};

    const parsedNominal = Number(nominal);
    const isUnnamed = Boolean(belumAdaNama);
    const hasManualSantri = Boolean(
      santriNama?.trim() && ['PUTRA', 'PUTRI'].includes(jenisKelamin) && kelas?.trim() && kamar?.trim()
    );

    if (isUnnamed) {
      if (
        !tanggalTransfer ||
        !Number.isFinite(parsedNominal) ||
        parsedNominal <= 0 ||
        !['BEKAL', 'SPP', 'LAINNYA'].includes(kategori) ||
        !metodeTransfer?.trim()
      ) {
        res.status(400).json({
          error: 'Untuk transfer tanpa nama, harap lengkapi tanggal, jenis uang, metode transfer, dan nominal lebih dari Rp 0.',
        });
        return;
      }
    } else if (
      !tanggalTransfer ||
      (!santriId && !hasManualSantri) ||
      !namaPengirim?.trim() ||
      !Number.isFinite(parsedNominal) ||
      parsedNominal <= 0 ||
      !['BEKAL', 'SPP', 'LAINNYA'].includes(kategori) ||
      !metodeTransfer?.trim()
    ) {
      res.status(400).json({
        error:
          'Harap lengkapi tanggal, nama santri, jenis kelamin, kelas, kamar, pengirim, kategori, metode transfer, dan nominal lebih dari Rp 0.',
      });
      return;
    }

    let resolvedSantriId: number;
    let txSantriNis: string;
    let txSantriNama: string;
    let txGender: 'PUTRA' | 'PUTRI';
    let txKelas: string;
    let txKamar: string;
    let txPengirim: string;

    if (isUnnamed) {
      resolvedSantriId = getOrCreateAnonSantriId();
      txSantriNis = '-';
      txSantriNama = 'Belum Ada Nama';
      txGender = (['PUTRA', 'PUTRI'].includes(jenisKelamin) ? jenisKelamin : 'PUTRA') as 'PUTRA' | 'PUTRI';
      txKelas = (typeof kelas === 'string' && kelas.trim()) || '-';
      txKamar = (typeof kamar === 'string' && kamar.trim()) || '-';
      txPengirim = (typeof namaPengirim === 'string' && namaPengirim.trim()) || 'Belum Diketahui';
    } else {
      let santri: any = null;
      if (santriId) {
        santri = db.prepare('SELECT * FROM santri WHERE id = ?').get(Number(santriId));
        if (!santri) {
          res.status(404).json({ error: 'Santri yang dipilih tidak ditemukan di database.' });
          return;
        }
      } else {
        santri = resolveOrCreateManualSantri({
          santriNama,
          santriNis,
          jenisKelamin,
          kelas,
          kamar,
          namaPengirim,
          tanggalTransfer,
        });
      }

      resolvedSantriId = santri.id;
      txSantriNis = (typeof santriNis === 'string' && santriNis.trim()) || santri.nis;
      txSantriNama = (typeof santriNama === 'string' && santriNama.trim()) || santri.nama_lengkap;
      txGender = (['PUTRA', 'PUTRI'].includes(jenisKelamin) ? jenisKelamin : santri.jenis_kelamin) as 'PUTRA' | 'PUTRI';
      txKelas = (typeof kelas === 'string' && kelas.trim()) || santri.kelas;
      txKamar = (typeof kamar === 'string' && kamar.trim()) || santri.kamar;
      txPengirim = namaPengirim.trim();
    }

    const refClean = typeof nomorReferensi === 'string' ? nomorReferensi.trim() : '';
    if (refClean) {
      const dup = db
        .prepare("SELECT id, kode_transaksi FROM transactions WHERE LOWER(TRIM(nomor_referensi)) = LOWER(?) AND status != 'DIBATALKAN'")
        .get(refClean) as { id: number; kode_transaksi: string } | undefined;
      if (dup) {
        res.status(409).json({
          error: `Transaksi ganda terdeteksi! Nomor referensi "${refClean}" sudah tercatat pada transaksi ${dup.kode_transaksi}.`,
        });
        return;
      }
    }

    const kodeTransaksi = nextTransactionCode(tanggalTransfer);
    const status = getInitialStatusForCategory(kategori as TransferCategory);
    const resolvedSubKategori =
      kategori === 'BEKAL'
        ? 'Uang Bekal'
        : kategori === 'SPP'
          ? 'Uang SPP'
          : (subKategori ?? '').trim() || 'Kebutuhan Pribadi';

    const nowIso = new Date().toISOString();
    const isAdminInput = req.user!.role === 'ADMIN';
    const approveDate = isAdminInput ? getTodayIsoDate() : null;
    const approveTime = isAdminInput ? getCurrentTimeHHMM() : null;

    const info = db
      .prepare(
        `INSERT INTO transactions (
          kode_transaksi, tanggal_transfer, santri_id, santri_nis, santri_nama,
          jenis_kelamin, kelas, kamar, nama_pengirim, nominal, kategori, sub_kategori,
          metode_transfer, nomor_referensi, catatan, status, belum_ada_nama, input_oleh_id, input_oleh_nama,
          disetujui_oleh_id, disetujui_oleh_nama, tanggal_disetujui, jam_disetujui,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        kodeTransaksi,
        tanggalTransfer,
        resolvedSantriId,
        txSantriNis,
        txSantriNama,
        txGender,
        txKelas,
        txKamar,
        txPengirim,
        Math.round(parsedNominal),
        kategori,
        resolvedSubKategori,
        metodeTransfer.trim(),
        refClean,
        (catatan ?? '').trim(),
        status,
        isUnnamed ? 1 : 0,
        req.user!.id,
        req.user!.namaLengkap,
        isAdminInput ? req.user!.id : null,
        isAdminInput ? req.user!.namaLengkap : null,
        approveDate,
        approveTime,
        nowIso,
        nowIso
      );

    const created = mapTransactionRow(db.prepare('SELECT * FROM transactions WHERE id = ?').get(info.lastInsertRowid));
    logAudit(
      created.id,
      created.kodeTransaksi,
      req.user!,
      'CATAT_TRANSFER',
      isUnnamed ? 'Pencatatan transfer masuk (belum ada nama)' : 'Pencatatan transfer masuk',
      `${created.santriNama} - Rp ${created.nominal.toLocaleString('id-ID')} (${created.kategori}) oleh ${req.user!.namaLengkap}${
        isAdminInput ? ` (Disetujui langsung oleh Admin ${req.user!.namaLengkap})` : ''
      }`
    );
    res.status(201).json({ transaction: created });
  }
);

app.post(
  '/api/transactions/:id/identify',
  requireAuth,
  requireRole(['ADMIN', 'OPERATOR']),
  (req: AuthedRequest, res: Response) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
      return;
    }

    if (existing.status === 'DIBATALKAN') {
      res.status(400).json({ error: 'Transaksi yang sudah dibatalkan tidak dapat dikoreksi.' });
      return;
    }

    const { santriNama, santriNis, jenisKelamin, kelas, kamar, namaPengirim, catatanKoreksi } = req.body ?? {};
    if (!santriNama?.trim() || !['PUTRA', 'PUTRI'].includes(jenisKelamin) || !kelas?.trim() || !kamar?.trim()) {
      res.status(400).json({ error: 'Nama santri, jenis kelamin, kelas, dan kamar wajib diisi saat koreksi identitas.' });
      return;
    }

    const resolvedPengirim = (typeof namaPengirim === 'string' && namaPengirim.trim()) || existing.nama_pengirim || '-';
    const santri = resolveOrCreateManualSantri({
      santriNama: santriNama.trim(),
      santriNis: typeof santriNis === 'string' ? santriNis.trim() : '',
      jenisKelamin,
      kelas: kelas.trim(),
      kamar: kamar.trim(),
      namaPengirim: resolvedPengirim,
      tanggalTransfer: existing.tanggal_transfer,
    });

    const txNis = (typeof santriNis === 'string' && santriNis.trim()) || santri.nis;
    const nowIso = new Date().toISOString();
    const auditNote =
      typeof catatanKoreksi === 'string' && catatanKoreksi.trim()
        ? catatanKoreksi.trim()
        : `Identitas dilengkapi oleh ${req.user!.namaLengkap}`;

    db.prepare(
      `UPDATE transactions
       SET santri_id = ?, santri_nis = ?, santri_nama = ?, jenis_kelamin = ?, kelas = ?, kamar = ?,
           nama_pengirim = ?, belum_ada_nama = 0, catatan_audit = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      santri.id,
      txNis,
      santriNama.trim(),
      jenisKelamin,
      kelas.trim(),
      kamar.trim(),
      resolvedPengirim,
      auditNote,
      nowIso,
      id
    );

    const updated = mapTransactionRow(db.prepare('SELECT * FROM transactions WHERE id = ?').get(id));
    logAudit(
      updated.id,
      updated.kodeTransaksi,
      req.user!,
      'KOREKSI_NAMA_TRANSFER',
      auditNote,
      `Koreksi dari "${existing.santri_nama}" menjadi "${updated.santriNama}" (${updated.jenisKelamin} · ${updated.kelas} / ${updated.kamar})`
    );
    res.json({ transaction: updated });
  }
);

app.post(
  '/api/transactions/:id/approve',
  requireAuth,
  requireRole(['ADMIN']),
  (req: AuthedRequest, res: Response) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
      return;
    }

    if (existing.status === 'DIBATALKAN') {
      res.status(400).json({ error: 'Transaksi yang sudah dibatalkan tidak dapat disetujui.' });
      return;
    }

    const tgl = getTodayIsoDate();
    const jam = getCurrentTimeHHMM();
    const nowIso = new Date().toISOString();

    db.prepare(
      `UPDATE transactions
       SET disetujui_oleh_id = ?, disetujui_oleh_nama = ?, tanggal_disetujui = ?, jam_disetujui = ?, updated_at = ?
       WHERE id = ?`
    ).run(req.user!.id, req.user!.namaLengkap, tgl, jam, nowIso, id);

    const updated = mapTransactionRow(db.prepare('SELECT * FROM transactions WHERE id = ?').get(id));
    logAudit(
      updated.id,
      updated.kodeTransaksi,
      req.user!,
      'SETUJUI_TRANSAKSI',
      'Persetujuan resmi Admin Tata Usaha',
      `Transaksi ${updated.kodeTransaksi} (${updated.santriNama}) disetujui oleh Admin ${req.user!.namaLengkap} pada ${tgl} ${jam}`
    );
    res.json({ transaction: updated });
  }
);

app.post(
  '/api/transactions/:id/pickup',
  requireAuth,
  requireRole(['ADMIN', 'OPERATOR']),
  (req: AuthedRequest, res: Response) => {
    const id = Number(req.params.id);
    const row = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as any;
    if (!row) {
      res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
      return;
    }

    if (row.status === 'DIBATALKAN') {
      res.status(400).json({ error: 'Transaksi yang sudah dibatalkan tidak dapat diproses.' });
      return;
    }

    if (row.status === 'SUDAH_DIAMBIL' || row.status === 'SPP_SUDAH_DIPROSES') {
      res.status(400).json({ error: 'Transaksi ini sudah ditandai selesai/diambil sebelumnya.' });
      return;
    }

    const { tanggalPengambilan, jamPengambilan, nominalDiserahkan, keteranganSerah } = req.body ?? {};
    const tgl = tanggalPengambilan || getTodayIsoDate();
    const jam = jamPengambilan || getCurrentTimeHHMM();
    const nominal = Number(nominalDiserahkan ?? row.nominal);
    if (!Number.isFinite(nominal) || nominal <= 0 || nominal > row.nominal) {
      res.status(400).json({ error: 'Nominal yang diserahkan harus valid dan tidak melebihi nominal transfer.' });
      return;
    }

    const nextStatus = row.kategori === 'SPP' ? 'SPP_SUDAH_DIPROSES' : 'SUDAH_DIAMBIL';
    const nowIso = new Date().toISOString();
    const shouldAutoApprove = req.user!.role === 'ADMIN' && !row.disetujui_oleh_id;
    const nextApprovedId = shouldAutoApprove ? req.user!.id : row.disetujui_oleh_id ?? null;
    const nextApprovedNama = shouldAutoApprove ? req.user!.namaLengkap : row.disetujui_oleh_nama ?? null;
    const nextApprovedDate = shouldAutoApprove ? tgl : row.tanggal_disetujui ?? null;
    const nextApprovedTime = shouldAutoApprove ? jam : row.jam_disetujui ?? null;

    db.prepare(
      `UPDATE transactions
       SET status = ?, tanggal_pengambilan = ?, jam_pengambilan = ?, petugas_serah_id = ?, petugas_serah_nama = ?,
           nominal_diserahkan = ?, keterangan_serah = ?,
           disetujui_oleh_id = ?, disetujui_oleh_nama = ?, tanggal_disetujui = ?, jam_disetujui = ?,
           updated_at = ?
       WHERE id = ?`
    ).run(
      nextStatus,
      tgl,
      jam,
      req.user!.id,
      req.user!.namaLengkap,
      Math.round(nominal),
      (keteranganSerah ?? '').trim(),
      nextApprovedId,
      nextApprovedNama,
      nextApprovedDate,
      nextApprovedTime,
      nowIso,
      id
    );

    const updated = mapTransactionRow(db.prepare('SELECT * FROM transactions WHERE id = ?').get(id));
    logAudit(
      updated.id,
      updated.kodeTransaksi,
      req.user!,
      row.kategori === 'SPP' ? 'PROSES_SPP' : 'SERAH_TERIMA_UANG',
      row.kategori === 'SPP' ? 'Verifikasi & proses pembayaran SPP' : 'Penyerahan uang kepada santri',
      `Diserahkan oleh ${req.user!.namaLengkap} (${req.user!.role}) sebesar Rp ${Math.round(nominal).toLocaleString('id-ID')} pada ${tgl} ${jam}`
    );
    res.json({ transaction: updated });
  }
);

app.put(
  '/api/transactions/:id',
  requireAuth,
  requireRole(['ADMIN']),
  (req: AuthedRequest, res: Response) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
      return;
    }

    const {
      tanggalTransfer,
      santriNama,
      jenisKelamin,
      kelas,
      kamar,
      namaPengirim,
      nominal,
      kategori,
      subKategori,
      metodeTransfer,
      nomorReferensi,
      catatan,
      catatanAudit,
    } = req.body ?? {};

    if (!catatanAudit?.trim()) {
      res.status(400).json({ error: 'Admin wajib mengisi catatan audit alasan perubahan transaksi.' });
      return;
    }

    const parsedNominal = Number(nominal);
    if (!tanggalTransfer || !namaPengirim?.trim() || !Number.isFinite(parsedNominal) || parsedNominal <= 0) {
      res.status(400).json({ error: 'Data nominal, tanggal, dan pengirim harus valid.' });
      return;
    }

    const refClean = typeof nomorReferensi === 'string' ? nomorReferensi.trim() : '';
    if (refClean) {
      const dup = db
        .prepare("SELECT id, kode_transaksi FROM transactions WHERE LOWER(TRIM(nomor_referensi)) = LOWER(?) AND status != 'DIBATALKAN' AND id != ?")
        .get(refClean, id) as { id: number; kode_transaksi: string } | undefined;
      if (dup) {
        res.status(409).json({
          error: `Nomor referensi "${refClean}" sudah digunakan pada transaksi ${dup.kode_transaksi}.`,
        });
        return;
      }
    }

    const nextKategori = (['BEKAL', 'SPP', 'LAINNYA'].includes(kategori) ? kategori : existing.kategori) as TransferCategory;
    let nextStatus = existing.status;
    if (existing.kategori !== nextKategori && existing.status !== 'DIBATALKAN') {
      if (nextKategori === 'SPP') {
        nextStatus = existing.status === 'SUDAH_DIAMBIL' ? 'SPP_SUDAH_DIPROSES' : 'SPP_BELUM_DIPROSES';
      } else {
        nextStatus = existing.status === 'SPP_SUDAH_DIPROSES' ? 'SUDAH_DIAMBIL' : 'BELUM_DIAMBIL';
      }
    }

    const resolvedSub =
      nextKategori === 'BEKAL'
        ? 'Uang Bekal'
        : nextKategori === 'SPP'
          ? 'Uang SPP'
          : (subKategori ?? '').trim() || 'Kebutuhan Pribadi';

    const nextSantriNama = (typeof santriNama === 'string' && santriNama.trim()) || existing.santri_nama;
    const nextGender = (['PUTRA', 'PUTRI'].includes(jenisKelamin) ? jenisKelamin : existing.jenis_kelamin) as 'PUTRA' | 'PUTRI';
    const nextKelas = (typeof kelas === 'string' && kelas.trim()) || existing.kelas;
    const nextKamar = (typeof kamar === 'string' && kamar.trim()) || existing.kamar;
    const nextBelumAdaNama =
      typeof req.body?.belumAdaNama === 'boolean'
        ? req.body.belumAdaNama
          ? 1
          : 0
        : existing.belum_ada_nama && nextSantriNama !== 'Belum Ada Nama'
          ? 0
          : existing.belum_ada_nama;

    let nextSantriId = existing.santri_id;
    let nextSantriNis = existing.santri_nis;
    if (nextBelumAdaNama === 0 && existing.belum_ada_nama === 1) {
      const realSantri = resolveOrCreateManualSantri({
        santriNama: nextSantriNama,
        jenisKelamin: nextGender,
        kelas: nextKelas,
        kamar: nextKamar,
        namaPengirim: namaPengirim.trim(),
        tanggalTransfer,
      });
      nextSantriId = realSantri.id;
      nextSantriNis = realSantri.nis;
    }

    db.prepare(
      `UPDATE transactions
       SET tanggal_transfer = ?, santri_id = ?, santri_nis = ?, santri_nama = ?, jenis_kelamin = ?, kelas = ?, kamar = ?,
           nama_pengirim = ?, nominal = ?, kategori = ?, sub_kategori = ?,
           metode_transfer = ?, nomor_referensi = ?, catatan = ?, status = ?, belum_ada_nama = ?, catatan_audit = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      tanggalTransfer,
      nextSantriId,
      nextSantriNis,
      nextSantriNama,
      nextGender,
      nextKelas,
      nextKamar,
      namaPengirim.trim(),
      Math.round(parsedNominal),
      nextKategori,
      resolvedSub,
      (metodeTransfer ?? existing.metode_transfer).trim(),
      refClean,
      (catatan ?? '').trim(),
      nextStatus,
      nextBelumAdaNama,
      catatanAudit.trim(),
      new Date().toISOString(),
      id
    );

    const updated = mapTransactionRow(db.prepare('SELECT * FROM transactions WHERE id = ?').get(id));
    logAudit(
      updated.id,
      updated.kodeTransaksi,
      req.user!,
      'EDIT_TRANSAKSI',
      catatanAudit.trim(),
      `Nominal ${existing.nominal} -> ${updated.nominal}, Kategori ${existing.kategori} -> ${updated.kategori}`
    );
    res.json({ transaction: updated });
  }
);

app.post(
  '/api/transactions/:id/cancel',
  requireAuth,
  requireRole(['ADMIN']),
  (req: AuthedRequest, res: Response) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
      return;
    }

    const { reason } = req.body ?? {};
    if (!reason?.trim()) {
      res.status(400).json({ error: 'Alasan pembatalan wajib diisi untuk catatan audit.' });
      return;
    }

    db.prepare("UPDATE transactions SET status = 'DIBATALKAN', catatan_audit = ?, updated_at = ? WHERE id = ?").run(
      reason.trim(),
      new Date().toISOString(),
      id
    );

    const updated = mapTransactionRow(db.prepare('SELECT * FROM transactions WHERE id = ?').get(id));
    logAudit(
      updated.id,
      updated.kodeTransaksi,
      req.user!,
      'BATALKAN_TRANSAKSI',
      reason.trim(),
      `Transaksi ${updated.kodeTransaksi} dibatalkan oleh ${req.user!.namaLengkap}`
    );
    res.json({ transaction: updated });
  }
);

app.delete(
  '/api/transactions/:id',
  requireAuth,
  requireRole(['ADMIN']),
  (req: AuthedRequest, res: Response) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
      return;
    }

    const reason = (req.body?.reason ?? req.query?.reason ?? '').toString().trim();
    if (!reason) {
      res.status(400).json({ error: 'Catatan audit wajib diisi sebelum menghapus transaksi.' });
      return;
    }

    db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
    logAudit(
      id,
      existing.kode_transaksi,
      req.user!,
      'HAPUS_TRANSAKSI',
      reason,
      `Dihapus permanen oleh ${req.user!.namaLengkap}: ${existing.santri_nama} - Rp ${existing.nominal.toLocaleString('id-ID')}`
    );
    res.json({ ok: true });
  }
);

// Users management (ADMIN only)
app.post('/api/users', requireAuth, requireRole(['ADMIN']), (req: AuthedRequest, res: Response) => {
  const { username, password, namaLengkap, role } = req.body ?? {};
  if (!username?.trim() || !password || password.length < 4 || !namaLengkap?.trim() || !['ADMIN', 'OPERATOR', 'KEPALA_PESANTREN'].includes(role)) {
    res.status(400).json({ error: 'Lengkapi username, password (min 4 karakter), nama lengkap, dan hak akses.' });
    return;
  }

  const dup = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (dup) {
    res.status(409).json({ error: `Username "${username.trim()}" sudah digunakan.` });
    return;
  }

  const nowIso = new Date().toISOString();
  const info = db
    .prepare('INSERT INTO users (username, password_hash, nama_lengkap, role, aktif, created_at) VALUES (?, ?, ?, ?, 1, ?)')
    .run(username.trim(), bcrypt.hashSync(password, 10), namaLengkap.trim(), role, nowIso);

  const created = mapUserRow(db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid));
  logAudit(null, null, req.user!, 'TAMBAH_PENGGUNA', 'Penambahan akun petugas', `${created.username} (${created.role})`);
  res.status(201).json({ user: created });
});

app.put('/api/users/:id', requireAuth, requireRole(['ADMIN']), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    return;
  }

  const { namaLengkap, role, aktif, password } = req.body ?? {};
  const nextNama = namaLengkap?.trim() || existing.nama_lengkap;
  const nextRole = ['ADMIN', 'OPERATOR', 'KEPALA_PESANTREN'].includes(role) ? role : existing.role;
  const nextAktif = typeof aktif === 'boolean' ? (aktif ? 1 : 0) : existing.aktif;
  const nextHash = password && password.length >= 4 ? bcrypt.hashSync(password, 10) : existing.password_hash;

  if (existing.role === 'ADMIN' && (nextRole !== 'ADMIN' || nextAktif === 0)) {
    const activeAdmins = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'ADMIN' AND aktif = 1 AND id != ?").get(id) as { c: number }).c;
    if (activeAdmins === 0) {
      res.status(400).json({ error: 'Minimal harus ada satu akun ADMIN aktif di dalam sistem.' });
      return;
    }
  }

  db.prepare('UPDATE users SET nama_lengkap = ?, role = ?, aktif = ?, password_hash = ? WHERE id = ?').run(
    nextNama,
    nextRole,
    nextAktif,
    nextHash,
    id
  );

  if (nextAktif === 0) {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
  }

  const updated = mapUserRow(db.prepare('SELECT * FROM users WHERE id = ?').get(id));
  logAudit(
    null,
    null,
    req.user!,
    'UBAH_PENGGUNA',
    'Pembaruan akun petugas',
    `${updated.username} · Role: ${updated.role} · Status: ${updated.aktif ? 'Aktif' : 'Nonaktif'}`
  );
  res.json({ user: updated });
});

// Custom categories for Uang Lainnya
app.post('/api/categories', requireAuth, requireRole(['ADMIN']), (req: AuthedRequest, res: Response) => {
  const { nama, deskripsi } = req.body ?? {};
  if (!nama?.trim()) {
    res.status(400).json({ error: 'Nama kategori tambahan wajib diisi.' });
    return;
  }
  const dup = db.prepare('SELECT id FROM custom_categories WHERE LOWER(nama) = LOWER(?)').get(nama.trim());
  if (dup) {
    res.status(409).json({ error: 'Kategori dengan nama tersebut sudah ada.' });
    return;
  }

  const info = db
    .prepare('INSERT INTO custom_categories (nama, deskripsi, created_at) VALUES (?, ?, ?)')
    .run(nama.trim(), (deskripsi ?? '').trim(), new Date().toISOString());

  const category = mapCategoryRow(db.prepare('SELECT * FROM custom_categories WHERE id = ?').get(info.lastInsertRowid));
  res.status(201).json({ category });
});

app.delete('/api/categories/:id', requireAuth, requireRole(['ADMIN']), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM custom_categories WHERE id = ?').run(id);
  res.json({ ok: true });
});

// Settings
app.put('/api/settings', requireAuth, requireRole(['ADMIN']), (req: AuthedRequest, res: Response) => {
  const { namaPesantren, alamatPesantren, namaBendahara, kota } = req.body ?? {};
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  if (namaPesantren?.trim()) upsert.run('namaPesantren', namaPesantren.trim());
  if (alamatPesantren?.trim()) upsert.run('alamatPesantren', alamatPesantren.trim());
  if (namaBendahara?.trim()) upsert.run('namaBendahara', namaBendahara.trim());
  if (kota?.trim()) upsert.run('kota', kota.trim());

  const settings = getSettingsObject();
  logAudit(null, null, req.user!, 'UBAH_PENGATURAN', 'Pembaruan profil pesantren', settings.namaPesantren);
  res.json({ settings });
});

// Database Backup & Restore
app.get('/api/backup/export', requireAuth, requireRole(['ADMIN', 'KEPALA_PESANTREN']), (req: AuthedRequest, res: Response) => {
  const payload = {
    exportedAt: new Date().toISOString(),
    exportedBy: req.user?.namaLengkap,
    app: 'Tata Usaha - Data dan Informasi Transfer Santri',
    settings: getSettingsObject(),
    santri: db.prepare('SELECT * FROM santri ORDER BY id ASC').all(),
    customCategories: db.prepare('SELECT * FROM custom_categories ORDER BY id ASC').all(),
    transactions: db.prepare('SELECT * FROM transactions ORDER BY id ASC').all(),
    auditLogs: db.prepare('SELECT * FROM audit_logs ORDER BY id ASC').all(),
  };

  const filename = `backup-tata-usaha-${getTodayIsoDate()}.json`;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(JSON.stringify(payload, null, 2));
});

app.get('/api/backup/sqlite', requireAuth, requireRole(['ADMIN']), (_req: AuthedRequest, res: Response) => {
  db.pragma('wal_checkpoint(TRUNCATE)');
  const filename = `pesantren-db-${getTodayIsoDate()}.db`;
  res.download(DB_PATH, filename);
});

app.post('/api/backup/restore', requireAuth, requireRole(['ADMIN']), (req: AuthedRequest, res: Response) => {
  const backup = req.body;
  if (!backup || !Array.isArray(backup.santri) || !Array.isArray(backup.transactions)) {
    res.status(400).json({ error: 'Format file backup JSON tidak valid.' });
    return;
  }

  const restoreTx = db.transaction(() => {
    db.prepare('DELETE FROM transactions').run();
    db.prepare('DELETE FROM santri').run();
    db.prepare('DELETE FROM custom_categories').run();

    const insSantri = db.prepare(
      'INSERT INTO santri (id, nis, nama_lengkap, jenis_kelamin, kelas, kamar, nama_wali, no_hp_wali, aktif, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const s of backup.santri) {
      insSantri.run(
        s.id,
        s.nis,
        s.nama_lengkap,
        s.jenis_kelamin,
        s.kelas,
        s.kamar,
        s.nama_wali,
        s.no_hp_wali ?? '',
        s.aktif ?? 1,
        s.created_at ?? new Date().toISOString()
      );
    }

    if (Array.isArray(backup.customCategories)) {
      const insCat = db.prepare('INSERT INTO custom_categories (id, nama, deskripsi, created_at) VALUES (?, ?, ?, ?)');
      for (const c of backup.customCategories) {
        insCat.run(c.id, c.nama, c.deskripsi ?? '', c.created_at ?? new Date().toISOString());
      }
    }

    const insTx = db.prepare(
      `INSERT INTO transactions (
        id, kode_transaksi, tanggal_transfer, santri_id, santri_nis, santri_nama,
        jenis_kelamin, kelas, kamar, nama_pengirim, nominal, kategori, sub_kategori,
        metode_transfer, nomor_referensi, catatan, status, belum_ada_nama, input_oleh_id, input_oleh_nama,
        disetujui_oleh_id, disetujui_oleh_nama, tanggal_disetujui, jam_disetujui,
        tanggal_pengambilan, jam_pengambilan, petugas_serah_id, petugas_serah_nama,
        nominal_diserahkan, keterangan_serah, catatan_audit, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const t of backup.transactions) {
      insTx.run(
        t.id,
        t.kode_transaksi,
        t.tanggal_transfer,
        t.santri_id,
        t.santri_nis,
        t.santri_nama,
        t.jenis_kelamin,
        t.kelas,
        t.kamar,
        t.nama_pengirim,
        t.nominal,
        t.kategori,
        t.sub_kategori ?? '',
        t.metode_transfer,
        t.nomor_referensi ?? '',
        t.catatan ?? '',
        t.status,
        t.belum_ada_nama ? 1 : 0,
        t.input_oleh_id,
        t.input_oleh_nama,
        t.disetujui_oleh_id ?? null,
        t.disetujui_oleh_nama ?? null,
        t.tanggal_disetujui ?? null,
        t.jam_disetujui ?? null,
        t.tanggal_pengambilan ?? null,
        t.jam_pengambilan ?? null,
        t.petugas_serah_id ?? null,
        t.petugas_serah_nama ?? null,
        t.nominal_diserahkan ?? null,
        t.keterangan_serah ?? null,
        t.catatan_audit ?? null,
        t.created_at ?? new Date().toISOString(),
        t.updated_at ?? new Date().toISOString()
      );
    }
  });

  restoreTx();
  logAudit(null, null, req.user!, 'RESTORE_DATABASE', 'Pemulihan database dari file backup JSON', `${backup.santri.length} santri, ${backup.transactions.length} transaksi`);
  res.json({ ok: true });
});

app.post('/api/admin/clear-data', requireAuth, requireRole(['ADMIN']), (req: AuthedRequest, res: Response) => {
  const scope = req.body?.scope === 'ALL' ? 'ALL' : 'SAMPLE_ONLY';
  const reason =
    typeof req.body?.reason === 'string' && req.body.reason.trim()
      ? req.body.reason.trim()
      : scope === 'ALL'
        ? 'Menghapus seluruh transaksi dan data santri'
        : 'Menghapus semua data contoh bawaan';

  let deletedTransactions = 0;
  let deletedSantri = 0;

  const runClear = db.transaction(() => {
    if (scope === 'ALL') {
      deletedTransactions = db.prepare('DELETE FROM transactions').run().changes;
      deletedSantri = db.prepare('DELETE FROM santri').run().changes;
    } else {
      const currentYear = new Date().getFullYear();
      const dynamicRefs = [
        ...SEED_TX_REFS,
        `BSI-${currentYear - 1}-018`,
        `BRI-${currentYear - 2}-019`,
      ];
      const allPlaceholders = dynamicRefs.map(() => '?').join(',');
      deletedTransactions = db
        .prepare(`DELETE FROM transactions WHERE nomor_referensi IN (${allPlaceholders})`)
        .run(...dynamicRefs).changes;

      const nisPlaceholders = SEED_SANTRI_NIS.map(() => '?').join(',');
      deletedSantri = db
        .prepare(
          `DELETE FROM santri
           WHERE nis IN (${nisPlaceholders})
             AND id NOT IN (SELECT DISTINCT santri_id FROM transactions)`
        )
        .run(...SEED_SANTRI_NIS).changes;
    }

    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('skipSampleSeed', 'true')").run();
  });

  runClear();

  logAudit(
    null,
    null,
    req.user!,
    scope === 'ALL' ? 'HAPUS_SEMUA_DATA' : 'HAPUS_DATA_CONTOH',
    reason,
    `Dihapus ${deletedTransactions} transaksi dan ${deletedSantri} data santri oleh ${req.user!.namaLengkap}`
  );

  res.json({ ok: true, deletedTransactions, deletedSantri });
});

async function startServer(): Promise<void> {
  const PORT = 3000;
  const isProd = process.env.NODE_ENV === 'production';
  const httpServer = http.createServer(app);

  if (!isProd) {
    process.env.DISABLE_HMR = 'true';
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: { server: httpServer },
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server Tata Usaha berjalan di http://localhost:${PORT}`);
  });
}

startServer();
