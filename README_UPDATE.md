NEXT SLIDE — HOTFIX LOGIN CARD GLOW V3

OBJETIVO
Corrigir o visual do card de login, removendo o quadrado/placa girando atrás do formulário e substituindo por um efeito premium discreto.

ARQUIVOS ALTERADOS
- components/auth/AuthShell.tsx
- README_UPDATE.md

O QUE FOI CORRIGIDO
1. Removido o bloco conic-gradient grande atrás do login.
2. O card voltou a ser escuro, corporativo e limpo.
3. A animação agora fica apenas na borda do card, de forma leve.
4. Adicionado um brilho suave que percorre a área do card, como um hover/mouse blur controlado.
5. Mantidas as alterações anteriores:
   - botão criar organização removido;
   - logo maior;
   - login corporativo;
   - fundo de TV corporativa.

BANCO
- Não altera Prisma.
- Não altera Neon.
- Não precisa rodar SQL.

VALIDAÇÃO
- Conferido que o hotfix altera apenas o AuthShell.
- Conferido que não contém .env, .env.local, node_modules, .next, .vercel ou segredos.
