NEXT SLIDE — ONLINE DEVICES V1

OBJETIVO
Criar o módulo real de dispositivos online para que o dashboard deixe de simular TVs online com base em módulos ativos.

O QUE FOI CRIADO
1. Nova tabela Prisma DeviceSession.
2. Novo endpoint público de heartbeat:
   - POST /api/player/[publicToken]/heartbeat
3. O player público /play/[publicToken] agora registra automaticamente:
   - dispositivo/navegador;
   - módulo em exibição;
   - slide atual;
   - resolução da tela;
   - timezone;
   - user agent;
   - último sinal.
4. Nova tela:
   - /devices
   - lista TVs/navegadores online e offline.
5. Dashboard atualizado:
   - “Telas online agora” agora vem de DeviceSession real;
   - “TVs em exibição agora” mostra dispositivos reais;
   - uso da licença usa TVs conectadas reais.
6. Sidebar atualizada com menu “Dispositivos”.

REGRAS DE ONLINE
- Um dispositivo é considerado online quando enviou heartbeat nos últimos 90 segundos.
- O player envia heartbeat imediatamente e depois a cada 30 segundos.
- Se a TV fechar, perder internet ou desligar, ela aparece offline após o limite de tempo.

ARQUIVOS ALTERADOS/CRIADOS
- prisma/schema.prisma
- app/api/player/[publicToken]/heartbeat/route.ts
- components/player/TVPlayer.tsx
- app/dashboard/page.tsx
- app/devices/page.tsx
- components/layout/Sidebar.tsx
- README_UPDATE.md

BANCO
- A Vercel já executa yarn prisma db push no deploy.
- Portanto, normalmente não precisa rodar SQL manual no Neon.
- O deploy criará a tabela DeviceSession automaticamente.

VALIDAÇÃO
- Conferido schema Prisma e relações.
- Conferido endpoint público com token hash.
- Conferido que o player não trava caso o heartbeat falhe.
- Conferido que o dashboard usa contagem real de dispositivos.
- Conferido que o ZIP não contém .env, .env.local, node_modules, .next, .vercel ou segredos.

TESTE APÓS DEPLOY
1. Abra um link público de módulo em uma aba/TV.
2. Aguarde até 30 segundos.
3. Acesse /dashboard e veja “Telas online agora”.
4. Acesse /devices para ver o dispositivo detectado.
