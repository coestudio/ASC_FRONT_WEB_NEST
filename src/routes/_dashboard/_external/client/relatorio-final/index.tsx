import { getDictionary } from "@/i18n/dictionaries";
import { PlaceholderPage } from "@/components/shell/placeholder-page";

export default async function ClientRelatorioFinalPage({
  params,
}: PageProps<"/[lang]/client/relatorio-final">) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <PlaceholderPage
      title={dict.nav.clientFinalReport}
      description={dict.shell.underConstructionDescription}
    />
  );
}
