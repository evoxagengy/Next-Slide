# Next Slide - PowerPoint para imagens v1

## Objetivo

Alterar o comportamento do upload de PowerPoint para que o arquivo `.pptx` seja processado no servidor e seus slides sejam transformados em imagens internas do Next Slide. Assim, o player de TV deixa de abrir o PowerPoint como arquivo interativo/Office Viewer e passa a exibir cada slide extraído como uma imagem fullscreen no fluxo automático.

## O que mudou

- Upload de PowerPoint agora aceita `.pptx`.
- O backend abre o `.pptx`, lê `ppt/slides/slideN.xml` e seus relacionamentos.
- Para cada slide, o sistema procura imagens incorporadas e salva a principal imagem do slide como `MediaAsset`.
- O formulário de criação transforma esses slides extraídos em slides do tipo `IMAGE`.
- Os slides extraídos usam o mesmo tempo definido para imagens/PowerPoint.
- O player passa slide por slide automaticamente, como imagem normal fullscreen.
- Arquivos `.ppt` antigos são recusados com mensagem orientando salvar como `.pptx`.

## Limite técnico importante

Esta versão extrai imagens incorporadas no `.pptx`. Ela funciona muito bem para apresentações em que cada slide é uma imagem ou possui uma imagem principal de fundo, que é o cenário ideal para TV 24/7.

Ela não renderiza formas nativas, textos, SmartArt e animações do PowerPoint como o PowerPoint desktop faria. Para conversão universal de qualquer apresentação para PNG fiel ao slide, seria necessário integrar um conversor externo ou serviço com LibreOffice/Office headless, que não é confiável dentro da Vercel serverless.

## Arquivos alterados

- `package.json`
- `app/api/assets/route.ts`
- `app/api/modules/route.ts`
- `components/modules/ModuleCreateForm.tsx`
- `README_UPDATE.md`

## Validação feita

- Conferência manual dos arquivos alterados.
- Verificação de sintaxe TS/TSX via TypeScript parser nos arquivos alterados.
- Conferência de imports e rotas.
- Conferência para não incluir `.env`, `.env.local`, `node_modules`, `.next`, `.vercel` ou segredos.

## Como testar após deploy

1. Entre no sistema.
2. Vá em `Módulos`.
3. Clique em `Novo módulo`.
4. Selecione um arquivo `.pptx` na seção PowerPoints.
5. Crie o módulo.
6. Edite/abra o player público.
7. Confirme que cada slide extraído aparece como imagem fullscreen e avança automaticamente.

Se o sistema retornar que o PowerPoint não possui imagens extraíveis, exporte a apresentação como imagens PNG/JPG ou salve o PowerPoint de forma que cada slide seja uma imagem de fundo.
