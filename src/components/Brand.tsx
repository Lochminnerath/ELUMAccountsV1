/** Logos for ELUM Accounts, swapped for the reversed set on dark grounds. */

export function AccountLockup({ height = 28 }: { height?: number }) {
  // The lockup's viewBox is 434 x 104.
  const width = Math.round((height * 434) / 104);
  return (
    <span className="brand-lockup" style={{ height }}>
      <img className="theme-light-only" src="/brand/account/elum-account-lockup.svg" width={width} height={height} alt="ELUM Account" />
      <img className="theme-dark-only" src="/brand/account/elum-account-lockup-reversed.svg" width={width} height={height} alt="ELUM Account" />
    </span>
  );
}

export function AccountMark({ size = 32 }: { size?: number }) {
  return (
    <span className="brand-mark" style={{ height: size }}>
      <img className="theme-light-only" src="/brand/account/elum-account-mark.svg" width={size} height={size} alt="" />
      <img className="theme-dark-only" src="/brand/account/elum-account-mark-reversed.svg" width={size} height={size} alt="" />
    </span>
  );
}

export type Product = 'elum' | 'write' | 'type' | 'browse' | 'make' | 'store' | 'account' | 'inquire';

/** Monoline product glyphs (handoff Appendix C, plus Account), coloured by CSS. */
const GLYPHS: Record<Product, React.ReactNode> = {
  elum: (
    <>
      <circle cx="8.5" cy="12" r="5.5" />
      <circle cx="15.5" cy="12" r="5.5" />
      <path d="M12 7.8a5.5 5.5 0 0 1 0 8.4a5.5 5.5 0 0 1 0-8.4z" fill="currentColor" stroke="none" />
    </>
  ),
  write: (
    <>
      <circle cx="6.75" cy="12" r="4.25" />
      <circle cx="13.25" cy="12" r="4.25" />
      <circle cx="20.25" cy="15.25" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  type: (
    <>
      <circle cx="6" cy="16.5" r="3.75" />
      <circle cx="12" cy="12" r="3.75" />
      <circle cx="18" cy="7.5" r="3.75" />
    </>
  ),
  browse: (
    <>
      <circle cx="10" cy="10" r="6.5" />
      <circle cx="17.25" cy="17.25" r="3.5" />
    </>
  ),
  make: (
    <>
      <circle cx="8" cy="8" r="4.4" />
      <circle cx="16" cy="8" r="4.4" />
      <circle cx="8" cy="16" r="4.4" />
      <circle cx="16" cy="16" r="4.4" />
    </>
  ),
  store: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="14.5" r="2.6" fill="currentColor" stroke="none" />
    </>
  ),
  account: (
    <>
      <circle cx="12" cy="8" r="4.25" />
      <circle cx="12" cy="16.5" r="6" />
      <path d="M9.2 11.2A6 6 0 0 1 14.8 11.2A4.25 4.25 0 0 1 9.2 11.2Z" fill="currentColor" stroke="none" />
    </>
  ),
  inquire: (
    <>
      <circle cx="12" cy="8.7" r="4.6" />
      <circle cx="8.62" cy="14.55" r="4.6" />
      <circle cx="15.38" cy="14.55" r="4.6" />
      <circle cx="12" cy="12.6" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
};

export function ProductGlyph({ product, size = 20 }: { product: Product; size?: number }) {
  return (
    <svg className="product-glyph" data-product={product} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {GLYPHS[product]}
    </svg>
  );
}
