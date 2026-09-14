import { useEffect, useRef, useState } from "react";

/**
 * Gera uma URL de preview (`blob:...`) para um único `File`, revogando a
 * anterior sempre que o arquivo mudar ou o componente desmontar.
 *
 * `File` é imutável — comparar pela própria instância (identidade) é
 * suficiente pra saber que o conteúdo não mudou, então a URL só é
 * recriada quando `file` muda de fato (nova seleção, remoção).
 */
export function useObjectUrl(file: File | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return url;
}

/**
 * Variante para lista de arquivos — mantém um `Map<File, string>` entre
 * renders: arquivo que já tem URL não recria; arquivo removido da lista
 * tem a URL revogada; no desmonte, revoga tudo que sobrou no `Map`.
 *
 * Retorna as URLs na mesma ordem de `files`.
 */
export function useObjectUrls(files: File[]): string[] {
  const mapRef = useRef<Map<File, string>>(new Map());
  const [, forceRender] = useState(0);

  useEffect(() => {
    const map = mapRef.current;
    const currentFiles = new Set(files);

    // Revoga URL de arquivos que saíram da lista.
    for (const [existingFile, existingUrl] of map) {
      if (!currentFiles.has(existingFile)) {
        URL.revokeObjectURL(existingUrl);
        map.delete(existingFile);
      }
    }

    // Cria URL só pra arquivo novo na lista.
    let changed = false;
    for (const file of files) {
      if (!map.has(file)) {
        map.set(file, URL.createObjectURL(file));
        changed = true;
      }
    }

    if (changed) {
      // Força um re-render pra refletir as URLs recém-criadas —
      // o cálculo abaixo (fora do efeito) já vai ler o `Map` atualizado.
      forceRender((n) => n + 1);
    }
  }, [files]);

  useEffect(() => {
    const map = mapRef.current;
    return () => {
      for (const url of map.values()) {
        URL.revokeObjectURL(url);
      }
      map.clear();
    };
  }, []);

  // Mantém o array alinhado a `files` por posição — item ainda sem URL
  // (primeiro frame antes do efeito rodar) usa string vazia, nunca "pula"
  // o índice.
  return files.map((file) => mapRef.current.get(file) ?? "");
}
