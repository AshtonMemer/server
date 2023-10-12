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

import Inbox from "../entity/Inbox";
import Config from "../Config";
import {createHash, randomBytes} from "crypto";
import Email from "../entity/Email";
import * as dns from "dns";
import {PremiumTier} from "../entity/PremiumTier";
import RedisController from "../db/RedisController";
import webhookSender from "./webhookSender";
import {StoredInbox} from "../entity/StoredInbox";
import BananaCrumbsUtils from "./BananaCrumbsUtils";

export default class EmailStorage {
    
    private constructor() {}
    
    private static received_emails: Map<string, Email[]> = new Map();
    
    public static customs: Map<string, Email[]> = new Map();
    
    /**
     * Generate a new email address.
     * @returns {Inbox} the inbox.
     */
    public static generateAddress(domain: string | undefined, premium: PremiumTier, account_id: string | undefined, account_token: string | undefined, prefix: string | undefined = undefined): Inbox {
        
        if(!domain) {
            domain = this.getRandomDomain();
        }
        
        if(prefix && prefix.length > 12) {
            prefix = undefined;
        }
        
        
        //if the domain does not exist
        if(!Config.EMAIL_DOMAINS.includes(domain)) {
            if(!Config.COMMUNITY_DOMAINS.includes(domain)) {
                throw new Error("Invalid domain");
            }
        }
        
        //generate a few random base36 characters for the prefix
        const first = randomBytes(3).toString("hex");
        
        const last = Math.floor(Date.now() / 1000).toString(16);
        
        //generate the full address with the prefix if it exists
        const address_full = `${prefix || first}${last}@${domain}`.toLowerCase();
        
        let expiration_multiplier = 1;
        
        //emails have a max expiration of 1 hour for free accounts,
        if(premium === PremiumTier.TEMPMAIL_PLUS) { //10 hours for TMP
            expiration_multiplier = 10;
        } else if(premium === PremiumTier.TEMPMAIL_ULTRA) { //and 30 for TMU
            expiration_multiplier = 30;
        }
        
        const inbox = new Inbox(
            address_full,
            randomBytes(64).toString("base64url"),
            (Date.now() + (3600 * 1000) * expiration_multiplier),
            [],
            premium,
            account_id,
            account_token,
        );
        
        (async () => {
            
            let webhook: string | undefined;
            
            if(account_id)
                webhook = await RedisController.instance.getIDWebhook(account_id);
            
            if(premium !== PremiumTier.TEMPMAIL_ULTRA)
                webhook = undefined;
            
            const stored_inbox: StoredInbox = {
                premium,
                webhook: webhook ? webhook : undefined,
                address: inbox.address,
                expires: inbox.expiration,
                token: inbox.token,
                last_access_time: Date.now(),
            };
            
            console.log(`storing`);
            
            await RedisController.instance.storeInbox(stored_inbox);
        })();
        
        return inbox;
    }
    
    /**
     * Get the emails in an inbox.
     * 
     * @param token {string} the token of the inbox.
     * @returns {Email[] | undefined} the emails, or undefined if the inbox does not exist (or has expired).
     */
    public static async getInbox(token: string): Promise<Email[] | undefined> {
        const emails = this.received_emails.get(token);
        let exists = false;
        
        if((await (RedisController.instance.getInbox(token)))?.address) {
            exists = true;
            // await RedisController.instance.setLastAccessTime(token);
        }
        
        //existing addresses may not be in the received_emails map.
        //This is because they are not stored there until an email is received.
        if(exists) {
            this.received_emails.delete(token);
            
            if(!emails || emails.length === 0) {
                return [];
            } else {
                return emails;
            }
        } else {
            console.log(`j`)
            return undefined;
        }
    }
    
    /**
     * Get a random email domain.
     * @returns {string} the domain.
     * @private
     */
    public static getRandomDomain(): string {
        //get a random domain from the Config.EMAIL_DOMAINS array
        return Config.EMAIL_DOMAINS[Math.floor(Math.random() * Config.EMAIL_DOMAINS.length)] || "theeyeoftruth.com";
    }
    
    /**
     * Get a random community email domain.
     * @returns {string} the domain.
     * @private
     */
    public static getRandomCommunityDomain(): string {
        if(Config.COMMUNITY_DOMAINS.length === 0) {
            //if there are no rush domains, just return a random domain
            return this.getRandomDomain();
        }
        
        return Config.COMMUNITY_DOMAINS[Math.floor(Math.random() * Config.COMMUNITY_DOMAINS.length)] as string;
    }
    
