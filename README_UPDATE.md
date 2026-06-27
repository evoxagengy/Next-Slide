NEXT SLIDE — DASHBOARD V2

OBJETIVO
Refazer a tela Dashboard do Next Slide com visual 2.0 inspirado na imagem de referência enviada pelo usuário.

ARQUIVOS ALTERADOS
- app/dashboard/page.tsx
- README_UPDATE.md

O QUE MUDA
1. Novo topo administrativo com CTA “Criar módulo”.
2. Novos cards executivos:
   - Módulos ativos;
   - Slides publicados;
   - Telas online agora;
   - Links públicos ativos;
   - Status da licença.
3. Nova tabela premium de módulos recentes.
4. Novo card de uso da licença com barras de progresso.
5. Nova seção de links públicos em uso.
6. Nova seção de TVs em exibição agora.
7. Visual dark premium com bordas, grid, glow, cards e estilo SaaS corporativo.
8. Mantém os dados reais do banco via Prisma.
9. Mantém o botão de criação de módulo e links para módulos/licença.

BANCO
- Não altera Prisma.
- Não altera Neon.
- Não precisa rodar SQL.

OBSERVAÇÃO TÉCNICA
O sistema ainda não possui uma tabela dedicada de telemetria/dispositivos de TV online. Por isso, “Telas online agora” e “TVs em exibição agora” usam os módulos ativos como base operacional. Quando for criado um módulo de devices/heartbeat, essa área poderá mostrar TVs reais por localização.

VALIDAÇÃO
- Conferida compatibilidade com o schema atual: User, License, SlideModule, Slide e MediaAsset.
- Conferidos imports de componentes existentes: AppShell, Card, Button e Badge.
- Conferido que não contém .env, .env.local, node_modules, .next, .vercel ou segredos.
