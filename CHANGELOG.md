## 0.5.0 — 02/10/2026

- Exclusão confirmada de usuários e autorizações, restrita a administradores de todos os vínculos do alvo e bloqueada para a própria conta. Preserva eventos, pagamentos e logs.
- Esqueci minha senha envia link pelo SMTP configurado. Link abre tela dedicada para definir e confirmar nova senha; inclui tratamento de link inválido e encerramento local da sessão ao concluir.
- Edição do evento permite criar acesso do cliente pelo e-mail, com salvamento atômico e validade até o dia seguinte à festa.
- Banco: executar 015 após 014. Auth: permitir a URL `https://exxeventos.pages.dev/?recuperar=1`.
- Validação local: 47 testes, incluindo isolamento por salão, exclusão, preservação dos eventos e recuperação de senha. Envio real de e-mail depende do SMTP e precisa ser conferido no ambiente publicado.

## 0.4.3 — 02/10/2026

- Identificação do cliente com fundo claro e contraste independente do tema.
- Botão discreto de atualizar ao lado da identificação, adaptado ao celular.
- Troca de senha agrupada dentro do cartão Meu perfil, com separação visual.

## 0.4.2 — 02/10/2026

- Corrigido o contraste do menu de configurações em todos os temas, distinguindo categorias, opções internas e opção selecionada.
- Expandir uma categoria abre sua primeira opção; recolher oculta o conteúdo e mantém proteção de alterações não salvas.

## 0.4.1 — 02/10/2026

- Configurações iniciam recolhidas, com apenas uma categoria aberta e conteúdo oculto ao recolher.
- Novo usuário e novos cadastros abrem por botão; edição de usuários, serviços, tarefas, tipos, detalhes e profissionais acontece na própria linha, com cancelamento e preservação em caso de erro.
- Troca de senha dentro de Meu perfil; nome cadastrado em Usuários tem prioridade na identificação (migração 014).
- Removido o aviso de Pacote, mantendo a proteção do item obrigatório.

# Histórico de versões

## 0.4.0 — 02/10/2026

- Configurações como penúltima opção e Sair como última; Sobre movido para Aplicativo.
- Categorias expansíveis: Cliente, Acessos, Salões e Aplicativo.
- Nome e foto do usuário com acesso à própria conta e troca de senha.
- Logs de alterações protegidos no banco, com autor, e-mail, horário e campos antes/depois.
- Banco: aplicar 013 após 012. Logs não retroativos e senhas fora do histórico.

## 0.3.0 — 02/10/2026

- Perfis com formulário aberto apenas ao criar ou editar, identificação e foco na edição.
- Permissões separadas para visualizar, criar, editar/cancelar e excluir eventos; visualizar e editar financeiro; visualizar e marcar tarefas; relatórios/fichas; administração.
- Portal do cliente configurável por salão, contador animado, menu fixo/recolhível e máscara de telefone.
- Versão e data no Sobre; pacote para publicação no Cloudflare Pages.
- Banco: aplicar 011 e depois 012, caso ainda não estejam aplicadas.

## 0.2.0 — 01/10/2026

- Agenda, relatórios e fichas PDF, identidade dos salões e RiffByte, usuários e portal inicial.
