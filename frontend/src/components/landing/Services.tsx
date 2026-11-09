import { SERVICES, SERVICE_TILES, images } from '../../data/landing';

export default function Services() {
  return (
    <section id="services">
      <div className="section-blob svc-blob-1">
        <svg viewBox="0 0 260 240" xmlns="http://www.w3.org/2000/svg"><path d="M0 240 C40 210,100 205,150 170 C195 138,220 90,200 45 C182 5,125 -8,80 12 C35 32,0 85,0 140 Z" fill="#8DBF3C"/><path d="M0 240 C28 218,65 212,90 185 C115 158,120 118,95 88 C70 58,25 50,0 72 Z" fill="#1F6B2E"/></svg>
      </div>
      <div className="section-blob svc-blob-2">
        <svg viewBox="0 0 260 240" xmlns="http://www.w3.org/2000/svg"><path d="M260 0 C220 30,160 35,110 70 C65 102,40 150,60 195 C78 235,135 248,180 228 C222 210,258 160,260 105 Z" fill="#8DBF3C"/><path d="M260 0 C232 22,195 28,170 58 C145 88,148 128,172 158 C196 188,238 182,260 155 Z" fill="#1F6B2E"/></svg>
      </div>
      <img loading="lazy" decoding="async" className="plant-deco plant-deco--service" src={images.decoPlant} alt="" />

      <div className="services-inner">
        <div className="services-header">
          <h2 className="section-title">Nos services</h2>
          <p className="services-subtitle" data-aos="fade-up" data-aos-delay="100">
            Une suite complète d’outils basés sur l’IA pour transformer la façon dont vous suivez et gérez vos cultures.
          </p>
        </div>

        <div className="services-grid" data-aos="fade-up">
          {SERVICES.map(({ img, title, desc }, i) => (
            <div key={title} className="service-card" data-aos="fade-up" data-aos-delay={String(i * 80)}>
              <img loading="lazy" decoding="async" className="service-img" src={img} alt={title} />
              <h3 className="service-card-title">{title}</h3>
              <p className="service-desc">{desc}</p>
            </div>
          ))}
        </div>

        <div className="img-tiles">
          {SERVICE_TILES.map(({ img, label }) => (
            <div key={label} className="img-tile">
              <img loading="lazy" decoding="async" src={img} alt={label} />
              <div className="img-tile-overlay"></div>
              <div className="img-tile-label">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
