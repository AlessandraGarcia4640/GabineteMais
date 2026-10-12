# Android — instalação para prova de conceito

O fluxo **Android validation APK** no GitHub Actions gera um aplicativo independente do servidor de desenvolvimento Expo. Depois de concluído, baixe o artefato `GabineteMais-validacao-<commit>`, extraia o ZIP e confira `BUILD.txt` e `SHA256SUMS.txt`. Instale `GabineteMais-validacao.apk` em um Android compatível (arm64; x86_64 para emulador). A instalação pode exigir autorização do Android para a origem do arquivo.

No primeiro acesso, informe o endereço fornecido pela pessoa responsável pelo ambiente. Depois, use uma conta fictícia do seed. O aparelho precisa alcançar a API e o banco já preparados conforme o guia de operação.

Para teste em rede local, a API deve atender a interface de rede do computador, e o endereço deve usar o IP acessível pelo telefone, com a porta da API. `localhost` no telefone aponta para o telefone, não para o computador. Este APK interno admite HTTP na rede de demonstração. Prefira HTTPS quando o acesso não estiver restrito ao ambiente de demonstração.

O endereço e a sessão são armazenados separadamente. **Alterar endereço de acesso**, no login, remove a sessão e o cache anteriores. Em builds configurados com EXPO_PUBLIC_API_URL, esse endereço é usado inicialmente; no APK preparado aqui, ele não é fixado.

Este instalador usa assinatura de debug para validação interna e não é uma versão de loja. A configuração normal não habilita HTTP. O workflow pode ser executado novamente pela interface Actions. Os perfis de EAS Build estão em `apps/mobile/eas.json`; é necessário conectar a conta/projeto EAS antes de usar esse serviço.

Registre instalação, aparelho, versão Android, commit, conectividade, encerramento/reabertura, expiração e logout. Execute o [protocolo da prova de conceito](validacao/protocolo-poc.md). A publicação do APK pelo CI, por si só, não marca os testes físicos ou sessões de usuários como concluídos.
