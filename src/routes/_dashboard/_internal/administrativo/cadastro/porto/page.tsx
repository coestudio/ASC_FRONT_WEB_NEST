import { getDictionary } from "@/i18n/dictionaries";
import { PlaceholderPage } from "@/components/shell/placeholder-page";

export default async function AdministrativoCadastroPortoPage({
  params,
}: PageProps<"/[lang]/administrativo/cadastro/porto">) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <PlaceholderPage
      title={dict.nav.administrativoHarbor}
      description={dict.shell.underConstructionDescription}
    />
  );
}
