import { useForm, type SubmitHandler } from "react-hook-form";
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner, Table } from "react-bootstrap";

import { PostApiOperationOperationIdRomaneioBody } from "@/api/generated/zod/romaneio/romaneio.zod";
import type { RomaneioImportInvalidDTO } from "@/api/generated/model";
import { withEmptyStringsAsNull } from "@/components/crud/empty-strings-resolver";
import { Modal } from "@/components/ui/modal";
import RenderFields from "@/layouts/Form/Fields/map";
import { useT } from "@/lib/ui-prefs";
import { buildRomaneioFields, toFormValues, type RomaneioFormValues } from "./RomaneioForm";

/**
 * SPEC-100 RF12 — ajuste de uma linha inválida do import de romaneio, em
 * duas áreas lado a lado: à esquerda o **original** (valores lidos da
 * planilha, só leitura, com os erros apontados pelo Core) e à direita o
 * **ajuste** (formulário de fardo pré-preenchido com o original, mesmos
 * campos e schema gerado da aba Romaneio). Campo alterado em relação ao
 * original fica destacado nas duas áreas. Em telas menores as áreas
 * empilham (original em cima).
 */
export function RomaneioFixRowModal({
  row,
  onSubmit,
  onClose,
}: {
  row: RomaneioImportInvalidDTO;
  onSubmit: (values: RomaneioFormValues) => Promise<void>;
  onClose: () => void;
}) {
  const t = useT();
  const original = toFormValues(row.row);
  const methods = useForm<RomaneioFormValues>({
    resolver: withEmptyStringsAsNull(PostApiOperationOperationIdRomaneioBody),
    defaultValues: original,
  });
  const {
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting },
  } = methods;
  const current = watch();

  // Na área de ajuste cada campo ocupa meia largura (a área já é metade do modal).
  const fields = buildRomaneioFields(t).map((field) => ({ ...field, col: { md: 6 } }));

  const valueOf = (values: RomaneioFormValues, name: string) =>
    String((values as Record<string, unknown>)[name] ?? "").trim();
  const isChanged = (name: string) => valueOf(current, name) !== valueOf(original, name);
  const changedCount = fields.filter((field) => isChanged(field.fieldName)).length;

  return (
    <Modal show onHide={onClose} centered size="xl" fullscreen="lg-down">
      <Modal.Header>
        <Modal.Title className="h5 mb-0">
          {t("administrative-operations.romaneio.import.fix.title")} —{" "}
          {t("administrative-operations.romaneio.import.sheetRowLabel", {
            row: String(row.sheetRow ?? ""),
          })}
        </Modal.Title>
      </Modal.Header>
      <Form noValidate onSubmit={handleSubmit(onSubmit as SubmitHandler<RomaneioFormValues>)}>
        <Modal.Body>
          {(row.errors ?? []).length > 0 ? (
            <Alert variant="warning" className="py-2">
              <div className="fw-semibold mb-1">
                <i className="bi bi-exclamation-triangle-fill me-1" aria-hidden="true" />
                {t("administrative-operations.romaneio.import.fix.errorsTitle")}
              </div>
              <ul className="mb-0 ps-3 small">
                {(row.errors ?? []).map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </Alert>
          ) : null}

          <Row className="g-3">
            <Col lg={5}>
              <Card className="h-100">
                <Card.Header className="fw-semibold">
                  <i className="bi bi-file-earmark-spreadsheet me-1" aria-hidden="true" />
                  {t("administrative-operations.romaneio.import.fix.originalTitle")}
                </Card.Header>
                <Card.Body className="p-0">
                  <Table size="sm" className="mb-0 align-middle">
                    <tbody>
                      {fields.map((field) => {
                        const value = valueOf(original, field.fieldName);
                        const changed = isChanged(field.fieldName);
                        return (
                          <tr
                            key={field.fieldName}
                            className={changed ? "table-warning" : undefined}
                          >
                            <th scope="row" className="text-body-secondary fw-normal small ps-3">
                              {field.label}
                            </th>
                            <td className="text-break pe-3">
                              {value ? (
                                <span
                                  className={changed ? "text-decoration-line-through" : undefined}
                                >
                                  {value}
                                </span>
                              ) : (
                                <span className="text-danger">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={7}>
              <Card className="h-100">
                <Card.Header className="fw-semibold d-flex align-items-center justify-content-between gap-2">
                  <span>
                    <i className="bi bi-pencil-square me-1" aria-hidden="true" />
                    {t("administrative-operations.romaneio.import.fix.adjustTitle")}
                  </span>
                  {changedCount > 0 ? (
                    <Badge bg="warning" text="dark">
                      {t("administrative-operations.romaneio.import.fix.changedCount", {
                        count: String(changedCount),
                      })}
                    </Badge>
                  ) : null}
                </Card.Header>
                <Card.Body>
                  <RenderFields fields={fields} methods={methods} />
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            className="me-auto"
            disabled={changedCount === 0}
            onClick={() => reset(original)}
          >
            <i className="bi bi-arrow-counterclockwise me-1" aria-hidden="true" />
            {t("administrative-operations.romaneio.import.fix.restore")}
          </Button>
          <Button variant="outline-primary" onClick={onClose}>
            {t("administrative-operations.romaneio.import.cancel")}
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? (
              <Spinner size="sm" animation="border" className="me-2" />
            ) : (
              <i className="bi bi-check-lg me-1" aria-hidden="true" />
            )}
            {t("administrative-operations.romaneio.import.fix.save")}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
