# Gestão de Eventos

Aplicativo em teste local com dois salões, eventos importados, financeiro, relatórios, portal do cliente e perfis de acesso.

**Versão 0.4.3 — 02/10/2026:** executar `supabase/011_portal_perfis.sql` após 009 e depois `supabase/012_permissoes_detalhadas.sql` e `supabase/013_perfil_auditoria.sql` para ativar opções do portal e perfis configuráveis. O menu no computador é fixo e recolhível; os telefones têm máscara brasileira. Contador do cliente com abertura de 3,5 segundos, opção de pular e respeito a movimento reduzido.

Veja [PUBLICAR.md](PUBLICAR.md) para publicar a versão de teste e configurar login/e-mail. Banco remoto e hospedagem ainda dependem da aplicação/configuração no painel pelo responsável.

## Banco

No projeto Supabase informado, abrir SQL Editor, criar uma consulta, colar o conteúdo completo de `supabase/001_estrutura.sql` e executar uma única vez. O arquivo é transacional e destinado ao projeto novo; não contém exclusões. Cria seis tabelas, regras de acesso, função de autorização e os nomes dos dois salões. Não importa dados pessoais, não cria contas e não concede permissões a usuários.

Depois será necessário criar a conta da gerente no Supabase Auth e vinculá-la aos salões pelo administrador, usando o identificador exato dessa conta. Não existe cadastro público com concessão automática de perfil. O login do painel Supabase é distinto do login do aplicativo.

## Desenvolvimento local

Node 22.12 ou superior. Executar `npm install`, `npm test`, `npm run build` e `npm run dev`. Configuração pública em `.env.local`, ignorada pelo Git. Não colocar chaves secretas ou service_role no frontend.

## Implementado

- Login por e-mail e senha e saída da sessão.
- Salões visíveis conforme vínculo no banco.
- Consulta, busca e cadastro básico de eventos pela gerente.
- Banco inicial de itens, pagamentos e tarefas, com valores decimais exatos e vínculos por salão.
- Testes locais em PostgreSQL/PGlite: isolamento, leitura financeira, proibição de autoelevação e integridade dos vínculos.

## Ainda pendente no ambiente real

- Aplicar as atualizações 011, 012 e 013 e testar com contas de equipe e cliente.
- Publicar o build, cadastrar URLs no Auth e configurar SMTP para primeiros acessos de clientes externos.
- Recuperação de senha esquecida, contratos e política de cópias de segurança.
- Conferência de login, PDF e permissões na versão publicada.

As planilhas originais não foram alteradas. Nenhum dado delas foi incluído no pacote público do aplicativo. Acesso externo não está publicado nesta etapa.

## Ficha do evento

Na agenda, usar Abrir evento. A ficha permite editar dados básicos, responsáveis, fornecedores, decoração, cardápio e observações; adicionar/editar serviços e pagamentos; cadastrar e concluir tarefas. Total e saldo são derivados dos itens e pagamentos, somando centavos inteiros na interface. Crédito é mostrado quando o valor pago excede o contratado. Campos financeiros são exibidos somente à gerente e continuam protegidos pelas políticas do banco.

Estas telas usam a migração 001 já existente, sem SQL adicional. Não há exclusão de lançamentos nesta etapa. Alterações de detalhes preservam chaves adicionais existentes no JSON. A importação continua pendente. Testes de cálculo e permissões e compilação executados localmente; o fluxo autenticado real precisa ser conferido com a conta de teste, sem compartilhar sua senha.

## Atualização de catálogos e modo de consulta

Esta atualização passa a exigir `supabase/002_catalogos.sql`, executado uma vez no SQL Editor após a 001. O script cria catálogos separados por salão, a partir dos cabeçalhos das planilhas: 17 serviços no Exxcelência, 15 no Exxplêndido e 12 tarefas em cada salão. Pacote e convidados extras estão incluídos nessas contagens. Data da assinatura e responsável pelo fechamento são campos próprios, não caixas de tarefas.

