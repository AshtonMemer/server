import * as https from "https";
import {RequestOptions} from "https";

const secrets = require("../../secrets.json");

export default function sendDiscordMessage(message: string) {
    
    const webhook_url = secrets.discord.webhook;
    
    const options: RequestOptions = {
        port: 443,
        host: "discord.com",
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
    };
    
    const body = JSON.stringify({
        content: message,
        allowed_mentions: {
            parse: [],
        }
    });
    
    const req = https.request(webhook_url, options, (res) => {
        res.on("data", () => {});
        
        res.on("end", () => {});
        
    });
    
    req.write(body);
    req.end();
    
}
