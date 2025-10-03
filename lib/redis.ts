import Redis from "ioredis";
import { CONFIG } from "./CONFIG";

declare global {
    var redis: Redis | undefined;
}

if (!global.redis) {
    global.redis = new Redis({
        host: CONFIG.REDIS_HOST,
        port: CONFIG.REDIS_PORT,
        enableReadyCheck: false,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
    });
    
    // Handle Redis connection errors gracefully
    global.redis.on('error', (err) => {
        console.warn('Redis connection error (rate limiting disabled):', err.message);
    });
    
    global.redis.on('connect', () => {
        console.log('Redis connected successfully');
    });
}

export default global.redis;