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
          <h2 className="section-title">Contact Us</h2>
          <p className="contact-header-sub">Get in touch with our team for demos, partnerships, or any questions about AgriNova.</p>
        </div>

        <div className="contact-grid">
          <div className="contact-info-panel" data-aos="fade-right">
            <h3 className="contact-info-title">Let's grow<br />something together</h3>
            <p className="contact-info-sub">Our team of agricultural AI experts is ready to help you transform your farming operations with intelligent technology.</p>
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
            <h3 className="form-title">Send us a message</h3>
            <p className="form-title-sub">We typically respond within 24 hours</p>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="contact-name">Name</label>
                <input id="contact-name" className="form-input" type="text" placeholder="Your full name" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="contact-email">Email</label>
                <input id="contact-email" className="form-input" type="email" placeholder="your@email.com" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="contact-subject">Subject</label>
              <input id="contact-subject" className="form-input" type="text" placeholder="Demo request, partnership..." />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="contact-message">Message</label>
              <textarea id="contact-message" className="form-input" placeholder="Tell us about your project or question..."></textarea>
            </div>
            <button className="form-btn">SEND MESSAGE →</button>
          </div>
        </div>
      </div>

      <img loading="lazy" decoding="async" data-aos="fade-up" className="contact-subscribe-img" src={images.contactFarmer} alt="AgriNova farmer" />
    </section>
  );
}
