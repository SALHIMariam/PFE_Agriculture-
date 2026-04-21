import { useEffect, useRef } from "react";

const STEPS = [
  {
    num: "01", img: "/images/landing/how-step-capture.png",
    label: "Capture",  title: "📸 Field Image Capture",
    desc: "Photograph your crops to launch the automatic AI analysis.",
    tags: ["Smartphone", "Drone", "Camera"],
  },
  {
    num: "02", img: "/images/landing/how-step-analyze.png",
    label: "Analyze",  title: "🔬 AI Image Analysis",
    desc: "Deep learning & computer vision process RGB images in real time.",
    tags: ["Deep Learning", "RGB Vision", "Real-Time"],
  },
  {
    num: "03", img: "/images/landing/how-step-detect.png",
    label: "Detect",   title: "🎯 Automatic Detection",
    desc: "Diseases, water stress and deficiencies detected with 90%+ accuracy.",
    tags: ["Disease", "Water Stress", "Deficiency"],
  },
  {
    num: "04", img: "/images/landing/how-step-result.png",
    label: "Result",   title: "📋 Report",
    desc: "PDF report with detected anomalies, treatments and health mapping.",
    tags: ["PDF Report", "Mapping", "Treatment"],
  },
];

export default function HowItWorksSection() {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const gridRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("visible"); });
      },
      { threshold: 0.15 }
    );
    if (titleRef.current) observer.observe(titleRef.current);
    gridRef.current?.querySelectorAll(".how-card").forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="how" className="agri-how">
      <div className="how-inner">
        <div className="how-header">
          <div className="how-badge">Process</div>
          <h2 className="how-title" ref={titleRef}>How It Works</h2>
          <p className="how-header-sub">
            4 simple steps to transform your field images into intelligent recommendations.
          </p>
        </div>

        <div className="how-grid" ref={gridRef}>
          {STEPS.map((s) => (
            <div key={s.num} className="how-card">
              <div className="how-img-wrap">
                <img
                  src={s.img}
                  alt={s.title}
                  loading="lazy"
                  style={{ width: "72%", height: "72%", objectFit: "contain", position: "relative", zIndex: 1 }}
                />
                <div className="how-num-badge">{s.num}</div>
              </div>
              <div className="how-body">
                <div className="how-label">{s.label}</div>
                <div className="how-step-title">{s.title}</div>
                <p className="how-step-desc">{s.desc}</p>
                <div className="how-tags">
                  {s.tags.map((t) => <span key={t}>{t}</span>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
