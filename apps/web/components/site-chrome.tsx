import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

/**
 * Site chrome shared by the landing page and the app pages (/create, auth
 * screens), so every public surface reads as the same product. Styling
 * classes come from the landing design system in app/globals.css.
 */
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Form-like home">
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span>form-like</span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Brand />
        <nav className="header-nav" aria-label="Main navigation">
          <a href="https://github.com/gibtang/form-like" target="_blank" rel="noreferrer">
            Open source <ArrowUpRight size={13} aria-hidden="true" />
          </a>
        </nav>
        <div className="header-actions">
          <Link href="/login" className="sign-in-link">Sign in</Link>
          <Link href="/create" className="header-cta">
            Get started <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <Brand />
      <span className="footer-note">Thoughtful forms, without the busywork.</span>
      <nav className="footer-links" aria-label="Footer navigation">
        <a href="https://github.com/gibtang/form-like" target="_blank" rel="noreferrer">Source <ArrowUpRight size={12} aria-hidden="true" /></a>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
      </nav>
      <span className="copyright">© {new Date().getFullYear()} Form-like</span>
    </footer>
  );
}
