import { TESTIMONIALS } from '../../data/landing';

export default function Testimonials() {
  return (
    <section id="feedback">
      <div className="leaf-deco leaf-deco--fb-left">
        <svg viewBox="0 0 180 280" xmlns="http://www.w3.org/2000/svg"><path d="M90 260 C140 200, 170 130, 150 70 C130 20, 70 5, 40 40 C15 70, 20 160, 50 210 C65 240, 90 260, 90 260Z" fill="#c9a84c"/><line x1="90" y1="260" x2="100" y2="50" stroke="#a88430" strokeWidth="2" opacity="0.5"/></svg>
      </div>
      <div className="leaf-deco leaf-deco--fb-right">
        <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg"><path d="M100 280 C20 220, 10 120, 60 60 C90 20, 140 10, 160 40 C180 70, 170 150, 140 200 C120 240, 100 280, 100 280Z" fill="#74c69d"/></svg>
      </div>
      <div className="fb-inner">
        <h2 className="fb-title">Ce qu’en disent les agriculteurs</h2>
        <div className="fb-progress"><div className="fb-progress-bar" id="fbProgress"></div></div>
        <div className="fb-slider">
          {TESTIMONIALS.map((t, i) => (
            <div key={t.name} className={`fb-card ${i === 0 ? 'active' : ''}`}>
              <div className="fb-card-inner">
                <div className="fb-avatar-ring"><img loading="lazy" decoding="async" src={t.img} alt={t.name} /></div>
                <div className="fb-body">
                  <div className="fb-name">{t.name}</div>
                  <div className="fb-role">{t.role}</div>
                  <div className="fb-stars">{'★'.repeat(t.stars)}{'☆'.repeat(5 - t.stars)}</div>
                  <p className="fb-quote">{t.quote}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="fb-dots">
          {TESTIMONIALS.map((_, i) => (
            <div key={i} className={`fb-dot ${i === 0 ? 'active' : ''}`} data-idx={i}>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
