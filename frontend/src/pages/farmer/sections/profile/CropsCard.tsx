import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { User } from "../../../../services/authService";
import { useAuth } from "../../../../context/AuthContext";
import { getAnalyses, type Analysis } from "../../../../services/analysisService";
import { cropEmoji } from "./options";
import { dateOnly } from "./format";
import styles from "./profile.module.css";
import { getDiseaseLabel } from "../../../../data/diseaseLabels";

type CropStatus = "good" | "watch" | "alert" | "unknown";

const STATUS_DOT: Record<CropStatus, string> = {
  good: "🟢",
  watch: "🟡",
  alert: "🔴",
  unknown: "⚪",
};

function prettyDisease(predicted?: string | null): string | null {
  if (!predicted) return null;
  return getDiseaseLabel(predicted).disease;
}

function statusFor(a?: Analysis): CropStatus {
  if (!a || a.status !== "done" || !a.predicted_class) return "unknown";
  if (a.predicted_class.toLowerCase().includes("healthy")) return "good";
  const confident = (a.confidence ?? 0) >= 0.8 || a.validation_status === "validated";
  return confident ? "alert" : "watch";
}

export default function CropsCard({ user: userProp, onAddCrop }: { user: User; onAddCrop: () => void }) {
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const [analyses, setAnalyses] = useState<Analysis[] | null>(null);
  // Le user d'AuthContext est rafraîchi après une analyse (auto-ajout de culture) :
  // on le privilégie pour que la liste se mette à jour sans recharger le profil.
  const crops = authUser?.crops ?? userProp.crops ?? [];

  useEffect(() => {
    let cancelled = false;
    getAnalyses(1)
      .then((res) => {
        if (!cancelled) setAnalyses(res.data);
      })
      .catch(() => {
        if (!cancelled) setAnalyses([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const latestByCrop = useMemo(() => {
    const map = new Map<string, Analysis>();
    for (const a of analyses ?? []) {
      if (!a.crop) continue;
      const existing = map.get(a.crop);
      if (!existing || (a.created_at ?? "") > (existing.created_at ?? "")) map.set(a.crop, a);
    }
    return map;
  }, [analyses]);

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <div className={styles.cardTitle}>🌱 {t("profile.crops.title")}</div>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onAddCrop}>
          + {t("profile.crops.add")}
        </button>
      </div>

      {crops.length === 0 ? (
        <p className={styles.cardIntro}>{t("profile.crops.none")}</p>
      ) : (
        <div className={styles.cropGrid}>
          {crops.map((crop) => {
            const last = latestByCrop.get(crop);
            const status = statusFor(last);
            return (
              <div key={crop} className={styles.cropCard}>
                <div className={styles.cropTop}>
                  <span className={styles.cropEmoji}>{cropEmoji(crop)}</span>
                  <span className={styles.cropName}>{crop}</span>
                </div>
                <span className={styles.cropStatus}>
                  {STATUS_DOT[status]} {t(`profile.crops.status.${status}`)}
                </span>
                <div style={{ marginTop: 10 }}>
                  <div className={styles.cropMetaRow}>
                    <span>{t("profile.crops.lastAnalysis")}</span>
                    <span>{last?.created_at ? dateOnly(last.created_at) : "—"}</span>
                  </div>
                  <div className={styles.cropMetaRow}>
                    <span>{t("profile.crops.lastDisease")}</span>
                    <span>{prettyDisease(last?.predicted_class) ?? "—"}</span>
                  </div>
                  <div className={styles.cropMetaRow}>
                    <span>{t("profile.crops.lastReco")}</span>
                    <span>{last?.expert_comment?.trim() || "—"}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
