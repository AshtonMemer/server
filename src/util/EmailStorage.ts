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

export default class EmailStorage {
    
    private constructor() {}
    
    private static inboxes: Inbox[] = [];
    public static customs: Map<string, Email[]> = new Map();
    
    private static last_access_time = new Map<string, number>();
    
    /**
     * Generate a new email address.
     * @returns {Inbox} the inbox.
     */
    public static generateAddress(domain: string | undefined, premium: boolean): Inbox {
        
        if(!domain) {
            domain = this.getRandomDomain();
        }
        
        //if the domain does not exist
        if(!Config.EMAIL_DOMAINS.includes(domain)) {
            if(!Config.RUSH_DOMAINS.includes(domain)) {
                throw new Error("Invalid domain");
            }
        }
        
        //generate 5 random base36 characters
        const first = randomBytes(2).toString("hex");
        
        const last = Math.floor(Date.now() / 1000).toString(10).substring(3);
        
        const address_full = `${first}${last}@${domain}`.toLowerCase();
        
        const inbox = new Inbox(
            address_full,
            randomBytes(64).toString("base64url"),
            //1 hour
            (Date.now() + (3600 * 1000) * (premium ? 10 : 1)), //premium inboxes last 10 hours
            [],
            premium
        );
        
        EmailStorage.inboxes.push(inbox);
        
        return inbox;
    }
    
    /**
     * Check if the storage has an email address.
     * @param address {string} the address.
     * @returns {boolean} true if the address exists, false otherwise.
     */
    public static hasEmail(address: string): boolean {
        for(const n of EmailStorage.inboxes) {
            if(n.address === address) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Get the emails in an inbox.
     * 
     * @param token {string} the token of the inbox.
     * @returns {Email[] | undefined} the emails, or undefined if the inbox does not exist (or has expired).
     */
    public static getInbox(token: string): Email[] | undefined {
        for(const i of EmailStorage.inboxes) {
            if(i.token === token) {
                const emails = i.emails;
                i.emails = []; //clear inbox
                EmailStorage.last_access_time.set(token, Date.now());
                return emails;
            }
        }
        
        return undefined;
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
     * Get a random rush email domain.
     * @returns {string} the domain.
     * @private
     */
    public static getRandomRushDomain(): string {
        if(Config.RUSH_DOMAINS.length === 0) {
            //if there are no rush domains, just return a random domain
            return this.getRandomDomain();
        }
        
        return Config.RUSH_DOMAINS[Math.floor(Math.random() * Config.RUSH_DOMAINS.length)] as string;
    }
    
    /**
     * On an email received.
     * @param email {Email} the email.
     */
    public static addEmail(email: Email) {
        for(const i of EmailStorage.inboxes) {
            if(i.address === email.to) {
                i.emails.push(email);
                return;
            }
        }
        
        //if the email is not for an inbox, add it to the customs map.
        const domain = email.to.split("@")[1] as string;
        
        //filter out expired emails
        if(Config.EMAIL_DOMAINS.includes(domain)) {
            return;
        } else if(Config.RUSH_DOMAINS.includes(domain)) {
            return;
        }
        
        //the custom domain emails should be limited to 25 emails.
        const emails = EmailStorage.customs.get(domain) || [];
        if(emails.length >= 25) {
            return;
        }
        
        emails.push(email);
        
        EmailStorage.customs.set(domain, emails);
    }
    
    /**
     * Timer to run for clearing the
     * email storage of expired inboxes.
     */
    public static clearTimer() {
        for(const i of EmailStorage.inboxes) {
            if(i.expiration < Date.now()) {
                EmailStorage.inboxes.splice(EmailStorage.inboxes.indexOf(i), 1);
            }
        }
        
        //also remove inboxes that have not been accessed in the last 10 minutes
        for(const [token, time] of EmailStorage.last_access_time) {
            if(time < Date.now() - (10 * 60 * 1000)) {
                EmailStorage.last_access_time.delete(token);
            }
        }
    }
    
    /**
     * Get the amount of connected people (or active inboxes)
     */
    public static getConnected() {
        return EmailStorage.inboxes.length + EmailStorage.customs.size;
    }
    
    public static async getCustomInbox(token: string, domain: string): Promise<Email[]> {
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
    }
}

setInterval(() => {
    EmailStorage.clearTimer()
}, 10000);

//every 10 seconds, remove all custom domain emails that are more than 10 hours old
setInterval(() => {
    const now = Date.now();
    for(const [domain, emails] of EmailStorage.customs) {
        const new_emails = emails.filter(e => e.date > now - (10 * 60 * 60 * 1000));
        EmailStorage.customs.set(domain, new_emails);
    }
}, 10000);
