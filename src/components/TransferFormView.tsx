import { useMemo, useState } from 'react';
import { PlusCircle, CheckCircle2, AlertCircle, UserCheck, HelpCircle } from 'lucide-react';
import {
  formatRupiah,
  formatRupiahDigits,
  getTodayIsoDate,
  hasDuplicateReference,
  parseRupiahInput,
  type CustomCategory,
  type Gender,
  type PaymentMethod,
  type TransferCategory,
  type TransferTransaction,
  type UserRole,
} from '../lib/domain';
import { TransactionTable } from './TransactionTable';

interface TransferFormViewProps {
  transactions: TransferTransaction[];
  customCategories: CustomCategory[];
  userRole: UserRole;
  onSubmitTransfer: (payload: {
    tanggalTransfer: string;
    santriNama: string;
    santriNis?: string;
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
    belumAdaNama?: boolean;
  }) => Promise<TransferTransaction>;
  onSelectSantri: (santriId: number) => void;
  onIdentify: (tx: TransferTransaction) => void;
  onApprove?: (tx: TransferTransaction) => void;
  onPickup: (tx: TransferTransaction) => void;
  onPrintReceipt: (tx: TransferTransaction) => void;
  onEdit: (tx: TransferTransaction) => void;
  onCancel: (tx: TransferTransaction) => void;
  onDelete: (tx: TransferTransaction) => void;
}

const QUICK_NOMINALS = [100000, 250000, 500000, 750000, 1000000];

type IncomingTab = 'HARI_INI' | 'SUDAH_ADA_NAMA' | 'BELUM_ADA_NAMA';

