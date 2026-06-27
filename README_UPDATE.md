NEXT SLIDE — HOTFIX PPTX BLOB BUFFER V1

OBJETIVO
Corrigir erro de build TypeScript/Node 24 no envio do buffer PPTX para o Blob usado na integração ConvertAPI.

ERRO CORRIGIDO
Type error: Type 'Buffer<ArrayBufferLike>' is not assignable to type 'BlobPart'.

CAUSA
No Node 24 + TypeScript, Buffer pode carregar ArrayBufferLike/SharedArrayBuffer na tipagem e não é aceito diretamente como BlobPart.

CORREÇÃO
O Buffer agora é copiado para um Uint8Array criado com ArrayBuffer normal e só então usado no Blob.

ARQUIVOS ALTERADOS
- app/api/assets/route.ts

BANCO
- Não altera Prisma.
- Não altera Neon.
- Não precisa rodar SQL.

VALIDAÇÃO
- Patch aplicado somente no trecho do Blob/FormData.
- Conferido que o arquivo mantém o fluxo ConvertAPI.
- Conferido que o ZIP não contém .env, .env.local, node_modules, .next, .vercel ou segredos.
