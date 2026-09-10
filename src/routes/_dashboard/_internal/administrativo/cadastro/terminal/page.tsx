import { getDictionary } from "@/i18n/dictionaries";
import { PlaceholderPage } from "@/components/shell/placeholder-page";

export default async function AdministrativoCadastroTerminalPage({
  params,
}: PageProps<"/[lang]/administrativo/cadastro/terminal">) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <PlaceholderPage
      title={dict.nav.administrativoTerminal}
      description={dict.shell.underConstructionDescription}
    />
  );
}
