NEXT SLIDE — UPDATE LOGIN CORPORATE V1

OBJETIVO
Refazer a tela de login no padrão corporativo premium enviado como referência, usando o background de gestão à vista em TV fornecido pelo usuário.

ARQUIVOS ALTERADOS
- components/auth/AuthShell.tsx
- components/auth/LoginForm.tsx
- components/layout/Brand.tsx
- app/login/page.tsx
- public/brand/login-background.png
- public/brand/next-slide-logo.png
- public/brand/logo-next-slide.png
- README_UPDATE.md

O QUE MUDA
1. Login passa a ter layout corporativo em duas colunas.
2. Lado esquerdo com logo Next Slide, headline, descrição, chips de recursos e selo de ambiente seguro.
3. Lado direito com card premium translúcido, borda azul/ciano e glow verde.
4. Formulário com campos maiores, botão gradiente, ícone de mostrar/ocultar senha e link de criação de organização.
5. Background passa a usar a imagem enviada pelo usuário.
6. Mobile continua responsivo: card centralizado e fundo corporativo preservado.

BANCO
- Não altera Prisma.
- Não altera Neon.
- Não precisa rodar SQL.

VALIDAÇÃO
- Conferido que o background enviado existe e foi incluído no ZIP.
- Conferido que a logo enviada existe, possui transparência e foi incluída no ZIP.
- Conferido que o LoginForm continua chamando a mesma API /api/auth/login.
- Conferido que o redirect pós-login foi preservado.
- Conferido que o ZIP não contém .env, .env.local, node_modules, .next, .vercel ou segredos.
