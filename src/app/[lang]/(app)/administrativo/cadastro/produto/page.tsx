import { getDictionary } from "@/i18n/dictionaries";
import { PlaceholderPage } from "@/components/shell/placeholder-page";

export default async function AdministrativoCadastroProdutoPage({
  params,
}: PageProps<"/[lang]/administrativo/cadastro/produto">) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <PlaceholderPage
      title={dict.nav.administrativoProduct}
      description={dict.shell.underConstructionDescription}
    />
  );
}
