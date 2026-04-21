export default function Stats() {
  return (
    <section id="stats">
      <div className="stats-grid" data-aos="zoom-in">
        <div className="stat-item"><div className="stat-val" data-target="90" data-suffix="%+">0</div><div className="stat-lbl">Detection Accuracy</div></div>
        <div className="stat-item"><div className="stat-val" data-target="10" data-suffix="+">0</div><div className="stat-lbl">Crop Types</div></div>
        <div className="stat-item"><div className="stat-val" data-target="500" data-suffix="+">0</div><div className="stat-lbl">Fields Monitored</div></div>
        <div className="stat-item"><div className="stat-val" data-target="247" data-special="24/7">0</div><div className="stat-lbl">Real-Time Analysis</div></div>
      </div>
    </section>
  );
}
