const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Allow .wasm files (needed by expo-sqlite on web)
config.resolver.assetExts.push('wasm');

// Prefer .web.ts/.web.tsx over .ts/.tsx on web platform
// (Expo handles this automatically via sourceExts priority)

// Stubs for native-only modules that have no web equivalent
const STUBS = path.resolve(__dirname, 'stubs');
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'expo-camera':          path.join(STUBS, 'expo-camera.js'),
  'expo-image-picker':    path.join(STUBS, 'expo-image-picker.js'),
  'expo-document-picker': path.join(STUBS, 'expo-document-picker.js'),
  'expo-file-system':     path.join(STUBS, 'expo-file-system.js'),
  'expo-notifications':   path.join(STUBS, 'expo-notifications.js'),
};

module.exports = config;
