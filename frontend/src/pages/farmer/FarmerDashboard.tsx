import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import clsx from "clsx";
import { useAuth } from "../../context/AuthContext";
import HomeSection from "./sections/HomeSection";
import AnalysisSection from "./sections/AnalysisSection";
import HistorySection from "./sections/HistorySection";
import RecommendationsSection from "./sections/RecommendationsSection";
import MapSection from "./sections/MapSection";
import StatsSection from "./sections/StatsSection";
import NewsSection from "./sections/NewsSection";
import ProfileSection from "./sections/ProfileSection";
import LeafDecorations from "./components/LeafDecorations";
import { SectionErrorBoundary } from "../../components/common/SectionErrorBoundary";
import NotificationBell from "./components/NotificationBell";
import WeatherChip from "./components/WeatherChip";
import { cropEmoji } from "../../data/crops";
import { iconFor } from "./components/navIcons";
import styles from "./FarmerDashboard.module.css";

const sidebarItems = [
  { id: "home", label: "Tableau de bord", icon: "home" },
  { id: "analysis", label: "Nouvelle analyse", icon: "analysis" },
  { id: "history", label: "Historique", icon: "history" },
  { id: "recommendations", label: "Recommandations", icon: "recommendations" },
  { id: "map", label: "Carte Tunisie", icon: "map" },
  { id: "stats", label: "Statistiques", icon: "stats" },
  { id: "news", label: "Actualités", icon: "news" },
];

export default function FarmerDashboard() {
  const [activePage, setActivePage] = useState("home");
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Le dashboard farmer n'a pas de mode sombre : on retire la classe `dark`
  // (posée globalement par ThemeContext) tant qu'il est affiché, sans toucher
  // à la préférence enregistrée — un expert/admin la retrouve en sortant.
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.remove("dark");
    return () => {
      if (hadDark) root.classList.add("dark");
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const renderSection = () => {
    switch (activePage) {
      case "analysis":
        return <AnalysisSection />;
      case "history":
        return <HistorySection />;
      case "recommendations":
        return (
          <SectionErrorBoundary sectionName="Recommandations">
            <RecommendationsSection onNewAnalysis={() => setActivePage("analysis")} />
          </SectionErrorBoundary>
        );
      case "map":
        return <MapSection />;
      case "stats":
        return <StatsSection />;
      case "news":
        return <NewsSection />;
      case "profile":
        return <ProfileSection />;
      default:
        return (
          <HomeSection
            sectionKey={activePage}
            onOpenProfile={() => setActivePage("profile")}
            onNewAnalysis={() => setActivePage("analysis")}
            onNavigate={setActivePage}
          />
        );
    }
  };

  return (
    <div className={styles.farmerRoot}>
      <LeafDecorations />
      <div className={styles.appLayout}>
        <aside className={styles.sidebar}>
          <div className={styles["sb-logo"]}>
            <img
              src="/logo-elastic-solutions.png"
              alt="Elastic Solutions"
              style={{ height: 36, width: "auto", maxWidth: 160, objectFit: "contain", display: "block" }}
            />
          </div>

          {sidebarItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={clsx(styles["sb-item"], activePage === item.id && styles.active)}
              onClick={() => setActivePage(item.id)}
            >
              {iconFor(item.id)}
              {item.label}
            </button>
          ))}

          <div className={styles["sb-spacer"]}>
            {(user?.roles?.includes("expert") || user?.roles?.includes("admin")) && (
              <button
                type="button"
                className={clsx(styles["sb-item"])}
                style={{ background: "#2563eb", color: "#fff" }}
                onClick={() => navigate("/dashboard/")}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                🔬 Retour au dashboard Expert
              </button>
            )}
            <button
              type="button"
              className={clsx(styles["sb-item"], activePage === "profile" && styles.active)}
              onClick={() => setActivePage("profile")}
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profil
            </button>
            <button type="button" className={clsx(styles["sb-item"], styles.danger)} onClick={handleLogout}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Déconnexion
            </button>
          </div>
        </aside>

        <div className={styles.mainWrapper}>
          <header className={styles.topbar}>
            <div>
              <div className={styles["hi-txt"]}>Bienvenue</div>
              <div className={styles["hi-name"]}>
                {user?.name ?? "Utilisateur"}, <em>vos plantes vont bien !</em>
              </div>
            </div>
            <div className={styles["tb-tools"]}>
              <div className={styles["tb-search"]}>
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input placeholder="Rechercher…" />
              </div>
              <WeatherChip />
              {user?.crops?.[0] && (
                <div className={styles["tb-chip"]}>
                  {cropEmoji(user.crops[0])} {user.crops[0]}
                </div>
              )}
              <NotificationBell />
              <div className={styles["tb-avatar-wrap"]}>
                <div className={styles["tb-avatar"]}>
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="" />
                  ) : (
                    user?.name?.split(" ")[0]?.[0] ?? "A"
                  )}
                </div>
                <span className={styles["tb-online-dot"]} title="En ligne" />
              </div>
            </div>
          </header>
          <div className={styles.content}>{renderSection()}</div>
        </div>
      </div>
    </div>
  );
}
