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
import {DeleteCustomWebhookRedisResponseType} from "../entity/DeleteCustomWebhookRedisResponseType";
import domainRegex from "../static/domainRegex";
import {createHash} from "crypto";

export default class RedisController {
    
    //redis instance
    private client = createClient();
    
    //redis controller instance
    public static readonly instance = new RedisController();
    
    //cached amount of connected users
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
    
    /**
     * Get the current community domains on the server
     */
    public async getCommunityDomains(): Promise<string[]> {
        const domains = await this.client.GET("exp-rush-domains");
        if(domains) {
            return JSON.parse(domains);
        } else {
            return [];
        }
    }
    
    /**
     * Set the current community domains
     * @param domains {string[]} a string array of domains
     */
    public async setCommunityDomains(domains: string[]): Promise<void> {
        await this.client.SET("exp-rush-domains", JSON.stringify(domains));
    }
    
    /**
     * Get a list of banned domains.
     * 
     * While not used, this is in the case of a bad actor adding
     * domains to intentionally hurt the website, or to avoid
     * the banned words list (for example, if someone added
     * g00gle.com, I would need to manually ban this since this
     * would still be considered trademark infringement).
     * 
     * @returns {string[]}
     */
    public async getBannedDomains(): Promise<string[]> {
        const domains = await this.client.GET("exp-banned-domains");
        if(domains) {
            return JSON.parse(domains);
        } else {
            return [];
        }
    }
    
    /**
     * Get the allowed IP addresses for community domains
     * @returns {string[]}
     */
    public async getAllowedIPs(): Promise<string[]> {
        const ips = await this.client.GET("exp-allowed-ips");
        if(ips) {
            return JSON.parse(ips);
        } else {
            return [];
        }
    }
    
    /**
     * Set a user's account webhook
     * @param bananacrumbs_id {string} User's BananaCrumbs ID
     * @param webhook_url {string} User's webhook URL
     */
    public async setIDWebhook(bananacrumbs_id: string, webhook_url: string): Promise<void> {
        await this.client.SET(`exp-webhook-${bananacrumbs_id}`, webhook_url);
    }
    
    /**
     * Get the webhook from a user's BananaCrumbs ID
     * @param bananacrumbs_id {string} User's BananaCrumbs ID
     * 
     * @returns {string | undefined} the webhook URL, or undefined if there is none
     */
    public async getIDWebhook(bananacrumbs_id: string): Promise<string | undefined> {
        return await this.client.GET(`exp-webhook-${bananacrumbs_id}`) || undefined;
    }
    
    /**
     * Delete a user's webhook ID
     * @param bananacrumbs_id {string} The user's BananaCrumbs ID
     * @returns {void}
     */
    public async deleteIDWebhook(bananacrumbs_id: string): Promise<void> {
        await this.client.DEL(`exp-webhook-${bananacrumbs_id}`);
    }
    
    /**
     * Store an inbox into Redis
     * @param inbox {StoredInbox} the stored inbox object
     * @returns {void}
     */
    public async storeInbox(inbox: StoredInbox): Promise<void> {
        await this.client.SET("exp-inbox-" + inbox.token, JSON.stringify(inbox));
    }
    
    /**
     * Delete an inbox by its token
     * @param token {string} the inbox token
     * @returns {boolean} true if it was deleted, false if the token does not match
     */
    public async deleteInbox(token: string): Promise<boolean> {
        if(!token.match(/[A-Za-z0-9_-]+/))
            return false;
        
        await this.client.DEL("exp-inbox-" + token);
        
        return true;
    }
    
    /**
     * Get an inbox by its token
     * @param token {string} the inbox token
     * @returns {StoredInbox | undefined} the inbox, or undefined if there was no inbox
     */
    public async getInbox(token: string): Promise<StoredInbox | undefined> {
        if(!token.match(/[A-Za-z0-9_-]+/))
            return undefined;
        const raw = await this.client.GET("exp-inbox-" + token);
        
        if(!raw) return undefined;
        
        return JSON.parse(raw);
    }
    
