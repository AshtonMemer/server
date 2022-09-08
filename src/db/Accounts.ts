
import {createHash, randomBytes} from "crypto";
import SendEmail from "../util/SendEmail";
import GetStats from "./GetStats";
import EmailStorage from "../util/EmailStorage";
import Account from "../entity/Account";

export default class Accounts {
    
    private static readonly awaitingVerification: Map<string, {date: number, code: string, tries: number}> = new Map();
    private static readonly awaitingLogin: Map<string, {date: number, code: string, tries: number}> = new Map();
    private static readonly ipRateLimit: Map<string, number> = new Map();
    
    //token, Account
    public static readonly accounts: Map<string, Account> = new Map();
    
    private static reverseString(str: string): string {
        return str.split("").reverse().join("");
    }
    
    public static sha512(address: string): string {
        return this.reverseString(createHash("sha512").update(address).digest("hex"));
    }
    
    /**
     * "Purify" the email address
     * @param email {string} The email address to purify.
     * @returns {string} The purified email address.
     * @private
     */
    private static purifyEmail(email: string): string {
        //remove all periods before the @ symbol
        email = email.replace(/\..*@/, "@");
        
        //remove everything after a plus sign
        email = email.replace(/\+.*@/, "@");
        
        //if the email ends with a /, remove it
        if(email.endsWith("/")) {
            email = email.substring(0, email.length - 1);
        }
        
        return email;
    }
    
    /**
     * Create a new account.
     * @param email {string} The email address of the account.
     * @param requestingIP {string} The IP address of the request.
     * @returns {boolean} Whether the account was created successfully or not.
     */
    public static async makeAccount(email: string, requestingIP: string): Promise<boolean> {
        if(1 === 1) return false;
        if(!this.ipRateLimit.has(requestingIP)) {
            //3600000
            this.ipRateLimit.set(requestingIP, Date.now() + 3600000);
        }
        
        if((this.ipRateLimit.get(requestingIP) || 0) < Date.now()) {
            console.log(`IP ${requestingIP} is rate limited.`);
            return false;
        }
        
        const possibleCodeChars = "ABCDEFGHJKLMNPQRTUVWXYZ3679";
        
        if(!email.match(/^[a-zA-Z\d_.+-]+@[a-zA-Z\d-]+\.[a-zA-Z\d-.]+$/)) {
            return false;
        }
        
        //purify the email to prevent spam
        email = this.purifyEmail(email);
        
        if(this.awaitingVerification.has(email)) {
            return false;
        }
        
        if(EmailStorage.hasEmail(email)) {
            return false;
        }
        
        if(await GetStats.instance.getAccount(email) !== null) {
            return false;
        }
        
        const code = Array.from({length: 12}, () => possibleCodeChars[Math.floor(Math.random() * possibleCodeChars.length)]).join("");
        SendEmail.sendVerificationEmail(email, code, requestingIP);
        
        this.awaitingVerification.set(email, {date: Date.now(), code: code, tries: 0});
        
        return true;
    }
    
    /**
     * Verify an account.
     * @param email {string} The email address of the account.
     * @param code {string} The verification code.
     * @returns {boolean} Whether the verification was successful.
     */
    public static async verifyAccount(email: string, code: string): Promise<boolean> {
        if(1 === 1) return false;
        const data = this.awaitingVerification.get(email);
        if(!data) {
            console.log(`No data for ${email}`);
            return false;
        }
        
        if(data.tries >= 5) {
            console.log(`Too many tries for ${email}`);
            return false;
        }
        
        data.tries++;
        
        if(data.code !== code) {
            console.log(`Code mismatch for ${email}`);
            return false;
        }
        
        console.log(`Tries for ${email} is now ${data.tries}`);
        
        if(Date.now() - data.date > 604800000) {
            console.log(`expired`);
            return false;
        }
        
        this.awaitingVerification.delete(email);
        
        await GetStats.instance.setAccount({
            email: email,
            domains: [],
            emails: [],
            premium_level: 0,
        });
        
        return true;
    }
    
    public static clearTimer(): void {
        const time_required = 604800000;
        const now = Date.now();
        
        //delete all accounts that have been awaiting verification for more than a week
        for(const [email, data] of this.awaitingVerification) {
            if(now - data.date > time_required) {
                this.awaitingVerification.delete(email);
            }
        }
    }
    
    public static login(email: string, requestingIP: string): void {
        if(1 === 1) return;
        email = this.purifyEmail(email);
        
        const possibleCodeChars = "ABCDEFGHJKLMNPQRTUVWXYZ123456789";
        
        if(this.awaitingLogin.has(email)) {
            return;
        } else if(this.awaitingVerification.has(email)) {
            return;
        } else if(!GetStats.instance.getAccount(email)) {
            return;
        }
        
        const code = Array.from({length: 12}, () => possibleCodeChars[Math.floor(Math.random() * possibleCodeChars.length)]).join("");
        SendEmail.sendLoginEmail(email, code, requestingIP);
        
        this.awaitingLogin.set(email, {date: Date.now(), code: code, tries: 0});
    }
    
    public static async verifyLogin(email: string, code: string): Promise<string | undefined> {
        if(1 === 1) return undefined;
        const data = this.awaitingLogin.get(email);
        if(!data) {
            console.log(`No data for ${email}`);
            return undefined;
        }
        
        if(data.tries >= 5) {
            console.log(`Too many tries for ${email}`);
            return undefined;
        }
        
        data.tries++;
        
        if(data.code !== code) {
            console.log(`Code mismatch for ${email}`);
            return undefined;
        }
        
        console.log(`Tries: ${data.tries}`);
        
        if(Date.now() - data.date > 604800000) {
            console.log(`expired`);
            return undefined;
        }
        
        this.awaitingVerification.delete(email);
        
        const token = randomBytes(64).toString("base64");
        const account = await GetStats.instance.getAccount(email);
        
        if(!account) return undefined;
        
        this.accounts.set(token, account);
        
        return token;
    }
    
    public static getAccount(token: string): Account | undefined {
        return this.accounts.get(token);
    }
}

setInterval(() => {
    Accounts.clearTimer();
}, 300000);
