import ComponentCard from "../../../../components/common/ComponentCard";
import { AgreementStats } from "../services/expertAnalyticsService";
import KpiTile, { formatPct } from "./KpiTile";

type Props = { data: AgreementStats | null; loading: boolean };

export default function AgreementCard({ data, loading }: Props) {
  return (
    <ComponentCard
      title="Accord humain–IA"
      desc="Accord entre le diagnostic IA et la décision de l'expert"
      tooltip="Pourcentage de cas où l'expert valide le diagnostic de l'IA sans modification. Un taux élevé indique une bonne performance du modèle. Calculé sur toutes les analyses traitées (hors en attente)."
      className="shadow-sm transition-shadow duration-300 hover:shadow-md"
    >
      {loading || !data ? (
        <div className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.03]" />
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <KpiTile label="Accord" value={formatPct(data.agreement_pct)} />
          <KpiTile label="Validations concordantes" value={String(data.validated_count)} />
          <KpiTile label="Désaccords" value={String(data.rejected_count)} />
        </div>
      )}
    </ComponentCard>
  );
}
