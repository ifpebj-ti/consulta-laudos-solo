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

function carregarScriptGoogle(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const existente = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existente) {
      existente.addEventListener('load', () => resolve());
      existente.addEventListener('error', () => reject(new Error('Falha ao carregar o script do Google.')));
      return;
    }
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Falha ao carregar o script do Google.'));
    document.head.appendChild(script);
  });
}

/**
 * Inicializa o Google Identity Services e renderiza o botão oficial do Google
 * (estilizado o mais próximo possível do protótipo) dentro do container retornado.
 * Sem um GOOGLE_CLIENT_ID configurado, o login real é indisponível — reportamos
 * isso como erro em vez de simular um token falso.
 */
export function useGoogleIdentity(clientId: string, onCredential: (idToken: string) => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) {
      setErro('Login com Google não configurado (defina VITE_GOOGLE_CLIENT_ID).');
      return;
    }

    let cancelado = false;

    carregarScriptGoogle()
      .then(() => {
        if (cancelado || !window.google || !containerRef.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => onCredentialRef.current(response.credential),
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
      .catch((erroCarregamento: Error) => setErro(erroCarregamento.message));

    return () => {
      cancelado = true;
    };
  }, [clientId]);

  return { containerRef, erro };
}
