import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Clean dist directory
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true });
}

// Get all dependencies from package.json to mark as external
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const externalDeps = Object.keys(packageJson.dependencies || {});

try {
  // Build main server
  await esbuild.build({
    entryPoints: ['src/server.ts'],
    outfile: 'dist/server.js',
    format: 'esm',
    platform: 'node',
    target: 'node20',
    sourcemap: true,
    bundle: true,
    external: externalDeps,
  });
  
  // Build seed-admin script
  await esbuild.build({
    entryPoints: ['src/scripts/seed-admin.ts'],
    outfile: 'dist/scripts/seed-admin.js',
    format: 'esm',
    platform: 'node',
    target: 'node20',
    sourcemap: true,
    bundle: true,
    external: externalDeps,
  });
  
  console.log('✅ Build complete!');
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}
