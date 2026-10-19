# Instalação do Gabinete+ no Android

Este fluxo gera um APK de demonstração diretamente pelo GitHub Actions.

## Arquivo

O artefato gerado chama-se `GabineteMais-Android-APK` e contém:

- `GabineteMais-preview.apk`

## Instalação pelo celular

1. Abra o repositório no GitHub.
2. Acesse **Actions**.
3. Abra a execução **Build Android APK** mais recente que esteja verde.
4. Role até **Artifacts**.
5. Baixe **GabineteMais-Android-APK**.
6. Abra o arquivo ZIP baixado e extraia `GabineteMais-preview.apk`.
7. Toque no APK para instalar.
8. Se o Android solicitar, autorize temporariamente **Instalar apps desconhecidos** para o navegador ou gerenciador de arquivos utilizado.

## API

O APK é construído com a variável `EXPO_PUBLIC_API_URL`.

Na execução automática desta branch, o valor padrão é `http://localhost:3333`. Esse endereço só alcança uma API rodando no próprio aparelho ou redirecionada por ADB.

Para uso funcional em outro dispositivo, gere o APK informando uma URL de API acessível pelo celular, por exemplo uma API publicada em HTTPS ou o endereço IP do computador na mesma rede Wi-Fi.
