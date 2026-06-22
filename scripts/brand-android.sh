#!/bin/bash
# ─── Production Post-Sync Script for Android ───
# Run AFTER: npx cap add android && npx cap sync android
# This script overwrites default Capacitor resources with Buscor branding

set -e

echo "🔧 Applying Buscor production branding to Android..."

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$PROJECT_ROOT/android"

# ─── 1. Copy app icons (overwrite defaults) ───
echo "📱 Copying app icons..."
if [ -d "$PROJECT_ROOT/mobile-resources/android/app/src/main/res" ]; then
  cp -Rf "$PROJECT_ROOT/mobile-resources/android/app/src/main/res/"* "$ANDROID_DIR/app/src/main/res/"
  echo "  ✅ Icons, splash, and resources copied"
fi

# ─── 2. Update version in build.gradle ───
echo "📦 Updating version info..."
BUILD_GRADLE="$ANDROID_DIR/app/build.gradle"
if [ -f "$BUILD_GRADLE" ]; then
  sed -i 's/versionCode [0-9]*/versionCode 6/' "$BUILD_GRADLE"
  sed -i 's/versionName "[^"]*"/versionName "1.0.0"/' "$BUILD_GRADLE"
  echo "  ✅ Version set to 1.0.0 (code 6)"
fi

# ─── 3. Update app name in strings ───
echo "✏️ Setting app name to 'Buscor'..."
STRINGS="$ANDROID_DIR/app/src/main/res/values/strings.xml"
if [ -f "$STRINGS" ]; then
  sed -i 's/<string name="app_name">[^<]*<\/string>/<string name="app_name">Buscor<\/string>/' "$STRINGS"
  echo "  ✅ App name set"
fi

echo ""
echo "🎉 Android production branding applied successfully!"