import { FOOTER_NAV, FOOTER_SERVICES, FOOTER_SOCIALS, FOOTER_CONTACT } from '../../data/landing';

export default function Footer() {
  return (
    <footer>
      <div className="footer-inner-wrap">
        <div className="footer-grid">
          <div>
            <div className="footer-logo">
              <img
                src="/logo-elastic-solutions.png"
                alt="Elastic Solutions"
                style={{ height: 36, width: "auto", maxWidth: 160, objectFit: "contain", display: "block" }}
              />
            </div>
            <p className="footer-desc">Plateforme agricole intelligente qui associe IA et vision par ordinateur pour suivre la santé des cultures et détecter les anomalies en temps réel.</p>
            <div className="footer-socials">
              {FOOTER_SOCIALS.map(({ label, aria }) => (
                <a key={aria} className="footer-social-btn" href="#" aria-label={aria}>{label}</a>
              ))}
            </div>
          </div>

          <div>
            <div className="footer-col-title">Nous contacter</div>
            <div className="footer-contact-list">
              {FOOTER_CONTACT.map(({ icon, text }) => (
                <div key={text} className="footer-contact-item">
                  <span className="footer-contact-icon">{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="footer-col-title">Navigation</div>
            {FOOTER_NAV.map(({ label, href }) => (
              <a key={href} className="footer-link" href={href}>{label}</a>
            ))}
          </div>

          <div>
            <div className="footer-col-title">Nos services</div>
            {FOOTER_SERVICES.map(s => (
              <span key={s} className="footer-link">{s}</span>
            ))}
          </div>
        </div>

        <div className="footer-bottom">
          <span className="footer-copy">© 2025 Elastic Solutions. Tous droits réservés. — Tunis, Tunisie</span>
          <div className="footer-bottom-links">
            {['Accueil', 'Confidentialité', 'Aide', 'FAQ'].map(l => (
              <a key={l} className="footer-copy footer-bottom-link" href="#">{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
