import { LoginForm } from "@/components/auth/login-form";
import { AuthBackground } from "@/components/auth/auth-background";
import { getDictionary } from "@/i18n/dictionaries";

export default async function LoginPage(props: PageProps<"/[lang]/login">) {
  const { lang } = await props.params;
  const searchParams = await props.searchParams;
  const dict = await getDictionary(lang);
  const callbackUrl =
    typeof searchParams.callbackUrl === "string"
      ? searchParams.callbackUrl
      : `/${lang}`;

  return (
    <AuthBackground>
      <LoginForm callbackUrl={callbackUrl} dict={dict.auth} lang={lang} />
    </AuthBackground>
  );
}
