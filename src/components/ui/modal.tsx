import { Modal as BootstrapModal, type ModalProps } from "react-bootstrap";

/**
 * Wrapper de `<Modal>` do react-bootstrap com o único comportamento de
 * fechamento permitido no projeto: a ação explícita de um botão no rodapé
 * (Cancelar/Fechar/Salvar). Clicar fora (`backdrop`) e apertar ESC
 * (`keyboard`) nunca fecham o modal — por isso o default aqui é
 * `backdrop="static"`/`keyboard={false}`, sobrescrevível só se um caso
 * realmente precisar (não deveria precisar).
 *
 * `scrollable` por padrão: sem isso, um modal com conteúdo mais alto que a
 * viewport (ex. formulário de 11 campos) cresce pra fora da tela e os
 * botões do rodapé (Cancelar/Salvar) ficam inacessíveis sem rolar a página
 * inteira por trás do backdrop. Com `scrollable`, o header/footer do
 * react-bootstrap ficam fixos dentro do modal e só o `Modal.Body` rola —
 * os botões de ação sempre visíveis.
 *
 * Use este componente em vez de importar `Modal` direto de
 * `react-bootstrap`. `Modal.Header` nunca leva `closeButton` — o "X" some,
 * a única saída é o botão do rodapé.
 */
export function Modal({
  backdrop = "static",
  keyboard = false,
  scrollable = true,
  ...props
}: ModalProps) {
  return <BootstrapModal backdrop={backdrop} keyboard={keyboard} scrollable={scrollable} {...props} />;
}

Modal.Header = BootstrapModal.Header;
Modal.Title = BootstrapModal.Title;
Modal.Body = BootstrapModal.Body;
Modal.Footer = BootstrapModal.Footer;
