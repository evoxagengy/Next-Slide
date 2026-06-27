# Next Slide — Security Phase 2

Atualização focada na FASE 2 da varredura de segurança.

## Correções críticas aplicadas

### 1. Arquivos enviados não ficam mais públicos por ID

Antes:
- `/api/assets/[id]/file` entregava qualquer arquivo apenas pelo ID.

Depois:
- Arquivo só abre com sessão administrativa da mesma licença ou com `token` público válido de um player ativo que realmente usa aquele asset.
- Player agora adiciona `?token=<publicToken>` automaticamente nas imagens, logos e PowerPoints salvos no sistema.
- Respostas de arquivo usam `Cache-Control: private, no-store` e `X-Content-Type-Options: nosniff`.

Como testar:
- Abra `/api/assets/ID/file` sem login/token: deve retornar 404.
- Abra o player público: imagens e logo do módulo devem carregar normalmente.

### 2. Proxy de sistema próprio ficou controlado

Antes:
- `/api/proxy/page?url=...` podia ser chamado sem token do player e aceitava HTTP.

Depois:
- Proxy exige `token` público do player.
- Proxy só carrega URL HTTPS.
- Proxy só aceita domínio em allowlist (`NEXT_SLIDE_PROXY_ALLOWED_HOSTS`).
- Proxy só carrega URL que pertence a um slide ativo com modo `PROXY` daquele player.
- Proxy rejeita localhost, IPs privados, redes internas e redirects para destino inseguro.
- Iframe proxy roda sem `allow-same-origin`, reduzindo risco de HTML externo acessar o contexto do Next Slide.

Como testar:
- Acesse `/api/proxy/page?url=https://cartaconvitecerradao.vercel.app` sem token: deve bloquear.
- No player, configure o link como `Sistema próprio / proxy`: deve tentar renderizar ou cair no fallback sem travar a TV.

## Riscos reduzidos

- Cadastro agora tem rate limit básico por IP.
- Upload tem rate limit básico por IP.
- Asset file tem rate limit básico por IP.
- Embed check tem rate limit e exige token público do player.
- Upload agora valida assinatura real do arquivo/magic bytes, não só extensão/MIME.
- Arquivo salvo é renomeado com nome aleatório seguro.
- CSP do player/proxy foi reduzida e removida a permissão HTTP em produção.
- Logs de erro da API não expõem a mensagem interna diretamente; retornam código de incidente.

## Arquivos alterados

- `.env.example`
- `middleware.ts`
- `lib/api.ts`
- `lib/audit.ts`
- `lib/network-security.ts`
- `lib/player.ts`
- `lib/public-access.ts`
- `lib/rate-limit.ts`
- `lib/security.ts`
- `app/api/assets/route.ts`
- `app/api/assets/[id]/file/route.ts`
- `app/api/auth/register/route.ts`
- `app/api/embed-check/route.ts`
- `app/api/proxy/page/route.ts`
- `components/player/TVPlayer.tsx`

## Variáveis opcionais

```env
NEXT_SLIDE_PROXY_ALLOWED_HOSTS=cartaconvitecerradao.vercel.app
NEXT_SLIDE_ALLOW_HTTP_LINKS=false
```

`NEXT_SLIDE_ALLOW_HTTP_LINKS=true` só deve ser usado em rede controlada/teste. Em produção, mantenha `false`.
