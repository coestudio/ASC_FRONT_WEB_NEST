import { getDictionary } from "@/i18n/dictionaries";
import { PlaceholderPage } from "@/components/shell/placeholder-page";

export default async function AdministrativoOcorrenciasPage({
  params,
}: PageProps<"/[lang]/administrativo/ocorrencias">) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <PlaceholderPage
      title={dict.nav.administrativoOccurrences}
      description={dict.shell.underConstructionDescription}
    />
  );
}