export function TransferFormView({
  transactions,
  customCategories,
  userRole,
  onSubmitTransfer,
  onSelectSantri,
  onIdentify,
  onApprove,
  onPickup,
  onPrintReceipt,
  onEdit,
  onCancel,
  onDelete,
}: TransferFormViewProps) {
  const today = getTodayIsoDate();
  const [tanggalTransfer, setTanggalTransfer] = useState(today);
  const [belumAdaNama, setBelumAdaNama] = useState(false);
  const [santriNama, setSantriNama] = useState('');
  const [santriNis, setSantriNis] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState<Gender>('PUTRA');
  const [kelas, setKelas] = useState('');
  const [kamar, setKamar] = useState('');
  const [namaPengirim, setNamaPengirim] = useState('');
  const [nominalText, setNominalText] = useState('');
  const [kategori, setKategori] = useState<TransferCategory>('BEKAL');
  const [subKategori, setSubKategori] = useState(customCategories[0]?.nama ?? 'Kebutuhan Pribadi');
  const [metodeTransfer, setMetodeTransfer] = useState<PaymentMethod>('BSI');
  const [nomorReferensi, setNomorReferensi] = useState('');
  const [catatan, setCatatan] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<IncomingTab>('HARI_INI');

  const duplicateWarning = useMemo(
    () => hasDuplicateReference(transactions, nomorReferensi),
    [transactions, nomorReferensi]
  );

  const todayTransactions = useMemo(
    () => transactions.filter((t) => t.tanggalTransfer === today),
    [transactions, today]
  );

  const namedTransactions = useMemo(
    () => transactions.filter((t) => !t.belumAdaNama),
    [transactions]
  );

  const unnamedTransactions = useMemo(
    () => transactions.filter((t) => t.belumAdaNama),
    [transactions]
  );

  const namedActiveTotal = useMemo(
    () => namedTransactions.filter((t) => t.status !== 'DIBATALKAN').reduce((s, t) => s + t.nominal, 0),
    [namedTransactions]
  );

  const unnamedActiveTotal = useMemo(
    () => unnamedTransactions.filter((t) => t.status !== 'DIBATALKAN').reduce((s, t) => s + t.nominal, 0),
    [unnamedTransactions]
  );

  const unnamedActiveCount = useMemo(
    () => unnamedTransactions.filter((t) => t.status !== 'DIBATALKAN').length,
    [unnamedTransactions]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (userRole === 'KEPALA_PESANTREN') {
      setError('Kepala Pesantren memiliki akses hanya baca dan tidak dapat menginput transaksi.');
      return;
    }

    if (!belumAdaNama) {
      if (!santriNama.trim()) {
        setError('Nama santri wajib diisi, atau pilih mode "Belum Ada Namanya" jika pengirim belum teridentifikasi.');
        return;
      }

      if (!kelas.trim() || !kamar.trim()) {
        setError('Kelas dan kamar santri wajib diisi.');
        return;
      }

      if (!namaPengirim.trim()) {
        setError('Nama pengirim (orang tua / wali) wajib diisi.');
        return;
      }
    }

    const nominal = parseRupiahInput(nominalText);
    if (!nominal || nominal <= 0) {
      setError('Masukkan nominal transfer yang valid (lebih dari Rp 0).');
      return;
    }

    if (duplicateWarning) {
      setError(
        `Nomor referensi "${nomorReferensi.trim()}" sudah tercatat sebelumnya. Periksa agar tidak terjadi transaksi ganda.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const created = await onSubmitTransfer({
        tanggalTransfer,
        santriNama: belumAdaNama ? 'Belum Ada Nama' : santriNama.trim(),
        santriNis: belumAdaNama ? undefined : santriNis.trim() || undefined,
        jenisKelamin,
        kelas: belumAdaNama ? kelas.trim() || '-' : kelas.trim(),
        kamar: belumAdaNama ? kamar.trim() || '-' : kamar.trim(),
        namaPengirim: belumAdaNama ? namaPengirim.trim() || 'Belum Diketahui' : namaPengirim.trim(),
        nominal,
        kategori,
        subKategori: kategori === 'LAINNYA' ? subKategori : kategori === 'SPP' ? 'Uang SPP' : 'Uang Bekal',
        metodeTransfer,
        nomorReferensi: nomorReferensi.trim(),
        catatan: catatan.trim(),
        belumAdaNama,
      });
      setSuccessMsg(
        belumAdaNama
          ? `Uang masuk tanpa nama (${created.kodeTransaksi}) sebesar ${formatRupiah(created.nominal)} berhasil dicatat dan dapat dikoreksi kapan saja.`
          : `Transfer ${created.kodeTransaksi} untuk ${created.santriNama} sebesar ${formatRupiah(created.nominal)} berhasil dicatat.`
      );
      if (belumAdaNama) {
        setActiveTab('BELUM_ADA_NAMA');
      }
      setSantriNama('');
      setSantriNis('');
      setKelas('');
      setKamar('');
      setNamaPengirim('');
      setNominalText('');
      setNomorReferensi('');
      setCatatan('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan transaksi transfer.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Pencatatan Transfer Masuk</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Input manual setiap uang transfer masuk dari orang tua/wali santri beserta kategori kebutuhan dan nomor referensi bank.
        </p>
      </div>

      {userRole === 'KEPALA_PESANTREN' ? (
        <div className="bg-amber-50 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-700/60 rounded-xl p-5 text-sm text-amber-900 dark:text-amber-200">
          Akun <strong>Kepala Pesantren</strong> bersifat pengawasan (hanya baca). Pencatatan transfer masuk dilakukan
          oleh Operator atau Admin Tata Usaha.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-[#111F19] border border-[#DCE4DF] dark:border-[#243B31] rounded-xl p-6 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[#0D4F35] dark:text-emerald-300 uppercase tracking-wider">
                  1. Data Santri & Pengirim (Input Manual)
                </h3>
                <div className="inline-flex items-center gap-1 p-1 bg-[#F1F5F2] dark:bg-[#0D1914] rounded-lg self-start">
                  <button
                    type="button"
                    onClick={() => setBelumAdaNama(false)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      !belumAdaNama ? 'bg-[#0D4F35] text-white' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Sudah Ada Namanya
                  </button>
                  <button
                    type="button"
                    onClick={() => setBelumAdaNama(true)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      belumAdaNama ? 'bg-amber-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Belum Ada Namanya
                  </button>
                </div>
              </div>

              {belumAdaNama && (
                <div className="p-3.5 bg-[#FBF6E6] dark:bg-amber-950/35 border border-[#E5C158]/80 dark:border-amber-700/60 rounded-lg text-xs text-amber-950 dark:text-amber-200 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-amber-700 dark:text-amber-300 shrink-0" aria-hidden="true" />
                    <span>Mode Transfer Masuk Tanpa Nama Santri</span>
                  </p>
                  <p className="text-amber-900 dark:text-amber-200/85 leading-relaxed">
                    Uang masuk akan tercatat di daftar <strong>Belum Ada Namanya</strong> tanpa mewajibkan nama santri,
                    kelas, atau kamar. Anda dapat menekan tombol <strong>Koreksi Nama</strong> nanti setelah wali/santri
                    mengonfirmasi bukti transfer.
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="tanggal-transfer" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tanggal Transfer *
                </label>
                <input
                  id="tanggal-transfer"
                  type="date"
                  value={tanggalTransfer}
                  onChange={(e) => setTanggalTransfer(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D4F35]/20 focus:border-[#0D4F35]"
                />
              </div>

              {!belumAdaNama ? (
                <>
                  <div>
                    <label htmlFor="nama-santri" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nama Santri *
                    </label>
                    <input
                      id="nama-santri"
                      type="text"
                      value={santriNama}
                      onChange={(e) => setSantriNama(e.target.value)}
                      placeholder="Ketik nama lengkap santri"
                      required
                      className="w-full px-3 py-2.5 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-[#2D473B] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D4F35]/20 focus:border-[#0D4F35]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="jenis-kelamin" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Jenis Kelamin *
                      </label>
                      <select
                        id="jenis-kelamin"
                        value={jenisKelamin}
                        onChange={(e) => setJenisKelamin(e.target.value as Gender)}
                        className="w-full px-3 py-2.5 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D4F35]/20 focus:border-[#0D4F35]"
                      >
                        <option value="PUTRA">Santri Putra</option>
                        <option value="PUTRI">Santri Putri</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="nis-santri" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Nomor Induk Santri / NIS (Opsional)
                      </label>
                      <input
                        id="nis-santri"
                        type="text"
                        value={santriNis}
                        onChange={(e) => setSantriNis(e.target.value)}
                        placeholder="Kosongkan jika tidak ada"
                        className="w-full px-3 py-2.5 text-sm font-mono-num bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-[#2D473B] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D4F35]/20 focus:border-[#0D4F35]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="kelas-santri" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Kelas *
                      </label>
                      <input
                        id="kelas-santri"
                        type="text"
                        value={kelas}
                        onChange={(e) => setKelas(e.target.value)}
                        placeholder="Contoh: VII A / X IPA 1"
                        required
                        className="w-full px-3 py-2.5 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-[#2D473B] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D4F35]/20 focus:border-[#0D4F35]"
                      />
                    </div>

                    <div>
                      <label htmlFor="kamar-santri" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Kamar / Asrama *
                      </label>
                      <input
                        id="kamar-santri"
                        type="text"
                        value={kamar}
                        onChange={(e) => setKamar(e.target.value)}
                        placeholder="Contoh: Al-Fatih 01"
                        required
                        className="w-full px-3 py-2.5 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-[#2D473B] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D4F35]/20 focus:border-[#0D4F35]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="nama-pengirim" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nama Pengirim (Orang Tua / Wali) *
                    </label>
                    <input
                      id="nama-pengirim"
                      type="text"
                      value={namaPengirim}
                      onChange={(e) => setNamaPengirim(e.target.value)}
                      placeholder="Nama pengirim di bukti transfer"
                      required
                      className="w-full px-3 py-2.5 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-[#2D473B] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D4F35]/20 focus:border-[#0D4F35]"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="jenis-kelamin-anon" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Asrama Sementara (Opsional)
                      </label>
                      <select
                        id="jenis-kelamin-anon"
                        value={jenisKelamin}
                        onChange={(e) => setJenisKelamin(e.target.value as Gender)}
                        className="w-full px-3 py-2.5 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D4F35]/20 focus:border-[#0D4F35]"
                      >
                        <option value="PUTRA">Sementara Putra (bisa dikoreksi)</option>
                        <option value="PUTRI">Sementara Putri (bisa dikoreksi)</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="nama-pengirim-anon" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Nama Pengirim di Rekening (Opsional)
                      </label>
                      <input
                        id="nama-pengirim-anon"
                        type="text"
                        value={namaPengirim}
                        onChange={(e) => setNamaPengirim(e.target.value)}
                        placeholder="Kosongkan jika belum diketahui"
                        className="w-full px-3 py-2.5 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-[#2D473B] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D4F35]/20 focus:border-[#0D4F35]"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#0D4F35] dark:text-emerald-300 uppercase tracking-wider">2. Rincian Dana & Metode Transfer</h3>

              <div>
                <label htmlFor="nominal-transfer" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nominal Transfer (Rupiah) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500 dark:text-slate-400">Rp</span>
                  <input
                    id="nominal-transfer"
                    type="text"
                    inputMode="numeric"
                    value={nominalText}
                    onChange={(e) => setNominalText(formatRupiahDigits(e.target.value))}
                    placeholder="500.000"
                    required
                    className="w-full pl-11 pr-4 py-2.5 text-base font-mono-num font-bold text-[#0D4F35] dark:text-emerald-300 bg-white dark:bg-[#0D1914] placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-[#2D473B] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D4F35]/25 focus:border-[#0D4F35]"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {QUICK_NOMINALS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setNominalText(formatRupiahDigits(String(amt)))}
                      className="px-2.5 py-1 text-xs font-mono-num font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#182C23] hover:bg-[#EFF6F2] dark:hover:bg-[#1E3A2D] hover:text-[#0D4F35] dark:hover:text-emerald-300 border border-slate-200 dark:border-[#2D473B] rounded-md cursor-pointer"
                    >
                      {formatRupiah(amt)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="jenis-uang" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Jenis Uang *
                  </label>
                  <select
                    id="jenis-uang"
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value as TransferCategory)}
                    className="w-full px-3 py-2.5 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D4F35]/20 focus:border-[#0D4F35]"
                  >
                    <option value="BEKAL">Uang Bekal</option>
                    <option value="SPP">Uang SPP</option>
                    <option value="LAINNYA">Uang Lainnya</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="metode-transfer" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Metode Transfer *
                  </label>
                  <select
                    id="metode-transfer"
                    value={metodeTransfer}
                    onChange={(e) => setMetodeTransfer(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2.5 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D4F35]/20 focus:border-[#0D4F35]"
                  >
                    <option value="BSI">BSI (Bank Syariah Indonesia)</option>
                    <option value="BRI">BRI</option>
                    <option value="BCA">BCA</option>
                    <option value="Mandiri">Mandiri</option>
                    <option value="Bank Lainnya">Bank Lainnya</option>
                    <option value="Tunai">Setoran Tunai Tata Usaha</option>
                  </select>
                </div>
              </div>

              {kategori === 'SPP' && (
                <div className="p-3 bg-[#FBF6E6] dark:bg-amber-950/35 border border-[#E5C158]/60 dark:border-amber-700/60 rounded-lg text-xs text-amber-900 dark:text-amber-200">
                  <strong>Catatan Pemisahan:</strong> Uang SPP dicatat dengan status khusus{' '}
                  <em>SPP Belum Diproses</em> dan tidak digabungkan ke dalam saldo Uang Bekal yang harus diambil santri.
                </div>
              )}

              {kategori === 'LAINNYA' && (
                <div>
                  <label htmlFor="sub-kategori" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Sub-Kategori Uang Lainnya *
                  </label>
                  <select
                    id="sub-kategori"
                    value={subKategori}
                    onChange={(e) => setSubKategori(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-[#2D473B] rounded-lg"
                  >
                    {customCategories.map((c) => (
                      <option key={c.id} value={c.nama}>
                        {c.nama}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="nomor-referensi" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor Referensi Bank (Cegah Transaksi Ganda)
                </label>
                <input
                  id="nomor-referensi"
                  type="text"
                  value={nomorReferensi}
                  onChange={(e) => setNomorReferensi(e.target.value)}
                  placeholder="Contoh: BSI-20261112-901"
                  className={`w-full px-3 py-2.5 text-sm font-mono-num border rounded-lg focus:outline-none focus:ring-2 ${
                    duplicateWarning
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 focus:ring-rose-500/20'
                      : 'bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border-slate-300 dark:border-[#2D473B] focus:ring-[#0D4F35]/20 focus:border-[#0D4F35]'
                  }`}
                />
                {duplicateWarning && (
                  <p className="mt-1 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Nomor referensi ini sudah terdaftar pada transaksi aktif lain.</span>
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="catatan-transfer" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan Tambahan
                </label>
                <input
                  id="catatan-transfer"
                  type="text"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Keterangan tambahan dari wali santri (opsional)"
                  className="w-full px-3 py-2.5 text-sm bg-white dark:bg-[#0D1914] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-[#2D473B] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D4F35]/20 focus:border-[#0D4F35]"
                />
              </div>
            </div>
          </div>

          {error && (
            <div role="alert" className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-sm text-rose-800 dark:text-rose-300 rounded-lg">
              {error}
            </div>
          )}

          {successMsg && (
            <div role="status" className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-900 dark:text-emerald-200 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" aria-hidden="true" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-end pt-2 border-t border-slate-100 dark:border-[#243B31]">
            <button
              type="submit"
              disabled={submitting || duplicateWarning}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0D4F35] hover:bg-[#093825] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" aria-hidden="true" />
              <span>{submitting ? 'Menyimpan Transaksi...' : 'Simpan Transfer Masuk'}</span>
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <button
            type="button"
            onClick={() => setActiveTab('SUDAH_ADA_NAMA')}
            className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'SUDAH_ADA_NAMA'
                ? 'bg-[#EFF6F2] dark:bg-[#163125] border-[#0D4F35] dark:border-emerald-400 ring-2 ring-[#0D4F35]/20 dark:ring-emerald-400/20'
                : 'bg-white dark:bg-[#111F19] border-[#DCE4DF] dark:border-[#243B31] hover:border-[#0D4F35]/50'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Uang Masuk Sudah Ada Namanya</span>
              <UserCheck className="w-4 h-4 text-[#0D4F35] dark:text-emerald-400" aria-hidden="true" />
            </div>
            <p className="mt-1.5 text-xl font-bold font-mono-num text-[#0D4F35] dark:text-emerald-300">{formatRupiah(namedActiveTotal)}</p>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              {namedTransactions.filter((t) => t.status !== 'DIBATALKAN').length} transaksi aktif teridentifikasi nama santri
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('BELUM_ADA_NAMA')}
            className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'BELUM_ADA_NAMA'
                ? 'bg-[#FBF6E6] dark:bg-amber-950/35 border-amber-600 dark:border-amber-400 ring-2 ring-amber-500/20'
                : 'bg-white dark:bg-[#111F19] border-[#DCE4DF] dark:border-[#243B31] hover:border-amber-500/60'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Uang Masuk Belum Ada Namanya</span>
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            </div>
            <p className="mt-1.5 text-xl font-bold font-mono-num text-amber-700 dark:text-amber-300">{formatRupiah(unnamedActiveTotal)}</p>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              {unnamedActiveCount} transaksi belum memiliki nama · Klik untuk melihat & koreksi nama
            </p>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {activeTab === 'HARI_INI'
              ? `Transfer Masuk Hari Ini (${todayTransactions.length})`
              : activeTab === 'SUDAH_ADA_NAMA'
                ? `Uang Masuk Sudah Ada Namanya (${namedTransactions.length})`
                : `Uang Masuk Belum Ada Namanya (${unnamedTransactions.length})`}
          </h3>

          <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#EAEFEC] dark:bg-[#0D1914] rounded-lg self-start">
            <button
              type="button"
              onClick={() => setActiveTab('HARI_INI')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'HARI_INI'
                  ? 'bg-[#0D4F35] text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Hari Ini ({todayTransactions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('SUDAH_ADA_NAMA')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'SUDAH_ADA_NAMA'
                  ? 'bg-[#0D4F35] text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Sudah Ada Namanya ({namedTransactions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('BELUM_ADA_NAMA')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'BELUM_ADA_NAMA'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Belum Ada Namanya ({unnamedTransactions.length})
            </button>
          </div>
        </div>

        <TransactionTable
          transactions={
            activeTab === 'HARI_INI'
              ? todayTransactions
              : activeTab === 'SUDAH_ADA_NAMA'
                ? namedTransactions
                : unnamedTransactions
          }
          userRole={userRole}
          lockedIdentitasNama={
            activeTab === 'SUDAH_ADA_NAMA'
              ? 'SUDAH_ADA_NAMA'
              : activeTab === 'BELUM_ADA_NAMA'
                ? 'BELUM_ADA_NAMA'
                : undefined
          }
          emptyMessage={
            activeTab === 'HARI_INI'
              ? 'Belum ada transfer masuk yang dicatat hari ini.'
              : activeTab === 'SUDAH_ADA_NAMA'
                ? 'Belum ada transfer masuk yang sudah teridentifikasi namanya.'
                : 'Semua uang masuk sudah memiliki nama santri.'
          }
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
    </div>
  );
}
