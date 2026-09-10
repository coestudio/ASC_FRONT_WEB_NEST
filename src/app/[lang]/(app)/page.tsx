import { auth } from "@/auth";
import { getDictionary } from "@/i18n/dictionaries";
import styles from "./page.module.css";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const session = await auth();

  return (
    <div className={styles.wrapper}>
      <h1>
        {dict.home.welcome.replace("{email}", session?.user?.email ?? "")}
      </h1>
    </div>
  );
}
