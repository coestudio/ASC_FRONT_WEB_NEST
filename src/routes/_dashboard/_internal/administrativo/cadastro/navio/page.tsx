import { getDictionary } from "@/i18n/dictionaries";
import { PlaceholderPage } from "@/components/shell/placeholder-page";

export default async function AdministrativoCadastroNavioPage({
  params,
}: PageProps<"/[lang]/administrativo/cadastro/navio">) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <PlaceholderPage
      title={dict.nav.administrativoVessel}
      description={dict.shell.underConstructionDescription}
    />
  );
}
