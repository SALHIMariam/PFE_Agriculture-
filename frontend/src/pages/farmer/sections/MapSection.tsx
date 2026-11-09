import { useEffect } from "react";
import styles from "../FarmerDashboard.module.css";
import DiseaseHeatmap from "../../Heatmap/DiseaseHeatmap";

export default function MapSection() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles["section-eye"]}>Vue régionale</div>
      <h2 className={styles["section-title"]}>Heatmap des maladies par <em>gouvernorat</em></h2>
      <DiseaseHeatmap />
    </div>
  );
}
