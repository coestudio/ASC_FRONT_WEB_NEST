import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { AuthBackground } from "@/components/auth/auth-background";
import { getDictionary } from "@/i18n/dictionaries";

export default async function ForgotPasswordPage(
  props: PageProps<"/[lang]/forgot-password">
) {
  const { lang } = await props.params;
  const dict = await getDictionary(lang);

  return (
    <AuthBackground>
      <ForgotPasswordForm dict={dict.auth} lang={lang} />
    </AuthBackground>
  );
}
