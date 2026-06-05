/**
 * PM2 ecosystem for the Warp License admin dashboard.
 *
 * Prerequisites:
 *   1. Copy .env.example → .env.local (DATABASE_URL, ADMIN_KEY, SESSION_SECRET)
 *   2. npm run db:migrate
 *   3. npm install && npm run build
 *
 * Usage (from frontend/):
 *   pm2 start ecosystem.config.cjs
 *   npm run pm2:logs
 *   npm run pm2:restart
 */
module.exports = {
  apps: [
    {
      name: "warp-license-admin",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start --port 5155",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      // max_memory_restart: "512M",
      // merge_logs: true,
      // time: true,
      env: {
        NODE_ENV: "production",
        PORT: 5155,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 5155,
      },
    },
  ],
};
