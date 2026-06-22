import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const RESOURCES = './mobile-resources';

// ─── Android mipmap sizes ───
const androidMipmap = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

// ─── Android adaptive icon foreground sizes (108dp base) ───
const androidAdaptiveFg = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
};

// ─── Android splash sizes ───
const androidSplash = {
  'drawable-port-mdpi': { w: 480, h: 800 },
  'drawable-port-hdpi': { w: 720, h: 1280 },
  'drawable-port-xhdpi': { w: 960, h: 1600 },
  'drawable-port-xxhdpi': { w: 1440, h: 2560 },
  'drawable-port-xxxhdpi': { w: 1920, h: 3200 },
};

// ─── iOS AppIcon sizes (filename → size) ───
const iosIcons = {
  'icon-20@1x': 20,
  'icon-20@2x': 40,
  'icon-20@3x': 60,
  'icon-29@1x': 29,
  'icon-29@2x': 58,
  'icon-29@3x': 87,
  'icon-40@1x': 40,
  'icon-40@2x': 80,
  'icon-40@3x': 120,
  'icon-60@2x': 120,
  'icon-60@3x': 180,
  'icon-76@1x': 76,
  'icon-76@2x': 152,
  'icon-83.5@2x': 167,
  'icon-1024': 1024,
};

async function resize(input, output, width, height) {
  await sharp(input)
    .resize(width, height, { fit: 'cover', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(output);
  console.log(`  ✅ ${output} (${width}x${height})`);
}

async function createSplash(logoPath, splashPath, outPath, w, h) {
  // Create solid #004C97 background
  const bg = Buffer.from([0x00, 0x4C, 0x97, 0xFF]);
  const bgBuf = await sharp({
    create: { width: w, height: h, channels: 4, background: { r: 0, g: 76, b: 151, alpha: 1 } }
  })
    .png()
    .toBuffer();

  // Resize logo to fit ~25% of height, centered
  const logoH = Math.floor(h * 0.25);
  const logoW = logoH;
  const logoResized = await sharp(logoPath)
    .resize(logoW, logoH, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Composite: background + centered logo
  const x = Math.floor((w - logoW) / 2);
  const y = Math.floor((h - logoH) / 2);

  await sharp(bgBuf)
    .composite([{ input: logoResized, left: x, top: y }])
    .png()
    .toFile(outPath);
  console.log(`  ✅ ${outPath} (${w}x${h})`);
}

async function main() {
  const iconSrc = path.join(RESOURCES, 'icon-1024.png');
  const fgSrc = path.join(RESOURCES, 'icon-foreground-1024.png');

  // ─── 1. Android mipmap icons ───
  console.log('\n📱 Generating Android mipmap icons...');
  const androidBase = path.join(RESOURCES, 'android/app/src/main/res');
  for (const [dir, size] of Object.entries(androidMipmap)) {
    const dirPath = path.join(androidBase, dir);
    fs.mkdirSync(dirPath, { recursive: true });
    await resize(iconSrc, path.join(dirPath, 'ic_launcher.png'), size, size);
    await resize(iconSrc, path.join(dirPath, 'ic_launcher_round.png'), size, size);
  }

  // ─── 2. Android adaptive icon foreground ───
  console.log('\n📱 Generating Android adaptive icon foregrounds...');
  for (const [dir, size] of Object.entries(androidAdaptiveFg)) {
    const dirPath = path.join(androidBase, dir);
    fs.mkdirSync(dirPath, { recursive: true });
    await resize(fgSrc, path.join(dirPath, 'ic_launcher_foreground.png'), size, size);
  }

  // ─── 3. Android splash screens ───
  console.log('\n📱 Generating Android splash screens...');
  for (const [dir, { w, h }] of Object.entries(androidSplash)) {
    const dirPath = path.join(androidBase, dir);
    fs.mkdirSync(dirPath, { recursive: true });
    await createSplash(fgSrc, null, path.join(dirPath, 'splash.png'), w, h);
  }

  // ─── 4. iOS AppIcon ───
  console.log('\n🍎 Generating iOS AppIcon...');
  const iosIconDir = path.join(RESOURCES, 'ios/App/App/Assets.xcassets/AppIcon.appiconset');
  fs.mkdirSync(iosIconDir, { recursive: true });

  const iosEntries = [];
  for (const [name, size] of Object.entries(iosIcons)) {
    const filename = `${name}.png`;
    await resize(iconSrc, path.join(iosIconDir, filename), size, size);
    const scale = name.includes('@') ? parseInt(name.split('@')[1]) : 1;
    const baseSize = Math.floor(size / scale);
    iosEntries.push({
      filename,
      idiom: baseSize === 1024 ? 'ios-marketing' : 'universal',
      platform: baseSize === 1024 ? 'ios' : 'ios',
      size: `${baseSize}x${baseSize}`,
      scale: `${scale}x`,
    });
  }

  // Write Contents.json
  const contentsJson = {
    images: iosEntries,
    info: {
      version: 1,
      author: 'xcode',
    },
  };
  fs.writeFileSync(path.join(iosIconDir, 'Contents.json'), JSON.stringify(contentsJson, null, 2));
  console.log(`  ✅ Contents.json`);

  // ─── 5. iOS Splash ───
  console.log('\n🍎 Generating iOS splash images...');
  const iosSplashDir = path.join(RESOURCES, 'ios/App/App/Assets.xcassets/Splash.imageset');
  fs.mkdirSync(iosSplashDir, { recursive: true });

  const iosSplashSizes = [
    { w: 1242, h: 2688, name: 'splash-iphone-xs-max' },   // iPhone XS Max / 11 Pro Max
    { w: 1125, h: 2436, name: 'splash-iphone-x' },        // iPhone X / XS / 11 Pro
    { w: 828, h: 1792, name: 'splash-iphone-xr' },         // iPhone XR / 11
    { w: 750, h: 1334, name: 'splash-iphone-8' },          // iPhone 8 / 7 / 6s
    { w: 1242, h: 2208, name: 'splash-iphone-8-plus' },    // iPhone 8 Plus / 7 Plus
    { w: 2048, h: 2732, name: 'splash-ipad-pro-12.9' },    // iPad Pro 12.9"
    { w: 1668, h: 2388, name: 'splash-ipad-pro-11' },      // iPad Pro 11"
    { w: 1536, h: 2048, name: 'splash-ipad' },              // iPad
  ];

  for (const { w, h, name } of iosSplashSizes) {
    await createSplash(fgSrc, null, path.join(iosSplashDir, `${name}.png`), w, h);
  }

  // Splash Contents.json
  const splashContents = {
    images: iosSplashSizes.map((s, i) => ({
      filename: `${s.name}.png`,
      idiom: 'universal',
      platform: 'ios',
      scale: '1x',
      size: `${s.w}x${s.h}`,
    })),
    info: { version: 1, author: 'xcode' },
  };
  fs.writeFileSync(path.join(iosSplashDir, 'Contents.json'), JSON.stringify(splashContents, null, 2));
  console.log(`  ✅ Splash Contents.json`);

  console.log('\n🎉 All mobile resources generated successfully!');
}

main().catch(console.error);