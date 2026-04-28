export const apps = [
    {
        name: "backend",
        script: "backend/server.mjs",
        watch: false,
        env: {
            NODE_ENV: "development"
        },
        env_production: {
            NODE_ENV: "production"
        }
    },
    {
        name: "ride-worker",
        script: "backend/src/workers/rideMatching.worker.mjs",
        watch: false,
        env: {
            NODE_ENV: "development"
        },
        env_production: {
            NODE_ENV: "production"
        }
    }
];