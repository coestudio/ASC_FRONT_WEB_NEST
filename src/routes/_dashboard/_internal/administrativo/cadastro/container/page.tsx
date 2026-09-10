import { getDictionary } from "@/i18n/dictionaries";
import { PlaceholderPage } from "@/components/shell/placeholder-page";

export default async function AdministrativoCadastroContainerPage({
  params,
}: PageProps<"/[lang]/administrativo/cadastro/container">) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <PlaceholderPage
      title={dict.nav.administrativoContainer}
      description={dict.shell.underConstructionDescription}
    />
  );
}
