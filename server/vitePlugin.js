// server/vitePlugin.js
import fs from 'fs';
import path from 'path';
import { getWalletChogs, getChogMetadata, handleImageProxy, refreshOwnerMap, MONAD_CONFIG } from './chogService.js';
import { convertChogToPixelSprite, PIPELINE_VERSION } from './pixelConverter.js';
import { getUnmappedTraitsReport } from './unmappedTraits.js';

export function chogApiPlugin() {
  return {
    name: 'vite-plugin-chog-api',
    configureServer(server) {
      // Warm up owner map asynchronously on server boot
      setTimeout(() => {
        refreshOwnerMap().catch(console.error);
      }, 500);

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost');
        const pathname = url.pathname;

        // Health endpoint
        if (pathname === '/api/health') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            status: 'ok',
            network: MONAD_CONFIG.name,
            chainId: MONAD_CONFIG.chainId,
            contract: MONAD_CONFIG.nftContract,
            timestamp: Date.now(),
          }));
          return;
        }

        // Image proxy
        if (pathname === '/api/image-proxy') {
          await handleImageProxy(req.url, res);
          return;
        }

        // Auto-Pixel Sprite API: /api/chog/:tokenId/sprite
        const spriteMatch = pathname.match(/^\/api\/chog\/(\d+)\/sprite$/);
        if (spriteMatch) {
          try {
            const tokenId = parseInt(spriteMatch[1], 10);
            if (tokenId < 1 || tokenId > MONAD_CONFIG.totalSupply) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: `Token ID must be between 1 and ${MONAD_CONFIG.totalSupply}` }));
              return;
            }

            const spriteData = await convertChogToPixelSprite(tokenId);
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
            res.end(JSON.stringify(spriteData));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        // Auto-Pixel Portrait PNG: /api/chog/:tokenId/portrait
        const portraitMatch = pathname.match(/^\/api\/chog\/(\d+)\/portrait$/);
        if (portraitMatch) {
          try {
            const tokenId = parseInt(portraitMatch[1], 10);
            const portraitFile = path.resolve('.cache', 'sprites', `${tokenId}_${PIPELINE_VERSION}_portrait.png`);
            if (fs.existsSync(portraitFile)) {
              const buf = fs.readFileSync(portraitFile);
              res.setHeader('Content-Type', 'image/png');
              res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
              res.end(buf);
              return;
            }

            // Generate if not cached
            await convertChogToPixelSprite(tokenId);
            if (fs.existsSync(portraitFile)) {
              const buf = fs.readFileSync(portraitFile);
              res.setHeader('Content-Type', 'image/png');
              res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
              res.end(buf);
              return;
            }
            res.statusCode = 404;
            res.end('Portrait not found');
          } catch (err) {
            res.statusCode = 500;
            res.end('Portrait error: ' + err.message);
          }
          return;
        }

        // Developer panel: Unmapped traits report
        if (pathname === '/api/admin/unmapped-traits') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(getUnmappedTraitsReport()));
          return;
        }

        // Wallet Chogs discovery: /api/wallet/:address/chogs
        const walletMatch = pathname.match(/^\/api\/wallet\/(0x[a-fA-F0-9]{40})\/chogs$/);
        if (walletMatch) {
          try {
            const address = walletMatch[1];
            const data = await getWalletChogs(address);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        // Single Chog metadata: /api/chog/:tokenId
        const chogMatch = pathname.match(/^\/api\/chog\/(\d+)$/);
        if (chogMatch) {
          try {
            const tokenId = parseInt(chogMatch[1], 10);
            const data = await getChogMetadata(tokenId);
            if (!data) {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Token not found' }));
              return;
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        // Trigger scan manually: POST /api/scan-owners
        if (pathname === '/api/scan-owners' && req.method === 'POST') {
          refreshOwnerMap().catch(console.error);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ status: 'scanning_started' }));
          return;
        }

        next();
      });
    },
  };
}
