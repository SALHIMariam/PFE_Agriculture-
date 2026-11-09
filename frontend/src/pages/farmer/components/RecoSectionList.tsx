import styles from "../FarmerDashboard.module.css";
import type { Recommendation } from "../../../services/analysisService";

/**
 * Rend l'intégralité des rubriques agronomiques d'une recommandation,
 * dans l'ordre : actions → traitements (chimique / bio / organique) →
 * irrigation → fertilisation → prévention → surveillance → temps de
 * récupération → conseils régionaux → avertissements.
 *
 * Toute rubrique vide (tableau absent ou vide) n'est pas rendue.
 * Partagé entre la page « Vos recommandations » et le détail d'analyse.
 */
function Section({
  title,
  items,
  warning = false,
}: {
  title: string;
  items?: string[] | null;
  warning?: boolean;
}) {
  const list = items ?? [];
  if (list.length === 0) return null;

  return (
    <div className={styles["reco-real-section"]}>
      <div className={styles["reco-real-section-title"]}>{title}</div>
      <ul
        className={
          warning
            ? `${styles["reco-real-list"]} ${styles["reco-real-warning-list"]}`
            : styles["reco-real-list"]
        }
      >
        {list.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function RecoSectionList({ recommendation: r }: { recommendation: Recommendation }) {
  return (
    <>
      {r.description && (
        <p
          style={{
            fontStyle: "italic",
            color: "#4d6b52",
            fontSize: 13.5,
            lineHeight: 1.65,
            margin: "0 0 20px",
          }}
        >
          {r.description}
        </p>
      )}

      {r.agent_pathogene && (
        <div
          style={{
            display: "inline-block",
            fontSize: 12,
            fontWeight: 700,
            color: "#4d6b52",
            background: "rgba(64,145,108,0.08)",
            border: "1px solid rgba(64,145,108,0.2)",
            borderRadius: 8,
            padding: "5px 10px",
            marginBottom: 20,
          }}
        >
          Agent : {r.agent_pathogene}
          {r.type_pathogene ? ` (${r.type_pathogene})` : ""}
        </div>
      )}

      <Section title="🔬 Symptômes" items={r.symptomes} />
      <Section title="Actions immédiates" items={r.actions_immediates} />
      <Section title="Traitements chimiques" items={r.traitements?.chimique} />
      <Section title="🌿 Traitements biologiques" items={r.traitements?.biologique} />
      <Section title="♻️ Traitements organiques" items={r.traitements?.organique} />
      <Section title="💧 Irrigation" items={r.irrigation} />
      <Section title="🌱 Fertilisation" items={r.fertilisation} />
      <Section title="🛡️ Prévention" items={r.prevention} />
      <Section title="🔍 Surveillance" items={r.surveillance} />

      {r.temps_recuperation && (
        <div className={styles["reco-real-section"]}>
          <div className={styles["reco-real-section-title"]}>⏱️ Temps de récupération</div>
          <ul className={styles["reco-real-list"]}>
            <li>{r.temps_recuperation}</li>
          </ul>
        </div>
      )}

      <Section title="📍 Conseils régionaux" items={r.conseils_adaptation} />
      <Section title="⚠️ Avertissements" items={r.avertissements} warning />

      {(r.references ?? []).length > 0 && (
        <div className={styles["reco-real-section"]}>
          <div className={styles["reco-real-section-title"]}>📚 Références</div>
          <ul className={styles["reco-real-list"]}>
            {(r.references ?? []).map((item, index) => (
              <li key={index} style={{ fontSize: 12, color: "#6b8c6c" }}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
