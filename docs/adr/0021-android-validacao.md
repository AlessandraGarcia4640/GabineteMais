# ADR 0021 — Instalador de validação e endereço do gabinete

Status: aceito.

O APK de validação usa endereço informado no primeiro acesso, salvo separadamente da sessão. Todos os módulos utilizam o mesmo destino do SessionManager. A troca só aparece no login e remove credenciais e cache antes de habilitar outro destino; a restauração também confere a origem já registrada nos tokens.

O protótipo interno permite HTTP em rede de demonstração através de plugin aplicado exclusivamente quando EXPO_PREVIEW_ALLOW_HTTP=true. Na configuração padrão/produção, tráfego aberto permanece desabilitado. O pacote Android é br.gabinetemais.prototipo. Credenciais ou parâmetros no endereço são recusados.

O plano prefere EAS Build. Foram incluídos perfis EAS preview/production; como a conta e o projeto EAS não estão configurados nesta sessão, o primeiro APK é compilado no GitHub Actions com o projeto gerado pelo Expo e JDK 17. O APK release inclui o bundle e usa a chave de debug do template exclusivamente para validação interna. Publicação em loja exige configuração e assinatura próprias.

O fluxo registra commit e checksum, publica o APK por 30 dias e compila arm64-v8a e x86_64. Aparelhos apenas 32 bits não estão cobertos. Permissões de armazenamento externo e sobreposição foram removidas por não serem necessárias aos fluxos do MVP.

Testes automatizados cobrem endereço inválido, configuração inicial, restauração, troca com remoção da sessão/cache e falha de armazenamento. A compilação e os testes não confirmam instalação em telefone nem usabilidade com participantes; essas evidências devem ser registradas no protocolo da prova de conceito.
