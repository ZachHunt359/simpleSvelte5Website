module.exports = {
  apps: [
    {
      name: 'paranoid-comic-prod',
      script: 'build/index.js',
  cwd: '/home/deploy/simpleSvelte5Website',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        BODY_SIZE_LIMIT: '100M',
        DOTENV_CONFIG_PATH: '/home/deploy/simpleSvelte5Website/.env.production',
        PROJECT_ROOT: '/home/deploy/simpleSvelte5Website'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        BODY_SIZE_LIMIT: '100M',
        DOTENV_CONFIG_PATH: '/home/deploy/simpleSvelte5Website/.env.production'
      },
      env_file: '/home/deploy/simpleSvelte5Website/.env.production',
      error_file: '/home/deploy/simpleSvelte5Website/build/logs/pm2-prod-error.log',
      out_file: '/home/deploy/simpleSvelte5Website/build/logs/pm2-prod-out.log',
      log_file: '/home/deploy/simpleSvelte5Website/build/logs/pm2-prod-combined.log',
      time: true
    },
    {
      name: 'paranoid-comic-staging',
      script: 'build/index.js',
  cwd: '/home/deploy/simpleSvelte5Website',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        BODY_SIZE_LIMIT: '100M',
        PORT: 3001,
        DOTENV_CONFIG_PATH: '/home/deploy/simpleSvelte5Website/.env.staging',
        PROJECT_ROOT: '/home/deploy/simpleSvelte5Website'
      },
      env_staging: {
        NODE_ENV: 'staging',
        BODY_SIZE_LIMIT: '100M',
        PORT: 3001,
        DOTENV_CONFIG_PATH: '/home/deploy/simpleSvelte5Website/.env.staging'
      },
      env_file: '/home/deploy/simpleSvelte5Website/.env.staging',
      error_file: '/home/deploy/simpleSvelte5Website/build/logs/pm2-staging-error.log',
      out_file: '/home/deploy/simpleSvelte5Website/build/logs/pm2-staging-out.log',
      log_file: '/home/deploy/simpleSvelte5Website/build/logs/pm2-staging-combined.log',
      time: true
    }
  ]
};