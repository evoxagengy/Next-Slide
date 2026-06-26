# Next Slide - Hotfix Embed Fallback v1

Corrige a experiência do player quando sites externos recusam iframe.

Inclui:
- Verificação server-side de headers X-Frame-Options e CSP frame-ancestors.
- Fallback elegante no player quando um site bloqueia incorporação.
- Evita mostrar a tela feia do navegador com "conexão recusada" quando o bloqueio é detectável.
- Mantém imagens e PowerPoint funcionando normalmente.

Observação:
Sites que bloqueiam iframe não podem ser forçados pelo Next Slide. A solução correta é usar link de embed/publicação do dashboard/site ou converter o conteúdo em imagem/PDF.
