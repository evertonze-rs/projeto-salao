# Gestão de Eventos

Este é o projeto dos salões Exxcelência e Exxplêndido. Priorize mobile first e preserve as regras de privacidade no banco, além dos controles de interface.

## Versões

A pedido do usuário, atualize a versão ao entregar alterações visíveis ou correções: patch para ajustes, minor para funcionalidades. Use `npm version X.Y.Z --no-git-tag-version` para manter package.json e package-lock.json sincronizados. Atualize `src/release.json` com a data real da entrega e registre a mudança no CHANGELOG.md. O Sobre lê a versão diretamente de package.json. Não altere a data só por recompilar.

Regenere o build e o pacote de publicação quando a entrega estiver validada. Não inclua planilhas, diretório private, SQL ou credenciais no pacote público. Migrações remotas não estão aplicadas apenas porque o arquivo local foi criado.
