import { useState } from 'react';
import { Printer, X, CheckCircle2, AlertTriangle, Edit3, UserCheck } from 'lucide-react';
import {
  formatRupiah,
  formatRupiahDigits,
  formatTanggalIndonesia,
  getCategoryLabel,
  getCurrentTimeHHMM,
  getStatusLabel,
  getTodayIsoDate,
  parseRupiahInput,
  type CustomCategory,
  type Gender,
  type PaymentMethod,
  type PesantrenSettings,
  type Santri,
  type TransferCategory,
  type TransferTransaction,
  type UserAccount,
} from '../lib/domain';
import { PesantrenEmblem } from './Emblem';

interface PickupModalProps {
  transaction: TransferTransaction;
  currentUser: UserAccount;
  onClose: () => void;
  onConfirm: (payload: {
    tanggalPengambilan: string;
    jamPengambilan: string;
    nominalDiserahkan: number;
    keteranganSerah: string;
  }) => Promise<void>;
}

export function PickupModal({ transaction, currentUser, onClose, onConfirm }: PickupModalProps) {
  const isSpp = transaction.kategori === 'SPP';
  const [tanggal, setTanggal] = useState(getTodayIsoDate());
  const [jam, setJam] = useState(getCurrentTimeHHMM());
  const [nominalText, setNominalText] = useState(formatRupiahDigits(String(transaction.nominal)));
  const [keterangan, setKeterangan] = useState(
    isSpp ? 'Pembayaran SPP diverifikasi dan diteruskan ke bendahara pesantren' : 'Diserahkan tunai langsung kepada santri'
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const nominalVal = parseRupiahInput(nominalText);
    if (!nominalVal || nominalVal <= 0 || nominalVal > transaction.nominal) {
      setError(`Nominal diserahkan harus antara Rp 1 sampai ${formatRupiah(transaction.nominal)}.`);
      return;
    }
    setSaving(true);
    try {
      await onConfirm({
        tanggalPengambilan: tanggal,
        jamPengambilan: jam,
        nominalDiserahkan: nominalVal,
        keteranganSerah: keterangan,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui status.');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-[#111F19] border border-slate-200 dark:border-[#243B31] rounded-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-[#0D4F35] text-white">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-[#E5C158]" aria-hidden="true" />
            <h3 className="text-base font-bold">
              {isSpp ? 'Konfirmasi Proses Pembayaran SPP' : 'Konfirmasi Penyerahan Uang Santri'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal konfirmasi"
            className="p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-[#F6F8F6] dark:bg-[#15261E] border border-[#DCE4DF] dark:border-[#243B31] rounded-lg p-4 text-sm space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-900 dark:text-white">{transaction.santriNama}</span>
              <span className="font-mono-num text-xs text-slate-500 dark:text-slate-400">{transaction.kodeTransaksi}</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {transaction.jenisKelamin === 'PUTRA' ? 'Santri Putra' : 'Santri Putri'} · Kelas {transaction.kelas} · Kamar{' '}
              {transaction.kamar}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Pengirim: {transaction.namaPengirim} · {getCategoryLabel(transaction.kategori, transaction.subKategori)}
            </p>
            <p className="pt-1 text-base font-bold text-[#0D4F35] dark:text-emerald-300 font-mono-num">
              Nominal Transfer: {formatRupiah(transaction.nominal)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pickup-date" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isSpp ? 'Tanggal Proses' : 'Tanggal Pengambilan'}
              </label>
              <input
                id="pickup-date"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D4F35]/20 focus:border-[#0D4F35]"
              />
            </div>
            <div>
              <label htmlFor="pickup-time" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isSpp ? 'Jam Proses' : 'Jam Pengambilan'}
              </label>
              <input
                id="pickup-time"
                type="time"
                value={jam}
                onChange={(e) => setJam(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D4F35]/20 focus:border-[#0D4F35]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="pickup-officer" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Petugas yang Menyerahkan / Memproses
            </label>
            <input
              id="pickup-officer"
              type="text"
              value={currentUser.namaLengkap}
              readOnly
              className="w-full px-3 py-2 text-sm bg-slate-100 dark:bg-[#182C23] border border-slate-200 dark:border-[#243B31] rounded-lg text-slate-700 dark:text-slate-200"
            />
          </div>

          <div>
            <label htmlFor="pickup-nominal" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isSpp ? 'Nominal SPP Diproses (Rp)' : 'Nominal Uang Diserahkan (Rp)'}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500 dark:text-slate-400">Rp</span>
              <input
                id="pickup-nominal"
                type="text"
                value={nominalText}
                onChange={(e) => setNominalText(formatRupiahDigits(e.target.value))}
                className="w-full pl-10 pr-3 py-2 text-sm font-mono-num font-semibold bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D4F35]/20 focus:border-[#0D4F35]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="pickup-notes" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Keterangan Tambahan
            </label>
            <textarea
              id="pickup-notes"
              rows={2}
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D4F35]/20 focus:border-[#0D4F35]"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 p-2.5 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-[#2D473B] rounded-lg hover:bg-slate-50 dark:hover:bg-[#1B3127] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#0D4F35] hover:bg-[#093825] disabled:opacity-60 rounded-lg cursor-pointer"
            >
              {saving ? 'Menyimpan...' : isSpp ? 'Tandai SPP Diproses' : 'Simpan & Tandai Sudah Diambil'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ReceiptModalProps {
  transaction: TransferTransaction;
  settings: PesantrenSettings;
  onClose: () => void;
}

export function ReceiptModal({ transaction, settings, onClose }: ReceiptModalProps) {
  const isSpp = transaction.kategori === 'SPP';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="bg-white border border-slate-200 dark:border-[#243B31] rounded-xl w-full max-w-2xl overflow-hidden print-sheet">
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 dark:bg-[#15261E] border-b border-slate-200 dark:border-[#243B31] no-print">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Pratinjau Bukti Resmi</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-[#0D4F35] text-white rounded-lg hover:bg-[#093825] cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Cetak Bukti</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup pratinjau bukti"
              className="p-1.5 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-8 space-y-6 bg-white text-slate-900">
          <div className="flex items-start justify-between gap-4 pb-5 border-b-2 border-[#0D4F35]">
            <div className="flex items-center gap-3.5">
              <PesantrenEmblem className="w-14 h-14 shrink-0" />
              <div>
                <h2 className="text-lg font-bold text-[#0D4F35]">{settings.namaPesantren}</h2>
                <p className="text-xs text-slate-600">{settings.alamatPesantren}</p>
                <p className="text-xs font-semibold text-[#B8860B] mt-0.5">
                  TATA USAHA KEUANGAN & TRANSFER SANTRI
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {isSpp ? 'Bukti Pembayaran SPP' : 'Bukti Pengambilan Uang'}
              </p>
              <p className="font-mono-num text-sm font-bold text-slate-900 mt-0.5">{transaction.kodeTransaksi}</p>
              <p className="text-xs text-slate-500 mt-0.5">Status: {getStatusLabel(transaction.status)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Data Santri</p>
              <div className="space-y-1">
                <p>
                  <span className="text-slate-500">Nama Santri:</span>{' '}
                  <strong className="text-slate-900">{transaction.santriNama}</strong>
                </p>
                <p>
                  <span className="text-slate-500">NIS / Asrama:</span>{' '}
                  <span className="font-mono-num">{transaction.santriNis}</span> ·{' '}
                  {transaction.jenisKelamin === 'PUTRA' ? 'Putra' : 'Putri'}
                </p>
                <p>
                  <span className="text-slate-500">Kelas / Kamar:</span> {transaction.kelas} · {transaction.kamar}
                </p>
                <p>
                  <span className="text-slate-500">Nama Pengirim:</span> {transaction.namaPengirim}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rincian Transfer & Otorisasi</p>
              <div className="space-y-1">
                <p>
                  <span className="text-slate-500">Tanggal Transfer:</span>{' '}
                  {formatTanggalIndonesia(transaction.tanggalTransfer)}
                </p>
                <p>
                  <span className="text-slate-500">Kategori:</span>{' '}
                  {getCategoryLabel(transaction.kategori, transaction.subKategori)}
                </p>
                <p>
                  <span className="text-slate-500">Metode / Ref:</span> {transaction.metodeTransfer}
                  {transaction.nomorReferensi ? ` · ${transaction.nomorReferensi}` : ''}
                </p>
                <p>
                  <span className="text-slate-500">Diinput oleh:</span>{' '}
                  <strong>{transaction.inputOlehNama}</strong>
                </p>
                <p>
                  <span className="text-slate-500">Disetujui Admin:</span>{' '}
                  <strong>
                    {transaction.disetujuiOlehNama
                      ? `${transaction.disetujuiOlehNama}${
                          transaction.tanggalDisetujui
                            ? ` (${transaction.tanggalDisetujui}${transaction.jamDisetujui ? ` ${transaction.jamDisetujui}` : ''})`
                            : ''
                        }`
                      : 'Menunggu persetujuan Admin'}
                  </strong>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#F6F8F6] border border-[#DCE4DF] rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-600">
                {isSpp ? 'Total Nominal Pembayaran SPP' : 'Nominal Uang Diserahkan'}
              </p>
              <p className="text-2xl font-bold text-[#0D4F35] font-mono-num mt-0.5">
                {formatRupiah(transaction.nominalDiserahkan ?? transaction.nominal)}
              </p>
              {transaction.keteranganSerah && (
                <p className="text-xs text-slate-600 mt-1">Keterangan: {transaction.keteranganSerah}</p>
              )}
            </div>
            <div className="text-xs text-slate-600 sm:text-right">
              <p>
                {isSpp ? 'Diproses pada:' : 'Diambil pada:'}{' '}
                <strong>
                  {transaction.tanggalPengambilan
                    ? `${formatTanggalIndonesia(transaction.tanggalPengambilan)} · Pukul ${transaction.jamPengambilan ?? '-'} WIB`
                    : 'Belum diambil / diproses'}
                </strong>
              </p>
              <p className="mt-1">
                Petugas Serah: <strong>{transaction.petugasSerahNama || '-'}</strong>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-6 text-center text-xs text-slate-700">
            <div>
              <p>{isSpp ? 'Wali / Penyetor,' : 'Penerima (Santri),'}</p>
              <div className="h-14" />
              <p className="font-semibold border-t border-slate-300 pt-1.5 inline-block min-w-[130px]">
                {isSpp ? transaction.namaPengirim : transaction.santriNama}
              </p>
            </div>
            <div>
              <p>Petugas Input / Serah,</p>
              <div className="h-14" />
              <p className="font-semibold border-t border-slate-300 pt-1.5 inline-block min-w-[130px]">
                {transaction.petugasSerahNama || transaction.inputOlehNama}
              </p>
            </div>
            <div>
              <p>
                {settings.kota}, {formatTanggalIndonesia(transaction.tanggalDisetujui ?? transaction.tanggalPengambilan ?? getTodayIsoDate())}
              </p>
              <p>Disetujui Admin,</p>
              <div className="h-10" />
              <p className="font-semibold border-t border-slate-300 pt-1.5 inline-block min-w-[130px]">
                {transaction.disetujuiOlehNama || 'Menunggu Persetujuan'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EditTransactionModalProps {
  transaction: TransferTransaction;
  customCategories: CustomCategory[];
  onClose: () => void;
  onSave: (payload: {
    tanggalTransfer: string;
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
    catatanAudit: string;
  }) => Promise<void>;
}

export function EditTransactionModal({
  transaction,
  customCategories,
  onClose,
  onSave,
}: EditTransactionModalProps) {
  const [tanggalTransfer, setTanggalTransfer] = useState(transaction.tanggalTransfer);
  const [santriNama, setSantriNama] = useState(transaction.santriNama);
  const [jenisKelamin, setJenisKelamin] = useState<Gender>(transaction.jenisKelamin);
  const [kelas, setKelas] = useState(transaction.kelas);
  const [kamar, setKamar] = useState(transaction.kamar);
  const [namaPengirim, setNamaPengirim] = useState(transaction.namaPengirim);
  const [nominalText, setNominalText] = useState(formatRupiahDigits(String(transaction.nominal)));
  const [kategori, setKategori] = useState<TransferCategory>(transaction.kategori);
  const [subKategori, setSubKategori] = useState(transaction.subKategori || 'Kebutuhan Pribadi');
  const [metodeTransfer, setMetodeTransfer] = useState<PaymentMethod>(transaction.metodeTransfer);
  const [nomorReferensi, setNomorReferensi] = useState(transaction.nomorReferensi);
  const [catatan, setCatatan] = useState(transaction.catatan);
  const [catatanAudit, setCatatanAudit] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const nominal = parseRupiahInput(nominalText);
    if (!nominal || nominal <= 0) {
      setError('Nominal transfer harus lebih dari Rp 0.');
      return;
    }
    if (!santriNama.trim() || !kelas.trim() || !kamar.trim()) {
      setError('Nama santri, kelas, dan kamar wajib diisi.');
      return;
    }
    if (!catatanAudit.trim()) {
      setError('Catatan audit alasan perubahan wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        tanggalTransfer,
        santriNama: santriNama.trim(),
        jenisKelamin,
        kelas: kelas.trim(),
        kamar: kamar.trim(),
        namaPengirim: namaPengirim.trim(),
        nominal,
        kategori,
        subKategori,
        metodeTransfer,
        nomorReferensi: nomorReferensi.trim(),
        catatan: catatan.trim(),
        catatanAudit: catatanAudit.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui transaksi.');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-[#111F19] border border-slate-200 dark:border-[#243B31] rounded-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-[#0D4F35] text-white">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-[#E5C158]" aria-hidden="true" />
            <h3 className="text-base font-bold">Edit Transaksi ({transaction.kodeTransaksi})</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup modal edit" className="p-1 rounded hover:bg-white/10 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-tgl" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tanggal Transfer</label>
              <input
                id="edit-tgl"
                type="date"
                value={tanggalTransfer}
                onChange={(e) => setTanggalTransfer(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="edit-nominal" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nominal (Rp)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 dark:text-slate-400">Rp</span>
                <input
                  id="edit-nominal"
                  type="text"
                  value={nominalText}
                  onChange={(e) => setNominalText(formatRupiahDigits(e.target.value))}
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm font-mono-num font-semibold bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-santri-nama" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Santri</label>
              <input
                id="edit-santri-nama"
                type="text"
                value={santriNama}
                onChange={(e) => setSantriNama(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="edit-santri-jk" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Jenis Kelamin</label>
              <select
                id="edit-santri-jk"
                value={jenisKelamin}
                onChange={(e) => setJenisKelamin(e.target.value as Gender)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg"
              >
                <option value="PUTRA">Santri Putra</option>
                <option value="PUTRI">Santri Putri</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-kelas" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Kelas</label>
              <input
                id="edit-kelas"
                type="text"
                value={kelas}
                onChange={(e) => setKelas(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="edit-kamar" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Kamar</label>
              <input
                id="edit-kamar"
                type="text"
                value={kamar}
                onChange={(e) => setKamar(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg"
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-pengirim" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Pengirim</label>
            <input
              id="edit-pengirim"
              type="text"
              value={namaPengirim}
              onChange={(e) => setNamaPengirim(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-kategori" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Jenis Uang</label>
              <select
                id="edit-kategori"
                value={kategori}
                onChange={(e) => setKategori(e.target.value as TransferCategory)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg"
              >
                <option value="BEKAL">Uang Bekal</option>
                <option value="SPP">Uang SPP</option>
                <option value="LAINNYA">Uang Lainnya</option>
              </select>
            </div>
            <div>
              <label htmlFor="edit-metode" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Metode Transfer</label>
              <select
                id="edit-metode"
                value={metodeTransfer}
                onChange={(e) => setMetodeTransfer(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg"
              >
                <option value="BSI">BSI</option>
                <option value="BRI">BRI</option>
                <option value="BCA">BCA</option>
                <option value="Mandiri">Mandiri</option>
                <option value="Bank Lainnya">Bank Lainnya</option>
                <option value="Tunai">Tunai</option>
              </select>
            </div>
          </div>

          {kategori === 'LAINNYA' && (
            <div>
              <label htmlFor="edit-sub" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Sub-Kategori Uang Lainnya</label>
              <select
                id="edit-sub"
                value={subKategori}
                onChange={(e) => setSubKategori(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg"
              >
                {customCategories.map((c) => (
                  <option key={c.id} value={c.nama}>{c.nama}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="edit-ref" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nomor Referensi (Opsional)</label>
            <input
              id="edit-ref"
              type="text"
              value={nomorReferensi}
              onChange={(e) => setNomorReferensi(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono-num bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg"
            />
          </div>

          <div>
            <label htmlFor="edit-catatan" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Catatan</label>
            <input
              id="edit-catatan"
              type="text"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg"
            />
          </div>

          <div>
            <label htmlFor="edit-audit" className="block text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">
              Catatan Audit Perubahan (Wajib untuk Admin) *
            </label>
            <input
              id="edit-audit"
              type="text"
              value={catatanAudit}
              onChange={(e) => setCatatanAudit(e.target.value)}
              placeholder="Contoh: Koreksi nominal sesuai mutasi rekening BSI"
              required
              className="w-full px-3 py-2 text-sm border border-amber-300 dark:border-amber-700/60 bg-amber-50/50 dark:bg-amber-950/30 text-slate-900 dark:text-amber-100 rounded-lg"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 p-2.5 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-[#2D473B] rounded-lg cursor-pointer">
              Batal
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-[#0D4F35] rounded-lg hover:bg-[#093825] cursor-pointer">
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface CancelDeleteModalProps {
  mode: 'cancel' | 'delete';
  transaction: TransferTransaction;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function CancelDeleteModal({ mode, transaction, onClose, onConfirm }: CancelDeleteModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Alasan wajib diisi untuk catatan audit.');
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(reason.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses tindakan.');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-[#111F19] border border-slate-200 dark:border-[#243B31] rounded-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-rose-700 text-white">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
            <h3 className="text-base font-bold">
              {mode === 'cancel' ? 'Konfirmasi Pembatalan Transaksi' : 'Konfirmasi Hapus Transaksi'}
            </h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup dialog" className="p-1 rounded hover:bg-white/10 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {mode === 'cancel'
              ? `Anda akan membatalkan transaksi ${transaction.kodeTransaksi} atas nama ${transaction.santriNama} (${formatRupiah(transaction.nominal)}). Riwayat transaksi tetap tersimpan dengan status DIBATALKAN.`
              : `PERHATIAN: Anda akan menghapus permanen transaksi ${transaction.kodeTransaksi} atas nama ${transaction.santriNama} (${formatRupiah(transaction.nominal)}). Tindakan ini akan dicatat di log audit.`}
          </p>

          <div>
            <label htmlFor="audit-reason" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Alasan / Catatan Audit *
            </label>
            <textarea
              id="audit-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tuliskan alasan pembatalan atau penghapusan..."
              required
              className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 p-2.5 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-[#2D473B] rounded-lg cursor-pointer">
              Kembali
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-lg cursor-pointer">
              {submitting ? 'Memproses...' : mode === 'cancel' ? 'Ya, Batalkan Transaksi' : 'Ya, Hapus Permanen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface SantriFormModalProps {
  initial?: Santri | null;
  onClose: () => void;
  onSave: (payload: {
    nis: string;
    namaLengkap: string;
    jenisKelamin: Gender;
    kelas: string;
    kamar: string;
    namaWali: string;
    noHpWali: string;
    aktif: boolean;
  }) => Promise<void>;
}

export function SantriFormModal({ initial, onClose, onSave }: SantriFormModalProps) {
  const [nis, setNis] = useState(initial?.nis ?? '');
  const [namaLengkap, setNamaLengkap] = useState(initial?.namaLengkap ?? '');
  const [jenisKelamin, setJenisKelamin] = useState<Gender>(initial?.jenisKelamin ?? 'PUTRA');
  const [kelas, setKelas] = useState(initial?.kelas ?? '');
  const [kamar, setKamar] = useState(initial?.kamar ?? '');
  const [namaWali, setNamaWali] = useState(initial?.namaWali ?? '');
  const [noHpWali, setNoHpWali] = useState(initial?.noHpWali ?? '');
  const [aktif, setAktif] = useState(initial?.aktif ?? true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!nis.trim() || !namaLengkap.trim() || !kelas.trim() || !kamar.trim() || !namaWali.trim()) {
      setError('Semua kolom bertanda bintang (*) wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        nis: nis.trim(),
        namaLengkap: namaLengkap.trim(),
        jenisKelamin,
        kelas: kelas.trim(),
        kamar: kamar.trim(),
        namaWali: namaWali.trim(),
        noHpWali: noHpWali.trim(),
        aktif,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan data santri.');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-[#111F19] border border-slate-200 dark:border-[#243B31] rounded-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-[#0D4F35] text-white">
          <h3 className="text-base font-bold">{initial ? 'Edit Data Santri' : 'Tambah Santri Baru'}</h3>
          <button type="button" onClick={onClose} aria-label="Tutup form santri" className="p-1 rounded hover:bg-white/10 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="s-nis" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nomor Induk Santri (NIS) *</label>
              <input id="s-nis" type="text" value={nis} onChange={(e) => setNis(e.target.value)} required className="w-full px-3 py-2 text-sm font-mono-num bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg" />
            </div>
            <div>
              <label htmlFor="s-jk" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Jenis Kelamin *</label>
              <select id="s-jk" value={jenisKelamin} onChange={(e) => setJenisKelamin(e.target.value as Gender)} className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg">
                <option value="PUTRA">Santri Putra</option>
                <option value="PUTRI">Santri Putri</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="s-nama" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap Santri *</label>
            <input id="s-nama" type="text" value={namaLengkap} onChange={(e) => setNamaLengkap(e.target.value)} required className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="s-kelas" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Kelas *</label>
              <input id="s-kelas" type="text" value={kelas} onChange={(e) => setKelas(e.target.value)} placeholder="Contoh: VII A" required className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg" />
            </div>
            <div>
              <label htmlFor="s-kamar" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Kamar / Asrama *</label>
              <input id="s-kamar" type="text" value={kamar} onChange={(e) => setKamar(e.target.value)} placeholder="Contoh: Al-Fatih 01" required className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="s-wali" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Orang Tua / Wali *</label>
              <input id="s-wali" type="text" value={namaWali} onChange={(e) => setNamaWali(e.target.value)} required className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg" />
            </div>
            <div>
              <label htmlFor="s-hp" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">No. Telepon Wali</label>
              <input id="s-hp" type="text" value={noHpWali} onChange={(e) => setNoHpWali(e.target.value)} placeholder="08..." className="w-full px-3 py-2 text-sm font-mono-num bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg" />
            </div>
          </div>

          {initial && (
            <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 pt-1">
              <input type="checkbox" checked={aktif} onChange={(e) => setAktif(e.target.checked)} className="rounded border-slate-300 text-[#0D4F35]" />
              <span>Santri berstatus aktif</span>
            </label>
          )}

          {error && (
            <p className="text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 p-2.5 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-[#2D473B] rounded-lg cursor-pointer">Batal</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-[#0D4F35] hover:bg-[#093825] rounded-lg cursor-pointer">
              {saving ? 'Menyimpan...' : 'Simpan Data Santri'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface IdentifySantriModalProps {
  transaction: TransferTransaction;
  onClose: () => void;
  onSave: (payload: {
    santriNama: string;
    santriNis?: string;
    jenisKelamin: Gender;
    kelas: string;
    kamar: string;
    namaPengirim: string;
    catatanKoreksi?: string;
  }) => Promise<void>;
}

export function IdentifySantriModal({ transaction, onClose, onSave }: IdentifySantriModalProps) {
  const [santriNama, setSantriNama] = useState(
    transaction.belumAdaNama || transaction.santriNama === 'Belum Ada Nama' ? '' : transaction.santriNama
  );
  const [santriNis, setSantriNis] = useState(transaction.santriNis === '-' ? '' : transaction.santriNis);
  const [jenisKelamin, setJenisKelamin] = useState<Gender>(transaction.jenisKelamin);
  const [kelas, setKelas] = useState(transaction.kelas === '-' ? '' : transaction.kelas);
  const [kamar, setKamar] = useState(transaction.kamar === '-' ? '' : transaction.kamar);
  const [namaPengirim, setNamaPengirim] = useState(
    transaction.namaPengirim === 'Belum Diketahui' ? '' : transaction.namaPengirim
  );
  const [catatanKoreksi, setCatatanKoreksi] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!santriNama.trim() || !kelas.trim() || !kamar.trim()) {
      setError('Nama santri, kelas, dan kamar wajib diisi untuk melengkapi identitas transfer.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        santriNama: santriNama.trim(),
        santriNis: santriNis.trim() || undefined,
        jenisKelamin,
        kelas: kelas.trim(),
        kamar: kamar.trim(),
        namaPengirim: namaPengirim.trim() || transaction.namaPengirim,
        catatanKoreksi: catatanKoreksi.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan koreksi identitas santri.');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-[#111F19] border border-slate-200 dark:border-[#243B31] rounded-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-[#0D4F35] text-white">
          <div className="flex items-center gap-2.5">
            <UserCheck className="w-5 h-5 text-[#E5C158]" aria-hidden="true" />
            <h3 className="text-base font-bold">Koreksi & Lengkapi Nama Santri</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal koreksi nama"
            className="p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-[#FBF6E6] dark:bg-amber-950/35 border border-[#E5C158]/70 dark:border-amber-700/60 rounded-lg p-4 text-sm space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-amber-900 dark:text-amber-200">Transfer Belum Ada Nama</span>
              <span className="font-mono-num text-xs text-slate-600 dark:text-slate-300">{transaction.kodeTransaksi}</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300">
              Tanggal {formatTanggalIndonesia(transaction.tanggalTransfer)} · {transaction.metodeTransfer}
              {transaction.nomorReferensi ? ` · Ref ${transaction.nomorReferensi}` : ''} ·{' '}
              {getCategoryLabel(transaction.kategori, transaction.subKategori)}
            </p>
            <p className="pt-1 text-base font-bold text-[#0D4F35] dark:text-emerald-300 font-mono-num">
              Nominal Masuk: {formatRupiah(transaction.nominal)}
            </p>
            {transaction.catatan && (
              <p className="text-xs text-slate-600 dark:text-slate-400">Catatan awal: {transaction.catatan}</p>
            )}
          </div>

          <div>
            <label htmlFor="id-santri-nama" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Lengkap Santri *
            </label>
            <input
              id="id-santri-nama"
              type="text"
              value={santriNama}
              onChange={(e) => setSantriNama(e.target.value)}
              placeholder="Ketik nama lengkap santri"
              required
              autoFocus
              className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D4F35]/20 focus:border-[#0D4F35]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="id-santri-jk" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Jenis Kelamin *
              </label>
              <select
                id="id-santri-jk"
                value={jenisKelamin}
                onChange={(e) => setJenisKelamin(e.target.value as Gender)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg"
              >
                <option value="PUTRA">Santri Putra</option>
                <option value="PUTRI">Santri Putri</option>
              </select>
            </div>
            <div>
              <label htmlFor="id-santri-nis" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                NIS (Opsional)
              </label>
              <input
                id="id-santri-nis"
                type="text"
                value={santriNis}
                onChange={(e) => setSantriNis(e.target.value)}
                placeholder="Kosongkan jika belum ada"
                className="w-full px-3 py-2 text-sm font-mono-num bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="id-santri-kelas" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kelas *
              </label>
              <input
                id="id-santri-kelas"
                type="text"
                value={kelas}
                onChange={(e) => setKelas(e.target.value)}
                placeholder="Contoh: VII A"
                required
                className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="id-santri-kamar" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kamar / Asrama *
              </label>
              <input
                id="id-santri-kamar"
                type="text"
                value={kamar}
                onChange={(e) => setKamar(e.target.value)}
                placeholder="Contoh: Al-Fatih 01"
                required
                className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg"
              />
            </div>
          </div>

          <div>
            <label htmlFor="id-pengirim" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Pengirim (Orang Tua / Wali)
            </label>
            <input
              id="id-pengirim"
              type="text"
              value={namaPengirim}
              onChange={(e) => setNamaPengirim(e.target.value)}
              placeholder="Nama pengirim atau pemilik rekening"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg"
            />
          </div>

          <div>
            <label htmlFor="id-catatan" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Catatan Koreksi (Opsional)
            </label>
            <input
              id="id-catatan"
              type="text"
              value={catatanKoreksi}
              onChange={(e) => setCatatanKoreksi(e.target.value)}
              placeholder="Contoh: Wali santri mengonfirmasi bukti transfer via WhatsApp"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 p-2.5 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-[#2D473B] rounded-lg hover:bg-slate-50 dark:hover:bg-[#1B3127] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#0D4F35] hover:bg-[#093825] disabled:opacity-60 rounded-lg cursor-pointer"
            >
              {saving ? 'Menyimpan...' : 'Simpan Koreksi Nama'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
