NEXT SLIDE — LOGIN POLISH V2

OBJETIVO
Refinar a tela de login corporativa conforme solicitação:
- remover o botão/link de criar organização;
- aumentar a logo Next Slide;
- adicionar animação viva no card de login com borda/luz rotacionando.

ARQUIVOS ALTERADOS
- components/auth/AuthShell.tsx
- components/auth/LoginForm.tsx
- components/layout/Brand.tsx
- app/login/page.tsx
- public/brand/login-background.png
- public/brand/next-slide-logo.png
- public/brand/logo-next-slide.png

O QUE MUDA
1. O card de login agora possui borda animada com gradiente rotativo azul/ciano/verde.
2. A logo foi aumentada no layout principal e no modo compacto.
3. O link/botão “Criar organização” foi removido da tela de login.
4. O login mantém:
   - e-mail;
   - senha;
   - mostrar/ocultar senha;
   - esqueceu sua senha;
   - botão entrar;
   - fundo corporativo.
5. Não altera autenticação, banco, Prisma, APIs ou permissões.

BANCO
- Não precisa rodar nada no Neon.

VALIDAÇÃO
- Conferido que não há link para /register no LoginForm.
- Conferido que o Brand usa a nova logo.
- Conferido que o ZIP não contém .env, .env.local, node_modules, .next, .vercel ou segredos.
