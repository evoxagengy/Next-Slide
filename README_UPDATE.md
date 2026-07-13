NEXT SLIDE — HOTFIX ENTERPRISE LICENSE PLAYER V1

OBJETIVO
Corrigir o player público exibindo “Licença indisponível” mesmo quando a licença está no plano Enterprise.

CAUSA PROVÁVEL
O sistema estava validando expiresAt para todos os planos.
Se uma licença Enterprise estivesse ativa, mas com uma data antiga em expiresAt, o player público bloqueava a exibição.

O QUE FOI CORRIGIDO
1. Enterprise agora é tratado como licença sem vencimento operacional.
2. A segurança continua preservada:
   - ACTIVE e TRIAL podem usar conforme a regra;
   - SUSPENDED continua bloqueado;
   - CANCELLED continua bloqueado;
   - EXPIRED continua bloqueado.
3. O player público agora seleciona também o campo plan da licença.
4. A validação de acesso público a assets/proxy também seleciona plan.

ARQUIVOS ALTERADOS
- lib/license.ts
- lib/player.ts
- lib/public-access.ts
- README_UPDATE.md

BANCO
- Não altera Prisma.
- Não altera Neon.
- Não precisa rodar SQL.

OBSERVAÇÃO
Se no banco a licença estiver com status EXPIRED, SUSPENDED ou CANCELLED, ela continuará bloqueada por segurança.
Para Enterprise funcionar, o status deve estar ACTIVE.

VALIDAÇÃO
- Conferido que isLicenseUsable agora considera o plano Enterprise.
- Conferido que player/public-access carregam plan no select.
- Conferido que o ZIP não contém .env, .env.local, node_modules, .next, .vercel ou segredos.
