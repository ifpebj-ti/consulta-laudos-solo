import { HomeHero } from './HomeHero';
import { LayoutEntrada } from './LayoutEntrada';
import { useTituloPagina } from '@/hooks/useTituloPagina';

export function HomePage() {
  useTituloPagina();

  return (
    <LayoutEntrada tituloId="home-titulo">
      <HomeHero />
    </LayoutEntrada>
  );
}