O evento abre em consulta. Editar evento libera formulários, edição dos serviços predefinidos, lançamento/edição de pagamentos e conclusão das tarefas. Os valores monetários usam máscara BRL: a digitação preenche os centavos da direita para a esquerda. Quantidades continuam numéricas.

Configurar salão permite adicionar serviços/tarefas e ativar/desativar itens do catálogo. Novos eventos recebem os itens ativos em uma única transação pelo banco. O histórico dos eventos existentes não acompanha alterações posteriores dos catálogos. O banco rejeita novos serviços/tarefas livres e vínculos de outro salão.

A migração acrescenta os padrões faltantes aos eventos anteriores, com serviços de valor zero. Mantém os registros livres de teste já existentes e não duplica nomes idênticos. Esses lançamentos anteriores podem continuar a ser corrigidos, mas não são oferecidos como opções nos novos eventos. Nenhum valor antigo é apagado. Os detalhes da festa usam os campos específicos de cada planilha. Testes da migração cobrem preenchimento automático, isolamento, preservação dos valores e mudanças aplicadas apenas a novos eventos.

## Datas, cancelamento e exclusão

Executar `supabase/004_cancelar_excluir.sql` uma vez após a 003. Essa migração não exclui nem cancela registros. Datas de evento, pagamento e assinatura são digitadas em dd/mm/aaaa, com máscara e validação de calendário, e enviadas em ISO ao banco. Após cadastrar, abre a ficha do mesmo evento em edição; abrir eventos pela agenda continua em consulta.

Gerenciar evento, na ficha em consulta, permite cancelar com justificativa obrigatória ou excluir após confirmação explícita. Cancelamento preserva serviços, tarefas e pagamentos e registra motivo, data/hora e usuário. A exclusão é definitiva: uma função transacional valida o perfil gerente no salão do evento e remove o evento e seus registros vinculados. A interface informa essa consequência antes da confirmação. Testes locais verificam bloqueio de cancelamento sem motivo, autoria, bloqueio de exclusão pela secretária, remoção dos dependentes e preservação de outros eventos.

## Configurações gerais e cadastro por etapas (005)

Executar `supabase/005_configuracoes_gerais.sql` uma vez após a 004. A atualização cria configurações gerais e mantém os vínculos com os salões e registros anteriores. Não importa clientes das planilhas. Os detalhes iniciais são extraídos dos cabeçalhos de cada planilha; campos que começam por “Terá” ou terminam em “: sim” iniciam como checkbox, os demais como texto. A gerente pode ajustar o tipo no cadastro para novos eventos. Itens idênticos já cadastrados nos dois salões são agrupados; nomes diferentes são preservados.

- Serviços, tarefas, tipos, detalhes e profissionais: cadastro geral com seleção de salões, edição e exclusão. Exclusão retira das opções futuras, preservando eventos existentes. Mudanças em salões ou propriedades são transacionais e verificam permissões em todos os salões envolvidos.
- Pacote: obrigatório e protegido contra edição/exclusão do catálogo. Não há escolha de categoria na interface. O preço do pacote continua editável no evento.
- Profissionais: serviços Fotos e/ou Filmagem, salões disponíveis e opção Particular permanente. Valores antigos continuam visíveis; novas escolhas são validadas no banco. Não foram criados profissionais automaticamente com os nomes das planilhas.
- Datas: calendário acessível por botão e digitação dd/mm/aaaa, armazenada como ISO sem conversão de fuso.
- Fechado por: pessoa que fechou a contratação, confirmado pelos valores das duas planilhas. Valores das antigas chaves Fechado e Fechado por: são exibidos sem perda.
- Etapas: Evento → Serviços → Detalhes → Pagamentos → Tarefas. Salvar e continuar grava antes de avançar. A troca manual de abas também salva alterações pendentes; falhas mantêm os campos preenchidos. Cancelar edição descarta apenas alterações não salvas da etapa, preservando registros já gravados. Há proteção contra sair/recarregar com alterações pendentes.
- Serviços e detalhes: salvos em lote por etapa, com transações no banco. Quantidades e preços ficam editáveis na própria linha. Tarefas permanecem clicáveis e são salvas imediatamente, inclusive fora da edição.

