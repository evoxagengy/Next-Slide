# Next Slide - Hotfix showClock validation v1

Correção de build TypeScript: `showClock` foi adicionado ao schema `moduleCreateSchema`, permitindo que `moduleUpdateSchema.partial()` aceite `data.showClock` na rota `app/api/modules/[id]/route.ts`.

Arquivos alterados:
- lib/validations.ts

Sem alteração de banco, Prisma, API pública ou variáveis de ambiente.
