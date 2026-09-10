import { getDictionary } from "@/i18n/dictionaries";
import { PlaceholderPage } from "@/components/shell/placeholder-page";

export default async function AdministrativoLogPage({
  params,
}: PageProps<"/[lang]/administrativo/log">) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <PlaceholderPage
      title={dict.nav.administrativoLog}
      description={dict.shell.underConstructionDescription}
    />
  );
}