Validação local: nove testes, incluindo migrações em PostgreSQL/PGlite, permissões, transações, calendário, checklist, profissionais e navegação por etapas em DOM simulado, além da compilação. A execução da migração e os testes autenticados no Supabase real dependem do painel do usuário. O aplicativo continua local, sem publicação externa.

## Pagamentos independentes e temas dos salões (006)

Executar `supabase/006_pagamentos_temas.sql` uma vez após 005. Acrescenta forma de pagamento e recebedor (`pago_para`), mantendo os lançamentos anteriores com esses campos vazios. Os lançamentos continuam representando pagamentos do evento e compondo o total pago, sem criar movimentações bancárias.

A aba Pagamentos abre com Novo pagamento e histórico. Cada registro tem Editar, independente de Editar evento. O formulário inclui calendário, valor em reais, forma de pagamento, Pago para e Detalhe. Salvar fecha o formulário e atualiza os totais; cancelar descarta somente o formulário não salvo. No primeiro cadastro, é possível incluir vários pagamentos ou continuar direto para as tarefas.

Configurações gerais → Salões permite escolher e visualizar um tema antes de salvar. Exxcelência inicia azul e Exxplêndido verde, com roxo e terracota também disponíveis. A escolha é persistida no banco por salão e aplicada quando a unidade é selecionada. A alteração do nome e outros dados do salão não está habilitada nesta etapa. Apenas gerentes autorizadas podem mudar o tema, com permissão de atualização restrita à coluna tema.

Testes adicionais cobrem criação/edição de pagamento fora da edição do evento, manutenção dos novos campos e detalhes, cancelamento de formulário, prévia/gravação de tema, isolamento entre salões e permissões no banco.
# Atualização 007 — devoluções, usuários e importação

Execute `supabase/007_devolucoes_usuarios.sql` no SQL Editor depois da atualização 006. Os pagamentos existentes continuam como recebimentos. Devoluções usam valor positivo com natureza `devolucao`, exibida negativa e descontada do recebido líquido. Ao cancelar um serviço, atualize também o valor contratado na aba Serviços; registrar uma devolução não altera o contrato automaticamente.

Configurações gerais → Usuários permite autorizar e-mail, nome, perfil e salão, editar, suspender e definir validade até o fim do dia em São Paulo. Para liberar dois salões, autorize o mesmo e-mail em cada um. Somente gerente ativo do salão administra esses acessos; não pode alterar o próprio vínculo. Dono e secretária mantêm consulta de eventos/detalhes/tarefas; financeiro e administração continuam exclusivos de gerente. Acesso de contratantes por evento ainda não está implementado.

O usuário autorizado define a própria senha em Primeiro acesso → Criar minha senha. Mantenha confirmação de e-mail no Supabase e configure a URL do aplicativo em Authentication → URL Configuration e o envio de e-mails antes de disponibilizar cadastros a terceiros. O serviço padrão de e-mail do Supabase pode restringir destinatários; não foi testado envio real. Nenhuma chave administrativa vai para o navegador. Autorizações são mantidas em tabela protegida, sem confiar em metadados enviados no cadastro. Referências: https://supabase.com/docs/reference/javascript/auth-signup e https://supabase.com/docs/guides/auth/managing-user-data.

