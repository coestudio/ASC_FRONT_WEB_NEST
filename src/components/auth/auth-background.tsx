import Image from "next/image";
import type { ReactNode } from "react";
import bg from "@/assets/images/login-bg.jpg";
import styles from "./auth-background.module.css";

type AuthBackgroundProps = {
  children: ReactNode;
};

// Background de tela cheia específico das rotas de autenticação: imagem de
// fundo + overlay escuro para dar contraste ao card sobreposto.
export function AuthBackground({ children }: AuthBackgroundProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.imageWrapper}>
        <Image
          src={bg}
          alt=""
          fill
          priority
          sizes="100vw"
          className={styles.image}
        />
      </div>
      <div className={styles.overlay} />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
