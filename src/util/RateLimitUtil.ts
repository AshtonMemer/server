
export default class RateLimitUtil {
    
    private constructor() {}
    
    public static readonly RATE_LIMITS: Map<string, number> = new Map();
    
    public static checkRateLimit(ip: string): boolean {
        const last_access = RateLimitUtil.RATE_LIMITS.get(ip);
        
        if(last_access) {
            if(Date.now() - last_access < 5000) {
                return true;
            }
        }
        
        RateLimitUtil.RATE_LIMITS.set(ip, Date.now());
        
        return false;
    }
    
}

setInterval(() => {
    RateLimitUtil.RATE_LIMITS.clear();
}, 300000);
