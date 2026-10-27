// Signs release APKs with the shop's own key when CI provides it, through
// these environment variables (GitHub secrets, never committed):
//   STIX_KEYSTORE_FILE, STIX_KEYSTORE_PASSWORD, STIX_KEY_ALIAS, STIX_KEY_PASSWORD
// Without them the release APK is signed with the debug key: fine for
// testing, but the shop's key must sign anything customers install, or
// updates won't install over it.
const { withAppBuildGradle } = require("expo/config-plugins");

const RELEASE_CONFIG = `
        release {
            if (System.getenv("STIX_KEYSTORE_FILE")) {
                storeFile file(System.getenv("STIX_KEYSTORE_FILE"))
                storePassword System.getenv("STIX_KEYSTORE_PASSWORD")
                keyAlias System.getenv("STIX_KEY_ALIAS")
                keyPassword System.getenv("STIX_KEY_PASSWORD")
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes("STIX_KEYSTORE_FILE")) return cfg;
    const debugBlock = /(signingConfigs\s*\{\s*debug\s*\{[^}]*\})/;
    if (!debugBlock.test(src)) throw new Error("with-release-signing: signingConfigs.debug not found in app/build.gradle");
    src = src.replace(debugBlock, `$1${RELEASE_CONFIG}`);
    const releaseUse = /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/;
    if (!releaseUse.test(src)) throw new Error("with-release-signing: release signingConfig not found in app/build.gradle");
    src = src.replace(releaseUse, `$1signingConfig System.getenv("STIX_KEYSTORE_FILE") ? signingConfigs.release : signingConfigs.debug`);
    cfg.modResults.contents = src;
    return cfg;
  });
};
