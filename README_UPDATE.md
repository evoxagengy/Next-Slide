NEXT SLIDE — UPDATE BRAND LOGO V1

OBJETIVO
Trocar a marca visual usada no sistema pela nova logo oficial enviada pelo usuário.

ARQUIVOS ALTERADOS
- components/layout/Brand.tsx
- app/layout.tsx
- public/brand/next-slide-logo.png
- public/brand/logo-next-slide.png

O QUE MUDA
1. O componente global Brand agora usa a nova imagem oficial do Next Slide.
2. A troca afeta automaticamente:
   - tela de login;
   - tela de cadastro;
   - sidebar;
   - header mobile;
   - demais pontos que usam Brand.
3. O metadata do app passa a apontar para a nova imagem como ícone/imagem social.
4. Não altera regras de negócio, banco, Prisma, APIs, login, módulos, player ou conversão PPTX.

BANCO
- Não precisa rodar nada no Neon.
- Não altera schema.
- Não altera dados.

VALIDAÇÃO
- Conferido que o arquivo enviado existe e possui transparência real.
- Conferido que o componente Brand não depende mais de ícone Lucide.
- Conferido que o ZIP não contém .env, .env.local, node_modules, .next, .vercel ou segredos.
