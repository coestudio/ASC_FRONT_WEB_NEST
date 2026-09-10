import { getDictionary } from "@/i18n/dictionaries";
import { PlaceholderPage } from "@/components/shell/placeholder-page";

export default async function ClientAcompanhamentoPage({
  params,
}: PageProps<"/[lang]/client/acompanhamento">) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <PlaceholderPage
      title={dict.nav.clientTracking}
      description={dict.shell.underConstructionDescription}
    />
  );
}
