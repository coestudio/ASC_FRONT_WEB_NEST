"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { toast, ToastContainer } from "react-toastify";

const TOAST_MESSAGES: Record<string, { message: string; type: "success" | "error" | "warning" }> = {
  welcome: { message: "Login realizado com sucesso.", type: "success" },
  "logged-out": { message: "Você saiu da sessão.", type: "success" },
  expired: { message: "Sessão expirada. Faça login novamente.", type: "warning" },
  "reset-success": { message: "Senha redefinida com sucesso.", type: "success" },
};

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const toastKey = searchParams.get("toast");
    if (toastKey && TOAST_MESSAGES[toastKey]) {
      const { message, type } = TOAST_MESSAGES[toastKey];
      toast[type](message);

      // Remove o param da URL sem recarregar a página
      const url = new URL(window.location.href);
      url.searchParams.delete("toast");
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [searchParams, router]);

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>{children}</SessionProvider>
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </QueryClientProvider>
  );
}
