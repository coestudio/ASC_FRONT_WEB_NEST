import { getDictionary } from "@/i18n/dictionaries";
import { PlaceholderPage } from "@/components/shell/placeholder-page";

export default async function AdminAcessosPage({
  params,
}: PageProps<"/[lang]/admin/acessos">) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <PlaceholderPage
      title={dict.nav.adminAccessProfiles}
      description={dict.shell.underConstructionDescription}
    />
  );
}
