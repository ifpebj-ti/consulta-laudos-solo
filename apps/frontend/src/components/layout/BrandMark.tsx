import './BrandMark.css';

export function BrandMark({ dark = true }: { dark?: boolean }) {
  return (
    <div className={`brand-mark ${dark ? 'brand-mark--dark' : ''}`.trim()}>
      <div className="brand-mark__logo" aria-hidden="true">
        <div className="brand-mark__logo-grid">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
      <div className="brand-mark__texto">
        <strong>INSTITUTO FEDERAL</strong>
        <span>Pernambuco &middot; Campus Belo Jardim</span>
      </div>
    </div>
  );
}
