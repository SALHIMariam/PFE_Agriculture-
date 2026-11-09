import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import DiseaseHeatmap from "../Heatmap/DiseaseHeatmap";

export default function DiseaseHeatmapPage() {
  return (
    <>
      <PageMeta title="Heatmap des maladies | Elastic Solutions" description="Concentration des maladies détectées par gouvernorat en Tunisie" />
      <PageBreadcrumb pageTitle="Heatmap des maladies" />
      <DiseaseHeatmap />
    </>
  );
}
