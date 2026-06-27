NEXT SLIDE — PERFORMANCE & SECURITY V1

OBJETIVO
Fazer uma varredura e otimizar os pontos que mais impactavam demora no login e troca de páginas, mantendo segurança e sem reescrever o sistema.

PRINCIPAIS MELHORIAS
1. Login mais rápido
- Consulta de usuário otimizada com select mínimo.
- Verificação de rate limit e busca do usuário em paralelo.
- Escritas pós-login executadas em paralelo: limpeza de tentativa, atualização de último login, criação de sessão e auditoria.
- LoginForm não força router.refresh depois do redirect, evitando navegação dupla.

2. Troca de páginas mais rápida
- getCurrentUser agora usa cache por request com React cache.
- Isso evita consultar a sessão/usuário/licença duas vezes na mesma renderização, especialmente porque a página e o AppShell chamam requireUser.

3. Página de módulos muito mais leve
- /modules não carrega mais todos os slides de todos os módulos no primeiro acesso.
- A tabela carrega apenas metadados e contagem de slides.
- O modal de edição carrega os slides sob demanda, somente quando o usuário clica em Editar.
- O modal de edição foi carregado por dynamic import para reduzir JavaScript inicial da tabela.

4. Player e assets mais rápidos
- Player público usa select mínimo no banco.
- Arquivos enviados agora têm ETag e Cache-Control seguro.
- Imagens do player podem ser reutilizadas pelo navegador sem baixar do Neon toda hora.

5. Índices no banco
- Adicionados índices compostos para consultas frequentes:
  - User: licenseId + isActive
  - SlideModule: licenseId + isActive
  - SlideModule: licenseId + updatedAt
  - Slide: moduleId + isActive + sortOrder
  - DeviceSession: licenseId + lastSeenAt

6. Segurança preservada/reforçada
- Sessão continua em cookie HttpOnly.
- Rate limit continua ativo.
- Assets continuam exigindo sessão válida ou token público autorizado.
- Cache dos assets continua validando permissão antes de responder 304.
- Login bloqueia licença cancelada/suspensa.

ARQUIVOS ALTERADOS
- lib/auth.ts
- app/api/auth/login/route.ts
- components/auth/LoginForm.tsx
- components/layout/Header.tsx
- app/modules/page.tsx
- components/modules/ModulesTable.tsx
- components/modules/ModuleEditModal.tsx
- app/api/assets/[id]/file/route.ts
- lib/player.ts
- lib/public-access.ts
- prisma/schema.prisma
- next.config.ts
- README_UPDATE.md

BANCO
- A Vercel já executa yarn prisma db push no deploy.
- Isso deve criar os novos índices automaticamente.
- Não precisa rodar SQL manual no Neon, salvo se o deploy falhar especificamente em prisma db push.

VALIDAÇÃO
- Arquivos críticos revisados.
- Conferida estrutura TS/TSX por balanceamento básico de chaves/parênteses/colchetes.
- Conferido que o ZIP não contém .env, .env.local, node_modules, .next, .vercel ou segredos.

TESTES APÓS DEPLOY
1. Fazer login e confirmar se entra no dashboard sem demora excessiva.
2. Navegar Dashboard → Módulos → Dispositivos → Licença.
3. Em Módulos, abrir Editar e confirmar se os slides carregam dentro do modal.
4. Conferir player público abrindo imagens normalmente.
5. Conferir se Vercel passou por prisma db push e next build.
