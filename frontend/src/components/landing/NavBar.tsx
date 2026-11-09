import React, { useEffect, useRef, useState } from "react";
import styles from "./Navbar.module.css";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";

/** Liens de la navbar ↔ id de la section correspondante dans la landing. */
const NAV_LINKS = [
  { id: "home", label: "Accueil" },
  { id: "about", label: "À propos" },
  { id: "services", label: "Services" },
  { id: "team", label: "Comment ça marche" },
  { id: "contact", label: "Contact" },
];

export default function Navbar() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const logoutClickedRef = React.useRef(false);
  const navRef = useRef<HTMLElement>(null);

  // Glassmorphism : la navbar est transparente sur le hero, puis se floute
  // dès que la page défile (> 10px).
  const [scrolled, setScrolled] = useState(
    () => typeof window !== "undefined" && window.scrollY > 10
  );

  // Scroll spy : section actuellement visible → lien actif dans la navbar.
  const [activeSection, setActiveSection] = useState("home");

  /**
   * La landing est rendue dans un shadow DOM : `document.getElementById` n'y
   * accède pas. On récupère la racine réelle (ShadowRoot ou Document) via le
   * nœud de la navbar.
   */
  const getRoot = (): ShadowRoot | Document => {
    const root = navRef.current?.getRootNode();
    return root instanceof ShadowRoot ? root : document;
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
      // Tout en haut : forcer "home" même si l'observer n'a pas encore réagi.
      if (window.scrollY < 100) setActiveSection("home");
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const root = getRoot();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target.id) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        root: null,
        // Bande "active" = de 20 % à 40 % de la hauteur de l'écran.
        rootMargin: "-20% 0px -60% 0px",
        threshold: 0,
      }
    );

    NAV_LINKS.forEach(({ id }) => {
      const el = root.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handleLogout = async (event?: React.MouseEvent) => {
    event?.stopPropagation();
    if (logoutClickedRef.current) return;
    logoutClickedRef.current = true;
    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      logoutClickedRef.current = false;
    }
  };

  const handleNavClick = (event: React.MouseEvent, id: string) => {
    event.preventDefault();
    getRoot().getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setActiveSection(id);
  };

  const renderLinks = () =>
    NAV_LINKS.map((link) => (
      <a
        key={link.id}
        href={`#${link.id}`}
        className={`nav-link ${activeSection === link.id ? "active" : ""}`}
        onClick={(e) => handleNavClick(e, link.id)}
      >
        {link.label}
      </a>
    ));

  return (
    <>
      <nav
        ref={navRef}
        id="navbar"
        className={`${styles.nav} ${scrolled ? "nav-scrolled" : "nav-top"}`}
      >
        <button className="nav-hamburger" id="hamburger" aria-label="Ouvrir le menu">
          <span></span><span></span><span></span>
        </button>

        <a className="logo nav-logo-center" href="#home" onClick={(e) => handleNavClick(e, "home")}>
          <img
            src="/logo-elastic-solutions.png"
            alt="Elastic Solutions"
            style={{ height: 44, width: "auto", maxWidth: 200, objectFit: "contain", display: "block" }}
          />
        </a>

        <div className="nav-links">{renderLinks()}</div>

        {!loading && !user && (
          <div className="nav-cta" style={{ display: "flex", gap: "10px" }}>
            <button className="btn-primary" onClick={() => navigate("/agrinova-login")}>
              Connexion
            </button>
            <button className="btn-primary" onClick={() => navigate("/agrinova-signup")}>
              Inscription
            </button>
          </div>
        )}

        {!loading && user && (
          <button className="btn-primary nav-cta" onClick={handleLogout}>
            Se déconnecter
          </button>
        )}
      </nav>

      <div className="mobile-menu" id="mobileMenu">
        <div className="mobile-menu-links">{renderLinks()}</div>
        <div className="mobile-menu-cta">
          {!loading && !user && (
            <>
              <div className="mobile-menu-cta-tagline">Prêt à cultiver plus intelligemment&nbsp;?</div>
              <div className="mobile-menu-cta-sub">Rejoignez des centaines d’agriculteurs qui protègent leurs cultures grâce à l’IA.</div>
              <button className="btn-primary" onClick={() => navigate("/agrinova-login")}>
                Connexion
              </button>
              <button className="btn-primary" style={{ marginTop: "8px" }} onClick={() => navigate("/agrinova-signup")}>
                Inscription
              </button>
            </>
          )}
          {!loading && user && (
            <button className="btn-primary" onClick={handleLogout}>
              Se déconnecter
            </button>
          )}
        </div>
      </div>
    </>
  );
}
