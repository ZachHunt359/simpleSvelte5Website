/**
 * PM2 ecosystem sample (no secrets). Copy to ecosystem.config.cjs on the server
 * and set real values via environment variables or a secure secrets store.
 *
 * Usage on server:
 *   cp ecosystem.config.sample.cjs ecosystem.config.cjs
 *   # export envs in shell or via a separate env file NOT tracked in git
 *   pm2 start ecosystem.config.cjs --update-env
 */

module.exports = {
  apps: [
    {
      name: 'simplesvelte5app',
      script: './build/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        // Do NOT hardcode secrets here; PM2 will merge shell env when using --update-env
        // SITE_ORIGIN: process.env.SITE_ORIGIN,
        // DATABASE_URL: process.env.DATABASE_URL,
        // SMTP_HOST: process.env.SMTP_HOST,
        // SMTP_PORT: process.env.SMTP_PORT,
        // SMTP_USER: process.env.SMTP_USER,
        // SMTP_PASS: process.env.SMTP_PASS,
        // SMTP_FROM: process.env.SMTP_FROM,
      }
    }
  ]
};
