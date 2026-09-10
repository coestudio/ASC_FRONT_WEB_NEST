import { getDictionary } from "@/i18n/dictionaries";
import { AreaHome } from "@/components/shell/area-home";

export default async function OperacionalHomePage({
  params,
}: PageProps<"/[lang]/operacional">) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <AreaHome
      title={dict.nav.operacional}
      welcome={dict.shell.areaWelcome.replace("{area}", dict.nav.operacional)}
    />
  );
}
