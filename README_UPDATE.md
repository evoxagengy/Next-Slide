NEXT SLIDE — HOTFIX DASHBOARD ONE SCREEN V1

OBJETIVO
Ajustar o dashboard para ficar em uma tela só no desktop, sem precisar rolar o mouse para ver as informações principais.

ARQUIVOS ALTERADOS
- app/dashboard/page.tsx
- README_UPDATE.md

O QUE FOI AJUSTADO
1. Dashboard agora usa altura controlada no desktop:
   - xl:h-[calc(100vh-112px)]
   - xl:overflow-hidden
2. Header do dashboard ficou mais compacto.
3. Cards superiores foram reduzidos.
4. Tabelas e blocos foram reorganizados em grid:
   - Módulos recentes
   - Links públicos
   - Uso da licença
   - TVs em exibição agora
5. Reduzido espaçamento vertical, padding e altura dos cards.
6. Mantida a integração real de dispositivos online criada anteriormente.

IMPORTANTE
- Em desktop/full HD, as principais informações ficam visíveis em uma tela única.
- Em telas menores/mobile, o scroll continua permitido para não quebrar responsividade.

BANCO
- Não altera Prisma.
- Não altera Neon.
- Não precisa rodar SQL.

VALIDAÇÃO
- Conferido que a alteração é apenas visual no dashboard.
- Conferido que as consultas existentes foram preservadas.
- Conferido que o dashboard continua usando DeviceSession real.
- Conferido que o ZIP não contém .env, .env.local, node_modules, .next, .vercel ou segredos.
