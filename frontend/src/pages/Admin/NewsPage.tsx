import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { NewsFeed } from "../News";

export default function NewsPage() {
  return (
    <>
      <PageMeta title="Actualités | Elastic Solutions" description="Veille agricole : maladies, traitements et tendances filtrables par culture" />
      <PageBreadcrumb pageTitle="Actualités" />
      <NewsFeed />
    </>
  );
}