    /**
     * Get an inbox by its address
     * @param address {string} the inbox address
     * @returns {StoredInbox | undefined} the inbox or undefined if it does not exist
     */
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
    
    /**
     * Clear timer.
     * This deletes all inboxes which are older than their expiration time.
     * 
     * @returns {string[]} addresses which were deleted
     */
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
    
    /**
     * Get the number of active inboxes
     */
    public async getConnected(): Promise<number> {
        return (await this.client.KEYS("exp-inbox-*")).length;
    }
    
    /**
     * Get the cached amount of connected users.
     * 
     * Since this may be an expensive operation,
     * this value is stored in this program's memory,
     * so it is not cycling through every time someone
     * requests for the website stats.
     */
    public getConnectedCached(): number {
        return RedisController.connected;
    }
    
    /**
     * Get the Custom Webhook Owner as a BananaCrumbs ID Hash
     * @param domain
     */
    public async getCustomWebhookOwner(domain: string): Promise<"did_not_exist" | string> {
        const hash = createHash("SHA512").update(domain).digest().toString("hex");
        const record = await this.client.GET("exp-domain-" + hash);
        
        if(!record) {
            return "did_not_exist";
        }
        
        return record;
    }
    
    /**
     * Delete a custom domain webhook
     * @param domain {string} the domain
     * @param bananacrumbs_id {string} the user's BananaCrumbs ID
     * @returns {DeleteCustomWebhookRedisResponseType}
     */
    public async deleteCustomWebhook(domain: string, bananacrumbs_id: string): Promise<DeleteCustomWebhookRedisResponseType> {
        if(!domainRegex.test(domain)) {
            return DeleteCustomWebhookRedisResponseType.INVALID_DOMAIN_REGEX;
        }
        
        const hash = createHash("SHA512").update(domain).digest().toString("hex");
        
        const record = await this.client.GET("exp-domain-" + hash);
        
        if(!record) {
            return DeleteCustomWebhookRedisResponseType.DID_NOT_EXIST;
        }
        
        if(record !== bananacrumbs_id) {
            return DeleteCustomWebhookRedisResponseType.INVALID_BANANACRUMBS_ID;
        }
        
        await this.client.DEL("exp-domain-" + hash);
        await this.client.DECR("exp-custom-domain-webhooks-" + bananacrumbs_id);
        
        return DeleteCustomWebhookRedisResponseType.SUCCESS;
    }
    
    /**
     * Get the amount of webhooks a user has on his/her account.
     * 
     * @param bananacrumbs_id {string} the BananaCrumbs ID of the user
     * @returns {number | false} the number, or false if it is not in the database
     */
    public async getCustomDomainWebhookCount(bananacrumbs_id: string): Promise<number | false> {
        if(!bananacrumbs_id.match(/[0-9]{24}/)) {
            return false;
        }
        
        const whs = await this.client.GET("exp-custom-domain-webhooks-" + bananacrumbs_id);
        
        if(!whs) {
            return false;
        }
        
        return Number(whs);
    }
    
    /**
     * Set a Custom Webhook for a domain
     * 
     * This assumes that the domain ownership has already been verified.
     * @param domain {string} the domain to set
     * @param bananacrumbs_id {string} the BananaCrumbs ID of the domain
     */
    public async setCustomWebhook(domain: string, bananacrumbs_id: string): Promise<boolean> {
        if(!domainRegex.test(domain)) {
            return false; //invalid domain
        }
        
        const hash = createHash("SHA512").update(domain).digest().toString("hex");
        
        //if the record already exists, overwrite it
        await this.client.SET("exp-domain-" + hash, bananacrumbs_id);
        await this.client.INCR("exp-custom-domain-webhooks-" + bananacrumbs_id);
        
        return true;
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
