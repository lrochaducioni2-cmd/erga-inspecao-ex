# Roteiro — Software de Inspeção Ex (ERGA Engenharia)

Documento de referência do que foi combinado com o Leandro. **Toda sessão de
desenvolvimento deve ler este arquivo antes de começar** e não avançar além
da fase aprovada sem combinar.

## O que é

Extensão do **CRMEx**: usa o cadastro de clientes do CRMEx (por API, nunca
banco compartilhado) para executar serviços de **inventário** e **inspeção Ex**
(ABNT NBR IEC 60079-17), com coleta em campo pelo celular e finalização,
relatórios e exportações no computador.

## Decisões tomadas

| Tema | Decisão |
|---|---|
| Plataforma | Separada do CRMEx; comunicação só por API (ler clientes; opcionalmente avisar entrega) |
| Vínculo com venda | **Sem trava**: projeto pode ser criado para qualquer cliente do CRMEx; vínculo com trabalho vendido é opcional |
| Hospedagem | Nuvem, começando em **planos gratuitos** para teste (Vercel + Postgres Neon/Supabase + Cloudflare R2), preparado para migrar a plano pago |
| Fotos | Nuvem (armazenamento de objetos) como principal + **pacote de backup .zip** por projeto para baixar no computador |
| Celular | **App web instalável (PWA)**, funciona sem internet e sincroniza depois; iPhone e Android |
| Usuários | Hoje só o Leandro (administrador); outros inspetores entram depois com login e senha. Administração só do Leandro |
| Sistema antigo | Não há código; as telas antigas servem só de referência do que precisa existir. Visual novo (protótipo aprovado) |
| Modelos de documento | Três modelos a receber do Leandro: **relatório de inspeção (PDF)**, **planilha (Excel)** e **inventário**. Até lá, layout provisório |

## Tipos de projeto

1. **Inventário** (mais simples) — usado após o estudo de classificação de
   áreas: cadastro de ambientes/pontos de liberação e equipamentos (**Ex / Não Ex**,
   foto, observação). Gera **plano de ação** automático:
   Ex → *inspeção apurada*; Não Ex → *substituição*. Serve de base para venda futura.
2. **Inspeção Ex** — Visual, Apurada ou Detalhada, checklist por tipo de
   proteção (tabelas da 60079-17, colunas D/A/V), 9 status por item
   (Conforme, Não conforme, N/A + 6 secundários), comentário e foto por item,
   **foto obrigatória em não conformidade**, não conformidades e plano de ação.

## Princípios de tela (protótipo aprovado)

- Celular = **só coleta de informações** (modo campo); computador = revisão, relatório PDF e Excel. Botões de PDF/Excel não aparecem em telas de celular.
- Botões grandes (≥ 44 px, maiores no celular), respostas em botões e não em listas suspensas.
- Foto primeiro; não digitar o que já se sabe (cliente do CRMEx, herança do ambiente, duplicar anterior).
- Sem botão "Salvar" em campo: salvamento automático e estado de sincronização sempre visível.
- Alto contraste para uso sob sol; IBM Plex Sans/Mono; azul `#16405F` + âmbar `#F2B233`.

Protótipo: https://claude.ai/artifact/T3P8qs21Yh4bGmeU8uryGh

## Fases

| Fase | Entrega | Situação |
|---|---|---|
| **1. Base** | Repositório, login, primeiro acesso (cria o administrador sem computador), usuários, leitura de clientes do CRMEx, app instalável, publicação gratuita com migração automática | ✅ entregue |
| **2. Projetos** | Criar/editar projeto (Inventário ou Inspeção Ex + grau), cliente do CRMEx ou **provisório** (vinculável depois), PI, dados técnicos, status Rascunho → Em campo → Em revisão → Aprovado → Emitido (aprovar/emitir só admin; emitido trava edição), busca e filtros | ✅ entregue |
| **3. Inventário** | Logo do cliente, ambientes/pontos de liberação (zona), equipamentos Ex/Não Ex com fotos (reduzidas no aparelho, Vercel Blob privado), quantidade, TAG do cliente, etiqueta EX-INSP-PI-0001, plano de ação automático, Excel e relatório PDF provisórios | ✅ entregue |
| **4. Celular sem internet** | Modo campo (/campo): baixar projeto para o aparelho, criar ambientes, cadastrar/editar equipamentos com fotos sem sinal (IndexedDB), fila de envio automática e idempotente ao voltar a internet, aviso de pendências, descarte de itens recusados; app instalado abre no modo campo | ✅ entregue |
| 5. Inspeção Ex | Checklist 60079-17, 9 status, foto/comentário por item, não conformidades, plano de ação (celular e computador) | a fazer |
| 6. Relatórios oficiais | Aplicar os 3 modelos de documento da ERGA; pacote de backup .zip | a fazer |
| 7. Evolução | Mais usuários, aviso de entrega ao CRMEx, migração para plano pago | a fazer |

## Pendências com o CRMEx

- O CRMEx precisa expor **`GET /api/empresas?busca=`** (lista/busca de clientes).
  Detalhes em `INTEGRACAO.md`.
