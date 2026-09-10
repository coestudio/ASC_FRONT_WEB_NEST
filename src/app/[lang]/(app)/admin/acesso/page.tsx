import { getDictionary } from "@/i18n/dictionaries";
import { AccessPageClient } from "@/components/access/access-page-client";

export default async function AdminAcessoPage({
  params,
}: PageProps<"/[lang]/admin/acesso">) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return <AccessPageClient dict={dict} />;
}
