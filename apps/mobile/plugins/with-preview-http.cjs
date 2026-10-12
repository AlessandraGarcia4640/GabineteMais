const { withAndroidManifest } = require('expo/config-plugins');
module.exports = function withPreviewHttp(config) {
  return withAndroidManifest(config, (next) => {
    const application = next.modResults.manifest.application?.[0];
    if (!application) throw new Error('Aplicação Android ausente.');
    application.$['android:usesCleartextTraffic'] = process.env.EXPO_PREVIEW_ALLOW_HTTP === 'true' ? 'true' : 'false';
    return next;
  });
};
