import {readFileSync, writeFileSync} from "fs";
import * as dns from "dns";
import sendDiscordMessage from "./util/sendDiscordMessage";

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
    
}

//every hour, update the list of email domains from domains.json.
setInterval(async () => {
    const domains = readFileSync("domains.json");
    Config.EMAIL_DOMAINS = JSON.parse(domains.toString()).domains;
    
    //check the A record for rush domains
    for(const domain of Config.RUSH_DOMAINS) {
        console.log(`checking ${domain}`);
        dns.resolve4("mx." + domain, async (err, addresses) => {
            if(err) {
                console.error(err);
                return;
            }
            
            const IP = "129.146.248.147";
            
            if(addresses[0] !== IP) {
                console.error(`Rush domain ${domain} is not pointing to ${IP}`);
                
                const json = JSON.parse(domains.toString());
                json.rush = json.rush.filter((d: string) => d !== domain);
                
                writeFileSync("domains.json", JSON.stringify(json, null, 4));
                
                sendDiscordMessage(`Rush domain ${domain} is not pointing to ${IP} and has been removed from the list.`);
            }
            
        });
        
        dns.resolveMx(domain, async (err, addresses) => {
            if(err) {
                console.error(err);
                return;
            }
            
            const correct_record = "mx." + domain;
            
            if(addresses.length !== 1) {
                console.error(`Rush domain ${domain} has more than one MX record.`);
                
                const json = JSON.parse(domains.toString());
                json.rush = json.rush.filter((d: string) => d !== domain);
                
                writeFileSync("domains.json", JSON.stringify(json, null, 4));
                await new Promise((resolve) => setTimeout(resolve, 500));
                
                sendDiscordMessage(`Rush domain ${domain} has more than one MX record and has been removed from the list.`);
                return;
            }
            
            // @ts-ignore
            if(addresses[0].exchange !== correct_record) {
                console.error(`Rush domain ${domain} is not pointing to ${correct_record}`);
                
                const json = JSON.parse(domains.toString());
                json.rush = json.rush.filter((d: string) => d !== domain);
                
                writeFileSync("domains.json", JSON.stringify(json, null, 4));
                await new Promise((resolve) => setTimeout(resolve, 500));
                
                sendDiscordMessage(`Rush domain ${domain} is not pointing to ${correct_record} and has been removed from the list.`);
            }
        });
        
    }
    
    Config.RUSH_DOMAINS = JSON.parse(domains.toString()).rush;
}, 10000);
