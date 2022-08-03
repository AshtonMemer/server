import Inbox from "../entity/Inbox";
import Config from "../Config";
import {randomBytes} from "crypto";
import Email from "../entity/Email";

export default class EmailStorage {
    
    private constructor() {}
    
    private static inboxes: Inbox[] = [];
    
    private static last_access_time = new Map<string, number>();
    
    /**
     * Generate a new email address.
     * @returns {Inbox} the inbox.
     */
    public static generateAddress(domain: string = this.getRandomDomain()): Inbox {
        
        //generate 5 random base36 characters
        const first = randomBytes(2).toString("hex");
        
        const last = Math.floor(Date.now() / 1000).toString(10).substring(3);
        
        const address_full = `${first}${last}@${domain}`.toLowerCase();
        
        const inbox = new Inbox(
            address_full,
            randomBytes(64).toString("base64url"),
            //1 hour
            Date.now() + (3600 * 1000),
            [],
        );
        
        EmailStorage.inboxes.push(inbox);
        
        return inbox;
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
        return Config.RUSH_DOMAINS[Math.floor(Math.random() * Config.RUSH_DOMAINS.length)] || "orangemail.shop";
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
        return EmailStorage.inboxes.length;
    }
}

setInterval(() => {EmailStorage.clearTimer()}, 10000);
