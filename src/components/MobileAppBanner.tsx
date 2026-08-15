import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';

const APK_URL = import.meta.env.VITE_MOBILE_APK_URL || '';
const STORAGE_KEY = 'axis-app-download-dismissed';

function isIOsBrowser(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export default function MobileAppBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!APK_URL) return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    if (isIOsBrowser()) return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card shadow-lg">
      <div className="flex items-center gap-3 px-4 pt-3">
        <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <Smartphone className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">Get the Axis app</p>
          <p className="text-xs text-muted-foreground truncate">Android APK</p>
        </div>
        <button
          onClick={() => { setVisible(false); localStorage.setItem(STORAGE_KEY, '1'); }}
          className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="px-4 pb-3.5 pt-2">
        <a
          href={APK_URL}
          download
          className="flex items-center justify-center gap-2 h-9 w-full rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
        >
          <Download className="h-4 w-4" /> Download & Install
        </a>
        <p className="text-[11px] text-muted-foreground mt-1.5 text-center">
          Allow "install unknown apps" in your browser settings
        </p>
      </div>
    </div>
  );
}