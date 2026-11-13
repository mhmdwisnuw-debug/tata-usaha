import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  formatRupiah,
  formatTanggalIndonesia,
  getCategoryLabel,
  getStatusLabel,
  getTodayIsoDate,
  type PesantrenSettings,
  type TransferTransaction,
} from './domain';

export function exportTransactionsToExcel(
  title: string,
  subtitle: string,
  rows: TransferTransaction[],
  totalNominal: number,
  settings: PesantrenSettings
): void {
  const headerRows = [
    [settings.namaPesantren],
    [`TATA USAHA KEUANGAN — ${title.toUpperCase()}`],
    [subtitle],
    [`Dicetak: ${formatTanggalIndonesia(getTodayIsoDate())}`],
    [],
    [
      'No',
      'Kode Transaksi',
      'Tanggal Transfer',
      'NIS',
      'Nama Santri',
      'Putra/Putri',
      'Kelas',
      'Kamar',
      'Nama Pengirim',
      'Kategori',
      'Metode',
      'No. Referensi',
      'Nominal (Rp)',
      'Status',
      'Diinput Oleh',
      'Disetujui Oleh (Admin)',
      'Tanggal Disetujui',
      'Tanggal Ambil/Proses',
      'Petugas Serah',
    ],
  ];

  const dataRows = rows.map((tx, idx) => [
    idx + 1,
    tx.kodeTransaksi,
    tx.tanggalTransfer,
    tx.santriNis,
    tx.santriNama,
    tx.jenisKelamin,
    tx.kelas,
    tx.kamar,
    tx.namaPengirim,
    getCategoryLabel(tx.kategori, tx.subKategori),
    tx.metodeTransfer,
    tx.nomorReferensi || '-',
    tx.nominal,
    getStatusLabel(tx.status),
    tx.inputOlehNama,
    tx.disetujuiOlehNama || 'Belum disetujui',
    tx.tanggalDisetujui ? `${tx.tanggalDisetujui} ${tx.jamDisetujui ?? ''}`.trim() : '-',
    tx.tanggalPengambilan ? `${tx.tanggalPengambilan} ${tx.jamPengambilan ?? ''}`.trim() : '-',
    tx.petugasSerahNama || '-',
  ]);

  const footerRow = [
    '',
    '',
    '',
    '',
    'TOTAL NOMINAL KESELURUHAN',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    totalNominal,
    `${rows.length} Transaksi`,
    '',
    '',
    '',
    '',
    '',
  ];

  const ws = XLSX.utils.aoa_to_sheet([...headerRows, ...dataRows, [], footerRow]);
  ws['!cols'] = [
    { wch: 5 },
    { wch: 18 },
    { wch: 14 },
    { wch: 11 },
    { wch: 24 },
    { wch: 11 },
    { wch: 10 },
    { wch: 14 },
    { wch: 22 },
    { wch: 22 },
    { wch: 12 },
    { wch: 18 },
    { wch: 16 },
    { wch: 20 },
    { wch: 24 },
    { wch: 24 },
    { wch: 18 },
    { wch: 18 },
    { wch: 24 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan Transfer');
  const safeName = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  XLSX.writeFile(wb, `${safeName}-${getTodayIsoDate()}.xlsx`);
}

export function exportTransactionsToPdf(
  title: string,
  subtitle: string,
  rows: TransferTransaction[],
  totalNominal: number,
  settings: PesantrenSettings
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFillColor(13, 79, 53);
  doc.rect(0, 0, 297, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text(settings.namaPesantren, 14, 10);
  doc.setFontSize(10);
  doc.setTextColor(235, 214, 145);
  doc.text(`TATA USAHA — ${title}`, 14, 17);

  doc.setTextColor(40, 50, 45);
  doc.setFontSize(9);
  doc.text(`${subtitle}  |  Total Data: ${rows.length} transaksi  |  Dicetak: ${formatTanggalIndonesia(getTodayIsoDate())}`, 14, 31);

  autoTable(doc, {
    startY: 35,
    head: [
      [
        'No',
        'Tanggal',
        'NIS / Santri',
        'L/P',
        'Kelas & Kamar',
        'Pengirim',
        'Kategori',
        'Metode',
        'Nominal',
        'Status',
        'Input & Persetujuan Admin',
      ],
    ],
    body: rows.map((tx, idx) => [
      String(idx + 1),
      tx.tanggalTransfer,
      `${tx.santriNama}\n(${tx.santriNis})`,
      tx.jenisKelamin === 'PUTRA' ? 'Putra' : 'Putri',
      `${tx.kelas} · ${tx.kamar}`,
      tx.namaPengirim,
      getCategoryLabel(tx.kategori, tx.subKategori),
      tx.metodeTransfer,
      formatRupiah(tx.nominal),
      getStatusLabel(tx.status),
      [
        `Input: ${tx.inputOlehNama}`,
        `Admin: ${tx.disetujuiOlehNama || 'Belum disetujui'}`,
        tx.petugasSerahNama ? `Serah: ${tx.petugasSerahNama}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    ]),
    foot: [
      [
        '',
        '',
        'TOTAL NOMINAL LAPORAN',
        '',
        '',
        '',
        '',
        `${rows.length} trx`,
        formatRupiah(totalNominal),
        '',
        '',
      ],
    ],
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: [20, 35, 28],
    },
    headStyles: {
      fillColor: [13, 79, 53],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    footStyles: {
      fillColor: [243, 247, 244],
      textColor: [13, 79, 53],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 9 },
      8: { halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [250, 252, 250],
    },
  });

  const safeName = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  doc.save(`${safeName}-${getTodayIsoDate()}.pdf`);
}
