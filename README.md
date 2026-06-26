# Next Slide

**Next Slide** é um SaaS para criar apresentações dinâmicas para TVs corporativas, gestão à vista, dashboards e comunicados internos.

O usuário cria um módulo, adiciona slides com imagens, textos, sites ou dashboards, copia o link público seguro e coloca esse link em uma TV, navegador, mini PC ou dispositivo de exibição para rodar 24/7.

## Stack

- Next.js App Router
- TypeScript
- TailwindCSS
- Componentes UI próprios inspirados em ShadCN UI
- Lucide React
- Framer Motion
- Prisma ORM
- Neon PostgreSQL
- Sessão segura com cookie HttpOnly
- Hash de senha com bcrypt forte
- Validação com Zod

## Principais funcionalidades

- Login seguro
- Cadastro de organização/licença
- Sessão com cookie HttpOnly
- Rate limiting e bloqueio temporário de login
- Usuários por licença
- Papéis: OWNER, ADMIN, EDITOR, VIEWER
- Licenças: TRIAL, PRO, ENTERPRISE
- Limites por licença
- Dashboard administrativo
- Módulos de slides
- Slides de imagem por URL
- Slides de site/URL
- Slides de dashboard em iframe quando permitido
- Slides de texto
- Reordenação de slides
- Ativar/desativar slides
- Duplicar módulos e slides
- Link público seguro por token
- Token público salvo com hash e token criptografado para exibição administrativa
- Regeneração de token com invalidação do link antigo
- Player público em `/play/[publicToken]`
- Auto-play em loop infinito
- Fallback elegante para conteúdo que bloqueia iframe
- Logs de auditoria e eventos de segurança
- Separação obrigatória por `licenseId`

## Variáveis de ambiente

Crie um arquivo `.env.local` com base no `.env.example`:

```env
DATABASE_URL="postgresql://..."
SESSION_SECRET="gere-uma-string-aleatoria-com-pelo-menos-32-caracteres"
NEXT_PUBLIC_APP_NAME="Next Slide"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Nunca commite `.env`, `.env.local` ou segredos reais.

### Gerar SESSION_SECRET

No PowerShell:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

No terminal Linux/macOS/Git Bash:

```bash
openssl rand -base64 48
```

## Instalação local

```bash
npm install
```

Como o Prisma CLI lê `.env` por padrão, este projeto também fornece scripts com `dotenv-cli` para carregar `.env.local`.

### Gerar Prisma Client

```bash
npm run prisma:generate
```

Ou, se estiver usando `.env` local:

```bash
npx prisma generate
```

### Criar tabelas no Neon/PostgreSQL

```bash
npm run prisma:push
```

Ou, se estiver usando `.env` local:

```bash
npx prisma db push
```

### Rodar seed inicial

```bash
npm run prisma:seed
```

Ou:

```bash
npx prisma db seed
```

O seed cria:

- Licença demo TRIAL
- Usuário Owner demo
- Módulo demo
- Slides demo

Credenciais demo:

```txt
E-mail: owner@nextslide.local
Senha: NextSlide@123
```

## Rodar localmente

```bash
npm run dev
```

Acesse:

```txt
http://localhost:3000
```

## Build de produção

```bash
npm run build
```

## Deploy na Vercel

1. Crie o projeto na Vercel apontando para o repositório.
2. Configure as variáveis de ambiente na Vercel:

```txt
DATABASE_URL
SESSION_SECRET
NEXT_PUBLIC_APP_NAME
NEXT_PUBLIC_APP_URL
```

3. Rode no ambiente local antes do deploy:

```bash
npm install
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
npm run build
```

4. Faça push para o GitHub e deixe a Vercel executar o build.

## Comandos GitHub

Para enviar pela primeira vez:

```bash
git init
git branch -M main
git remote add origin https://github.com/evoxagengy/Next-Slide.git
git add .
git commit -m "initial Next Slide SaaS"
git push -u origin main
```

Se o repositório já estiver conectado:

```bash
git status
git add .
git commit -m "update Next Slide"
git push origin main
```

## Como usar

1. Crie a conta em `/register`.
2. Acesse o dashboard.
3. Crie um módulo em `/modules/new`.
4. Adicione slides de imagem, texto, URL ou dashboard.
5. Ordene os slides.
6. Defina duração de cada slide.
7. Copie o link público do player.
8. Abra o link na TV, mini PC, navegador ou dispositivo de exibição.
9. Deixe rodando em tela cheia 24/7.

## Segurança implementada

- Senhas nunca são salvas em texto puro.
- Hash de senha com bcrypt e custo forte.
- Sessão salva no banco.
- Token de sessão salvo apenas em cookie HttpOnly.
- Cookie `Secure` em produção.
- `SameSite=Lax`.
- Rate limiting de login por e-mail + IP.
- Bloqueio temporário após tentativas inválidas.
- Erros genéricos no login para reduzir enumeração de usuários.
- Validação com Zod em entradas críticas.
- Sanitização básica de textos.
- Validação de URLs.
- Prisma ORM para reduzir risco de SQL Injection.
- Queries administrativas filtradas por `licenseId`.
- Token público salvo por hash para validação.
- Token público criptografado para permitir cópia no painel sem salvar segredo puro.
- Regeneração de token invalida link antigo.
- AuditLog para ações críticas.
- SecurityEvent para eventos suspeitos.
- Headers de segurança via `next.config.ts` e `middleware.ts`.
- CSP separada para área administrativa e player.
- Sem upload persistente no filesystem da Vercel.
- `.env*` ignorado no Git, exceto `.env.example`.

## Separação multi-tenant

Toda operação administrativa filtra por `licenseId`. Um usuário de uma licença não consegue acessar módulos, slides, usuários ou logs de outra licença.

## Observação sobre iframes

Alguns sites, Power BI, Grafana, Looker Studio ou dashboards internos podem bloquear incorporação via `X-Frame-Options` ou `Content-Security-Policy`.

Quando isso acontecer, o player mostra um fallback elegante:

```txt
Este conteúdo não permite incorporação. Abra em nova guia ou use link compatível com embed.
```

## Arquitetura futura preparada

Não implementado no MVP, mas a estrutura já está preparada para evoluir com:

- Upload de imagens com Vercel Blob
- S3
- Supabase Storage
- Cloudinary
- Integração Power BI avançada
- Integração Grafana
- Agendamento de apresentações
- Playlists por horário
- Controle remoto da TV
- Múltiplas TVs por módulo
- Analytics de exibição
- Modo offline
- QR Code do link
- Convites por e-mail
- Billing real
- Microsoft/Google Login
- Auditoria avançada

## Estrutura principal

```txt
app/
components/
lib/
prisma/
middleware.ts
next.config.ts
package.json
.env.example
README.md
```

## Repositório oficial

```txt
https://github.com/evoxagengy/Next-Slide
```
