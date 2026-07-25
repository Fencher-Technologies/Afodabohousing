import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';

const APK_URL = import.meta.env.VITE_MOBILE_APK_URL || '';
const STORAGE_KEY = 'afodabo-app-banner-dismissed';

function isMobileBrowser(): boolean {
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export default function MobileAppBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!APK_URL) return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;
    if (isMobileBrowser()) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div className="sticky top-16 z-40 bg-gradient-to-r from-primary/95 to-primary/90 backdrop-blur-sm text-primary-foreground border-b border-primary-foreground/10">
      <div className="flex items-center gap-3 px-4 py-2.5 max-w-7xl mx-auto">
        <div className="h-9 w-9 rounded-xl bg-primary-foreground/15 flex items-center justify-center shrink-0">
          <Smartphone className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">Get the Afodabo Housing app</p>
          <p className="text-xs text-primary-foreground/70 truncate">Install for easy access on your phone</p>
        </div>
        <a href={APK_URL} download
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary-foreground text-primary text-xs font-bold hover:bg-primary-foreground/90 transition-colors shrink-0">
          <Download className="h-3.5 w-3.5" /> Install
        </a>
        <button onClick={() => { setVisible(false); sessionStorage.setItem(STORAGE_KEY, '1'); }}
          className="p-1 rounded-lg hover:bg-primary-foreground/10 transition-colors shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}