import { getDictionary } from "@/i18n/dictionaries";
import { AreaHome } from "@/components/shell/area-home";

export default async function AdministrativoHomePage({
  params,
}: PageProps<"/[lang]/administrativo">) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <AreaHome
      title={dict.nav.administrativo}
      welcome={dict.shell.areaWelcome.replace(
        "{area}",
        dict.nav.administrativo
      )}
    />
  );
}
