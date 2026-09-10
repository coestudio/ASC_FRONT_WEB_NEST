import { Container } from "react-bootstrap";
import styles from "./area-home.module.css";

type AreaHomeProps = {
  title: string;
  welcome: string;
};

// Home de cada área (Administrativo/Operacional/Área do cliente/Laboratório)
// — conteúdo levemente mais elaborado que o placeholder genérico (saudação +
// título da área), mas ainda sem nenhum dado real do Core (fora do escopo
// desta SPEC).
export function AreaHome({ title, welcome }: AreaHomeProps) {
  return (
    <Container className={styles.wrapper}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.welcome}>{welcome}</p>
    </Container>
  );
}
