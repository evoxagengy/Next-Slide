# Next Slide - Hotfix Modal Portal v1

## Problema corrigido

O modal de edição estava sendo renderizado dentro da linha/tabela do módulo. Em alguns navegadores/estilos, `position: fixed` pode ficar preso ao contexto visual de um ancestral, principalmente quando há `overflow`, `transform`, `backdrop` ou containers complexos.

## Correção

- `ModuleEditModal` agora renderiza o modal via `createPortal(..., document.body)`.
- `ModuleCreateModal` também foi ajustado para portal, evitando o mesmo problema no botão "Novo módulo".
- O modal usa `z-[9999]`, backdrop próprio e sai totalmente da tabela/card.
- Clique fora do conteúdo fecha o modal.
- Scroll do body continua bloqueado enquanto o modal estiver aberto.

## Arquivos alterados

- components/modules/ModuleEditModal.tsx
- components/modules/ModuleCreateModal.tsx

## Validação realizada

- Arquivos lidos e revisados manualmente.
- Verificada a estrutura de JSX/TSX.
- Validação de sintaxe com TypeScript `transpileModule` nos dois arquivos alterados.
- ZIP conferido sem `.env`, `.env.local`, `node_modules`, `.next`, `.vercel` ou segredos.

## Observação

Não altera banco, Prisma, APIs ou regras de negócio. É um hotfix visual/comportamental dos modais.
