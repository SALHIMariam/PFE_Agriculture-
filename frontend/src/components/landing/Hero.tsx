export default function Hero() {
  return (
    <section id="home">
      <div className="hero-fullbg">
        <div className="hero-slide hero-slide-1" id="heroSlide1"></div>
        <div className="hero-slide hero-slide-2" id="heroSlide2"></div>
      </div>
      <div className="hero-overlay"></div>
      <div className="hero-dots">
        <div className="hero-dot active" id="dot1"></div>
        <div className="hero-dot" id="dot2"></div>
      </div>

      <div className="hero-grid">
        <div className="hero-content">
          <h1 className="hero-title">Bienvenue sur<br /><span>Elastic Solutions</span></h1>
          <p className="hero-p1">
            Une plateforme agricole intelligente qui aide les agriculteurs et les experts à suivre la santé des cultures grâce aux technologies avancées d’intelligence artificielle.
          </p>
          <p className="hero-p2">
            Elle analyse les images RVB prises au smartphone, à l’appareil photo ou par drone pour détecter automatiquement les anomalies des cultures&nbsp;: maladies, stress hydrique et carences nutritives.
          </p>
          <div className="btn-group">
            <button className="btn-primary" data-scroll-to="services">Découvrir les fonctionnalités</button>
            <button className="btn-learn-more" data-scroll-to="about">En savoir plus</button>
          </div>
          <div className="mini-stats">
            <div><div className="mini-stat-val">90&nbsp;%+</div><div className="mini-stat-lbl">Précision</div></div>
            <div><div className="mini-stat-val">10+</div><div className="mini-stat-lbl">Types de cultures</div></div>
            <div><div className="mini-stat-val">24/7</div><div className="mini-stat-lbl">Surveillance</div></div>
          </div>
        </div>
        <div />
      </div>
    </section>
  );
}
