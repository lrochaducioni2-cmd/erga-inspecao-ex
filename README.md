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

## Publicando de graça (fase de testes)

1. **Banco**: crie um projeto gratuito no [Neon](https://neon.tech) e copie a
   *connection string* (`DATABASE_URL`).
2. **App**: importe este repositório na [Vercel](https://vercel.com) (plano
   Hobby) e configure as variáveis do `.env.example`
   (`NEXTAUTH_URL` = a URL que a Vercel der).
3. No seu computador, com o `DATABASE_URL` do Neon no `.env`:
   `npm run db:deploy && npm run db:seed`.
4. No iPhone: abra a URL no Safari › Compartilhar › **Adicionar à Tela de Início**.

> O plano gratuito da Vercel é para uso não comercial — serve para testar;
> no uso real nos serviços da ERGA, migrar para o plano pago (≈ US$ 20/mês)
> ou outra hospedagem.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (porta 3001) |
| `npm run build` | Build de produção |
| `npm run lint` / `npm run typecheck` | Verificações |
| `npm run db:migrate` | Cria/aplica migrations (desenvolvimento) |
| `npm run db:deploy` | Aplica migrations (produção) |
| `npm run db:seed` | Cria/atualiza o administrador |
| `npm run crm:mock` | CRMEx simulado para desenvolvimento |
