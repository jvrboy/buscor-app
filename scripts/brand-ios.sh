#!/bin/bash
# ─── Production Post-Sync Script for iOS ───
# Run AFTER: npx cap add ios && npx cap sync ios
# This script overwrites default Capacitor resources with Buscor branding

set -e

echo "🔧 Applying Buscor production branding to iOS..."

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IOS_DIR="$PROJECT_ROOT/ios/App"

# ─── 1. Copy app icons ───
echo "📱 Copying app icons..."
ICON_SRC="$PROJECT_ROOT/mobile-resources/ios/App/App/Assets.xcassets/AppIcon.appiconset"
ICON_DST="$IOS_DIR/App/Assets.xcassets/AppIcon.appiconset"
if [ -d "$ICON_SRC" ]; then
  rm -rf "$ICON_DST"
  cp -R "$ICON_SRC" "$ICON_DST"
  echo "  ✅ AppIcon assets copied"
fi

# ─── 2. Copy splash images ───
echo "🌊 Copying splash images..."
SPLASH_SRC="$PROJECT_ROOT/mobile-resources/ios/App/App/Assets.xcassets/Splash.imageset"
SPLASH_DST="$IOS_DIR/App/Assets.xcassets/Splash.imageset"
if [ -d "$SPLASH_SRC" ]; then
  rm -rf "$SPLASH_DST"
  cp -R "$SPLASH_SRC" "$SPLASH_DST"
  echo "  ✅ Splash assets copied"
fi

# ─── 3. Copy LaunchScreen.storyboard ───
echo "🎯 Updating LaunchScreen..."
STORYBOARD_SRC="$PROJECT_ROOT/mobile-resources/ios/App/Base.lproj/LaunchScreen.storyboard"
STORYBOARD_DST="$IOS_DIR/Base.lproj/LaunchScreen.storyboard"
if [ -f "$STORYBOARD_SRC" ]; then
  cp -f "$STORYBOARD_SRC" "$STORYBOARD_DST"
  echo "  ✅ LaunchScreen.storyboard copied"
fi

# ─── 4. Set app display name and version in Info.plist ───
echo "📦 Updating Info.plist..."
PLIST="$IOS_DIR/Info.plist"
if [ -f "$PLIST" ]; then
  /usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName Buscor" "$PLIST" 2>/dev/null || \
    /usr/libexec/PlistBuddy -c "Add :CFBundleDisplayName string Buscor" "$PLIST"
  
  /usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString 1.0.0" "$PLIST" 2>/dev/null || \
    /usr/libexec/PlistBuddy -c "Add :CFBundleShortVersionString string 1.0.0" "$PLIST"
  
  /usr/libexec/PlistBuddy -c "Set :CFBundleVersion 6" "$PLIST" 2>/dev/null || \
    /usr/libexec/PlistBuddy -c "Add :CFBundleVersion string 6" "$PLIST"
  
  /usr/libexec/PlistBuddy -c "Set :UIStatusBarStyle UIStatusBarStyleLightContent" "$PLIST" 2>/dev/null || \
    /usr/libexec/PlistBuddy -c "Add :UIStatusBarStyle string UIStatusBarStyleLightContent" "$PLIST"
  
  echo "  ✅ Info.plist updated (v1.0.0, build 6)"
fi

# ─── 5. Update project.pbxproj for version and branding ───
echo "🔧 Updating Xcode project settings..."
PBXPROJ="$IOS_DIR/App.xcodeproj/project.pbxproj"
if [ -f "$PBXPROJ" ]; then
  sed -i '' 's/MARKETING_VERSION = [^;]*/MARKETING_VERSION = 1.0.0/g' "$PBXPROJ"
  sed -i '' 's/CURRENT_PROJECT_VERSION = [^;]*/CURRENT_PROJECT_VERSION = 6/g' "$PBXPROJ"
  sed -i '' 's/PRODUCT_BUNDLE_IDENTIFIER = [^;]*/PRODUCT_BUNDLE_IDENTIFIER = za.co.buscor.app/g' "$PBXPROJ"
  sed -i '' 's/PRODUCT_NAME = [^;]*/PRODUCT_NAME = Buscor/g' "$PBXPROJ"
  echo "  ✅ Xcode project settings updated"
fi

echo ""
echo "🎉 iOS production branding applied successfully!"