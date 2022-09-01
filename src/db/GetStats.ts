import {createClient} from "redis";
import Account from "../entity/Account";

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
    
    /**
     * Get a user account.
     * @param email {string} The email address of the account.
     * @returns {Account | undefined} The account, or undefined if it does not exist.
     */
    public async getAccount(email: string): Promise<Account | null> {
        const hexEmail = Buffer.from(email).toString("hex");
        const account = await this.client.GET("exp-account-" + hexEmail);
        
        if(account) {
            const json = JSON.parse(account);
            return new Account(json.email, json.domains, json.emails, json.premium_level);
        } else {
            return null;
        }
    }
    
    /**
     * Set a user account.
     * @param account {Account} The account to set.
     * @returns {Promise<void>} A promise that resolves when the account is set.
     */
    public async setAccount(account: Account): Promise<void> {
        const hexEmail = Buffer.from(account.email).toString("hex");
        await this.client.SET("exp-account-" + hexEmail, JSON.stringify(account));
    }
    
}
