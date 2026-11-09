import { CONTACT_ITEMS, images } from '../../data/landing';

export default function Contact() {
  return (
    <section id="contact">
      <div className="section-blob contact-blob-1">
        <svg viewBox="0 0 260 240" xmlns="http://www.w3.org/2000/svg"><path d="M260 0 C220 30,160 35,110 70 C65 102,40 150,60 195 C78 235,135 248,180 228 C222 210,258 160,260 105 Z" fill="#8DBF3C"/><path d="M260 0 C232 22,195 28,170 58 C145 88,148 128,172 158 C196 188,238 182,260 155 Z" fill="#1F6B2E"/></svg>
      </div>
      <div className="section-blob contact-blob-2">
        <svg viewBox="0 0 260 240" xmlns="http://www.w3.org/2000/svg"><path d="M0 240 C40 210,100 205,150 170 C195 138,220 90,200 45 C182 5,125 -8,80 12 C35 32,0 85,0 140 Z" fill="#8DBF3C"/><path d="M0 240 C28 218,65 212,90 185 C115 158,120 118,95 88 C70 58,25 50,0 72 Z" fill="#1F6B2E"/></svg>
      </div>
      <div className="contact-glow"></div>

      <div className="contact-inner">
        <div className="contact-header" data-aos="fade-up">
          <h2 className="section-title">Contactez-nous</h2>
          <p className="contact-header-sub">Contactez notre équipe pour une démonstration, un partenariat ou toute question sur Elastic Solutions.</p>
        </div>

        <div className="contact-grid">
          <div className="contact-info-panel" data-aos="fade-right">
            <h3 className="contact-info-title">Faisons pousser<br />quelque chose ensemble</h3>
            <p className="contact-info-sub">Notre équipe d’experts en IA agricole est prête à vous aider à transformer votre exploitation grâce à des technologies intelligentes.</p>
            <div className="contact-items">
              {CONTACT_ITEMS.map(({ icon, label, value, href }) => (
                <div key={label} className="contact-item">
                  <div className="contact-item-icon">{icon}</div>
                  <div>
                    <div className="contact-item-lbl">{label}</div>
                    {href
                      ? <div className="contact-item-val"><a href={href}>{value}</a></div>
                      : <div className="contact-item-val">{value}</div>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="contact-form-box" data-aos="fade-left">
            <h3 className="form-title">Envoyez-nous un message</h3>
            <p className="form-title-sub">Nous répondons généralement sous 24&nbsp;heures</p>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="contact-name">Nom</label>
                <input id="contact-name" className="form-input" type="text" placeholder="Votre nom complet" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="contact-email">E-mail</label>
                <input id="contact-email" className="form-input" type="email" placeholder="vous@exemple.com" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="contact-subject">Objet</label>
              <input id="contact-subject" className="form-input" type="text" placeholder="Demande de démonstration, partenariat…" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="contact-message">Message</label>
              <textarea id="contact-message" className="form-input" placeholder="Parlez-nous de votre projet ou de votre question…"></textarea>
            </div>
            <button className="form-btn">ENVOYER LE MESSAGE →</button>
          </div>
        </div>
      </div>

      <img loading="lazy" decoding="async" data-aos="fade-up" className="contact-subscribe-img" src={images.contactFarmer} alt="Agriculteur utilisant Elastic Solutions" />
    </section>
  );
}