`scripts/previa_importacao.py` lê as planilhas originais, sem modificá-las. `scripts/gerar_importacao.py` prepara SQL privado em `private/previa-importacao/Importar-eventos.sql`; `node scripts/testar_importacao.mjs` executa esse SQL em PostgreSQL local isolado e verifica totais/reexecução. Nada é enviado automaticamente ao Supabase. O SQL importa 201 eventos e 1.121 lançamentos (5 devoluções), ignora parcelas sem valor e linhas sem evento, corrige o tipo das linhas solicitadas e o vínculo de Detalhes da Mirella. Sofia usa os dados da aba Eventos, linha 167: Sabrina e 120 convidados. A ficha de Detalhes correspondente vem da linha 169; a duplicata da linha 167 permanece apenas na origem local, sem gerar registro adicional. O script registra a origem de cada evento; não sobrescreve uma importação já realizada nem duplica eventos em reexecução. Para evitar vínculos incorretos, um evento manual com mesmo nome/data aborta a transação para revisão.
# Atualizações 008–010 — agenda, clientes, identidade e documentos

- Execute `008_clientes_multissalao.sql` se ainda não aplicada, depois `009_identidade_contatos.sql`. A 009 cadastra o logo fornecido do Exxcelência, habilita nome/endereço/CNPJ/telefone/e-mail/logo editáveis, agrupa profissionais repetidos pelo nome normalizado e adiciona criação atômica de evento com autorização do cliente.
- A agenda inicia em hoje/próximos eventos, permite passados/todos e filtra pelo mês do calendário. O calendário acompanha a rolagem normal.
- A marca é Gestão de Eventos / RiffByte Tecnologia. Assets fornecidos ficam em `public/brand`; a tela Sobre informa versão 0.2.0. Nenhum endereço, CNPJ ou contato real foi inventado: devem ser preenchidos nas configurações.
- Usuários internos recebem um ou dois salões em uma única gravação. Clientes recebem um evento, com resumo por RPC e nenhum acesso direto às tabelas internas. A validade sugerida é data do evento + 1 dia, inclusive; prevalece a menor data entre a validade configurada e esse limite. A opção no novo evento autoriza o e-mail; não cria uma senha previsível nem chama a API administrativa no navegador. A identidade Auth é concluída no primeiro acesso com senha escolhida pelo cliente e confirmação de e-mail. Envio SMTP/URLs de confirmação continua dependente da configuração do Supabase.
- Troca de senha exige validação da senha atual e usa o Supabase Auth. A conta de quem administra não troca o próprio perfil por essa tela.
- Exibir ficha tem seleções reativas de seções. O PDF é um documento A4 gerado por jsPDF/AutoTable, não captura de tela; checklist e resumo financeiro começam em folhas separadas. Cabeçalho recebe logo e dados do salão, nome e data do evento. Prévia abre outra aba. A leitura do logo é redimensionada no navegador para não inserir a imagem original de 20 megapixels em cada documento. Relatórios incluem agenda, tarefas, financeiro e profissionais (eventos distintos, por data, sem Particular/cancelados).
- `010_remover_testes_anteriores.sql` remove somente registros sem `_origem` criados antes da primeira importação, guardando cópia integral em tabela protegida. Aborta se menos de 201 eventos importados forem encontrados ou se houver mais de 20 candidatos. Não apaga eventos importados nem cadastros posteriores. Esse SQL precisa ser executado no Supabase; não foi aplicado remotamente pelo assistente.
- Verificações: suíte `npm test`, `npm run build`, importação/limpeza em PostgreSQL isolado com `node scripts/testar_importacao.mjs`, e amostras PDF com `node scripts/validar_relatorios.mjs`. QA contém apenas dados fictícios em `private/qa-relatorios/`. A abertura de URL blob pela ferramenta de navegador de teste foi bloqueada; as páginas PDF foram renderizadas e conferidas diretamente.

Atualização 0.4.1: aplicar `supabase/014_nome_cadastrado.sql` depois de 013 para priorizar o nome cadastrado em Usuários. Recarregue o aplicativo após executar. Os cadastros abrem por botão e a edição ocorre na própria linha.
