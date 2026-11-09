export default function Stats() {
  return (
    <section id="stats">
      <div className="stats-grid" data-aos="zoom-in">
        <div className="stat-item"><div className="stat-val" data-target="90" data-suffix="%+">0</div><div className="stat-lbl">Précision de détection</div></div>
        <div className="stat-item"><div className="stat-val" data-target="10" data-suffix="+">0</div><div className="stat-lbl">Types de cultures</div></div>
        <div className="stat-item"><div className="stat-val" data-target="500" data-suffix="+">0</div><div className="stat-lbl">Parcelles suivies</div></div>
        <div className="stat-item"><div className="stat-val" data-target="247" data-special="24/7">0</div><div className="stat-lbl">Analyse en temps réel</div></div>
      </div>
    </section>
  );
}
