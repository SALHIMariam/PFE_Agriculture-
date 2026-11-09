"""Pipeline complet : base de connaissances -> dataset -> entraînement."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src import config
from src.knowledge_base import save as save_kb
from src.dataset import save as save_dataset
from src.train import main as train_main
from src.compatibility import as_dataframe, summary

if __name__ == "__main__":
    print("=" * 70)
    print("1/4  Matrice de compatibilité")
    s = summary()
    print(f"     {s['n_plantes']} plantes x {s['n_gouvernorats']} gouvernorats "
          f"= {s['n_combinaisons']} combinaisons")
    print(f"     {s['repartition']}")
    as_dataframe().to_csv(config.REPORTS_DIR / "matrice_compatibilite.csv", encoding="utf-8-sig")

    print("\n2/4  Base de connaissances")
    kb = save_kb()
    print(f"     {kb['n_packages']} packages pour {kb['n_classes']} classes")

    print("\n3/4  Jeu de données")
    df = save_dataset()
    print(f"     {len(df):,} lignes ({df[config.TARGET].nunique()} packages)")
    print(f"     {df['Case'].value_counts().sort_index().to_dict()}")

    print("\n4/4  Entraînement des 5 algorithmes")
    train_main()
