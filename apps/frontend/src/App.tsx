import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';
import { CarregandoPagina } from '@/components/feedback/CarregandoPagina';
import { AvisoConexao } from '@/components/feedback/AvisoConexao';
import { HomePage } from '@/features/home/HomePage';
import '@/components/feedback/Feedback.css';

const LoginAnalistaPage = lazy(() =>
  import('@/features/auth/analista/LoginAnalistaPage').then((m) => ({ default: m.LoginAnalistaPage })),
);
const AnalistaLayout = lazy(() =>
  import('@/features/laudos/analista/AnalistaLayout').then((m) => ({ default: m.AnalistaLayout })),
);
const AnalistaDashboardPage = lazy(() =>
  import('@/features/laudos/analista/AnalistaDashboardPage').then((m) => ({ default: m.AnalistaDashboardPage })),
);
const AnaliseLaudoPage = lazy(() =>
  import('@/features/laudos/analista/AnaliseLaudoPage').then((m) => ({ default: m.AnaliseLaudoPage })),
);
const ConsultaLaudoPage = lazy(() =>
  import('@/features/auth/cliente/ConsultaLaudoPage').then((m) => ({ default: m.ConsultaLaudoPage })),
);
const LaudoDetalhePage = lazy(() =>
  import('@/features/laudos/cliente/LaudoDetalhePage').then((m) => ({ default: m.LaudoDetalhePage })),
);
const NaoEncontradoPage = lazy(() =>
  import('@/features/erros/NaoEncontradoPage').then((m) => ({ default: m.NaoEncontradoPage })),
);

export function Rotas() {
  const location = useLocation();

  return (
    <ErrorBoundary chaveReinicio={location.pathname}>
      <Suspense fallback={<CarregandoPagina />}>
        <Routes>
          <Route path="/" element={<HomePage />} />

          <Route path="/analista/login" element={<LoginAnalistaPage />} />
          <Route element={<ProtectedRoute perfil="ANALISTA" redirectTo="/analista/login" />}>
            <Route element={<AnalistaLayout />}>
              <Route path="/analista" element={<AnalistaDashboardPage />} />
              <Route path="/analista/analises" element={<Navigate to="/analista" replace />} />
              <Route path="/analista/analises/:protocolo" element={<AnaliseLaudoPage />} />
            </Route>
          </Route>

          <Route path="/cliente" element={<ConsultaLaudoPage />} />
          <Route element={<ProtectedRoute perfil="CLIENTE" redirectTo="/cliente" />}>
            <Route path="/cliente/laudo" element={<LaudoDetalhePage />} />
          </Route>

          <Route path="*" element={<NaoEncontradoPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <a className="pular-conteudo" href="#conteudo">
          Pular para o conteúdo
        </a>
        <Rotas />
        <AvisoConexao />
      </AuthProvider>
    </BrowserRouter>
  );
}
