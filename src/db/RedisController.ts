/*
 * COPYRIGHT (C) BananaCrumbs LLC
 * All Rights Reserved.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES, OR
 * OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 * ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

import {createClient} from "redis";
import {StoredInbox} from "../entity/StoredInbox";

export default class RedisController {
    
    private client = createClient();
    
    public static readonly instance = new RedisController();
    
    public static connected: number;
    
    private constructor() {
        this.client.connect().then(() => {
            console.log("Connected to Redis");
        }).catch(() => {
            console.error(`could not connect to redis!`);
        });
    }
    
    /**
     * Get the amount of emails the server has received so far
     */
    public async getStats(): Promise<number> {
        return parseInt(await this.client.GET("exp-stats") || "0");
    }
    
    /**
     * Increment the statistics
     */
    public async incrementStats(): Promise<void> {
        await this.client.INCR("exp-stats");
    }
    
    /**
     * Get the domains currently on the server
     */
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
    
    public async setIDWebhook(bananacrumbs_id: string, webhook_url: string): Promise<void> {
        await this.client.SET(`exp-webhook-${bananacrumbs_id}`, webhook_url);
    }
    
    public async getIDWebhook(bananacrumbs_id: string): Promise<string | undefined> {
        return await this.client.GET(`exp-webhook-${bananacrumbs_id}`) || undefined;
    }
    
    public async deleteIDWebhook(bananacrumbs_id: string): Promise<void> {
        await this.client.DEL(`exp-webhook-${bananacrumbs_id}`);
    }
    
    public async storeInbox(inbox: StoredInbox): Promise<void> {
        await this.client.SET("exp-inbox-" + inbox.token, JSON.stringify(inbox));
    }
    
    public async deleteInbox(token: string): Promise<boolean> {
        if(!token.match(/[A-Za-z0-9_-]+/))
            return false;
        
        await this.client.DEL("exp-inbox-" + token);
        
        return true;
    }
    
    public async getInbox(token: string): Promise<StoredInbox | undefined> {
        if(!token.match(/[A-Za-z0-9_-]+/))
            return undefined;
        const raw = await this.client.GET("exp-inbox-" + token);
        
        if(!raw) return undefined;
        
        return JSON.parse(raw);
    }
    
    public async getInboxByAddress(address: string): Promise<StoredInbox | undefined> {
        const all_addresses = await this.client.KEYS("exp-inbox-*");
        
        for(let i = 0; i < all_addresses.length; i++){
            const raw = all_addresses[i] as string;
            const stored_inbox: StoredInbox = JSON.parse(raw);
            
            if(stored_inbox.address === address) {
                return stored_inbox;
            }
        }
        
        return undefined;
    }
    
    public async clearTimer(): Promise<string[]> {
        const keys = await this.client.KEYS("exp-inbox-*");
        
        //tokens marked for deletion which have expired
        let marked_for_deletion: string[] = [];
        
        keys.forEach((key) => {
            const data: StoredInbox = JSON.parse(key);
            if(data.expires <= Date.now()) {
                marked_for_deletion.push(data.token);
            }
        });
        
        marked_for_deletion.forEach((token) => {
            this.deleteInbox(token);
        });
        
        return marked_for_deletion;
    }
    
    public async getConnected(): Promise<number> {
        return (await this.client.KEYS("exp-inbox-*")).length;
    }
    
    public getConnectedCached(): number {
        return RedisController.connected;
    }
    
}

//timer to set the connected inboxes
//since this is an expensive endpoint, this number will be cached
//instead of on demand like with v1 of the API.
setInterval(async () => {
    RedisController.connected = await RedisController.instance.getConnected();
}, 10000);

//timer to clear the old inboxes
setInterval(async () => {
    await RedisController.instance.clearTimer();
}, 30000);
