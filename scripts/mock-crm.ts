// CRMEx simulado — implementa em memória a parte do contrato (INTEGRACAO.md)
// usada até agora, para desenvolver e testar sem depender do CRM real.
//
// Roda com: npm run crm:mock   (porta 4000, token "dev-token")
// Variáveis opcionais: MOCK_CRM_PORT, MOCK_CRM_TOKEN.
//
// Endpoints:
//   GET /api/empresas?busca=texto
//   GET /api/empresas/:id

import { createServer, type ServerResponse } from "node:http";

const PORT = Number(process.env.MOCK_CRM_PORT ?? 4000);
const TOKEN = process.env.MOCK_CRM_TOKEN ?? "dev-token";

// Dados fictícios, só para desenvolvimento.
const empresas = [
  {
    id: "emp-1",
    razao_social: "Cliente Exemplo Ltda.",
    nome_fantasia: "Exemplo",
    cnpj: "00.000.000/0001-00",
    endereco: "Rua Exemplo, 100 — Criciúma/SC",
    telefone: "(48) 0000-0000",
    email: "contato@exemplo.invalid",
    contato_responsavel: "Fulano de Tal",
  },
  {
    id: "emp-2",
    razao_social: "Outro Cliente S.A.",
    nome_fantasia: null,
    cnpj: "11.111.111/0001-11",
    endereco: "Av. Exemplo, 200 — Imbituba/SC",
    telefone: null,
    email: "seguranca@outro.invalid",
    contato_responsavel: "Beltrana",
  },
  {
    id: "emp-3",
    razao_social: "Terceiro Cliente Indústria Ltda.",
    nome_fantasia: "Terceiro",
    cnpj: "22.222.222/0001-22",
    endereco: "Distrito Industrial — Tubarão/SC",
    telefone: "(48) 2222-2222",
    email: null,
    contato_responsavel: null,
  },
];

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const log = (status: number) => console.log(`${req.method} ${url.pathname}${url.search} → ${status}`);

  if (req.headers.authorization !== `Bearer ${TOKEN}`) {
    log(401);
    return send(res, 401, { error: "Token inválido." });
  }

  if (req.method === "GET" && url.pathname === "/api/empresas") {
    const busca = normalize(url.searchParams.get("busca") ?? "");
    const list = empresas.filter((e) =>
      !busca || normalize([e.razao_social, e.nome_fantasia, e.cnpj].filter(Boolean).join(" ")).includes(busca),
    );
    log(200);
    return send(res, 200, list);
  }

  const match = url.pathname.match(/^\/api\/empresas\/([^/]+)$/);
  if (req.method === "GET" && match) {
    const empresa = empresas.find((e) => e.id === decodeURIComponent(match[1]));
    log(empresa ? 200 : 404);
    return empresa ? send(res, 200, empresa) : send(res, 404, { error: "Empresa não encontrada." });
  }

  log(404);
  send(res, 404, { error: "Rota não encontrada." });
});

server.listen(PORT, () => {
  console.log(`CRMEx simulado em http://localhost:${PORT} (token: ${TOKEN})`);
});
