import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { HomePage } from '@/features/home/HomePage';
import { LoginAnalistaPage } from '@/features/auth/analista/LoginAnalistaPage';
import { AnaliseLaudoPage } from '@/features/laudos/analista/AnaliseLaudoPage';
import { ConsultaLaudoPage } from '@/features/auth/cliente/ConsultaLaudoPage';
import { LaudoDetalhePage } from '@/features/laudos/cliente/LaudoDetalhePage';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />

          <Route path="/analista/login" element={<LoginAnalistaPage />} />
          <Route element={<ProtectedRoute role="ANALISTA" redirectTo="/analista/login" />}>
            <Route path="/analista/analises" element={<AnaliseLaudoPage />} />
          </Route>

          <Route path="/cliente" element={<ConsultaLaudoPage />} />
          <Route element={<ProtectedRoute role="CLIENTE" redirectTo="/cliente" />}>
            <Route path="/cliente/laudo" element={<LaudoDetalhePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
