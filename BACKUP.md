# Backup do ExxEventos

## Estado atual

Rotina preparada, mas DESATIVADA até cadastrar os dois secrets e a variável de ativação. Nenhuma cópia real do banco foi criada nem restaurada nesta preparação. Testes locais verificam criptografia, senha errada, adulteração, integridade e proteção contra sobrescrita; não validam recuperação do Supabase real.

## Configurar uma vez

Repositório: https://github.com/evertonze-rs/projeto-salao/settings/secrets/actions

Em Settings → Secrets and variables → Actions → Secrets → New repository secret:

1. `SUPABASE_DB_URL`: conexão completa obtida no Supabase → Connect → Session pooler, porta 5432. Substituir [YOUR-PASSWORD] pela senha DO BANCO, não a senha de login do aplicativo ou a chave pública. Caracteres especiais da senha devem ser codificados para URL. Não colocar a conexão no chat, em arquivos versionados nem nas variáveis VITE do Cloudflare. Manter a conexão na região indicada pelo painel.
2. `BACKUP_PASSWORD`: senha exclusiva e aleatória com pelo menos 24 caracteres. Guardar também uma cópia em gerenciador de senhas ou local seguro fora do GitHub. Sem ela não será possível abrir os backups; trocá-la não permite abrir as cópias antigas.

Depois, na aba Variables, criar `BACKUP_ENABLED` com valor `true`.

Em Actions → Backup criptografado do banco → Run workflow, selecionar master. Conferir conclusão verde e presença do artifact backup-.... Baixar o artifact e guardar também uma cópia fora do GitHub. Só depois da primeira execução validada considerar a rotina ativa.

## Rotina e limites

Agendamento: 06:23 UTC, normalmente 03:23 em Brasília. GitHub pode atrasar ou omitir execuções agendadas; conferir a última cópia com frequência. Em repositórios públicos sem atividade, o GitHub pode desativar agendamentos após 60 dias. Habilitar notificações de falhas de Actions nas preferências da sua conta.

Retenção configurada: 7 dias. Somente arquivos criptografados e seus hashes são enviados como artifact. O repositório é público: trate os arquivos criptografados como potencialmente acessíveis e proteja a senha. Dumps temporários nunca são enviados ao Git nem ao site. O runner é descartado ao final.

A rotina usa o runner padrão e os limites gratuitos disponíveis no GitHub; conferir uso de armazenamento e Actions. Não há contratação de serviço pago neste preparo. Não é garantia de gratuidade ilimitada. Remover a variável BACKUP_ENABLED ou mudar para false desativa a rotina.

Executar também antes de alterações importantes. O data.sql usa um snapshot do dump de dados, mas roles/schema/data são exportações separadas: evitar migrações de estrutura enquanto o backup roda. Uma cópia diária pode perder alterações posteriores à última execução bem-sucedida.

## Conteúdo

- roles.sql: papéis conforme exportação oficial do Supabase CLI.
- schema.sql: estrutura, funções, políticas e permissões exportadas.
- data.sql: dados, inclusive tabelas de autenticação. O script exige encontrar saloes, eventos e auth.users; isso não substitui uma restauração de teste.
- auth-trigger.sql: recria o gatilho personalizado de cadastro em auth.users após restaurar os dados.
- project/: migrações e modelos de e-mail versionados, para referência; não executar todas as migrações por cima de schema.sql.
- manifest.json: data UTC, commit, versão do CLI e hashes dos arquivos.

Não inclui configuração do painel Auth (SMTP, URLs, provedores, limites), credenciais externas, chaves raiz de criptografia do Supabase nem objetos binários do Storage. Logos e fotos atuais armazenados nas tabelas são incluídos nos dados; arquivos de marca estáticos estão no GitHub. Se passar a usar Storage, adicionar cópia dos objetos. O SMTP precisa ser reconfigurado em um projeto novo. Consulte as considerações de criptografia do guia oficial antes de migrar autenticação entre projetos.

## Abrir uma cópia local

Baixar o artifact do Actions e extrair os arquivos .exxbackup e .sha256 para private/backups. Instalar Python e as dependências:

```powershell
python -m pip install -r scripts/backup/requirements.txt
python scripts/backup/decrypt.py private/backups/ARQUIVO.exxbackup private/backups/restauracao.zip
```

A senha é solicitada sem aparecer na tela. O script confere a autenticidade e os hashes antes de criar o ZIP. Não executa SQL e não sobrescreve arquivo existente. O ZIP resultante contém dados pessoais e credenciais de autenticação protegidas pelo banco: guardar privadamente e nunca enviar ao GitHub.

## Ensaio de restauração — ainda pendente

1. Criar um projeto Supabase separado, vazio, para teste (verificar disponibilidade no plano). NUNCA usar produção para o ensaio. Anotar IDs diferentes de origem e destino.
2. Verificar versão de Postgres, extensões e chaves de criptografia conforme guia oficial. Instalar psql. Conferir hashes/descriptografia da cópia baixada.
3. Configurar conexão APENAS ao destino. O guia oficial restaura roles.sql, schema.sql e data.sql com ON_ERROR_STOP, em transação única e session_replication_role=replica durante os dados. Não desativar erros para forçar sucesso. Ajustes de ownership/papéis podem ser necessários no projeto novo; revisar antes de executar.
4. Aplicar auth-trigger.sql no destino após restaurar os dados. Não aplicar a migração 010 de limpeza de testes em um banco restaurado.
5. Comparar contagens por salão de eventos, itens, pagamentos, tarefas, detalhes, usuários e logs. Comparar soma dos itens, recebimentos e devoluções por salão. Confirmar RLS habilitada e testar conta administrativa e cliente no ambiente isolado.
6. Reconfigurar URLs/SMTP e testar novo cadastro e recuperação. Não disparar mensagens para clientes reais durante o ensaio.
7. Registrar data da cópia, destino, resultados e diferenças. Só declarar restauração validada depois desses passos com uma cópia real.

O arquivo de backup não basta para afirmar que o sistema é recuperável. Ainda faltam a primeira exportação real e o ensaio acima antes de fechar a versão 1.0.

Fontes: https://supabase.com/docs/guides/platform/backups e https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
