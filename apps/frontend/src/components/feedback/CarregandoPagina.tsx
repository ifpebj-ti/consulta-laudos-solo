import './Feedback.css';

export function CarregandoPagina({ rotulo = 'Carregando…' }: { rotulo?: string }) {
  return (
    <div className="carregando-pagina" role="status" aria-live="polite">
      <span className="carregando-pagina__trilho" aria-hidden="true" />
      <span className="visually-hidden">{rotulo}</span>
    </div>
  );
}
