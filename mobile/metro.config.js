const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

// Extend Expo's default Metro config so the serializer stays intact, then add
// support for the shared `core/` folder (outside this app) and let it resolve
// dependencies (e.g. @babel/runtime) from this app's node_modules.
const config = getDefaultConfig(__dirname);

config.watchFolders = [path.resolve(__dirname, "../core")];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules")];

module.exports = config;
