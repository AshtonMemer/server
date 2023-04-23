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

import {readFileSync} from "fs";
import * as dns from "dns";
import sendDiscordMessage from "./util/sendDiscordMessage";
import GetStats from "./db/GetStats";
import fetch from "node-fetch";

export default class Config {
    
    private constructor() {}
    
    //the port to listen for incoming mail
    public static MAIL_PORT: 25 | 2525 = 2525;
    
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
            
            let sendMessage = true;
            
            if(!a || !mx) {
                domains.splice(domains.indexOf(domain), 1);
                await GetStats.instance.setRushDomains(domains);
                
                if(!a) {
                    console.log(`Rush domain ${domain} has an invalid A record.`);
                    sendMessage = false;
                } else {
                    console.log(`Rush domain ${domain} has an invalid MX record.`);
                    sendMessage = false;
                }
            }
            
            if(await checkTXTRecord(domain)) {
                console.log(`Rush domain ${domain} has an invalid TXT record.`);
                sendMessage = false;
                domains.splice(domains.indexOf(domain), 1);
                await GetStats.instance.setRushDomains(domains);
            }
            
            if(sendMessage && Config.checking_domains.includes(domain)) {
                sendDiscordMessage(`New public domain: ${domain}`);
            }
        }
        
        await GetStats.instance.setRushDomains(domains);
        
    } catch(e) {}
    
    
    Config.EMAIL_DOMAINS = await GetStats.instance.getDomains();
    Config.RUSH_DOMAINS = await GetStats.instance.getRushDomains();
    
    Config.checking_domains = [];
    
    lock = false;
}, 30000);

const secrets = JSON.parse(readFileSync("./src/secrets.json").toString());

const checker_ip = secrets.checker_ip;
const checker_port = secrets.checker_port;
const checker_auth = secrets.checker_auth;

async function checkIP(addr: string): Promise<boolean> {
    
    const e = await fetch(`${checker_ip}:${checker_port}`, {
        headers: {
            "Authorization": checker_auth,
            "Cookie": addr
        },
    });
    
    return e.ok;
    
}

async function checkARecord(domain: string, try_again: boolean): Promise<boolean> {
    try {
        
        let r: string[] = [];
        
        try {
            r = await dns.promises.resolve4("mx." + domain);
            
        } catch(e) {}
        
        if(!r || r.length !== 1) {
            
            r = await dns.promises.resolve6("mx." + domain);
            
            if(r.length !== 1)
                return false;
            
            return checkIP(r[0] as string);
        }
        
        return checkIP(r[0] as string)
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
