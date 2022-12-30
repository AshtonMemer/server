import {readFileSync} from "fs";
import * as dns from "dns";
import sendDiscordMessage from "./util/sendDiscordMessage";
import GetStats from "./db/GetStats";

export default class Config {
    
    private constructor() {}
    
    //the port to listen for incoming mail
    public static MAIL_PORT: 25 | 2525 = 25;
    
    //the port to run the HTTP server
    //8443 is left in for testing, use 80 for production (ssl is managed by nginx)
    public static HTTP_PORT: 80 | 8443 = 8443;
    
    //what the email domains can be.
    public static EMAIL_DOMAINS: string[] = JSON.parse(readFileSync("domains.json").toString()).domains;
    
    public static RUSH_DOMAINS: string[] = JSON.parse(readFileSync("domains.json").toString()).rush;
    
    public static checking_domains: string[] = [];
    
}
console.log(`config loaded`);
GetStats.instance.getDomains().then(r => {
    Config.EMAIL_DOMAINS = r;
});

GetStats.instance.getRushDomains().then(r => {
    Config.RUSH_DOMAINS = r;
});

let lock = false;

setInterval(async () => {
    
    if(lock) return;
    lock = true;
    
    try {
        let domains = await GetStats.instance.getRushDomains();
        const banned_domains = await GetStats.instance.getBannedDomains();
        
        for(let i = 0; i < Config.checking_domains.length; i++) {
            const domain = Config.checking_domains[i];
            
            if(!domain) {
                continue;
            }
            
            if(!domains.includes(domain)) {
                domains.push(domain);
            }
        }
        
        for(const banned_domain of banned_domains) {
            if(domains.includes(banned_domain)) {
                domains = domains.filter(d => d !== banned_domain);
            }
        }
        
        let dms: string[] = domains;
        
        //check the A record for rush domains
        for(const domain of dms) {
            
            if(Config.EMAIL_DOMAINS.includes(domain)) {
                domains.splice(domains.indexOf(domain), 1);
                await GetStats.instance.setRushDomains(domains);
                sendDiscordMessage(`Removed ${domain} from rush domains because it is already a normal domain.`);
                continue;
            }
            
            const a = await checkARecord(domain, true);
            const mx = await checkMXRecord(domain, true);
            
            if(!a || !mx) {
                domains.splice(domains.indexOf(domain), 1);
                await GetStats.instance.setRushDomains(domains);
                
                if(!a) {
                    sendDiscordMessage(`Rush domain ${domain} has an invalid A record.`);
                } else {
                    sendDiscordMessage(`Rush domain ${domain} has an invalid MX record.`);
                }
            }
            
            if(await checkTXTRecord(domain)) {
                sendDiscordMessage(`Rush domain ${domain} has an invalid TXT record.`);
                domains.splice(domains.indexOf(domain), 1);
                await GetStats.instance.setRushDomains(domains);
            }
        }
        
        await GetStats.instance.setRushDomains(domains);
        
    } catch(e) {}
    
    
    Config.EMAIL_DOMAINS = await GetStats.instance.getDomains();
    Config.RUSH_DOMAINS = await GetStats.instance.getRushDomains();
    
    Config.checking_domains = [];
    
    lock = false;
}, 30000);

async function checkARecord(domain: string, try_again: boolean): Promise<boolean> {
    try {
        
        const r = await dns.promises.resolve4("mx." + domain);
        
        const IP_RANGES = await GetStats.instance.getAllowedIPs();
        
        if(r.length > 0) {
            const ip = r[0] as string;
            
            if(!IP_RANGES.includes(ip)) {
                return false;
            }
        }
        
        return true;
    } catch(e) {
        if(try_again) {
            return await checkARecord(domain, false);
        } else {
            console.error(e);
            return false;
        }
    }
}

async function checkMXRecord(domain: string, try_again: boolean): Promise<boolean> {
    try {
        const r = await dns.promises.resolveMx(domain);
        
        const CORRECT_RECORD = "mx." + domain;
        
        if(r.length === 1) {
            return r[0]?.exchange === CORRECT_RECORD;
        }
        
        return false;
    } catch(e) {
        if(try_again) {
            return await checkMXRecord(domain, false);
        } else {
            console.error(e);
            return false;
        }
    }
}

async function checkTXTRecord(domain: string): Promise<boolean> {
    try {
        const r = await dns.promises.resolveTxt(domain);
        
        const key = "_tmpml";
        
        //check to see if _tmpml.<domain> exists
        for(const record of r) {
            if(record[0] === key) {
                return true;
            }
        }
        
        return false;
    } catch(e) {
        return false;
    }
}
