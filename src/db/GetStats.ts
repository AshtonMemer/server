import {createClient} from "redis";

export default class GetStats {
    
    private client = createClient();
    
    public static readonly instance = new GetStats();
    
    private constructor() {
        this.client.connect().then(() => {
            console.log("Connected to Redis");
        });
    }
    
    public async getStats(): Promise<number> {
        return parseInt(await this.client.GET("exp-stats") || "0");
    }
    
    public async incrementStats(): Promise<void> {
        await this.client.INCR("exp-stats");
    }
    
    public async getDomains(): Promise<string[]> {
        const domains = await this.client.GET("exp-domains");
        if(domains) {
            return JSON.parse(domains);
        } else {
            return [];
        }
    }
    
    public async setDomains(domains: string[]): Promise<void> {
        await this.client.SET("exp-domains", JSON.stringify(domains));
    }
    
    public async getRushDomains(): Promise<string[]> {
        const domains = await this.client.GET("exp-rush-domains");
        if(domains) {
            return JSON.parse(domains);
        } else {
            return [];
        }
    }
    
    public async setRushDomains(domains: string[]): Promise<void> {
        await this.client.SET("exp-rush-domains", JSON.stringify(domains));
    }
    
    public async getBannedDomains(): Promise<string[]> {
        const domains = await this.client.GET("exp-banned-domains");
        if(domains) {
            return JSON.parse(domains);
        } else {
            return [];
        }
    }
    
    public async getAllowedIPs(): Promise<string[]> {
        const ips = await this.client.GET("exp-allowed-ips");
        if(ips) {
            return JSON.parse(ips);
        } else {
            return [];
        }
    }
    
}
