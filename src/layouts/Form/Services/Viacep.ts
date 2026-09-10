//* Puxar infos de cep
export type CepData =
  | {
      cep: string;
      logradouro: string;
      complemento: string;
      unidade: string;
      localidade: string;
      bairro: string;
      estado: string;
      uf: string;
    }
  | {
      erro: true;
      message: string;
    }
  | undefined
  | null;

export async function cepInfo(cepValue: string): Promise<CepData> {
  const cleanCep = (cepValue || "").replace(/\D/g, "");

  // Validação: só faz a requisição se o CEP tiver exatamente 8 dígitos
  if (cleanCep.length !== 8) {
    return null;
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, {
      method: "GET",
      mode: "cors",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.log("Response not ok:", response.status);
      return { erro: true, message: "CEP não encontrado" };
    }

    const data = await response.json();

    // ViaCEP retorna { erro: true } quando o CEP não existe
    if (data.erro) {
      console.log("CEP não encontrado");
      return { erro: true, message: "CEP não encontrado" };
    }

    return data;
  } catch (err: any) {
    console.log("Erro ao buscar CEP!", err);

    // Verifica se é erro de rede/CORS/navegador
    if (err.name === "TypeError" && err.message.includes("fetch")) {
      return {
        erro: true,
        message: "Erro de conexão. Verifique sua internet ou permissões do navegador.",
      };
    }

    return { erro: true, message: "Erro ao buscar CEP" };
  }
}
