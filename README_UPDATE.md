NEXT SLIDE — HOTFIX PPTX CONVERSION V4

OBJETIVO
Substituir a conversão interna simplificada de PPTX por conversão fiel em PNG usando serviço externo (ConvertAPI), para que cada slide do PowerPoint seja convertido como imagem real, preservando layout, textos, fundo, personagem e elementos visuais.

ARQUIVOS INCLUÍDOS
- app/api/assets/route.ts
- .env.example
- README_UPDATE.md

O QUE FOI AJUSTADO
1. Removida a estratégia que tentava reconstruir o slide manualmente em SVG.
2. Novo fluxo de conversão: PPTX -> PNG por serviço de conversão externo.
3. Cada slide convertido vira uma imagem separada no sistema.
4. Continua respeitando os planos: Basic sem PPTX; Premium/Enterprise com PPTX.
5. Continua sem exigir alteração no banco Neon.

IMPORTANTE
Para funcionar corretamente, é necessário configurar a variável:
- CONVERTAPI_SECRET

E também:
- PPTX_CONVERTER_PROVIDER="convertapi"

SEM ISSO
O sistema vai bloquear a conversão de PPTX com mensagem clara, ao invés de gerar imagem errada.

COMO TESTAR
1. Aplique os arquivos.
2. Configure as envs na Vercel.
3. Faça redeploy.
4. Entre no sistema.
5. Crie/edite um módulo.
6. Envie o mesmo PPTX de teste.
7. Confirme se cada slide virou uma imagem separada, na ordem correta.
