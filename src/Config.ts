import {readFileSync} from "fs";

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
setInterval(() => {
    const domains = readFileSync("domains.json");
    Config.EMAIL_DOMAINS = JSON.parse(domains.toString()).domains;
    Config.RUSH_DOMAINS = JSON.parse(domains.toString()).rush;
}, 3600000);
