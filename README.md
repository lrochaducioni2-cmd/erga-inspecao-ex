# Inspeção Ex · ERGA Engenharia

Software de inventário e inspeção de equipamentos para atmosferas explosivas
(ABNT NBR IEC 60079-17), extensão do CRMEx. Planejamento e fases em
[`ROTEIRO.md`](./ROTEIRO.md); integração em [`INTEGRACAO.md`](./INTEGRACAO.md).

## Stack

Next.js 16 (App Router) · Prisma 7 + PostgreSQL · NextAuth v4 (e-mail e senha) ·
Tailwind CSS 4 · app instalável no celular (PWA).

## Rodando localmente

Pré-requisitos: Node.js 20+ e Docker (ou um Postgres já disponível).

```bash
npm install
docker compose up -d          # Postgres local na porta 5433
cp .env.example .env          # preencha NEXTAUTH_SECRET e ADMIN_*
npm run db:migrate            # cria as tabelas
npm run db:seed               # cria o administrador (ADMIN_EMAIL / ADMIN_PASSWORD)
npm run crm:mock              # (outro terminal) CRMEx simulado na porta 4000
npm run dev                   # http://localhost:3001
```

## Publicando de graça (fase de testes) — tudo pelo celular

1. **Banco (Neon)** — em [neon.tech](https://neon.tech), entre com o GitHub e crie
   um projeto (região: *São Paulo* se houver). Em **Connect**, desligue
   *Connection pooling* e copie a *connection string* (`postgresql://…`).
2. **App (Vercel)** — em [vercel.com](https://vercel.com), entre com o GitHub,
   **Add New › Project**, importe `erga-inspecao-ex` e, antes de publicar, abra
   **Environment Variables** e cadastre:

   | Nome | Valor |
   |---|---|
   | `DATABASE_URL` | a connection string do Neon |
   | `NEXTAUTH_SECRET` | uma frase longa e aleatória (30+ caracteres) |
   | `SETUP_CODE` | um código só seu, pedido no primeiro acesso |
   | `CRM_API_URL` / `CRM_API_TOKEN` | quando o CRMEx expuser a API (pode deixar para depois) |

3. Toque em **Deploy**. As tabelas do banco são criadas automaticamente a cada
   publicação (`vercel-build`).
4. **Fotos (Vercel Blob)** — no projeto da Vercel: **Storage › Create › Blob**,
   escolha acesso **Private** e conecte ao projeto (cria `BLOB_READ_WRITE_TOKEN`).
   Depois, **Deployments › ⋯ › Redeploy**.
5. Abra a URL que a Vercel mostrar: a tela **Primeiro acesso** pede o
   `SETUP_CODE` e cria o seu usuário administrador. Ela só aparece uma vez.
6. No iPhone: Safari › Compartilhar › **Adicionar à Tela de Início**.

> `NEXTAUTH_URL` não é necessário na Vercel. O plano gratuito da Vercel é
> para uso não comercial — serve para testar; no uso real nos serviços da
> ERGA, migrar para o plano pago (≈ US$ 20/mês) ou outra hospedagem.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (porta 3001) |
| `npm run build` | Build de produção |
| `npm run lint` / `npm run typecheck` | Verificações |
| `npm run db:migrate` | Cria/aplica migrations (desenvolvimento) |
| `npm run db:deploy` | Aplica migrations (produção) |
| `npm run db:seed` | Cria/atualiza o administrador pelo `.env` (uso local) |
| `npm run crm:mock` | CRMEx simulado para desenvolvimento |
