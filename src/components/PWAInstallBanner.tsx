import { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton({
  variant = 'sidebar',
}: {
  variant?: 'sidebar' | 'topbar' | 'login';
}) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  async function handleClick() {
    if (isInstallable) {
      const ok = await install();
      if (ok) return;
    }
    setShowGuide(true);
  }

  const buttonClass =
    variant === 'sidebar'
      ? 'w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-[#093825] bg-[#E5C158] hover:bg-[#d8b244] rounded-lg transition-colors cursor-pointer'
      : variant === 'topbar'
        ? 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0D4F35] dark:text-emerald-200 bg-[#EFF6F2] dark:bg-[#15261E] hover:bg-[#DCECE3] dark:hover:bg-[#1C3228] border border-[#0D4F35]/25 dark:border-[#2D473B] rounded-lg transition-colors cursor-pointer whitespace-nowrap'
        : 'inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#0D4F35] dark:text-emerald-200 bg-[#EFF6F2] dark:bg-[#15261E] hover:bg-[#DCECE3] dark:hover:bg-[#1C3228] border border-[#0D4F35]/25 dark:border-[#2D473B] rounded-lg transition-colors cursor-pointer';

  return (
    <>
      <button type="button" onClick={handleClick} className={buttonClass}>
        <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{isInstallable ? 'Pasang Aplikasi' : 'Pasang di HP / Laptop'}</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/55 dark:bg-black/70 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-[#111F19] border border-slate-200 dark:border-[#243B31] rounded-xl w-full max-w-md overflow-hidden text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between px-5 py-4 bg-[#0D4F35] text-white">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#E5C158]" aria-hidden="true" />
                <h3 className="text-sm font-bold">Pasang Aplikasi Tata Usaha</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Tutup panduan instalasi"
                className="p-1 rounded hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-sm">
              <p className="text-slate-600 dark:text-slate-300">
                Aplikasi ini mendukung pemasangan langsung ke layar utama HP (Android / iOS) maupun Desktop agar dapat
                dibuka seperti aplikasi native tanpa bilah browser.
              </p>

              {isIOS ? (
                <div className="p-4 bg-[#F6F8F6] dark:bg-[#15261E] border border-[#DCE4DF] dark:border-[#243B31] rounded-lg space-y-2 text-xs text-slate-700 dark:text-slate-300">
                  <p className="font-bold text-[#0D4F35] dark:text-emerald-300">
                    Langkah Pemasangan di iPhone / iPad (Safari):
                  </p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>
                      Ketuk tombol <strong>Bagikan (Share)</strong> di bilah bawah Safari.
                    </li>
                    <li>
                      Gulir ke bawah dan pilih <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>.
                    </li>
                    <li>
                      Ketuk <strong>Tambah (Add)</strong> untuk menyimpan ikon <em>Tata Usaha</em>.
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="p-4 bg-[#F6F8F6] dark:bg-[#15261E] border border-[#DCE4DF] dark:border-[#243B31] rounded-lg space-y-2 text-xs text-slate-700 dark:text-slate-300">
                  <p className="font-bold text-[#0D4F35] dark:text-emerald-300">
                    Langkah Pemasangan di Android (Chrome) / Desktop:
                  </p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>
                      Buka menu browser (ikon <strong>⋮</strong> di kanan atas Chrome Android atau ikon instal di bilah alamat laptop).
                    </li>
                    <li>
                      Pilih <strong>Tambahkan ke Layar Utama</strong> atau <strong>Instal Aplikasi (Install App)</strong>.
                    </li>
                    <li>
                      Konfirmasi <strong>Pasang</strong> untuk membuka aplikasi dari ikon layar utama.
                    </li>
                  </ol>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="w-full py-2.5 text-xs font-semibold bg-[#0D4F35] hover:bg-[#093825] text-white rounded-lg cursor-pointer"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg no-print"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>Mode Offline — Koneksi internet terputus, data lokal tetap ditampilkan.</span>
    </div>
  );
}
