# Publicação de teste — Gestão de Eventos

O site é estático; login e dados continuam no Supabase. Não precisa deixar este computador ligado depois de publicar. O pacote não contém planilhas, eventos, senhas ou scripts SQL.

## 1. Atualizar o banco

No SQL Editor do Supabase, execute **uma vez**, nesta ordem, os arquivos completos `supabase/011_portal_perfis.sql`, `supabase/012_permissoes_detalhadas.sql` e `supabase/013_perfil_auditoria.sql`, depois das atualizações até 009. Execute somente os arquivos que ainda não foram aplicados, nessa ordem. A limpeza 010 é independente. Esta atualização preserva os eventos e os vínculos de usuários. Ela cria os perfis e as opções do portal, ativa RLS nas tabelas novas e ajusta as funções de acesso.

No aplicativo, abra Configurações gerais → Portal do cliente e escolha as informações de cada salão. Por padrão, informações financeiras e textos detalhados ficam desligados; progresso e contador ficam ligados.

As flags separam visualizar eventos, criar, editar/cancelar e excluir; visualizar e editar financeiro; visualizar e marcar checklist; usar relatórios e fichas. Permitir alterações habilita a leitura correspondente. O acesso a relatórios controla os recursos do aplicativo; uma pessoa autorizada a visualizar dados ainda pode copiá-los ou imprimi-los pelo próprio navegador.

Perfis: os novos perfis podem ser criados, editados e excluídos quando não estiverem em uso. Dono e Secretária podem ter suas permissões alteradas. Gerente e Cliente são reservados; somente administradores de todos os salões alteram os perfis gerais. Administração completa inclui todos os acessos. A atribuição de usuários continua escolhendo um ou ambos os salões.

## 2. Gerar o pacote

Em `C:\Projetos\projeto-salao`, execute:

```powershell
npm run build
python scripts/empacotar_site.py
```

O pacote atualizado da versão 0.5.0 será `private/publicacao/gestao-eventos-site.zip`. Contém **apenas dist**, com `index.html` na raiz. Para atualizar o site, gere um pacote novo. Não envie a pasta inteira do projeto, `.env.local`, `private` ou as planilhas.

## 3. Hospedar no Cloudflare Pages

1. Crie sua conta gratuita em https://dash.cloudflare.com/sign-up e confirme o e-mail. Não é necessário comprar domínio nem contratar um plano pago. Entre na sua conta Cloudflare e abra Workers & Pages.
2. Crie um projeto **Pages** com envio direto de arquivos (Direct Upload / Drag and drop).
3. Escolha o nome do projeto e envie `gestao-eventos-site.zip`.
4. Publique e copie o endereço HTTPS terminado em `.pages.dev`. Não é necessário comprar domínio.

Referência oficial: https://developers.cloudflare.com/pages/get-started/direct-upload/

O frontend também pode ser hospedado em outro serviço para sites estáticos; os arquivos da pasta `dist` são os mesmos. A configuração pública do Supabase é incorporada durante o build.

## 4. Ajustar o login

No Supabase, em Authentication → URL Configuration:

- Site URL: endereço HTTPS publicado.
- Redirect URLs: adicione esse mesmo endereço. Mantenha `http://127.0.0.1:5173` para desenvolvimento local, se necessário.

Para contas já criadas, teste o login com e-mail e senha. Para clientes criarem a própria senha e confirmarem o e-mail, configure SMTP em Authentication: o serviço padrão do Supabase não envia para clientes externos à equipe do projeto. Use os dados do seu provedor de e-mail no painel Supabase; nunca os coloque no aplicativo ou no arquivo `.env.local`.

Referência oficial: https://supabase.com/docs/guides/auth/auth-smtp

## 5. Conferência no ambiente publicado

- Abrir o link no celular usando dados móveis e no computador.
- Entrar com a conta administrativa, selecionar ambos os salões e abrir relatórios/PDF.
- Autorizar uma conta de cliente para um evento de teste futuro; concluir seu primeiro acesso.
- Conferir o contador e as seções habilitadas; desabilitar financeiro, atualizar o portal e confirmar que desapareceu.
- Validar um perfil de consulta, um de tarefas e um de financeiro; suspender a conta de teste ao terminar.

