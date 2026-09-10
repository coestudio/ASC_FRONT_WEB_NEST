import { getDictionary } from "@/i18n/dictionaries";
import { PlaceholderPage } from "@/components/shell/placeholder-page";

export default async function AdministrativoClientesPage({
  params,
}: PageProps<"/[lang]/administrativo/clientes">) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <PlaceholderPage
      title={dict.nav.administrativoClients}
      description={dict.shell.underConstructionDescription}
    />
  );
}
