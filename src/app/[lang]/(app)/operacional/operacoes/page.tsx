import { getDictionary } from "@/i18n/dictionaries";
import { PlaceholderPage } from "@/components/shell/placeholder-page";

export default async function OperacionalOperacoesPage({
  params,
}: PageProps<"/[lang]/operacional/operacoes">) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <PlaceholderPage
      title={dict.nav.operacionalOptions}
      description={dict.shell.underConstructionDescription}
    />
  );
}
