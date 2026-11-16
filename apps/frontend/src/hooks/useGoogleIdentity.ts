import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

export const MENSAGEM_FALHA_SCRIPT_GOOGLE =
  'Não foi possível carregar o login do Google. Verifique sua conexão ou se algum bloqueador está impedindo o acesso.';

function carregarScriptGoogle(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const existente = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existente && existente.dataset.falhou !== 'sim') {
      existente.addEventListener('load', () => resolve());
      existente.addEventListener('error', () => reject(new Error(MENSAGEM_FALHA_SCRIPT_GOOGLE)));
      return;
    }
    existente?.remove();
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      script.dataset.falhou = 'sim';
      reject(new Error(MENSAGEM_FALHA_SCRIPT_GOOGLE));
    };
    document.head.appendChild(script);
  });
}

export function useGoogleIdentity(clientId: string, onCredential: (idToken: string) => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    if (!clientId) {
      setErro('Login com Google não configurado (defina VITE_GOOGLE_CLIENT_ID).');
      return;
    }

    let cancelado = false;
    setErro(null);

    carregarScriptGoogle()
      .then(() => {
        if (cancelado || !window.google || !containerRef.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response?.credential) onCredentialRef.current(response.credential);
          },
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'signin_with',
          logo_alignment: 'left',
          locale: 'pt-BR',
          width: 360,
        });
      })
      .catch((erroCarregamento: Error) => {
        if (!cancelado) setErro(erroCarregamento.message);
      });

    return () => {
      cancelado = true;
    };
  }, [clientId, tentativa]);

  return { containerRef, erro, tentarNovamente: () => setTentativa((n) => n + 1) };
}
