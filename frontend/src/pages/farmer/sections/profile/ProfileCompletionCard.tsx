import { useTranslation } from "react-i18next";
import type { User } from "../../../../services/authService";
import styles from "./profile.module.css";

export function profileCompletion(user: User) {
  const criteria = [
    { key: "governorate", done: Boolean(user.governorate) },
    { key: "crops", done: (user.crops?.length ?? 0) > 0 },
    { key: "farmType", done: Boolean(user.farm_profile) },
    { key: "surface", done: user.surface_ha != null && user.surface_ha > 0 },
    { key: "irrigation", done: Boolean(user.irrigation_system) },
    { key: "season", done: Boolean(user.main_season) },
  ];
  const percent = Math.round((criteria.filter((c) => c.done).length / criteria.length) * 100);
  return { criteria, percent };
}

export default function ProfileCompletionCard({ user }: { user: User }) {
  const { t } = useTranslation();
  const { criteria, percent } = profileCompletion(user);

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <div className={styles.cardTitle}>🌾 {t("profile.completion.title")}</div>
        <div className={styles.progressValue}>{percent}%</div>
      </div>

      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ width: `${percent}%` }} />
      </div>

      <div className={styles.criteriaGrid}>
        {criteria.map((c) => (
          <div key={c.key} className={`${styles.criterion} ${c.done ? styles.criterionDone : ""}`}>
            <span className={`${styles.criterionMark} ${c.done ? styles.criterionMarkDone : ""}`}>
              {c.done ? "✓" : "○"}
            </span>
            {t(`profile.completion.criteria.${c.key}`)}
          </div>
        ))}
      </div>
    </div>
  );
}
