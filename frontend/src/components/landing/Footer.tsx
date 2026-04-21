import { FOOTER_NAV, FOOTER_SERVICES, FOOTER_SOCIALS, FOOTER_CONTACT } from '../../data/landing';

export default function Footer() {
  return (
    <footer>
      <div className="footer-inner-wrap">
        <div className="footer-grid">
          <div>
            <div className="footer-logo">
              <div className="footer-logo-icon">🌱</div>
              <div className="footer-logo-text">AgriNova</div>
            </div>
            <p className="footer-desc">Intelligent agricultural platform combining AI and computer vision to monitor crop health and detect anomalies in real time.</p>
            <div className="footer-socials">
              {FOOTER_SOCIALS.map(({ label, aria }) => (
                <a key={aria} className="footer-social-btn" href="#" aria-label={aria}>{label}</a>
              ))}
            </div>
          </div>

          <div>
            <div className="footer-col-title">Get In Touch</div>
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
            <div className="footer-col-title">Our Services</div>
            {FOOTER_SERVICES.map(s => (
              <span key={s} className="footer-link">{s}</span>
            ))}
          </div>
        </div>

        <div className="footer-bottom">
          <span className="footer-copy">© 2025 AgriNova. All Rights Reserved. — Tunis, Tunisia</span>
          <div className="footer-bottom-links">
            {['Home', 'Privacy', 'Help', 'FAQs'].map(l => (
              <a key={l} className="footer-copy footer-bottom-link" href="#">{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
