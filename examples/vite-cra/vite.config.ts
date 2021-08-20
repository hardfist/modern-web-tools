import { defineConfig } from 'vite';
import reactRefresh from '@vitejs/plugin-react-refresh';
import { build } from 'esbuild';
// https://vitejs.dev/config/
export default defineConfig({
  build: {
    minify: false
  },
  plugins: [
    process.env.VITE_ESBUILD_BUNDLE && {
      name: 'vite:esbuild',
      enforce: 'pre',
      config(cfg) {
        return {
          build: {
            commonjsOptions: {
              include: ['']
            }
          }
        };
      },
      configResolved(cfg) {
        console.log('cjs:', cfg.build.commonjsOptions);
      },
      async resolveId(source, importer) {
        const realId = await this.resolve(source, importer, {
          skipSelf: true
        });
        if (realId?.id.includes('node_modules')) {
          return {
            id: source,
            external: true
          };
        }
        return undefined;
      },
      async renderChunk(code, chunk) {
        if (chunk.fileName.endsWith('.js')) {
          const result = await build({
            stdin: {
              contents: code,
              loader: 'js',
              resolveDir: __dirname
            },
            write: false,
            absWorkingDir: __dirname,
            bundle: true
          });
          return {
            code: result.outputFiles[0].text
          };
        }
      }
    }
  ]
});
