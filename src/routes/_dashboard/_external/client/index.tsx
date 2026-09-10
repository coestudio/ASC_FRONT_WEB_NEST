import { getDictionary } from "@/i18n/dictionaries";
import { AreaHome } from "@/components/shell/area-home";

export default async function ClientHomePage({
  params,
}: PageProps<"/[lang]/client">) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <AreaHome
      title={dict.nav.client}
      welcome={dict.shell.areaWelcome.replace("{area}", dict.nav.client)}
    />
  );
}
