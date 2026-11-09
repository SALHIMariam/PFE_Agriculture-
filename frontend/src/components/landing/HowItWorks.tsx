import { HOW_STEPS } from '../../data/landing';

export default function HowItWorks() {
  return (
    <>
      <section id="how-intro" className="how-intro-section">
        <div className="leaf-deco leaf-deco--how-right">
          <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg"><path d="M100 280 C20 220,10 120,60 60 C90 20,140 10,160 40 C180 70,170 150,140 200 C120 240,100 280,100 280Z" fill="#74c69d"/><line x1="100" y1="280" x2="100" y2="60" stroke="#40916c" strokeWidth="2" opacity="0.5"/></svg>
        </div>
        <div className="leaf-deco leaf-deco--how-left">
          <svg viewBox="0 0 180 280" xmlns="http://www.w3.org/2000/svg"><path d="M90 260 C130 165,155 100,135 50 C115 5,55 -5,30 30 C5 65,10 140,40 180 C55 205,80 220,80 220Z" fill="#c9a84c"/></svg>
        </div>
        <div className="mission-inner" data-aos="fade-up">
          <h2 className="how-intro-title">De la photo au diagnostic<br />en quelques secondes</h2>
          <p className="how-intro-text">
            <span className="mission-highlight">
              Elastic Solutions analyse chaque image de parcelle par intelligence artificielle pour détecter les maladies, le stress hydrique et les carences nutritives, et propose immédiatement des recommandations de traitement précises.
            </span>
          </p>
        </div>
      </section>

      <section id="team">
        <div className="section-blob team-blob-1">
          <svg viewBox="0 0 240 220" xmlns="http://www.w3.org/2000/svg"><path d="M0 0 C50 20,100 15,140 50 C178 83,188 135,165 178 C145 212,95 220,55 200 C18 182,0 135,0 85 Z" fill="#8DBF3C"/><path d="M0 0 C30 18,65 15,88 45 C110 75,108 118,82 145 C56 172,15 162,0 132 Z" fill="#1F6B2E"/></svg>
        </div>
        <div className="section-blob team-blob-2">
          <svg viewBox="0 0 240 220" xmlns="http://www.w3.org/2000/svg"><path d="M240 220 C200 198,155 200,115 172 C75 145,55 98,75 55 C92 18,140 5,182 22 C220 38,242 88,240 140 Z" fill="#8DBF3C"/><path d="M240 220 C212 202,178 200,158 175 C138 150,142 112,164 88 C186 64,222 68,240 95 Z" fill="#1F6B2E"/></svg>
        </div>

        <div className="team-inner">
          <div className="team-header" data-aos="fade-up">
            <h2 className="section-title">Comment ça marche</h2>
            <p className="team-header-sub">4&nbsp;étapes simples pour transformer vos images de parcelles en recommandations intelligentes.</p>
          </div>
          <div className="team-grid">
            {HOW_STEPS.map(({ img, num, role, name, desc, tags }, i) => (
              <div
                key={num}
                className="team-card how-card"
                data-aos="zoom-in"
                data-aos-delay={String(i * 100)}
                style={{ borderRadius: "16px", overflow: "hidden", background: "#ffffff" }}
              >
                <div className="team-img how-img-wrap">
                  <img loading="lazy" decoding="async" className="how-step-img" src={img} alt={role} />
                  <div className="how-num-badge">{num}</div>
                </div>
                <div
                  className="team-body"
                  style={{
                    padding: "20px 24px 24px 24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <h3 className="team-role" style={{ marginTop: "12px", marginBottom: "4px" }}>{role}</h3>
                  <div className="team-name">{name}</div>
                  <p className="team-desc">{desc}</p>
                  <div className="how-tags" style={{ marginTop: "12px", gap: "6px", flexWrap: "wrap" }}>
                    {tags.map(t => <span key={t}>{t}</span>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
