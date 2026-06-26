# Next Slide - Atualização UX Módulos v2

Correções principais:

- Tela de Módulos virou tabela, não cards.
- Botão Novo módulo continua abrindo modal.
- Após criar módulo, não abre mais /modules/[id]; fecha o modal e atualiza a tabela.
- /modules/new e /modules/[id] redirecionam para /modules.
- Gerenciar foi substituído por Editar em modal.
- Modal Editar simplificado com dados do módulo, logo, link público e tabela de slides.
- Imagens não mostram URL; mostram miniatura/nome do arquivo/tempo.
- PowerPoint não mostra URL; mostra nome/tipo/tempo.
- URLs aparecem apenas para sites/dashboards.
- Logo do módulo agora é imagem enviada por arquivo.
- Tempo: opção única global ou separado entre imagem+PowerPoint e sites.
- PowerPoint usa o mesmo tempo global de imagens.
- Player exibe imagens em tela cheia com object-cover.
- Link público copiado usa o domínio atual do navegador, reduzindo erro 404 por URL errada de ambiente.
- Regeneração de token também retorna publicPath relativo.
