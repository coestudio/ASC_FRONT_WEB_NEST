import { getDictionary } from "@/i18n/dictionaries";
import { AreaHome } from "@/components/shell/area-home";

export default async function LaboratorioPage({
  params,
}: PageProps<"/[lang]/laboratorio">) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <AreaHome
      title={dict.nav.laboratorio}
      welcome={dict.shell.areaWelcome.replace("{area}", dict.nav.laboratorio)}
    />
  );
}
