import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [{
    name: 'page-trailing-slashes',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        if (url.pathname === '/overlay' || url.pathname === '/capture') {
          res.writeHead(302, { Location: `${url.pathname}/${url.search}` });
          res.end();
          return;
        }
        next();
      });
    },
  }],
  server: {
    host: '127.0.0.1', port: 5173, strictPort: true,
    fs: { deny: ['**/.env', '**/.env.*', '**/tokens.json*', '**/.git/**'] },
  },
});
