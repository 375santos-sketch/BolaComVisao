import React, { useState, useEffect } from 'react';
import logoImg from '../assets/images/bolacomvisao_logo_1786622535530.jpg';

export const InstallPwaBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
  });

  useEffect(() => {
    if (isInstalled) return;

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Check if user dismissed recently
      const dismissed = localStorage.getItem('bolacomvisao_pwa_dismissed');
      if (!dismissed) {
        setShowBanner(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled]);

  const [showGuide, setShowGuide] = useState<boolean>(false);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      setShowGuide(true);
      setTimeout(() => setShowGuide(false), 6000);
      return;
    }
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } catch (e) {
      console.warn('PWA install prompt notice:', e);
      setShowGuide(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('bolacomvisao_pwa_dismissed', `${Date.now()}`);
  };

  if (!showBanner || isInstalled) return null;

  return (
    <>
      <div className="bg-gradient-to-r from-slate-900 via-cyan-950/80 to-slate-900 border-b border-cyan-500/40 px-3 py-2 text-xs flex items-center justify-between gap-3 shadow-lg animate-fadeIn z-30 select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={logoImg}
            alt="BolaComVisão"
            className="w-7 h-7 rounded-lg object-cover border border-cyan-400/60 shrink-0"
          />
          <div className="min-w-0">
            <div className="font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider text-[11px] truncate">
              Instalar BolaComVisão PWA
            </div>
            <div className="text-[10px] text-cyan-200/80 truncate">
              Acesso direto no ecrã principal, rápido e 100% offline no campo 📱
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black font-['Chakra_Petch'] uppercase rounded-lg text-[10px] tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
          >
            Instalar 📲
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors text-xs"
            title="Fechar aviso"
          >
            ✕
          </button>
        </div>
      </div>

      {showGuide && (
        <div className="bg-slate-950 border-b border-cyan-500/50 p-2.5 text-center text-xs font-mono text-cyan-300 animate-fadeIn z-30">
          💡 Para instalar no telemóvel: toque no menu do navegador (<strong>Partilhar 📤</strong> no iPhone ou{' '}
          <strong>⋮</strong> no Android) e selecione <strong>&quot;Adicionar ao ecrã principal&quot;</strong>.
        </div>
      )}
    </>
  );
};
