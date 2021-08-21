import { defineConfig, Plugin, ResolvedConfig } from 'vite';
import { build } from 'esbuild';
import path from 'path';
import { injectToHead } from './utils/html';
export const externalRE = /^(https?:)?\/\//;
export const isExternalUrl = (url: string): boolean => externalRE.test(url);
function toPublicPath(filename: string, config: ResolvedConfig) {
  return isExternalUrl(filename) ? filename : config.base + filename;
}

export function viteEsbuildBundlePlugin(): Plugin {
  let config: ResolvedConfig;
  let facadeChunks = [];
  return {
    name: 'vite:esbuild',
    enforce: 'pre',
    config(cfg) {
      return {
        build: {
          cssCodeSplit: false,
          commonjsOptions: {
            include: ['']
          }
        }
      };
    },
    configResolved(cfg) {
      config = cfg;
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
    async generateBundle(options, chunkMap) {
      const entryPoints = {};

      for (const [file, chunk] of Object.entries(chunkMap)) {
        if (file.endsWith('.js') && chunk.type === 'chunk') {
          entryPoints[path.resolve(config.root, file)] = chunk;
          if (chunk.isEntry) {
            facadeChunks.push(file);
          }
        }
      }
      const context = this;
      const result = await build({
        entryPoints: Object.keys(entryPoints),
        write: false,
        absWorkingDir: __dirname,
        bundle: true,
        outdir: '/assets',
        format: 'esm',
        allowOverwrite: true,
        splitting: true,
        plugins: [
          {
            name: 'memfs',
            setup(build) {
              build.onResolve({ filter: /.*/ }, async (args) => {
                const realPath = path.resolve(args.resolveDir, args.path);
                if (entryPoints[realPath]) {
                  return {
                    path: realPath
                  };
                } else {
                  const result = await context.resolve(args.path, args.importer, {
                    skipSelf: true
                  });
                  return {
                    path: result.id
                  };
                }
              });
              build.onLoad({ filter: /.*/ }, (args) => {
                const res = entryPoints[args.path];
                if (res) {
                  return {
                    contents: entryPoints[args.path].code,
                    resolveDir: path.dirname(args.path)
                  };
                }
              });
            }
          }
        ]
      });
      for (const output of result.outputFiles) {
        const fileName = path.relative('/', output.path);
        console.log('fileName:', fileName);
        /**
         * rollup not support emitChunk in generate bundle,which is hard to deal with
         * so we have to use transformIndexHtml to handle script injection
         */
        this.emitFile({
          type: 'asset',
          fileName: fileName,
          source: output.text
        });
      }
    },
    async transformIndexHtml(html) {
      const assetTags = [
        // js entry chunk for this page
        {
          tag: 'script',
          attrs: {
            type: 'module',
            crossorigin: true,
            src: toPublicPath(facadeChunks[0], config)
          }
        }
      ];
      return injectToHead(html, assetTags);
    }
  } as Plugin;
}
