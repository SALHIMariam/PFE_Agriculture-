import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import styles from "./AgriNovaSignUpPage.module.css";
import { useAuth } from "../../context/AuthContext";

/* ── Data ─────────────────────────────────────────────── */

const CROPS = [
  { key: "Apple", emoji: "🍎", latin: "Malus domestica" },
  { key: "Chili", emoji: "🌶️", latin: "Capsicum annuum" },
  { key: "Corn", emoji: "🌽", latin: "Zea mays" },
  { key: "Cucumber", emoji: "🥒", latin: "Cucumis sativus" },
  { key: "Grape", emoji: "🍇", latin: "Vitis vinifera" },
  { key: "Lemon", emoji: "🍋", latin: "Citrus limon" },
  { key: "Mango", emoji: "🥭", latin: "Mangifera indica" },
  { key: "Potato", emoji: "🥔", latin: "Solanum tuberosum" },
  { key: "Tomato", emoji: "🍅", latin: "Solanum lycopersicum" },
  { key: "Wheat", emoji: "🌾", latin: "Triticum aestivum" },
];

const FARM_TYPES = [
  { key: "Small", icon: "🌱", desc: "Family farm, up to 10 ha. Focused on quality and local markets." },
  { key: "Medium", icon: "🚜", desc: "Commercial operation, 10–100 ha. Scaling with smart monitoring." },
  { key: "Large", icon: "🏭", desc: "Industrial scale, 100+ ha. Full automation and data pipelines." },
];

const RIGHT_TITLES: Record<number, { title: string; sub: string }> = {
  1: { title: "Intelligent agriculture<br/>starts <em>here.</em>", sub: "AI · Crop Monitoring · Real-Time Intelligence" },
  2: { title: "Choose your <em>crops</em>", sub: "Personalized AI diagnostics" },
  3: { title: "Almost <em>there!</em>", sub: "One last step to get started" },
};

const STEP_LABELS = ["Account Setup", "Crop Selection", "Farm Profile"];

/* ── Particles hook (reused from login) ───────────────── */

function useParticles(containerRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const colors = [
      "rgba(116,198,157,.7)",
      "rgba(201,168,76,.55)",
      "rgba(141,191,60,.5)",
      "rgba(255,255,255,.22)",
    ];
    const particles: HTMLDivElement[] = [];
    for (let i = 0; i < 48; i++) {
      const dot = document.createElement("div");
      const size = Math.random() * 5 + 1.5;
      const tx = (Math.random() - 0.5) * 200;
      const ty = -(Math.random() * 300 + 80);
      const color = colors[Math.floor(Math.random() * colors.length)];
      dot.className = styles.particle;
      dot.style.cssText = [
        `width:${size}px`,
        `height:${size}px`,
        `left:${Math.random() * 100}%`,
        `top:${Math.random() * 80 + 10}%`,
        `background:${color}`,
        `--tx:${tx}px`,
        `--ty:${ty}px`,
        `animation-duration:${Math.random() * 9 + 7}s`,
        `animation-delay:${Math.random() * 9}s`,
      ].join(";");
      el.appendChild(dot);
      particles.push(dot);
    }
    return () => particles.forEach((p) => p.remove());
  }, [containerRef]);
}

/* ── Component ────────────────────────────────────────── */

