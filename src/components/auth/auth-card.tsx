import Image from "next/image";
import type { ReactNode } from "react";
import logo from "@/assets/images/logo.png";
import styles from "./auth-card.module.css";

type AuthCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

// Card reutilizável para telas de autenticação (login, recuperação de senha etc).
// É sempre escuro, independente do tema light/dark global do site, para manter
// contraste sobre a imagem de fundo — por isso escopa data-bs-theme="dark" aqui.
export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className={styles.card} data-bs-theme="dark">
      <div className={styles.brand}>
        <Image
          src={logo}
          alt="Alex Stewart"
          width={40}
          height={40}
          className={styles.logo}
        />
        <div>
          <p className={styles.brandName}>Alex Stewart</p>
          <p className={styles.brandTagline}>Agriculture</p>
        </div>
      </div>

      <h1 className={styles.title}>{title}</h1>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}

      {children}
    </div>
  );
}
