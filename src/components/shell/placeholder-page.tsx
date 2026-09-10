import { Container } from "react-bootstrap";
import { ConeStriped } from "react-bootstrap-icons";
import styles from "./placeholder-page.module.css";

type PlaceholderPageProps = {
  title: string;
  description: string;
};

// Página placeholder reutilizável pra sub-rotas do sidebar que ainda não
// têm implementação real — evita link morto sem exigir CRUD real (fora do
// escopo desta SPEC).
export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <Container className={styles.wrapper}>
      <ConeStriped aria-hidden className={styles.icon} />
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.description}>{description}</p>
    </Container>
  );
}
