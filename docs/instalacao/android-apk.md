# Instalar e usar o Gabinete+ em um Samsung Galaxy

O APK de demonstração é gerado automaticamente pelo GitHub Actions. A versão de preview permite informar o endereço da API no próprio aplicativo, sem precisar gerar um novo APK quando o IP do computador mudar.

## APK

Workflow: **Build Android APK**

Artefato: **GabineteMais-Android-APK**

Arquivo: **GabineteMais-preview.apk**

## Preparar o computador que servirá a API

No Windows, com o repositório já clonado e atualizado, basta abrir:

`scripts\\start-phone-preview.cmd`

Se preferir pelo PowerShell:

~~~powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-phone-preview.ps1
~~~

O script:

- verifica Docker, Node e pnpm;
- cria um \`.env\` local se necessário;
- sobe PostgreSQL;
- instala dependências;
- gera Prisma Client;
- aplica migrations;
- cria dados fictícios de demonstração;
- mostra o endereço da API para informar no celular;
- inicia a API.

Credencial fictícia padrão:

- E-mail: \`chefia@example.invalid\`
- Senha: \`GabineteMais2026!\`

O computador e o Samsung devem estar na mesma rede Wi-Fi para usar um endereço local como \`http://192.168.x.x:3333\`.

## Instalação no Samsung

1. GitHub → repositório **GabineteMais** → **Actions**.
2. Abra **Build Android APK** e escolha uma execução verde da branch \`main\`.
3. Em **Artifacts**, baixe **GabineteMais-Android-APK**.
4. Extraia \`GabineteMais-preview.apk\`.
5. Toque no APK.
6. Se solicitado, habilite temporariamente **Permitir desta fonte** para o aplicativo usado para abrir o APK.
7. Abra **Gabinete+**.
8. Na primeira tela, informe o endereço mostrado pelo script no computador, por exemplo \`http://192.168.0.10:3333\`.
9. Entre com a credencial fictícia acima.

## Encerrar o ambiente local

Feche a janela onde a API está rodando e abra:

`scripts\\stop-phone-preview.cmd`

Ou execute:

~~~powershell
powershell -ExecutionPolicy Bypass -File .\scripts\stop-phone-preview.ps1
~~~

## Observação

O APK aceita HTTP somente no perfil de preview para permitir testes na rede local. Builds de produção continuam sem essa liberação.
