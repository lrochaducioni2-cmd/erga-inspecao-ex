# Integração Software de Inspeção Ex ↔ CRMEx

Os dois sistemas são **independentes** e se comunicam **só por API** — nunca
por banco compartilhado. O CRMEx é a fonte da verdade do cadastro de clientes;
este software apenas lê.

## Configuração

```bash
CRM_API_URL="https://crm.exemplo.com.br"   # URL base do CRMEx
CRM_API_TOKEN="..."                         # token emitido pelo CRMEx (Bearer)
```

Para desenvolver sem o CRMEx real: `npm run crm:mock` (porta 4000, token
`dev-token`, dados fictícios em `scripts/mock-crm.ts`).

## Endpoints usados

| Endpoint | Uso | Fase |
|---|---|---|
| `GET /api/empresas?busca=texto` | Lista/busca clientes (nome, fantasia, CNPJ) — **precisa ser criado no CRMEx** | 1 |
| `GET /api/empresas/:id` | Dados de um cliente | 1 |
| `GET /api/trabalhos?status=vendido`, `GET /api/trabalhos/:id` | Vincular (opcional) um projeto a um trabalho vendido | 7 |
| `PATCH /api/trabalhos/:id/status` | Avisar entrega (`entregue`, `data_entrega`, `link_relatorio`) | 7 |

Autenticação: `Authorization: Bearer <token>` em todas as chamadas.

### Empresa (formato esperado)

```json
{
  "id": "emp-1",
  "razao_social": "Cliente Exemplo Ltda.",
  "nome_fantasia": "Exemplo",
  "cnpj": "00.000.000/0001-00",
  "endereco": "Rua Exemplo, 100 — Criciúma/SC",
  "telefone": "(48) 0000-0000",
  "email": "contato@exemplo.invalid",
  "contato_responsavel": "Fulano de Tal"
}
```

Só `id` e `razao_social` são obrigatórios; os demais podem ser `null`.
Listas podem vir como array puro (preferido) ou `{ "data": [...] }`.

## Pedido ao CRMEx

1. Criar `GET /api/empresas?busca=` — busca sem acento/maiúsculas por razão
   social, nome fantasia e CNPJ; sem `busca`, devolve os clientes mais recentes
   (limite sugerido: 50).
2. Emitir um token de API para este software.
3. Erros: 401/403 token inválido, 404 inexistente, corpo `{ "error": "..." }`.