    /**
     * On an email received.
     * @param email {Email} the email.
     */
    public static async addEmail(email: Email) {
        const inbox = await RedisController.instance.getInboxByAddress(email.to);
        
        if(inbox) {
            if(inbox.webhook) {
                return webhookSender(inbox.webhook, [email]);
            }
            
            if(!this.received_emails.has(inbox.token)) {
                this.received_emails.set(inbox.token, []);
            }
            
            this.received_emails.get(inbox.token)?.push(email);
        } else {
            
            const domain = email.to.split("@")[1] || "";
            
            //check for custom domain
            if(Config.EMAIL_DOMAINS.includes(domain) || Config.COMMUNITY_DOMAINS.includes(domain)) {
                //invalid or expired
                return;
            }
            
            //check if the domain has a webhook associated with it.
            //if it does, return true so this email will not be put
            //into the customs map.
            async function checkWebhook(): Promise<boolean> {
                try {
                    const bcid = await RedisController.instance.getCustomWebhookOwner(domain);
                    
                    if(bcid === "did_not_exist") {
                        return false;
                    }
                    
                    const webhook = await RedisController.instance.getIDWebhook(bcid)
                    
                    if(webhook) {
                        
                        //check if BCID has time
                        if(!(await BananaCrumbsUtils.checkTempMailUltraTime(bcid))) {
                            return false;
                        }
                        
                        webhookSender(webhook, [email]);
                        return true;
                    }
                    
                    return false;
                } catch(e) {
                    console.error(e);
                    return false;
                }
            }
            
            //if the webhook is false, set it to the custom domain
            if(await checkWebhook()) {
                return;
            }
            
            const custom_inbox = this.customs.get(domain);
            
            if(!custom_inbox) {
                this.customs.set(domain, []);
            }
            
            this.customs.get(domain)?.push(email);
        }
    }
    
    /**
     * @deprecated
     * @param token
     * @param domain
     */
    public static async getCustomInboxLegacy(token: string, domain: string): Promise<Email[]> {
        try {
            //verify the TXT record _tmpml.example.com should be the sha512 of the token
            //if it is, return the emails.
            //if not, return an empty array.
            const res = await dns.promises.resolveTxt(`_tmpml.${domain}`);
            if(res.length === 0) {
                return [];
            }
            
            // @ts-ignore
            const txt = res[0][0];
            
            const sha512 = createHash("sha512").update(token).digest("hex");
            
            if(txt !== sha512) {
                return [];
            }
            
            const emails = EmailStorage.customs.get(domain) || [];
            EmailStorage.customs.set(domain, []);
            
            return emails;
        } catch(e) {
            return [];
        }
    }
    
    /**
     * Check the custom inbox for the v2 API.
     * 
     * @param password {string} the password for the domain.
     * @param domain {string} the domain
     * @param bananacrumbs_id {string} the BananaCrumbs ID of the user
     * @param bananacrumbs_token {string} the BananaCrumbs Token of the user
     * @returns {Email[] | "invalid_password" | undefined} the email array, "invalid_password", or undefined if there was an issue checking
     */
    public static async checkCustomUUIDInbox(password: string, domain: string, bananacrumbs_id: string, bananacrumbs_token: string): Promise<Email[] | "invalid_password" | undefined> {
        try {
            const long_hash = createHash("sha512").update(domain + bananacrumbs_id + bananacrumbs_token)
                .digest()
                .toString("hex");
            
            const uuid = long_hash.substring(128 - 32);
            
            const res = await dns.promises.resolveTxt(`${uuid}.${domain}`);
            if(res.length === 0) {
                return [];
            }
            
            // @ts-ignore
            const txt = res[0][0];
            
            const sha512 = createHash("sha512").update(password).digest("hex");
            
            if(txt !== sha512) {
                return "invalid_password";
            }
            
            const emails = EmailStorage.customs.get(domain) || [];
            EmailStorage.customs.set(domain, []);
            
            return emails;
        } catch(e) {
            return undefined;
        }
    }
}

//every 10 seconds, remove all custom domain emails that are more than 1 hour old
setInterval(() => {
    const now = Date.now();
    for(const [domain, emails] of EmailStorage.customs) {
        const new_emails = emails.filter(e => e.date > now - (60 * 60 * 1000));
        EmailStorage.customs.set(domain, new_emails);
    }
}, 10000);
