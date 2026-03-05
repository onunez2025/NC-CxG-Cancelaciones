module.exports = {
    apps: [
        {
            name: 'ebm-app',
            script: 'npx',
            args: 'tsx server/index.ts',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'development',
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 3000
            }
        }
    ]
};
