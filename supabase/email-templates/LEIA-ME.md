# E-mails ExxEventos em português

Estes arquivos são modelos para configurar no Supabase; o deploy do Cloudflare não os aplica. Não contêm tokens reais. A identidade visual é comum aos dois salões, pois o e-mail de autenticação não recebe o tema do evento de forma confiável. Não depende de imagens externas para mostrar a marca.

## Corrigir o destino antes de enviar outro e-mail

Em Authentication → URL Configuration:

- Site URL: `https://exxeventos.pages.dev`
- Redirect URLs: adicionar `https://exxeventos.pages.dev` e `https://exxeventos.pages.dev/?recuperar=1`.
- Manter endereços locais apenas se usados no desenvolvimento; `localhost:3000` não deve ser Site URL de produção.

O app já solicita a recuperação com `redirectTo` apontando para a origem atual seguida de `/?recuperar=1`. Quando a URL não está permitida, o Supabase pode usar Site URL como destino. Um link chegando a localhost indica destino/configuração antiga; não é defeito do botão HTML.

## Aplicar modelos

Em Authentication → Emails → Templates, abra a opção indicada em assuntos.json. Copie o assunto para Subject e o conteúdo COMPLETO do arquivo HTML correspondente para Body/Source. Salve cada modelo.

| Tela | Arquivo | Assunto |
|---|---|---|
| Reset password | recuperar-senha.html | Redefina sua senha | ExxEventos |
| Confirm sign up | confirmar-cadastro.html | Confirme seu cadastro | ExxEventos |
| Invite user | convite.html | Você recebeu um convite | ExxEventos |
| Magic link | link-acesso.html | Seu link de acesso | ExxEventos |
| Change email address | alterar-email.html | Confirme a alteração de e-mail | ExxEventos |
| Reauthentication | reautenticacao.html | Seu código de confirmação | ExxEventos |
| Password changed (se habilitado) | senha-alterada.html | Sua senha foi alterada | ExxEventos |
| Email address changed (se habilitado) | email-alterado.html | Seu e-mail foi alterado | ExxEventos |

Preserve `{{ .ConfirmationURL }}`: é o link de verificação gerado pelo Supabase, não substitua por um link comum do site. Preserve também as outras variáveis entre chaves. Os templates de convite e magic link não adicionam novos fluxos à interface; apenas traduzem mensagens caso sejam usadas. Os avisos de segurança precisam ser habilitados no painel para serem enviados.

## Teste depois de salvar

Solicite um NOVO e-mail em Esqueci minha senha no site publicado. Mensagens antigas não recebem as correções. Confira assunto, botão e URL final. Defina uma senha nova e confirme novo login. Não compartilhe capturas da barra de endereço contendo access_token, refresh_token ou links de recuperação.

No Outlook, marque a mensagem legítima como Não é lixo eletrônico. A mudança do template não garante entrega na caixa de entrada: reputação do remetente e do domínio dos links também interferem. Se um scanner consumir links de uso único, avalie um fluxo de confirmação intermediária ou código; não altere para URLs não verificadas.

Documentação: https://supabase.com/docs/guides/auth/auth-email-templates e https://supabase.com/docs/guides/auth/redirect-urls
