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
import DatabaseController from "./db/DatabaseController";
import fetch from "node-fetch";
import Logger from "./util/Logger";

export default class Config {
    
    private constructor() {}
    
    //the port to listen for incoming mail
    public static MAIL_PORT: 25 | 2525 = 2525;
    
    //the port to run the HTTP server
    //8443 is left in for testing, use 80 for production (ssl is managed by nginx)
    public static HTTP_PORT: 80 | 8443 = 8443;
    
    //what the email domains can be.
    public static EMAIL_DOMAINS: string[] = JSON.parse(readFileSync("domains.json").toString()).domains;
    
    //now known as "community domains" (these are really stored in Redis)
    public static COMMUNITY_DOMAINS: string[] = JSON.parse(readFileSync("domains.json").toString()).rush;
    
    //community domains which are currently being checked.
    public static checking_domains: string[] = [];
    
}

Logger.log("Loading domains from Redis...");

//load the normal/community domains into memory.
DatabaseController.instance.getDomains().then(r => {
    Config.EMAIL_DOMAINS = r;
});

DatabaseController.instance.getCommunityDomains().then(r => {
    Config.COMMUNITY_DOMAINS = r;
});

//locks the IP checker from being run multiple times at once
let lock = false;

setInterval(async () => {
    
    if(lock) return;
    lock = true;
    
    try {
        
        //get a list of the current community domains
        let domains = await DatabaseController.instance.getCommunityDomains();
        const banned_domains = await DatabaseController.instance.getBannedDomains();
        
        //add all domains waiting to be added to the service.
        for(let i = 0; i < Config.checking_domains.length; i++) {
            const domain = Config.checking_domains[i];
            
            if(!domain) {
                continue;
            }
            
            if(!domains.includes(domain)) {
                domains.push(domain);
            }
        }
        
        //remove any banned domains
        for(const banned_domain of banned_domains) {
            if(domains.includes(banned_domain)) {
                domains = domains.filter(d => d !== banned_domain);
            }
        }
        
        let dms: string[] = domains;
        
        //check the A record for community domains
        for(const domain of dms) {
            
            //if the domain is a normal domain
            if(Config.EMAIL_DOMAINS.includes(domain)) {
                domains.splice(domains.indexOf(domain), 1);
                await DatabaseController.instance.setCommunityDomains(domains);
                sendDiscordMessage(`Removed ${domain} from rush domains because it is already a normal domain.`);
                continue;
            }
            
            //check the A and MX records of community domains.
            const a = await checkARecord(domain, true);
            const mx = await checkMXRecord(domain, true);
            
            let sendMessage = true;
            
            //if the A or MX record is invalid, remove the domain.
            if(!a || !mx) {
                domains.splice(domains.indexOf(domain), 1);
                await DatabaseController.instance.setCommunityDomains(domains);
                
                if(!a) {
                    Logger.log(`Rush domain ${domain} has an invalid A record.`);
                    sendMessage = false;
                } else {
                    Logger.log(`Rush domain ${domain} has an invalid MX record.`);
                    sendMessage = false;
                }
            }
            
            //if the community domain has a _tmpml TXT record, remove it.
            if(await checkTXTRecord(domain)) {
                Logger.log(`Rush domain ${domain} has an invalid TXT record.`)
                sendMessage = false;
                domains.splice(domains.indexOf(domain), 1);
                await DatabaseController.instance.setCommunityDomains(domains);
            }
            
            if(sendMessage && Config.checking_domains.includes(domain)) {
                sendDiscordMessage(`New public domain: ${domain}`);
            }
        }
        
        await DatabaseController.instance.setCommunityDomains(domains);
        
    } catch(e) {}
    
    
    Config.EMAIL_DOMAINS = await DatabaseController.instance.getDomains();
    Config.COMMUNITY_DOMAINS = await DatabaseController.instance.getCommunityDomains();
    
    Config.checking_domains = [];
    
    lock = false;
}, 30000);


//to be used in future versions of TempMail
const secrets = JSON.parse(readFileSync("./src/secrets.json").toString());


//to be used in future versions of TempMail
const checker_ip = secrets.checker_ip;
const checker_port = secrets.checker_port;
const checker_auth = secrets.checker_auth;

//to be used in future versions of TempMail
// @ts-ignore
async function checkIP(addr: string): Promise<boolean> {
    
    Logger.log(`Sending a confirmation message to ensure ${addr} is correct`);
    
    const e = await fetch(`${checker_ip}:${checker_port}`, {
        headers: {
            "Authorization": checker_auth,
            "Cookie": addr
        },
    });
    
    Logger.log(`Confirmation server returned ${e.status}`)
    
    return e.ok;
    
}

/**
 * Check the A record of a community domain to ensure it is correct.
 * 
 * @deprecated Because there is a set amount of IP addresses that this method checks,
 *             this method will be replaced soon.  Community domains in the future
 *             will be added to the TempMail Nameserver (probably through a public
 *             nameserver) to further avoid TempMail detection, and automatically
 *             add new IP addresses as they are released.
 * 
 * @param domain {string} the domain to check.
 * @param try_again {boolean} true to try again, false otherwise.
 */
async function checkARecord(domain: string, try_again: boolean): Promise<boolean> {
    try {
        
        const allowed_ips = await DatabaseController.instance.getAllowedIPs();
        
        //check if mx.<domain> has an ipv4 or ipv6 address
        try {
            const r = await dns.promises.resolve4("mx." + domain);
            
            if(r.length === 1) {
                return allowed_ips.includes(r[0] as string);
            }
            
            return false;
        } catch(e) {
            //check for the new IPv6 range
            const r = await dns.promises.resolve6("mx." + domain);
            
            if(r.length === 1) {
                return r[0]?.startsWith(secrets.ipv6_range) || false;
            }
        }
        
        return false;
        
    } catch(e) {
        if(try_again) {
            return await checkARecord("mx." + domain, false);
        } else {
            console.error(e);
            return false;
        }
    }
}

/**
 * Check the MX record of a community domain.
 * 
 * This checks to see if "MX.DOMAIN.COM." is the mail server for "DOMAIN.COM.".
 * 
 * @deprecated This may be changed in the future to bypass tempmail detectors.
 * 
 * @param domain {string} The domain to check
 * @param try_again {boolean} Whether or not to try again if the first attempt fails
 * @returns {boolean} true if the MX record is correct, false if it is not or there is an error.
 */
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

/**
 * Check the TXT record of a custom domain.
 * 
 * This will be used to make sure that community domains are not also custom domains.
 * 
 * @param domain {string} The domain to check
 * @returns {Promise<boolean>} Whether or not the TXT record exists
 */
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
