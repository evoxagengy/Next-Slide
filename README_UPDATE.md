# Next Slide — Hotfix Manager Duplicate Prop v1

## Objetivo
Corrigir falha de build TypeScript em `components/users/ManagerClient.tsx`.

## Problema
O TypeScript acusava que `companyName` poderia ser sobrescrito porque o objeto de edição da empresa declarava propriedades explícitas e depois espalhava `...current[id]`.

## Correção
A função `setCompanyEdit` agora monta um objeto `base` primeiro e depois aplica somente o patch alterado, eliminando a duplicidade de propriedades.

## Arquivos alterados
- `components/users/ManagerClient.tsx`

## Banco
Não altera banco.

## Teste esperado
O build deve passar do erro:
`companyName is specified more than once`
