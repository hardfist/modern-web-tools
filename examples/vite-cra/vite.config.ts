import { defineConfig, Plugin, ResolvedConfig } from 'vite';
import { viteEsbuildBundlePlugin } from './plugins/esbuild-bundle';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    minify: false
  },
  plugins: [process.env.VITE_ESBUILD_BUNDLE && viteEsbuildBundlePlugin()]
});
