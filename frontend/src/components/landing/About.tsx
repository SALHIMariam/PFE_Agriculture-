import { useState } from 'react';
import { images, VISION_FEATURES } from '../../data/landing';

export default function About() {
  const [isVineyardLoaded, setIsVineyardLoaded] = useState(false);
  const [isFarmerLoaded, setIsFarmerLoaded] = useState(false);

  return (
    <section id="about">
      <div className="about-blob-svg top-right">
        <svg viewBox="0 0 340 300" xmlns="http://www.w3.org/2000/svg">
          <path d="M340 0 C340 0, 280 10, 230 40 C170 78, 140 130, 160 185 C178 235, 230 258, 280 250 C318 244, 340 220, 340 220 Z" fill="#8DBF3C"/>
          <path d="M340 0 C340 0, 310 15, 280 50 C250 85, 240 130, 260 170 C278 205, 316 215, 340 200 Z" fill="#1F6B2E"/>
          <path d="M340 180 C330 195, 315 230, 320 260 C325 280, 340 285, 340 285 Z" fill="#1F6B2E" opacity="0.7"/>
        </svg>
      </div>
      <div className="about-blob-svg bottom-left">
        <svg viewBox="0 0 320 280" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 280 C0 280, 60 270, 110 240 C170 202, 200 150, 180 95 C162 45, 110 22, 60 30 C22 36, 0 60, 0 60 Z" fill="#8DBF3C"/>
          <path d="M0 280 C0 280, 30 265, 60 230 C90 195, 100 150, 80 110 C62 75, 24 65, 0 80 Z" fill="#1F6B2E"/>
          <path d="M0 100 C10 85, 25 50, 20 20 C15 0, 0 0, 0 0 Z" fill="#1F6B2E" opacity="0.7"/>
        </svg>
      </div>

      <div className="about-title-wrap">
        <h2 className="section-title about-main-title">À propos</h2>
      </div>

      <div className="about-grid">
        <div className="about-imgs" data-aos="fade-right">
          <div className={`about-img1 about-img-enter ${isVineyardLoaded ? 'is-loaded' : ''}`} data-aos="fade-right">
            <img
              loading="eager"
              fetchPriority="high"
              decoding="sync"
              src={images.aboutVineyard}
              alt="Vignoble"
              onLoad={() => setIsVineyardLoaded(true)}
            />
          </div>
          <div className={`about-img2 about-img-enter about-img-enter-delayed ${isFarmerLoaded ? 'is-loaded' : ''}`} data-aos="fade-up" data-aos-delay="200">
            <img
              loading="eager"
              fetchPriority="high"
              decoding="sync"
              src={images.aboutFarmer}
              alt="Agricultrice"
              onLoad={() => setIsFarmerLoaded(true)}
            />
          </div>
        </div>

        <div>
          <h3 className="about-subtitle" data-aos="fade-up" data-aos-delay="100">
            Transformer l’agriculture<br />grâce à l’innovation en IA
          </h3>
          <p className="about-text-primary" data-aos="fade-up" data-aos-delay="100">
            Elastic Solutions est une plateforme innovante qui accompagne l’agriculture moderne grâce à l’intelligence artificielle et à la vision par ordinateur. Elle analyse les images de plantes pour détecter les anomalies et fournir aux agriculteurs des informations utiles sur la santé de leurs cultures.
          </p>
          <p className="about-text-secondary" data-aos="fade-up" data-aos-delay="200">
            Elle a été conçue pour aider les agriculteurs, les agronomes et les organisations agricoles à prendre des décisions éclairées à partir de données réelles collectées directement sur le terrain.
          </p>

          <div className="vision-card" data-aos="fade-left" data-aos-delay="200">
            <div className="vision-title">🌱 Notre vision</div>
            <div className="vision-subtitle">Une agriculture intelligente portée par l’IA</div>
            <p className="vision-text">
              Faire de l’agriculture traditionnelle une agriculture intelligente et durable, grâce au suivi par IA, à l’analyse d’images de plantes et à des recommandations intelligentes.
            </p>
            <div className="vision-features">
              {VISION_FEATURES.map(({ icon, name, desc }) => (
                <div className="vf-card" key={name}>
                  <span className="vf-icon">{icon}</span>
                  <div className="vf-name">{name}</div>
                  <div className="vf-desc">{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