export default function AgriNovaSignUpPage() {
  const { user, register, loading } = useAuth();
  const navigate = useNavigate();

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  /* Step state */
  const [currentStep, setCurrentStep] = useState(1);

  /* Step 1 fields */
  const [fullName, setFullName] = useState("");
  const [farm, setFarm] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  /* Step 2 */
  const [selectedCrops, setSelectedCrops] = useState<Set<string>>(new Set());

  /* Step 3 */
  const [selectedFarm, setSelectedFarm] = useState<string | null>(null);
  const [termsChecked, setTermsChecked] = useState(false);

  /* Shared */
  const [error, setError] = useState("");
  const [buttonState, setButtonState] = useState<"idle" | "loading" | "success">("idle");

  const particlesRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const activeBtnRef = useRef<HTMLButtonElement>(null);
  useParticles(particlesRef);

  /* ── Helpers ── */

  const shake = () => {
    const btn = activeBtnRef.current;
    if (!btn) return;
    btn.style.animation = "none";
    void btn.offsetHeight;
    btn.style.animation = "shake 0.4s ease";
    setTimeout(() => { btn.style.animation = ""; }, 400);
  };

  const goToStep = (n: number) => {
    setError("");
    setCurrentStep(n);
    innerRef.current?.scrollTo(0, 0);
  };

  /* ── Password hints ── */
  const hasUpper = /[A-Z]/.test(password);
  const hasNum = /[0-9]/.test(password);

  /* ── Step validations ── */

  const validateStep1 = () => {
    if (!fullName || !farm || !email || !password || !password2) {
      setError("Please fill in all fields.");
      shake();
      return false;
    }
    if (!email.includes("@")) {
      setError("Enter a valid email address.");
      return false;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return false;
    }
    if (!hasUpper) {
      setError("Password must contain at least one uppercase letter.");
      return false;
    }
    if (!hasNum) {
      setError("Password must contain at least one number.");
      return false;
    }
    if (password !== password2) {
      setError("Passwords do not match.");
      shake();
      return false;
    }
    return true;
  };

  const handleGoStep2 = () => {
    setError("");
    if (validateStep1()) goToStep(2);
  };

  const handleGoStep3 = () => {
    setError("");
    if (selectedCrops.size === 0) {
      setError("Please select at least one crop.");
      shake();
      return;
    }
    goToStep(3);
  };

  const handleSubmit = async () => {
    setError("");
    if (!selectedFarm) {
      setError("Please select your farm type.");
      shake();
      return;
    }
    if (!termsChecked) {
      setError("Please agree to the Terms & Privacy Policy.");
      return;
    }

    setButtonState("loading");

    try {
      await register(fullName, email, password, password2);
      setButtonState("success");
      setTimeout(() => navigate("/dashboard"), 700);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "A network error occurred. Please try again.";
      setError(message);
      setButtonState("idle");
      shake();
    }
  };

  const toggleCrop = (key: string) => {
    setSelectedCrops((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /* ── Progress bar helper ── */
  const piClass = (step: number) => {
    if (step < currentStep) return `${styles.pi} ${styles.piDone}`;
    if (step === currentStep) return `${styles.pi} ${styles.piActive}`;
    return styles.pi;
  };

  const lineClass = (afterStep: number) =>
    afterStep < currentStep
      ? `${styles.piLine} ${styles.piLineFilled}`
      : styles.piLine;

  const rDotClass = (step: number) => {
    if (step < currentStep) return `${styles.rDot} ${styles.rDotDone}`;
    if (step === currentStep) return `${styles.rDot} ${styles.rDotActive}`;
    return styles.rDot;
  };

  /* ── Progress bar JSX ── */
  const progressBar = (
    <div className={styles.progInline}>
      <div className={piClass(1)}>
        <span className={styles.piDot}>{currentStep > 1 ? "✓" : "1"}</span>
        <span className={styles.piLbl}>Account</span>
      </div>
      <div className={lineClass(1)} />
      <div className={piClass(2)}>
        <span className={styles.piDot}>{currentStep > 2 ? "✓" : "2"}</span>
        <span className={styles.piLbl}>Crops</span>
      </div>
      <div className={lineClass(2)} />
      <div className={piClass(3)}>
        <span className={styles.piDot}>3</span>
        <span className={styles.piLbl}>Farm Profile</span>
      </div>
    </div>
  );

  /* ── Render ── */
  return (
    <div className={styles.page}>
      {/* ═══ LEFT PANEL ═══ */}
      <div className={styles.panelLeft}>
        <Link to="/" className={styles.homeArrow} aria-label="Retour à l'accueil">←</Link>

        <svg className={styles.leafBg} viewBox="0 0 520 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <path d="M490 0 C525 38,528 92,484 124 C464 138,436 133,426 109 C416 84,432 42,490 0Z" fill="#74c69d" opacity=".13" />
          <line x1="490" y1="0" x2="430" y2="109" stroke="#40916c" strokeWidth="1" opacity=".11" />
          <path d="M0 835 C34 802,76 796,86 822 C92 840,72 861,44 867 C16 873,0 854,0 835Z" fill="#8DBF3C" opacity=".15" />
          <g transform="translate(40,78) rotate(-12)"><path d="M0 22 C8 4,20 1,24 13 C20 24,8 28,0 22Z" fill="#40916c" opacity=".28" /></g>
          <g transform="translate(122,60) rotate(8)"><path d="M0 20 C7 4,18 1,22 11 C18 21,7 25,0 20Z" fill="#74c69d" opacity=".22" /></g>
          <g transform="translate(220,74) rotate(-6)"><path d="M0 24 C9 5,22 2,26 15 C22 27,9 31,0 24Z" fill="#8DBF3C" opacity=".18" /></g>
          <g transform="translate(320,62) rotate(14)"><path d="M0 20 C8 4,19 1,22 12 C19 22,8 26,0 20Z" fill="#40916c" opacity=".2" /></g>
          <g transform="translate(415,76) rotate(-10)"><path d="M0 22 C8 5,21 2,25 14 C21 25,8 29,0 22Z" fill="#74c69d" opacity=".17" /></g>
          <g transform="translate(478,58) rotate(6)"><path d="M0 18 C7 3,16 0,19 9 C16 18,7 22,0 18Z" fill="#8DBF3C" opacity=".14" /></g>
          <g transform="translate(20,157) rotate(10)"><path d="M0 24 C9 5,22 2,26 15 C22 27,9 31,0 24Z" fill="#74c69d" opacity=".22" /></g>
          <g transform="translate(95,142) rotate(-16)"><path d="M0 20 C8 4,19 1,22 11 C19 21,8 25,0 20Z" fill="#40916c" opacity=".19" /></g>
          <g transform="translate(188,160) rotate(12)"><path d="M0 22 C9 5,21 2,25 14 C21 25,9 29,0 22Z" fill="#8DBF3C" opacity=".17" /></g>
          <g transform="translate(282,145) rotate(-8)"><path d="M0 24 C9 6,22 2,26 15 C22 27,9 31,0 24Z" fill="#74c69d" opacity=".18" /></g>
          <g transform="translate(376,159) rotate(18)"><path d="M0 20 C8 4,18 1,22 11 C18 21,8 25,0 20Z" fill="#40916c" opacity=".16" /></g>
          <g transform="translate(455,144) rotate(-6)"><path d="M0 22 C8 5,20 2,24 13 C20 24,8 28,0 22Z" fill="#8DBF3C" opacity=".15" /></g>
          <g transform="translate(55,240) rotate(-8)"><path d="M0 22 C8 5,21 2,25 14 C21 25,8 29,0 22Z" fill="#40916c" opacity=".2" /></g>
          <g transform="translate(148,224) rotate(14)"><path d="M0 24 C9 6,22 2,26 15 C22 27,9 31,0 24Z" fill="#74c69d" opacity=".18" /></g>
          <g transform="translate(244,242) rotate(-14)"><path d="M0 20 C8 4,18 1,22 11 C18 21,8 25,0 20Z" fill="#8DBF3C" opacity=".16" /></g>
          <g transform="translate(340,226) rotate(10)"><path d="M0 22 C9 5,21 2,25 14 C21 25,9 29,0 22Z" fill="#40916c" opacity=".17" /></g>
          <g transform="translate(432,242) rotate(-12)"><path d="M0 20 C8 4,19 1,22 12 C19 22,8 26,0 20Z" fill="#74c69d" opacity=".15" /></g>
          <g transform="translate(24,324) rotate(6)"><path d="M0 24 C9 6,22 2,26 15 C22 27,9 31,0 24Z" fill="#8DBF3C" opacity=".18" /></g>
          <g transform="translate(112,310) rotate(-10)"><path d="M0 22 C8 5,20 2,24 13 C20 24,8 28,0 22Z" fill="#40916c" opacity=".16" /></g>
          <g transform="translate(208,326) rotate(16)"><path d="M0 20 C8 4,18 1,22 11 C18 21,8 25,0 20Z" fill="#74c69d" opacity=".15" /></g>
          <g transform="translate(306,312) rotate(-6)"><path d="M0 24 C9 6,21 2,25 14 C21 25,9 29,0 24Z" fill="#8DBF3C" opacity=".15" /></g>
          <g transform="translate(398,327) rotate(12)"><path d="M0 22 C8 5,20 2,24 13 C20 24,8 28,0 22Z" fill="#40916c" opacity=".14" /></g>
          <g transform="translate(60,410) rotate(-14)"><path d="M0 22 C9 5,21 2,25 14 C21 25,9 29,0 22Z" fill="#74c69d" opacity=".16" /></g>
          <g transform="translate(160,394) rotate(8)"><path d="M0 24 C9 6,22 2,26 15 C22 27,9 31,0 24Z" fill="#40916c" opacity=".14" /></g>
          <g transform="translate(258,412) rotate(-10)"><path d="M0 20 C8 4,18 1,22 11 C18 21,8 25,0 20Z" fill="#8DBF3C" opacity=".13" /></g>
          <g transform="translate(356,396) rotate(14)"><path d="M0 22 C8 5,20 2,24 13 C20 24,8 28,0 22Z" fill="#74c69d" opacity=".13" /></g>
          <g transform="translate(445,410) rotate(-6)"><path d="M0 20 C8 4,19 1,22 12 C19 22,8 26,0 20Z" fill="#40916c" opacity=".12" /></g>
          <g transform="translate(30,492) rotate(8)"><path d="M0 22 C8 5,20 2,24 13 C20 24,8 28,0 22Z" fill="#40916c" opacity=".14" /></g>
          <g transform="translate(126,478) rotate(-12)"><path d="M0 20 C8 4,18 1,22 11 C18 21,8 25,0 20Z" fill="#74c69d" opacity=".12" /></g>
          <g transform="translate(226,494) rotate(10)"><path d="M0 24 C9 6,21 2,25 14 C21 25,9 29,0 24Z" fill="#8DBF3C" opacity=".11" /></g>
        </svg>

        <div className={styles.logo}>
          <div className={styles.logoMark}>🌱</div>
          <div>
            <div className={styles.logoName}>AgriNova</div>
            <span className={styles.logoSub}>Smart Agriculture</span>
          </div>
        </div>

        <div className={styles.panelLeftInner} ref={innerRef}>
          {/* Error banner */}
          <div className={`${styles.errBox} ${error ? styles.errBoxOn : ""}`} role="alert" aria-live="polite">
            <span>⚠</span>
            <span>{error || "Error"}</span>
          </div>

          {/* ── STEP 1 — Account ── */}
          <div className={`${styles.step} ${currentStep === 1 ? styles.stepActive : ""}`}>
            <div className={styles.sEye}>Step 1 of 3</div>
            <h2 className={styles.sH1}><em>Create</em><br />your account</h2>
            <p className={styles.sSub}>Your crops are waiting. Start with your basic info.</p>

            {progressBar}

            <div className={styles.twoCol}>
              <div className={styles.field}>
                <label className={styles.lbl} htmlFor="su-fname">Full name</label>
                <div className={styles.fw}>
                  <input className={styles.inp} id="su-fname" type="text" placeholder="John Doe" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  <div className={styles.fline} />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.lbl} htmlFor="su-farm">Farm / Organization</label>
                <div className={styles.fw}>
                  <input className={styles.inp} id="su-farm" type="text" placeholder="Green Fields Co." value={farm} onChange={(e) => setFarm(e.target.value)} />
                  <div className={styles.fline} />
                </div>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.lbl} htmlFor="su-email">Email address</label>
              <div className={styles.fw}>
                <input className={styles.inp} id="su-email" type="email" placeholder="you@agrinova.ai" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <div className={styles.fline} />
              </div>
            </div>

            <div className={styles.twoCol}>
              <div className={styles.field}>
                <label className={styles.lbl} htmlFor="su-pw">Password</label>
                <div className={styles.fw}>
                  <input className={styles.inp} id="su-pw" type={showPassword ? "text" : "password"} placeholder="Min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <div className={styles.fline} />
                  <button className={styles.eye} type="button" onClick={() => setShowPassword((p) => !p)}>
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {password.length > 0 && (
                  <div className={styles.pwHints}>
                    <div className={`${styles.pwHint} ${hasUpper ? styles.pwHintOk : styles.pwHintBad}`}>
                      <span>{hasUpper ? "✓" : "○"}</span> At least one uppercase letter
                    </div>
                    <div className={`${styles.pwHint} ${hasNum ? styles.pwHintOk : styles.pwHintBad}`}>
                      <span>{hasNum ? "✓" : "○"}</span> At least one number
                    </div>
                  </div>
                )}
              </div>
              <div className={styles.field}>
                <label className={styles.lbl} htmlFor="su-pw2">Confirm password</label>
                <div className={styles.fw}>
                  <input className={styles.inp} id="su-pw2" type="password" placeholder="Repeat password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
                  <div className={styles.fline} />
                </div>
              </div>
            </div>

            <div className={styles.btnRow}>
              <button className={styles.btn} type="button" ref={currentStep === 1 ? activeBtnRef : undefined} onClick={handleGoStep2}>
                <span>Continue &nbsp;→</span>
              </button>
            </div>
            <div className={styles.signIn}>
              Already have an account? <Link to="/agrinova-login">Sign in →</Link>
            </div>
          </div>

          {/* ── STEP 2 — Crops ── */}
          <div className={`${styles.step} ${currentStep === 2 ? styles.stepActive : ""}`}>
            <div className={styles.sEye}>Step 2 of 3</div>
            <h2 className={styles.sH1}>Your <em>crops</em></h2>
            <p className={styles.sSub}>Select the crops you grow. We'll personalize your AI diagnostics.</p>

            {progressBar}

            <p className={styles.cropsHint}>Choose one or more:</p>

            <div className={styles.cropsGrid}>
              {CROPS.map((crop) => (
                <div
                  key={crop.key}
                  className={`${styles.cropCard} ${selectedCrops.has(crop.key) ? styles.cropCardSelected : ""}`}
                  onClick={() => toggleCrop(crop.key)}
                >
                  <span className={styles.cropEmoji}>{crop.emoji}</span>
                  <div className={styles.cropInfo}>
                    <div className={styles.cropName}>{crop.key}</div>
                    <div className={styles.cropLatin}>{crop.latin}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.btnRow}>
              <button className={styles.btnBack} type="button" onClick={() => goToStep(1)}>← Back</button>
              <button className={styles.btn} type="button" ref={currentStep === 2 ? activeBtnRef : undefined} onClick={handleGoStep3}>
                <span>Continue &nbsp;→</span>
              </button>
            </div>
          </div>

          {/* ── STEP 3 — Farm Profile ── */}
          <div className={`${styles.step} ${currentStep === 3 ? styles.stepActive : ""}`}>
            <div className={styles.sEye}>Step 3 of 3</div>
            <h2 className={styles.sH1}>Farm <em>Profile</em></h2>
            <p className={styles.sSub}>Tell us about your operation so we can tailor your experience.</p>

            {progressBar}

            <div className={styles.farmTypes}>
              {FARM_TYPES.map((ft) => (
                <div
                  key={ft.key}
                  className={`${styles.ft} ${selectedFarm === ft.key ? styles.ftSelected : ""}`}
                  onClick={() => setSelectedFarm(ft.key)}
                >
                  <div className={styles.ftIcon}>{ft.icon}</div>
                  <div className={styles.ftName}>{ft.key}</div>
                  <div className={styles.ftDesc}>{ft.desc}</div>
                  <div className={`${styles.ftCheck} ${selectedFarm === ft.key ? styles.ftSelectedCheck : ""}`}>
                    {selectedFarm === ft.key ? "✓" : "○"} Select
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.termsBox} onClick={() => setTermsChecked((p) => !p)}>
              <div className={`${styles.tchk} ${termsChecked ? styles.tchkOn : ""}`}>
                {termsChecked ? "✓" : ""}
              </div>
              <div className={styles.termsTxt}>
                I agree to AgriNova's <a href="#" onClick={(e) => e.stopPropagation()}>Terms of Service</a> and{" "}
                <a href="#" onClick={(e) => e.stopPropagation()}>Privacy Policy</a>.
                I understand my farm data will be used to improve AI diagnostics.
              </div>
            </div>

            <div className={styles.btnRow}>
              <button className={styles.btnBack} type="button" onClick={() => goToStep(2)}>← Back</button>
              <button
                className={`${styles.btn} ${buttonState === "loading" ? styles.btnLoading : ""} ${buttonState === "success" ? styles.btnSuccess : ""}`}
                type="button"
                ref={currentStep === 3 ? activeBtnRef : undefined}
                disabled={buttonState === "loading" || buttonState === "success"}
                onClick={handleSubmit}
              >
                <span>
                  {buttonState === "loading"
                    ? "Creating account…"
                    : buttonState === "success"
                      ? "✓ Account created!"
                      : "Create Account  →"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ RIGHT PANEL ═══ */}
      <div className={styles.panelRight}>
        <div className={styles.rAtm} />
        <div className={styles.rGrain} />
        <div className={styles.rFlare} />
        <div className={styles.rFlare2} />
        <div className={styles.rGeo}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className={styles.geoLine} />
          ))}
        </div>
        <div className={styles.rParticles} ref={particlesRef} />

        <svg className={styles.rBlob} viewBox="0 0 600 580" xmlns="http://www.w3.org/2000/svg">
          <path d="M300 38 C452 28,572 128,578 280 C584 432,482 558,330 568 C178 578,52 480,38 328 C24 176,116 48,300 38Z" fill="#74c69d" />
        </svg>

        <div className={styles.orb1} />
        <div className={styles.orb2} />

        <div className={styles.odWrap}>
          <div className={styles.odGold} />
          <div className={styles.odMint} />
          <div className={styles.odLeaf} />
        </div>

        <div className={styles.rEmb}>
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <line x1="32" y1="60" x2="32" y2="18" stroke="#74c69d" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="32" y1="44" x2="19" y2="31" stroke="#74c69d" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="32" y1="37" x2="45" y2="24" stroke="#74c69d" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="32" y1="52" x2="20" y2="40" stroke="#74c69d" strokeWidth="1.5" strokeLinecap="round" opacity=".55" />
            <line x1="32" y1="52" x2="44" y2="40" stroke="#74c69d" strokeWidth="1.5" strokeLinecap="round" opacity=".55" />
            <ellipse cx="32" cy="15" rx="5.5" ry="10" fill="#c9a84c" opacity=".9" />
            <ellipse cx="20" cy="27" rx="4.5" ry="8.5" fill="#c9a84c" opacity=".75" />
            <ellipse cx="43" cy="21" rx="4.5" ry="8.5" fill="#c9a84c" opacity=".75" />
            <circle cx="32" cy="32" r="2.5" fill="rgba(116,198,157,0.55)" />
          </svg>
        </div>

        <div className={styles.rTitleWrap}>
          <div className={styles.rTitle} dangerouslySetInnerHTML={{ __html: RIGHT_TITLES[currentStep].title }} />
          <div className={styles.rSubtitle}>{RIGHT_TITLES[currentStep].sub}</div>
        </div>

        <div className={styles.rDots}>
          <div className={styles.rDotsRow}>
            <div className={rDotClass(1)} />
            <div className={rDotClass(2)} />
            <div className={rDotClass(3)} />
          </div>
          <div className={styles.rDotLbl}>{STEP_LABELS[currentStep - 1]}</div>
        </div>
      </div>
    </div>
  );
}

