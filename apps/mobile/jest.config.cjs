const expoPreset = require('jest-expo/jest-preset');
module.exports = {
  ...expoPreset,
  resolver: require.resolve('react-native/jest/resolver'),
  testEnvironment: require.resolve('react-native/jest/react-native-env'),
  setupFiles: [require.resolve('react-native/jest/setup'), require.resolve('jest-expo/src/preset/setup')],
  testMatch: ['**/src/**/*.test.ts', '**/src/**/*.test.tsx'],
  moduleNameMapper: {
    ...expoPreset.moduleNameMapper,
    '^expo$': '<rootDir>/node_modules/expo',
    '^expo/(.*)$': '<rootDir>/node_modules/expo/$1',
    '^react-native$': '<rootDir>/node_modules/react-native',
    '^react-native/(.*)$': '<rootDir>/node_modules/react-native/$1',
    '^@/(.*)$': '<rootDir>/$1',
    '^@gabinete-plus/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transformIgnorePatterns: ['node_modules/(?!(?:\\.pnpm|(?:jest-)?react-native(?:-.*)?|@react-native(?:-community)?|expo(?:-.*)?|@expo(?:/.*)?|@tanstack/.*|zustand|zod|react-hook-form|@hookform/.*|@react-navigation/.*)(?:/|$))'],
};