O banco real, as URLs de autenticação, o SMTP e o site publicado precisam dessa conferência. Os testes automatizados locais não substituem esses passos.

## Custos e portabilidade

Em 02/10/2026, o Free do Supabase inclui 50 mil usuários ativos mensais, banco de 500 MB e 5 GB de saída. Projetos podem pausar após uma semana de inatividade. São limites de uso, não uma garantia permanente de gratuidade. Consulte https://supabase.com/pricing antes de contratar algo.

Gerenciar usuários no aplicativo não exige abandonar Supabase Auth. O aplicativo controla perfis, salões e validade; o Auth verifica credenciais. Mudar apenas a hospedagem do frontend não altera usuários nem dados. Para mudar o backend, é necessário exportar banco, funções/RLS e autenticação; Supabase permite migrar contas e hashes entre projetos ou para uma instalação própria. Em outro sistema de autenticação pode ser necessário redefinir as senhas. Hospedagem própria transfere a responsabilidade por atualizações, backups e disponibilidade.

https://supabase.com/docs/guides/troubleshooting/migrating-auth-users-between-projects

https://supabase.com/docs/guides/self-hosting/restore-from-platform

## Manutenção depois de publicar

Uma correção de tela ou comportamento normalmente exige atualizar os arquivos locais, validar, aumentar a versão, gerar um novo ZIP e usar Nova implantação no mesmo projeto Pages. O endereço continua igual e os dados continuam no Supabase. Uma alteração no banco recebe um novo arquivo SQL; faça backup antes e teste sua compatibilidade. Voltar a uma implantação anterior do site não desfaz uma migração do banco.

O caminho direto oficial é https://dash.cloudflare.com/?to=/:account/workers-and-pages . Ele pede a conta se houver mais de uma. Na área de criação, selecione Pages e o envio direto de arquivos, não adição de domínio.

Logs: Configurações → Aplicativo → Logs. Administradores veem alterações dos salões autorizados; logs de configurações gerais exigem administração de todos os salões. O usuário que usa o aplicativo é identificado pelo UUID e e-mail, além do nome. SQL executado no painel sem sessão do aplicativo aparece como Sistema / SQL. Fotos e logos são resumidos no log; senhas não são armazenadas nele. O histórico começa na aplicação da atualização 013. Administradores do banco continuam tecnicamente capazes de alterar tabelas; a proteção contra exclusão/edição dos logs aplica-se aos usuários do aplicativo. Para produção, definir rotina de backup e retenção de logs conforme volume e necessidades da empresa.

Atualização 0.4.1: aplicar `supabase/014_nome_cadastrado.sql` depois de 013 para priorizar o nome cadastrado em Usuários. Recarregue o aplicativo após executar. Os cadastros abrem por botão e a edição ocorre na própria linha.

## Atualização 0.5.0 — usuários e recuperação de senha

1. Aplicar `supabase/015_usuarios_evento.sql` após 014. O arquivo instala as funções; não exclui usuários durante a migração.
2. Em Authentication → URL Configuration, manter Site URL `https://exxeventos.pages.dev` e adicionar em Redirect URLs o endereço exato `https://exxeventos.pages.dev/?recuperar=1`. Manter também a URL da raiz para confirmação de cadastro. Para testar localmente, adicionar a URL equivalente do ambiente local.
3. Com SMTP configurado, usar Esqueci minha senha em uma conta de teste; conferir recebimento, troca da senha pelo link e novo login. O formulário não exige a senha antiga. Links inválidos ou expirados permitem voltar e solicitar outro.
4. Excluir usuário exige confirmação: remove vínculos e conta de autenticação, preservando eventos e logs. Para recadastrar, primeiro autorizar novamente; o cliente usa Primeiro acesso para definir uma senha. A exclusão em auth.users depende das relações do Supabase Auth; se outro recurso futuro criar dependências, a transação falha integralmente, sem remoção parcial. Contas excluídas perdem os vínculos usados nas políticas mesmo com token anterior ainda dentro da validade.
5. Em Editar evento, Criar acesso salva o evento e autoriza o e-mail em uma transação. E-mail já vinculado exige gerenciamento em Usuários; conflitos mantêm o formulário e não gravam parcialmente.

GitHub: branch master publica automaticamente no projeto Pages conectado. Migrações SQL não são executadas pelo build.
