# Next Slide — Player Clean Clock v1

## Objetivo
Limpar o player público para TV, removendo a barra inferior com nome do módulo/empresa/logo e adicionando apenas data e hora de forma discreta no canto superior direito.

## Alterações
- Removeu a barra inferior do player público.
- Removeu exibição de nome do módulo, empresa, contador de slides e logo no player.
- Adicionou relógio/data fixos no canto superior direito, com números mais aparentes e visual sutil.
- A validação de embed deixa de aparecer como tela "Validando incorporação".
- A validação de links agora roda em segundo plano.
- O resultado da validação fica em cache por slide/link durante a sessão do player, evitando repetir a tela/validação visual quando o dashboard volta no loop.

## Arquivo alterado
- components/player/TVPlayer.tsx

## Observações
- Não altera Prisma.
- Não altera banco.
- Não altera APIs.
- Não altera uploads.
- Não altera permissões.
