import { images } from '../../data/landing';

export default function Mission() {
  return (
    <section id="mission">
      <div className="leaf-deco leaf-deco--left-top">
        <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg"><path d="M100 280 C20 220, 10 120, 60 60 C90 20, 140 10, 160 40 C180 70, 170 150, 140 200 C120 240, 100 280, 100 280Z" fill="#74c69d"/><line x1="100" y1="280" x2="100" y2="60" stroke="#40916c" strokeWidth="2" opacity="0.5"/><line x1="100" y1="200" x2="60" y2="140" stroke="#40916c" strokeWidth="1.5" opacity="0.4"/><line x1="100" y1="160" x2="140" y2="110" stroke="#40916c" strokeWidth="1.5" opacity="0.4"/></svg>
      </div>
      <div className="leaf-deco leaf-deco--right-top">
        <svg viewBox="0 0 180 280" xmlns="http://www.w3.org/2000/svg"><path d="M90 260 C140 200, 170 130, 150 70 C130 20, 70 5, 40 40 C15 70, 20 160, 50 210 C65 240, 90 260, 90 260Z" fill="#c9a84c"/><line x1="90" y1="260" x2="100" y2="50" stroke="#a88430" strokeWidth="2" opacity="0.5"/></svg>
      </div>
      <div className="leaf-deco leaf-deco--left-bottom">
        <svg viewBox="0 0 180 280" xmlns="http://www.w3.org/2000/svg"><path d="M90 260 C140 200, 170 130, 150 70 C130 20, 70 5, 40 40 C15 70, 20 160, 50 210 C65 240, 90 260, 90 260Z" fill="#c9a84c"/></svg>
      </div>

      <div className="mission-inner" data-aos="fade-up">
        <div className="mission-icon-wrap">
          <img loading="lazy" decoding="async" src={images.missionTarget} alt="Mission" />
        </div>
        <h3 className="mission-title">Our Mission</h3>
        <p className="mission-text">
          <span className="mission-highlight">
            To promote precision agriculture by combining artificial intelligence and modern web technologies to improve crop productivity and reduce agricultural losses.
          </span>
        </p>
      </div>
    </section>
  );
}
