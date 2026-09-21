import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/**
 * Minimal local proxy with 3s in-memory caching to access Kalshi's public
 * prediction market data and Coinbase live crypto market data safely without CORS.
 */
function marketDataProxyPlugin(): Plugin {
  const cache = new Map<
    string,
    { body: string; status: number; time: number }
  >();
  const CACHE_TTL_MS = 2500;

  return {
    name: 'market-data-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        let targetUrl: string | null = null;

        if (req.url?.startsWith('/api/kalshi')) {
          const subpath = req.url.replace(/^\/api\/kalshi/, '');
          targetUrl = `https://api.elections.kalshi.com/trade-api/v2${subpath}`;
        } else if (req.url?.startsWith('/api/coinbase')) {
          const subpath = req.url.replace(/^\/api\/coinbase/, '');
          targetUrl = `https://api.exchange.coinbase.com${subpath}`;
        }

        if (!targetUrl) {
          return next();
        }

        const now = Date.now();
        const cached = cache.get(targetUrl);
        if (cached && now - cached.time < CACHE_TTL_MS) {
          res.statusCode = cached.status;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('X-Cache-Status', 'HIT');
          res.end(cached.body);
          return;
        }

        try {
          const resp = await fetch(targetUrl, {
            headers: {
              'User-Agent': 'AgentTradingOS/1.0',
              Accept: 'application/json',
            },
          });
          const text = await resp.text();
          if (resp.ok) {
            cache.set(targetUrl, {
              body: text,
              status: resp.status,
              time: now,
            });
          }
          res.statusCode = resp.status;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('X-Cache-Status', 'MISS');
          res.end(text);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Network error';
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              error: {
                code: 'bad_gateway',
                message,
              },
            }),
          );
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), marketDataProxyPlugin()],
});
