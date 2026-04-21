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
          <h1 className="hero-title">Welcome to<br /><span>AgriNova</span></h1>
          <p className="hero-p1">
            An intelligent agricultural platform designed to help farmers and agricultural experts monitor crop health using advanced artificial intelligence technologies.
          </p>
          <p className="hero-p2">
            Analyzing RGB images from smartphones, cameras, or drones to automatically detect crop anomalies — diseases, water stress, and nutrient deficiencies.
          </p>
          <div className="btn-group">
            <button className="btn-primary" data-scroll-to="services">Explore Features</button>
            <button className="btn-learn-more" data-scroll-to="about">Learn More</button>
          </div>
          <div className="mini-stats">
            <div><div className="mini-stat-val">90%+</div><div className="mini-stat-lbl">Accuracy</div></div>
            <div><div className="mini-stat-val">10+</div><div className="mini-stat-lbl">Crop Types</div></div>
            <div><div className="mini-stat-val">24/7</div><div className="mini-stat-lbl">Monitoring</div></div>
          </div>
        </div>
        <div />
      </div>
    </section>
  );
}
