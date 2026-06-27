NEXT SLIDE — UPDATE EDIT MODAL SLIDES V1

OBJETIVO
Melhorar o modal de edição do módulo para gerenciar a ordem dos slides e permitir trocar somente as imagens/PPTX sem apagar sites.

O QUE FOI ALTERADO
1. Na tabela “Slides do módulo”, agora é possível editar a ordem:
   - arrastando linhas;
   - usando botões ↑ e ↓.
2. A ordem é salva no backend usando:
   - POST /api/modules/[id]/slides/reorder
3. O modal agora permite importar novas imagens diretamente no módulo.
4. O modal agora permite importar novo PPTX diretamente no módulo:
   - o PPTX é convertido em imagens;
   - cada slide convertido vira um slide IMAGE no módulo.
5. Criada opção “Apagar só imagens”:
   - remove apenas slides IMAGE e POWERPOINT;
   - mantém sites/dashboards URL e DASHBOARD;
   - mantém a ordem relativa dos sites.
6. Sites continuam preservados.
7. Também foi adicionada edição rápida do título do slide no próprio modal.

ARQUIVOS ALTERADOS
- components/modules/ModuleEditModal.tsx
- README_UPDATE.md

BANCO
- Não altera Prisma.
- Não altera Neon.
- Não precisa rodar SQL.

APIS USADAS
- POST /api/assets
- POST /api/modules/[id]/slides
- POST /api/modules/[id]/slides/reorder
- PATCH /api/slides/[id]
- DELETE /api/slides/[id]

VALIDAÇÃO
- Conferida estrutura TSX.
- Conferida contagem básica de chaves/parênteses/colchetes.
- Conferido que não altera rotas, banco ou schema.
- Conferido que o ZIP não contém .env, .env.local, node_modules, .next, .vercel ou segredos.

COMO TESTAR
1. Abra Módulos.
2. Clique em Editar.
3. Na tabela de slides, mova imagens/sites com ↑ ↓ ou arraste.
4. Confirme no player se a ordem mudou.
5. Clique em “Apagar só imagens”.
6. Confirme que sites/dashboards permaneceram.
7. Importe imagens ou PPTX novo.
8. Ajuste a ordem novamente, se necessário.
