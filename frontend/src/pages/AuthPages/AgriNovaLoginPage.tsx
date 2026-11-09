import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import styles from "./AgriNovaLoginPage.module.css";
import { useAuth } from "../../context/AuthContext";

function useParticles(containerRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const colors = [
      "rgba(116,198,157,.7)",
      "rgba(201,168,76,.55)",
      "rgba(141,191,60,.5)",
      "rgba(255,255,255,.22)",
    ];

    const particles: HTMLDivElement[] = [];
    for (let i = 0; i < 48; i += 1) {
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

      container.appendChild(dot);
      particles.push(dot);
    }

    return () => {
      particles.forEach((particle) => particle.remove());
    };
  }, [containerRef]);
}

export default function AgriNovaLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [buttonState, setButtonState] = useState<"idle" | "loading" | "success">("idle");

  const particlesRef = useRef<HTMLDivElement>(null);
  const loginButtonRef = useRef<HTMLButtonElement>(null);
  const submitRef = useRef(false);
  useParticles(particlesRef);

  const shakeElement = (element: HTMLElement | null) => {
    if (!element) return;
    element.style.animation = "none";
    void element.offsetHeight;
    element.style.animation = "shake 0.4s ease";
    window.setTimeout(() => {
      element.style.animation = "";
    }, 400);
  };

  const validate = () => {
    if (!email || !password) {
      setError("Veuillez remplir tous les champs.");
      shakeElement(loginButtonRef.current);
      return false;
    }

    if (!email.includes("@")) {
      setError("Veuillez saisir une adresse e-mail valide.");
      shakeElement(loginButtonRef.current);
      return false;
    }

    return true;
  };

  const handleLogin = async (event?: FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    
    if (submitRef.current) return;
    submitRef.current = true;

    try {
      if (buttonState === "loading" || buttonState === "success") return;

      setError("");

      if (!validate()) return;

      setButtonState("loading");

      const { user: loggedUser, mustChangePassword } = await login(email, password);
      setButtonState("success");

      if (mustChangePassword) {
        navigate("/force-password-change", { replace: true });
        return;
      }

      const roles = Array.isArray(loggedUser?.roles) ? loggedUser.roles : [];
      if (roles.includes("admin") || roles.includes("expert")) {
        navigate("/dashboard", { replace: true });
      } else if (roles.includes("farmer")) {
        navigate("/farmer/dashboard", { replace: true });
      } else {
        // Compte sans rôle reconnu : jamais de redirection vers une page
        // publique (PublicOnlyRoute le déconnecterait aussitôt).
        navigate("/login", { replace: true });
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Erreur réseau. Veuillez réessayer.";
      setError(message);
      setButtonState("idle");
      shakeElement(loginButtonRef.current);
    } finally {
      submitRef.current = false;
    }
  };



  const buttonLabel =
    buttonState === "loading"
      ? "Connexion…"
      : buttonState === "success"
        ? "✓  Bon retour !"
        : "Se connecter  →";

  return (
    <div className={styles.page}>
      <div className={styles.panelLeft}>
        <Link to="/" className={styles.homeArrow} aria-label="Retour à l'accueil">
          ←
        </Link>

        <svg
          className={styles.panelLeftLeafbg}
          viewBox="0 0 500 900"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M475 0 C510 35,515 85,472 118 C452 132,426 128,418 106 C410 82,424 40,475 0Z" fill="#74c69d" opacity=".14" />
          <line x1="475" y1="0" x2="424" y2="106" stroke="#40916c" strokeWidth="1" opacity=".12" />
          <path d="M0 830 C32 798,74 792,84 818 C90 835,70 856,42 862 C14 868,0 850,0 830Z" fill="#8DBF3C" opacity=".16" />
          <g transform="translate(38,75) rotate(-12)"><path d="M0 22 C8 4,20 1,24 13 C20 24,8 28,0 22Z" fill="#40916c" opacity=".28" /><line x1="0" y1="22" x2="24" y2="13" stroke="#40916c" strokeWidth=".7" opacity=".2" /></g>
          <g transform="translate(118,58) rotate(8)"><path d="M0 20 C7 4,18 1,22 11 C18 21,7 25,0 20Z" fill="#74c69d" opacity=".22" /></g>
          <g transform="translate(215,72) rotate(-6)"><path d="M0 24 C9 5,22 2,26 15 C22 27,9 31,0 24Z" fill="#8DBF3C" opacity=".19" /></g>
          <g transform="translate(310,60) rotate(14)"><path d="M0 20 C8 4,19 1,22 12 C19 22,8 26,0 20Z" fill="#40916c" opacity=".2" /></g>
          <g transform="translate(400,75) rotate(-10)"><path d="M0 22 C8 5,21 2,25 14 C21 25,8 29,0 22Z" fill="#74c69d" opacity=".18" /></g>
          <g transform="translate(465,55) rotate(6)"><path d="M0 18 C7 3,16 0,19 9 C16 18,7 22,0 18Z" fill="#8DBF3C" opacity=".15" /></g>
          <g transform="translate(18,155) rotate(10)"><path d="M0 24 C9 5,22 2,26 15 C22 27,9 31,0 24Z" fill="#74c69d" opacity=".24" /></g>
          <g transform="translate(92,140) rotate(-16)"><path d="M0 20 C8 4,19 1,22 11 C19 21,8 25,0 20Z" fill="#40916c" opacity=".2" /></g>
          <g transform="translate(182,158) rotate(12)"><path d="M0 22 C9 5,21 2,25 14 C21 25,9 29,0 22Z" fill="#8DBF3C" opacity=".18" /></g>
          <g transform="translate(272,143) rotate(-8)"><path d="M0 24 C9 6,22 2,26 15 C22 27,9 31,0 24Z" fill="#74c69d" opacity=".19" /></g>
          <g transform="translate(368,157) rotate(18)"><path d="M0 20 C8 4,18 1,22 11 C18 21,8 25,0 20Z" fill="#40916c" opacity=".17" /></g>
          <g transform="translate(448,142) rotate(-6)"><path d="M0 22 C8 5,20 2,24 13 C20 24,8 28,0 22Z" fill="#8DBF3C" opacity=".16" /></g>
          <g transform="translate(50,238) rotate(-8)"><path d="M0 22 C8 5,21 2,25 14 C21 25,8 29,0 22Z" fill="#40916c" opacity=".22" /></g>
          <g transform="translate(140,222) rotate(14)"><path d="M0 24 C9 6,22 2,26 15 C22 27,9 31,0 24Z" fill="#74c69d" opacity=".19" /></g>
          <g transform="translate(235,240) rotate(-14)"><path d="M0 20 C8 4,18 1,22 11 C18 21,8 25,0 20Z" fill="#8DBF3C" opacity=".17" /></g>
          <g transform="translate(330,225) rotate(10)"><path d="M0 22 C9 5,21 2,25 14 C21 25,9 29,0 22Z" fill="#40916c" opacity=".18" /></g>
          <g transform="translate(420,240) rotate(-12)"><path d="M0 20 C8 4,19 1,22 12 C19 22,8 26,0 20Z" fill="#74c69d" opacity=".16" /></g>
          <g transform="translate(22,322) rotate(6)"><path d="M0 24 C9 6,22 2,26 15 C22 27,9 31,0 24Z" fill="#8DBF3C" opacity=".2" /></g>
          <g transform="translate(108,308) rotate(-10)"><path d="M0 22 C8 5,20 2,24 13 C20 24,8 28,0 22Z" fill="#40916c" opacity=".18" /></g>
          <g transform="translate(202,324) rotate(16)"><path d="M0 20 C8 4,18 1,22 11 C18 21,8 25,0 20Z" fill="#74c69d" opacity=".16" /></g>
          <g transform="translate(298,310) rotate(-6)"><path d="M0 24 C9 6,21 2,25 14 C21 25,9 29,0 24Z" fill="#8DBF3C" opacity=".17" /></g>
          <g transform="translate(388,325) rotate(12)"><path d="M0 22 C8 5,20 2,24 13 C20 24,8 28,0 22Z" fill="#40916c" opacity=".15" /></g>
          <g transform="translate(58,408) rotate(-14)"><path d="M0 22 C9 5,21 2,25 14 C21 25,9 29,0 22Z" fill="#74c69d" opacity=".18" /></g>
          <g transform="translate(155,392) rotate(8)"><path d="M0 24 C9 6,22 2,26 15 C22 27,9 31,0 24Z" fill="#40916c" opacity=".16" /></g>
          <g transform="translate(252,410) rotate(-10)"><path d="M0 20 C8 4,18 1,22 11 C18 21,8 25,0 20Z" fill="#8DBF3C" opacity=".15" /></g>
          <g transform="translate(348,395) rotate(14)"><path d="M0 22 C8 5,20 2,24 13 C20 24,8 28,0 22Z" fill="#74c69d" opacity=".15" /></g>
          <g transform="translate(435,408) rotate(-6)"><path d="M0 20 C8 4,19 1,22 12 C19 22,8 26,0 20Z" fill="#40916c" opacity=".13" /></g>
          <g transform="translate(28,490) rotate(8)"><path d="M0 22 C8 5,20 2,24 13 C20 24,8 28,0 22Z" fill="#40916c" opacity=".16" /></g>
          <g transform="translate(122,476) rotate(-12)"><path d="M0 20 C8 4,18 1,22 11 C18 21,8 25,0 20Z" fill="#74c69d" opacity=".14" /></g>
          <g transform="translate(220,492) rotate(10)"><path d="M0 24 C9 6,21 2,25 14 C21 25,9 29,0 24Z" fill="#8DBF3C" opacity=".13" /></g>
          <g transform="translate(315,477) rotate(-8)"><path d="M0 22 C8 5,20 2,24 13 C20 24,8 28,0 22Z" fill="#40916c" opacity=".13" /></g>
          <g transform="translate(405,490) rotate(14)"><path d="M0 20 C8 4,18 1,22 11 C18 21,8 25,0 20Z" fill="#74c69d" opacity=".12" /></g>
        </svg>

        <div className={styles.logo}>
          <img
            src="/logo-elastic-solutions.png"
            alt="Elastic Solutions"
            style={{ height: 56, width: "auto", maxWidth: 240, objectFit: "contain", display: "block" }}
          />
        </div>

        <form className={styles.panelLeftInner} onSubmit={handleLogin}>
          <div className={styles.headline}>
            <div className={styles.headlineEyebrow}>Accès sécurisé</div>
            <h1 className={styles.headlineH1}>
              <em>Bienvenue</em>
              <br />
              sur votre espace
              <br />
              <span className={styles.brandOutline}>Elastic Solutions.</span>
            </h1>
            <p className={styles.headlineSub}>
              Vos cultures vous attendent. Connectez-vous pour accéder
              <br />
              aux diagnostics IA, aux bilans de santé en temps réel
              <br />
              et au suivi intelligent de vos parcelles, en un seul endroit.
            </p>
          </div>

          {resetSuccess && (
            <div className={styles.successBanner} role="status">
              ✓ Mot de passe modifié avec succès. Connectez-vous.
            </div>
          )}

          <div className={`${styles.formError} ${error ? styles.isVisible : ""}`} role="alert" aria-live="polite">
            <span aria-hidden="true">⚠</span>
            <span>{error || "Erreur"}</span>
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel} htmlFor="agri-email">
              Adresse e-mail
            </label>
            <div className={styles.formFieldWrap}>
              <input
                className={styles.formInput}
                id="agri-email"
                type="email"
                placeholder="vous@exemple.com"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <div className={styles.formUnderline} aria-hidden="true" />
            </div>
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel} htmlFor="agri-password">
              Mot de passe
            </label>
            <div className={styles.formFieldWrap}>
              <input
                className={styles.formInput}
                id="agri-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <div className={styles.formUnderline} aria-hidden="true" />
              <button
                className={styles.formEyeToggle}
                type="button"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                onClick={() => setShowPassword((previous) => !previous)}
              >
                {showPassword ? "Masquer" : "Afficher"}
              </button>
            </div>
          </div>

          <div className={styles.formOptions}>
            <label className={`${styles.formRemember} ${remember ? styles.isChecked : ""}`}>
              <input type="checkbox" checked={remember} onChange={() => setRemember((previous) => !previous)} />
              <div className={styles.formCheckboxUi} aria-hidden="true">
                {remember ? "✓" : ""}
              </div>
              Rester connecté
            </label>
            <Link to="/forgot-password" className={styles.formForgot}>
              Mot de passe oublié&nbsp;?
            </Link>
          </div>

          <button
            className={`${styles.btnSubmit} ${buttonState === "loading" ? styles.isLoading : ""} ${buttonState === "success" ? styles.isSuccess : ""}`}
            type="submit"
            disabled={buttonState === "loading" || buttonState === "success"}
            ref={loginButtonRef}
          >
            <span className={styles.btnSubmitText}>{buttonLabel}</span>
          </button>

          <p className={styles.formRegister}>
            Pas encore de compte&nbsp;? <Link to="/agrinova-signup">Créer un compte →</Link>
          </p>
        </form>
      </div>

      <div className={styles.panelRight}>
        <div className={styles.panelRightAtmosphere} />
        <div className={styles.panelRightGrain} />
        <div className={styles.panelRightFlare} />
        <div className={styles.panelRightFlareWarm} />

        <div className={styles.panelRightGeo}>
          {[...Array(5)].map((_, index) => (
            <div key={index} className={styles.geoLine} />
          ))}
        </div>

        <div className={styles.panelRightParticles} ref={particlesRef} />

        <svg className={styles.panelRightBlob} viewBox="0 0 600 580" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M300 38 C452 28,572 128,578 280 C584 432,482 558,330 568 C178 578,52 480,38 328 C24 176,116 48,300 38Z"
            fill="#74c69d"
          />
        </svg>

        <div className={`${styles.orbitRing} ${styles.orbitRingOuter}`} />
        <div className={`${styles.orbitRing} ${styles.orbitRingInner}`} />

        <div className={styles.orbitDots}>
          <div className={`${styles.orbitDot} ${styles.orbitDotGold}`} />
          <div className={`${styles.orbitDot} ${styles.orbitDotMint}`} />
          <div className={`${styles.orbitDot} ${styles.orbitDotLeaf}`} />
        </div>

        <div className={styles.panelRightEmblem}>
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

        <div className={styles.panelRightTitleWrap}>
          <div className={styles.panelRightTitle}>
            L’agriculture intelligente
            <br />
            commence <em>ici.</em>
          </div>
          <div className={styles.panelRightSubtitle}>IA · Suivi des cultures · Analyse en temps réel</div>
        </div>

        <div className={styles.panelRightStats}>
          {[
            { number: "90", sup: " %+", label: "Précision" },
            { number: "10", sup: "+", label: "Cultures" },
            { number: "24/7", sup: "", label: "Surveillance" },
          ].map(({ number, sup, label }) => (
            <div key={label} className={styles.stat}>
              <div className={styles.statNumber}>
                {number}
                {sup ? <sup>{sup}</sup> : null}
              </div>
              <div className={styles.statLabel}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
