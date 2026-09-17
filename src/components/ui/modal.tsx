import { Modal as BootstrapModal, type ModalHeaderProps, type ModalProps } from "react-bootstrap";

/**
 * Wrapper de `<Modal>` do react-bootstrap. Clicar fora (`backdrop`) e
 * apertar ESC (`keyboard`) nunca fecham o modal — por isso o default aqui
 * é `backdrop="static"`/`keyboard={false}`, sobrescrevível só se um caso
 * realmente precisar (não deveria precisar). O fechamento explícito é
 * feito pelo(s) botão(ões) do rodapé (Cancelar/Fechar/Salvar) e, desde
 * SPEC-51, também pelo "X" no cabeçalho (`Modal.Header`) — as duas formas
 * chamam o mesmo `onHide` passado ao `<Modal>` pai.
 *
 * `scrollable` por padrão: sem isso, um modal com conteúdo mais alto que a
 * viewport (ex. formulário de 11 campos) cresce pra fora da tela e os
 * botões do rodapé (Cancelar/Salvar) ficam inacessíveis sem rolar a página
 * inteira por trás do backdrop. Com `scrollable`, o header/footer do
 * react-bootstrap ficam fixos dentro do modal e só o `Modal.Body` rola —
 * os botões de ação sempre visíveis.
 *
 * Use este componente em vez de importar `Modal` direto de
 * `react-bootstrap`. `Modal.Header` sempre leva `closeButton` por padrão
 * (o "X" aparece), sobrescrevível com `closeButton={false}` pro raro caso
 * que precisar do comportamento antigo (nenhum consumidor precisa hoje).
 */
export function Modal({
  backdrop = "static",
  keyboard = false,
  scrollable = true,
  ...props
}: ModalProps) {
  return (
    <BootstrapModal backdrop={backdrop} keyboard={keyboard} scrollable={scrollable} {...props} />
  );
}

/** `Modal.Header` com o "X" de fechar habilitado por padrão (SPEC-51). */
function Header({ closeButton = true, ...props }: ModalHeaderProps) {
  return <BootstrapModal.Header closeButton={closeButton} {...props} />;
}

Modal.Header = Header;
Modal.Title = BootstrapModal.Title;
Modal.Body = BootstrapModal.Body;
Modal.Footer = BootstrapModal.Footer;
