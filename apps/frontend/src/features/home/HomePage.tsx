import { HomeHero } from './HomeHero';
import { LayoutEntrada } from './LayoutEntrada';

export function HomePage() {
  return (
    <LayoutEntrada tituloId="home-titulo">
      <HomeHero />
    </LayoutEntrada>
  );
}
