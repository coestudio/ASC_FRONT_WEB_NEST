import { getDictionary } from "@/i18n/dictionaries";
import { PlaceholderPage } from "@/components/shell/placeholder-page";

export default async function ClientColaboradoresPage({
  params,
}: PageProps<"/[lang]/client/colaboradores">) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <PlaceholderPage
      title={dict.nav.clientCollaborators}
      description={dict.shell.underConstructionDescription}
    />
  );
}
