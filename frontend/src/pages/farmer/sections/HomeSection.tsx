import { useEffect, useRef, useState } from "react";
import useAnimatedCounter from "../hooks/useAnimatedCounter";
import useReplayAnimations from "../hooks/useReplayAnimations";
import ProfileOverviewCard from "../components/ProfileOverviewCard";
import RiskAlertCard from "../components/RiskAlertCard";
import RiskCalendar from "../components/RiskCalendar";
import FarmerKpis from "../components/home/FarmerKpis";
import MonthlyAnalysesChart from "../components/home/MonthlyAnalysesChart";
import RiskMapWidget from "../components/home/RiskMapWidget";
import TopDiseasesCard from "../components/home/TopDiseasesCard";
import RecentAnalysesCard from "../components/home/RecentAnalysesCard";
import { useAuth } from "../../../context/AuthContext";
import { getFarmerDashboard, type FarmerDashboardResponse } from "../../../services/statsService";
import styles from "../FarmerDashboard.module.css";

type HomeSectionProps = {
  sectionKey: string;
  onOpenProfile?: () => void;
  onNewAnalysis?: () => void;
  onNavigate?: (section: string) => void;
};

export default function HomeSection({ sectionKey, onOpenProfile, onNewAnalysis, onNavigate }: HomeSectionProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { replayKey } = useReplayAnimations(rootRef, sectionKey);
  const { user } = useAuth();
  const [data, setData] = useState<FarmerDashboardResponse | null>(null);
  const [loadError, setLoadError] = useState(false);
  const healthScore = useAnimatedCounter(data ? String(data.kpis.healthy_percentage) : "0", true, 1200, replayKey);

  useEffect(() => {
    getFarmerDashboard()
      .then(setData)
      .catch(() => setLoadError(true));
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className={styles.page} ref={rootRef}>
      <ProfileOverviewCard onEditProfile={onOpenProfile} />

      <RiskAlertCard onNewAnalysis={onNewAnalysis} />

      <div className={styles["hero-row"]}>
        <div className={styles.welcome}>
          <div className={styles["wc-badge"]}>
            <span className={styles.dot} />Aujourd'hui
          </div>
          <h1 className={styles["wc-title"]}>
            Vos cultures sont en <em>excellente santé</em>
          </h1>
          <p className={styles["wc-sub"]}>
            Une nouvelle analyse a été validée par votre expert. Il est temps d'appliquer les recommandations personnalisées.
          </p>
          <button type="button" className={styles["wc-cta"]} onClick={onNewAnalysis}>
            Nouvelle analyse
          </button>
        </div>

        <div className={styles["health-card"]}>
          <div className={styles["hc-label"]}>Cultures saines</div>
          <div className={styles["hc-ring"]}>
            <svg width="170" height="170">
              <defs>
                <linearGradient id="gradRing" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#74c69d" />
                  <stop offset="100%" stopColor="#c9a84c" />
                </linearGradient>
              </defs>
              <circle className={styles["hc-ring-bg"]} cx="85" cy="85" r="75" fill="none" strokeWidth="12" />
              {/* key : remonte le cercle quand la valeur réelle arrive pour rejouer l'animation */}
              <circle
                key={data?.kpis.healthy_percentage ?? "loading"}
                className={styles["hc-ring-fg"]}
                cx="85" cy="85" r="75" fill="none" strokeWidth="12"
                style={{ "--ring-target": 471 * (1 - (data?.kpis.healthy_percentage ?? 0) / 100) } as React.CSSProperties}
              />
            </svg>
            <div className={styles["hc-ring-val"]}>
              <span className={styles.n}>{healthScore}</span>
              <span className={styles.u}>/ 100</span>
            </div>
          </div>
          <div className={styles["hc-trend"]}>
            {data ? `${data.kpis.last_30_days} analyse${data.kpis.last_30_days > 1 ? "s" : ""} ces 30 derniers jours` : "…"}
          </div>
        </div>
      </div>

      {loadError && (
        <div className={styles["fd-error"]}>Impossible de charger vos statistiques pour le moment.</div>
      )}

      <FarmerKpis kpis={data?.kpis ?? null} replayKey={replayKey} onNavigate={onNavigate} />

      <div className={styles["fd-grid-wide"]}>
        <MonthlyAnalysesChart monthly={data?.monthly ?? null} />
        <RiskMapWidget governorate={user?.governorate} onOpen={() => onNavigate?.("map")} />
      </div>

      <div className={styles["fd-grid-wide"]}>
        <RecentAnalysesCard
          recent={data?.recent ?? null}
          onOpenHistory={() => onNavigate?.("history")}
          onNewAnalysis={onNewAnalysis}
        />
        <TopDiseasesCard diseases={data?.top_diseases ?? null} />
      </div>

      <RiskCalendar />
    </div>
  );
}
