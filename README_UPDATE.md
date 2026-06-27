# Next Slide — Gerenciador, Empresas, Planos e Controle PPTX v1

## Objetivo
Criar a tela Gerenciador no lugar da tela Usuários, permitindo ao usuário master administrar empresas, usuários, planos e limites de licenças.

## O que foi alterado
- Sidebar: item Usuários renomeado para Gerenciador.
- Tela /users redesenhada como Gerenciador.
- Abas: Usuários e Empresas.
- Usuários: filtro por empresa, criação de usuário vinculado a uma empresa, alteração de papel e ativação/desativação.
- Empresas: criação de empresa, edição de plano, status e quantidade de licenças de usuário.
- Planos adicionados:
  - Basic: até 20 módulos e sem conversão PPTX.
  - Premium: até 100 módulos e com conversão PPTX.
  - Enterprise: sem limite operacional de módulos e com conversão PPTX.
- Backend: APIs novas em /api/manager.
- Segurança: apenas usuário master/plataforma pode criar/editar empresas.
- PPTX: conversão bloqueada para plano Basic/Trial e liberada para Premium/Enterprise.

## Variável opcional
NEXT_SLIDE_PLATFORM_OWNER_EMAILS=santos.bruno@engenixsystem.com.br,evoxagengy@gmail.com

Se não configurar, o sistema usa esses e-mails como padrão para identificar o usuário master da plataforma.

## Banco
O Prisma adiciona os novos valores do enum LicensePlan:
- BASIC => basic
- PREMIUM => premium

Os valores antigos TRIAL e PRO continuam no schema para compatibilidade com registros antigos.

## Teste esperado
1. Entrar com usuário master.
2. Abrir Gerenciador.
3. Criar empresa Basic.
4. Criar empresa Premium.
5. Criar usuário em uma empresa selecionada.
6. Alterar plano de uma empresa.
7. Confirmar limite de módulos refletido na tabela.
8. Em empresa Basic, tentar enviar PPTX e receber bloqueio de plano.
9. Em empresa Premium/Enterprise, enviar PPTX e converter.
