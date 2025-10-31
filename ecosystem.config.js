module.exports = {
  apps: [
    {
      name: 'paranoid-comic-prod',
      script: 'build/index.js',
      cwd: '/home/deploy/simpleSvelte5Website/simplesvelte5app',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      node_args: '-r dotenv/config',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DOTENV_CONFIG_PATH: '/home/deploy/simpleSvelte5Website/simplesvelte5app/.env.production'
      },
      error_file: '/home/deploy/simpleSvelte5Website/simplesvelte5app/build/logs/pm2-prod-error.log',
      out_file: '/home/deploy/simpleSvelte5Website/simplesvelte5app/build/logs/pm2-prod-out.log',
      log_file: '/home/deploy/simpleSvelte5Website/simplesvelte5app/build/logs/pm2-prod-combined.log',
      time: true
    },
    {
      name: 'paranoid-comic-staging',
      script: 'build/index.js',
      cwd: '/home/deploy/simpleSvelte5Website/simplesvelte5app',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      node_args: '-r dotenv/config',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        DOTENV_CONFIG_PATH: '/home/deploy/simpleSvelte5Website/simplesvelte5app/.env.staging'
      },
      error_file: '/home/deploy/simpleSvelte5Website/simplesvelte5app/build/logs/pm2-staging-error.log',
      out_file: '/home/deploy/simpleSvelte5Website/simplesvelte5app/build/logs/pm2-staging-out.log',
      log_file: '/home/deploy/simpleSvelte5Website/simplesvelte5app/build/logs/pm2-staging-combined.log',
      time: true
    }
  ]
};