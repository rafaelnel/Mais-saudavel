import React, { useState } from 'react';
import { Download, Share, Smartphone, Monitor, Check, X } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  theme?: 'dark' | 'light';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ theme = 'dark' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // If already running as an installed standalone PWA, hide the install button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full transition-all whitespace-nowrap shrink-0 shadow-xs ${
          isInstallable
            ? 'bg-[#DDA3E6] text-[#582B5E] hover:bg-[#e5b5ed]'
            : theme === 'dark'
            ? 'bg-[#DDA3E6]/20 text-[#DDA3E6] hover:bg-[#DDA3E6]/30 border border-[#DDA3E6]/30'
            : 'bg-[#DDA3E6]/35 text-[#582B5E] hover:bg-[#DDA3E6]/50 border border-[#DDA3E6]/50'
        }`}
        title="Instalar aplicativo Mais Saudável no seu dispositivo"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Baixar App</span>
      </button>

      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-[28px] bg-[#1B1C20] border border-white/10 p-6 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#DDA3E6] text-[#582B5E] flex items-center justify-center shrink-0 font-bold shadow-sm">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-display font-bold text-white">
                    Instalar Mais Saudável (PWA)
                  </h3>
                  <p className="text-xs text-white/60">
                    Acesse direto da tela inicial como um aplicativo nativo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-5 space-y-3 text-xs">
              {isIOS ? (
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-[#8AC4F2]">
                    <Share className="w-4 h-4" />
                    <span>No iPhone ou iPad (Safari):</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-white/80 leading-relaxed">
                    <li>
                      Toque no botão <strong>Compartilhar</strong> na barra inferior do Safari.
                    </li>
                    <li>
                      Role para baixo e toque em <strong>Adicionar à Tela de Início</strong>.
                    </li>
                    <li>
                      Confirme tocando em <strong>Adicionar</strong> no canto superior direito.
                    </li>
                  </ol>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-[#8AC4F2]">
                      <Smartphone className="w-4 h-4" />
                      <span>No Android (Chrome / Edge / Samsung):</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1.5 text-white/80 leading-relaxed">
                      <li>
                        Abra o link direto (fora de abas embutidas) e toque no menu{' '}
                        <strong>⋮ (três pontos)</strong> do navegador.
                      </li>
                      <li>
                        Selecione <strong>Instalar aplicativo</strong> ou{' '}
                        <strong>Adicionar à tela inicial</strong>.
                      </li>
                    </ol>
                  </div>

                  <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-[#DDA3E6]">
                      <Monitor className="w-4 h-4" />
                      <span>No Computador (Chrome / Edge):</span>
                    </div>
                    <p className="text-white/80 leading-relaxed">
                      Clique no ícone de <strong>Instalar Mais Saudável</strong> no lado direito da
                      barra de endereços do navegador (ou no menu ⋮ →{' '}
                      <em>Salvar e compartilhar → Instalar página como app</em>).
                    </p>
                  </div>
                </>
              )}

              <div className="rounded-2xl bg-[#8AC4F2]/10 border border-[#8AC4F2]/25 p-3 flex items-center gap-2.5 text-[#8AC4F2]">
                <Check className="w-4 h-4 shrink-0" />
                <span>
                  Funciona em tela cheia, com ícone próprio e suporte a cache offline.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="mt-5 w-full py-2.5 rounded-full bg-[#8AC4F2] hover:bg-[#9ed0f8] text-[#0A468E] font-bold text-xs transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-4 z-50 flex items-center gap-2 rounded-full bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-lg">
      <span className="h-2 w-2 rounded-full bg-slate-950 animate-pulse" />
      Modo Offline — Usando dados em cache local
    </div>
  );
};
