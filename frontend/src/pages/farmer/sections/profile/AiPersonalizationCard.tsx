import { useTranslation } from "react-i18next";
import type { User } from "../../../../services/authService";
import styles from "./profile.module.css";

export default function AiPersonalizationCard({ user }: { user: User }) {
  const { t } = useTranslation();
  const zone = user.climate_zone;

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <div className={styles.cardTitle}>🤖 {t("profile.ai.title")}</div>
      </div>
      <p className={styles.cardIntro}>{t("profile.ai.intro")}</p>

      <div className={styles.infoGrid}>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>{t("profile.ai.cropsTracked")}</span>
          <span className={styles.infoValue}>{user.crops?.length ?? 0}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>{t("profile.ai.region")}</span>
          <span className={styles.infoValue}>{user.governorate ?? t("common.notSet")}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>{t("profile.ai.climateZone")}</span>
          <span className={styles.infoValue}>
            {zone ? t(`profile.zone.${zone.key}`, { defaultValue: zone.label }) : t("common.notSet")}
          </span>
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {(["region", "crops", "risks"] as const).map((k) => (
          <div key={k} className={styles.criterion}>
            <span className={`${styles.criterionMark} ${styles.criterionMarkDone}`}>✓</span>
            {t(`profile.ai.benefits.${k}`)}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18 }}>
        <button type="button" className={styles.btn} disabled title="Bientôt disponible">
          {t("profile.ai.managePrefs")}
        </button>
      </div>
    </div>
  );
}
