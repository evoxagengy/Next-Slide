# Next Slide - Smart Links v1

## Objetivo

Melhorar o comportamento de sites/dashboards no player público, deixando o fluxo mais simples e robusto para TV 24/7.

## Ajustes incluídos

- Adiciona modo de exibição para sites/dashboards na criação do módulo:
  - Automático / embed: tenta incorporar no player.
  - Link externo / aviso: não tenta incorporar; mostra aviso amigável e segue a apresentação.
- Adiciona modo de exibição para sites/dashboards no modal Editar.
- Quando um site bloquear iframe, o player mostra fallback elegante e informa que vai seguir automaticamente para o próximo slide.
- Adiciona contagem regressiva no fallback de link bloqueado/externo.
- Mantém imagens, PowerPoints e links compatíveis funcionando no player.
- Não altera banco/Prisma.

## Limite técnico importante

Não existe forma segura e universal de forçar qualquer site a rodar dentro de iframe quando o próprio site envia `X-Frame-Options: DENY` ou `Content-Security-Policy: frame-ancestors`. O player agora trata isso sem quebrar e continua a apresentação.

Para sistemas próprios, o ideal é criar uma rota `/embed` ou `/tv` no sistema de origem e liberar iframe para o domínio do Next Slide.

## Validação feita antes do ZIP

- Leitura dos arquivos alterados.
- Verificação de sintaxe TS/TSX com TypeScript parser.
- Conferência de imports e chamadas de `EmbedFallback`.
- Conferência de referências de `openMode` em criação/edição.
- Sem alteração de schema Prisma.
- Sem `.env`, `.env.local`, segredos ou `node_modules` no pacote.

## Arquivos alterados

- components/player/TVPlayer.tsx
- components/modules/ModuleCreateForm.tsx
- components/modules/ModuleEditModal.tsx
