# Gabinete+ mobile

Expo/React Native, com roteamento protegido, TanStack Query, Zustand e schemas Zod de packages/shared.

Na raiz do monorepo: preparar .env, instalar dependências, configurar apps/mobile/.env com EXPO_PUBLIC_API_URL e executar `pnpm dev:mobile`. API e PostgreSQL precisam estar disponíveis para os fluxos reais. A URL é pública no bundle e não recebe credenciais/query/fragmento.

- [Operação, instalação e continuidade](../../docs/operacao-e-transicao.md)
- [Login e sessão](../../docs/login-mobile.md)
- [Integração e limites do MVP](../../docs/integracao-mobile-api.md)
- [Demonstração](../../docs/demonstracao.md)
- [Testes mobile](../../docs/testes-mobile.md)
- [Biblioteca de componentes](src/components/README.md)
- [Acessibilidade](../../docs/acessibilidade.md)

`pnpm check` verifica tipos, lint e testes; CI repete testes mobile e integrações. `pnpm --filter @gabinete-plus/mobile export:web` verifica o bundle web. Bundles não comprovam execução em aparelhos.

RF00–RF04 implementados; RF05/RF06 e validação física/visual permanecem pendentes. O script reset-project é legado do scaffold, não procedimento de manutenção deste aplicativo.
