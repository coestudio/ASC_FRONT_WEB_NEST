import { getDictionary } from "@/i18n/dictionaries";
import { PlaceholderPage } from "@/components/shell/placeholder-page";

// Rota fora do prefixo /administrativo de propósito — mesmo path usado pelo
// warren/Portal pro item "Operações" do menu Administrativo
// (src/Layouts/SideBar/index.tsx: { to: "/operacoes", ... }).
export default async function OperacoesPage({
  params,
}: PageProps<"/[lang]/operacoes">) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <PlaceholderPage
      title={dict.nav.administrativoOperations}
      description={dict.shell.underConstructionDescription}
    />
  );
}
