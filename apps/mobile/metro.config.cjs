const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
const source = path.join(__dirname, 'src') + path.sep;

// Source modules shared with Node integration tests use ESM .js specifiers.
// Metro resolves their TypeScript source; installed packages keep the default resolver.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (context.originModulePath.startsWith(source) && moduleName.startsWith('.') && moduleName.endsWith('.js')) {
    try { return context.resolveRequest(context, moduleName, platform); }
    catch { return context.resolveRequest(context, moduleName.slice(0, -3), platform); }
  }
  return context.resolveRequest(context, moduleName, platform);
};
module.exports = config;
