# Next Slide - Smart Links v2 Proxy Controlado

## Objetivo

Adicionar um modo extra para sites/sistemas próprios que bloqueiam iframe por `X-Frame-Options` ou `frame-ancestors`, sem alterar o sistema de origem.

## O que foi incluído

- Novo modo de exibição para sites/dashboards: `Sistema próprio / proxy`.
- Nova rota segura: `/api/proxy/page?url=...`.
- Allowlist de domínios para evitar proxy aberto.
- Player usa o proxy somente quando o slide estiver configurado como `PROXY`.
- Middleware libera `/api/proxy/*` para ser exibido dentro do player, sem `X-Frame-Options: DENY`.
- Enum Prisma `SlideOpenMode` atualizado com `PROXY`.
- Fallback mantido se o proxy não conseguir renderizar o sistema.

## Variável opcional recomendada na Vercel

Para liberar domínios próprios adicionais, configure:

```txt
NEXT_SLIDE_PROXY_ALLOWED_HOSTS=cartaconvitecerradao.vercel.app
```

Pode usar múltiplos domínios separados por vírgula:

```txt
NEXT_SLIDE_PROXY_ALLOWED_HOSTS=cartaconvitecerradao.vercel.app,outro-sistema.vercel.app
```

O domínio `cartaconvitecerradao.vercel.app` já está liberado por padrão no código.

## Limitações técnicas

Esse modo tenta renderizar a página por proxy no domínio do Next Slide. Funciona melhor para páginas públicas e dashboards simples. Pode falhar em páginas com login, cookies privados, chamadas internas absolutas complexas, autenticação cross-site ou scripts que assumem domínio próprio.
