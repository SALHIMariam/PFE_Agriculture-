import { useTranslation } from "react-i18next";
import type { User } from "../../../../services/authService";
import styles from "./profile.module.css";

const ZONE_CLASS: Record<string, string> = {
  green: styles.zoneGreen,
  yellow: styles.zoneYellow,
  orange: styles.zoneOrange,
};

export default function FarmCard({ user, onEdit }: { user: User; onEdit: () => void }) {
  const { t } = useTranslation();

  const farmType = user.farm_profile
    ? t(`profile.farmType.${user.farm_profile}`, { defaultValue: user.farm_profile })
    : null;
  const irrigation = user.irrigation_system
    ? t(`profile.irrigation.${user.irrigation_system}`, { defaultValue: user.irrigation_system })
    : null;
  const zone = user.climate_zone;

  const Value = ({ children }: { children: React.ReactNode }) =>
    children ? <span className={styles.infoValue}>{children}</span> : <span className={styles.mutedValue}>{t("common.notSet")}</span>;

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <div className={styles.cardTitle}>🚜 {t("profile.farm.title")}</div>
        <button type="button" className={styles.btn} onClick={onEdit}>
          {t("common.edit")}
        </button>
      </div>

      <div className={styles.infoGrid}>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>{t("profile.farm.farmType")}</span>
          <Value>{farmType}</Value>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>{t("profile.farm.surface")}</span>
          <Value>
            {user.surface_ha != null && user.surface_ha > 0
              ? t("profile.farm.hectares", { value: user.surface_ha })
              : null}
          </Value>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>{t("profile.farm.governorate")}</span>
          <Value>{user.governorate}</Value>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>{t("profile.farm.climateZone")}</span>
          {zone ? (
            <span className={`${styles.zonePill} ${ZONE_CLASS[zone.color] ?? ""}`}>
              {t(`profile.zone.${zone.key}`, { defaultValue: zone.label })}
            </span>
          ) : (
            <span className={styles.mutedValue}>{t("common.notSet")}</span>
          )}
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>{t("profile.farm.irrigation")}</span>
          <Value>{irrigation}</Value>
        </div>
      </div>
    </div>
  );
}
