# Next Slide — PPTX Render Slides v3

## Objetivo

Corrigir a conversão de PowerPoint para que cada slide do `.pptx` vire uma imagem própria dentro do Next Slide.

## Correção aplicada

Antes, o backend procurava imagens incorporadas dentro de cada slide e escolhia a maior imagem encontrada. Isso fazia slides sem imagem de fundo, ou slides compostos por texto e formas, serem ignorados.

Agora, o backend percorre todos os arquivos `ppt/slides/slideN.xml` do `.pptx`, respeitando a ordem da apresentação, e gera um SVG por slide. Esse SVG é salvo como `MediaAsset` com MIME `image/svg+xml`, sendo exibido pelo player como uma imagem fullscreen normal.

## Resultado esperado

- PPTX com 2 slides gera 2 imagens.
- PPTX com 50 slides gera 50 imagens.
- Slides com texto também geram imagem.
- Slides com imagens internas também geram imagem.
- A ordem dos slides é preservada.

## Observação técnica

Essa é uma renderização própria em SVG, compatível com Vercel e sem depender de LibreOffice/headless browser. Ela cobre textos básicos, imagens e posicionamento principal. Para fidelidade 100% idêntica ao PowerPoint desktop, futuramente será necessário um worker externo com LibreOffice/CloudConvert.
