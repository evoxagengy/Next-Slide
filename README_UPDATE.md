# Next Slide - Update: relógio opcional + imagens/PPTX unificados + ordenação

## Objetivo

Esta atualização simplifica a criação de módulo para o usuário comum:

- O relógio/data do player agora é opcional por módulo.
- A área de PowerPoint foi removida como seção separada.
- A área de arquivos agora tem dois botões: **Selecionar imagens** e **Selecionar PPTX**.
- Quando um PPTX é selecionado, o sistema tenta extrair as imagens dos slides e adiciona cada slide extraído na mesma tabela de imagens.
- As imagens podem ser reordenadas antes de criar o módulo usando arrastar/soltar ou botões de subir/descer.
- A ordem definida na tabela é a ordem usada na apresentação.
- Sites/dashboards continuam separados e usando URL.

## Arquivos alterados

- `prisma/schema.prisma`
- `lib/validations.ts`
- `lib/player.ts`
- `app/modules/page.tsx`
- `app/api/modules/route.ts`
- `app/api/modules/[id]/route.ts`
- `app/api/modules/[id]/duplicate/route.ts`
- `components/modules/ModuleCreateForm.tsx`
- `components/modules/ModuleEditModal.tsx`
- `components/modules/ModulesTable.tsx`
- `components/player/TVPlayer.tsx`

## Banco de dados

Foi adicionado o campo:

```prisma
showClock Boolean @default(true)
```

A Vercel já executa `prisma db push` no build, então o Neon deve ser atualizado automaticamente.

## Observação técnica sobre PPTX

No ambiente Vercel, a conversão segura e nativa de PowerPoint para imagem precisa ser feita sem depender de filesystem persistente ou LibreOffice local. Nesta versão, o backend abre o arquivo `.pptx` e extrai as imagens incorporadas nos slides. Isso funciona melhor quando cada slide contém uma imagem/fundo principal, padrão comum para apresentações em TV.

Para renderização 100% fiel de textos, formas, SmartArt, gráficos e animações do PowerPoint desktop, a evolução ideal é usar um serviço dedicado de conversão, como LibreOffice em worker externo, CloudConvert, Microsoft Graph ou uma fila de conversão fora da Vercel.

## Validação realizada antes do ZIP

- Arquivos alterados revisados.
- Sintaxe TS/TSX validada via parser TypeScript.
- Imports conferidos.
- Rotas Prisma/API conferidas.
- ZIP conferido sem `.env`, `.env.local`, `node_modules`, `.next`, `.vercel` ou segredos.
- Build completo não foi executado porque o ambiente não baixa dependências do registry, mas a Vercel fará o build real.
