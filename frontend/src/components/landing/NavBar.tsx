import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";

export default function Navbar() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <>
      <nav id="navbar">
        <button className="nav-hamburger" id="hamburger" aria-label="Menu">
          <span></span><span></span><span></span>
        </button>

        <a className="logo nav-logo-center" href="#home">
          <div className="logo-icon">🌱</div>
          <div>
            <div className="logo-name">AgriNova</div>
            <div className="logo-sub">Smart Agriculture</div>
          </div>
        </a>

        <div className="nav-links">
          <a className="nav-link active" href="#home">Home</a>
          <a className="nav-link" href="#about">About</a>
          <a className="nav-link" href="#services">Services</a>
          <a className="nav-link" href="#team">How It Works</a>
          <a className="nav-link" href="#contact">Contact</a>
        </div>

        {!loading && !user && (
          <div className="nav-cta" style={{ display: "flex", gap: "10px" }}>
            <button className="btn-primary" onClick={() => navigate("/agrinova-login")}>
              Login
            </button>
            <button className="btn-primary" onClick={() => navigate("/agrinova-signup")}>
              Sign Up
            </button>
          </div>
        )}

        {!loading && user && (
          <button className="btn-primary nav-cta" onClick={handleLogout}>
            Déconnecter
          </button>
        )}
      </nav>

      <div className="mobile-menu" id="mobileMenu">
        <div className="mobile-menu-links">
          <a className="nav-link active" href="#home">Home</a>
          <a className="nav-link" href="#about">About</a>
          <a className="nav-link" href="#services">Services</a>
          <a className="nav-link" href="#how">How It Works</a>
          <a className="nav-link" href="#contact">Contact</a>
        </div>
        <div className="mobile-menu-cta">
          {!loading && !user && (
            <>
              <div className="mobile-menu-cta-tagline">Ready to grow smarter?</div>
              <div className="mobile-menu-cta-sub">Join hundreds of farmers using AI to protect their crops.</div>
              <button className="btn-primary" onClick={() => navigate("/agrinova-login")}>
                Login
              </button>
              <button className="btn-primary" style={{ marginTop: "8px" }} onClick={() => navigate("/agrinova-signup")}>
                Sign Up
              </button>
            </>
          )}
          {!loading && user && (
            <button className="btn-primary" onClick={handleLogout}>
              Déconnecter
            </button>
          )}
        </div>
      </div>
    </>
  );
}
