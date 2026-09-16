import { useEffect, useState } from "react";
import { Button } from "react-bootstrap";
import { Modal } from "@/components/ui/modal";
import * as mammoth from "mammoth";
import * as XLSX from "xlsx";

import { LoadingState } from "@/components/ui/loading-state";
import { useT } from "@/lib/ui-prefs";

/** Subtipo estrutural de `FileDTO` (regra 2 do AGENTS.md não se aplica — é
 * `type` de props, não schema Zod) — aceita o `FileDTO` gerado direto. */
export type FilePreviewFile = {
  url?: string;
  name?: string;
  extension?: string;
  contentType?: string | null;
};

export type FilePreviewModalProps = {
  show: boolean;
  onHide: () => void;
  file: FilePreviewFile | null;
};

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"];
const DOCX_EXTENSIONS = ["docx", "doc"];
const SHEET_EXTENSIONS = ["xlsx", "xls", "csv"];

type Kind = "image" | "pdf" | "docx" | "sheet" | "unsupported";

function extensionOf(file: FilePreviewFile): string {
  if (file.extension) return file.extension.replace(/^\./, "").toLowerCase();
  const name = file.name ?? file.url ?? "";
  const match = /\.([a-z0-9]+)$/i.exec(name);
  return match ? match[1].toLowerCase() : "";
}

/** Resolve o "modo de exibição" por `contentType` (prioridade), com fallback
 * pra `extension` (§3 da SPEC-20). */
function resolveKind(file: FilePreviewFile): Kind {
  const contentType = file.contentType ?? "";
  const ext = extensionOf(file);

  if (contentType.startsWith("image/") || IMAGE_EXTENSIONS.includes(ext)) return "image";
  if (contentType === "application/pdf" || ext === "pdf") return "pdf";
  if (
    contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    DOCX_EXTENSIONS.includes(ext)
  )
    return "docx";
  if (
    contentType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    contentType === "application/vnd.ms-excel" ||
    contentType === "text/csv" ||
    SHEET_EXTENSIONS.includes(ext)
  )
    return "sheet";
  return "unsupported";
}

function iconForExtension(ext: string): string {
  if (IMAGE_EXTENSIONS.includes(ext)) return "bi-file-earmark-image";
  if (ext === "pdf") return "bi-file-earmark-pdf";
  if (DOCX_EXTENSIONS.includes(ext)) return "bi-file-earmark-word";
  if (SHEET_EXTENSIONS.includes(ext)) return "bi-file-earmark-spreadsheet";
  if (ext === "ppt" || ext === "pptx") return "bi-file-earmark-slides";
  return "bi-file-earmark";
}

/**
 * Fallback "sem preview" (§6.3 da SPEC-20) — usado para PPTX/PPT (sem lib
 * client-side viável), tipo desconhecido, arquivo sem `url`, e qualquer erro
 * de parsing de `mammoth`/`xlsx`. Nunca uma tela em branco (RF3/RF4).
 */
function UnavailableFallback({
  file,
  message,
}: {
  file: FilePreviewFile | null;
  message?: string;
}) {
  const t = useT();
  const ext = file ? extensionOf(file) : "";

  return (
    <div className="text-center text-body-secondary py-5">
      <i className={`bi ${iconForExtension(ext)} display-4 d-block mb-3`} aria-hidden />
      <p className="mb-3 fw-semibold text-body">{file?.name || t("filePreview.titleFallback")}</p>
      <p className="mb-3">{message ?? t("filePreview.unavailable.message")}</p>
      {file?.url ? (
        <div className="d-flex justify-content-center gap-2">
          <a
            className="btn btn-sm btn-outline-primary"
            href={file.url}
            target="_blank"
            rel="noreferrer"
          >
            <i className="bi bi-box-arrow-up-right me-1" aria-hidden />
            {t("filePreview.unavailable.open")}
          </a>
          <a
            className="btn btn-sm btn-primary"
            href={file.url}
            download={file.name}
            target="_blank"
            rel="noreferrer"
          >
            <i className="bi bi-download me-1" aria-hidden />
            {t("filePreview.unavailable.download")}
          </a>
        </div>
      ) : null}
    </div>
  );
}

function DocxPreview({ file }: { file: FilePreviewFile }) {
  const t = useT();
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHtml(null);
    setFailed(false);

    fetch(file.url as string)
      .then((res) => res.arrayBuffer())
      .then((arrayBuffer) => mammoth.convertToHtml({ arrayBuffer }))
      .then((result) => {
        if (!cancelled) setHtml(result.value);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [file.url]);

  if (failed) return <UnavailableFallback file={file} message={t("filePreview.error")} />;
  if (html === null) return <LoadingState variant="inline" />;
  // Conteúdo vem do parsing local de `mammoth`, não é HTML arbitrário de terceiro.
  return <div className="file-preview-docx" dangerouslySetInnerHTML={{ __html: html }} />;
}

function SheetPreview({ file }: { file: FilePreviewFile }) {
  const t = useT();
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHtml(null);
    setFailed(false);

    fetch(file.url as string)
      .then((res) => res.arrayBuffer())
      .then((arrayBuffer) => {
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        if (!sheet) throw new Error("empty workbook");
        return XLSX.utils.sheet_to_html(sheet);
      })
      .then((result) => {
        if (!cancelled) setHtml(result);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [file.url]);

  if (failed) return <UnavailableFallback file={file} message={t("filePreview.error")} />;
  if (html === null) return <LoadingState variant="inline" />;
  return (
    // Conteúdo vem do parsing local de `xlsx`/SheetJS, não é HTML arbitrário de terceiro.
    <div
      className="file-preview-sheet table-responsive"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Modal genérico de preview **read-only** de um arquivo já salvo (SPEC-20).
 * Não faz upload, não é formulário — não confundir com
 * `InputPhotoSingle`/`InputFileSingle` (`File` local antes do envio,
 * SPEC-SHARE-02). Não importa nada de `@/components/operations/**` nem de
 * `@/api/generated/endpoints/document/**` (RF6) — reusável por qualquer
 * aba/tela que tenha um `FileDTO`.
 */
export function FilePreviewModal({ show, onHide, file }: FilePreviewModalProps) {
  const t = useT();

  const kind = file ? resolveKind(file) : "unsupported";
  const title = file?.name || t("filePreview.titleFallback");

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header>
        <Modal.Title className="h6 mb-0 text-truncate">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {!file || !file.url ? (
          <UnavailableFallback file={file} message={t("filePreview.unavailable.noUrl")} />
        ) : kind === "image" ? (
          <img src={file.url} alt={title} className="img-fluid d-block mx-auto" />
        ) : kind === "pdf" ? (
          <object data={file.url} type="application/pdf" width="100%" style={{ height: "75vh" }}>
            <UnavailableFallback file={file} />
          </object>
        ) : kind === "docx" ? (
          <DocxPreview file={file} />
        ) : kind === "sheet" ? (
          <SheetPreview file={file} />
        ) : (
          <UnavailableFallback file={file} />
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-primary" onClick={onHide}>
          {t("crud.recordModal.close")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
