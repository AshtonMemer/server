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
import RateLimitUtil from "../../util/RateLimitUtil";
import {readFileSync} from "fs";
import Config from "../../Config";
import EmailStorage from "../../util/EmailStorage";
import RedisController from "../../db/RedisController";
import {PremiumTier} from "../../entity/PremiumTier";
import {IncomingMessage, ServerResponse} from "http";

/**
 * THIS IS AN OLD VERSION OF THE TEMPMAIL API.       /
 * THIS IS AN OLD VERSION OF THE TEMPMAIL API.      /
 * THIS IS AN OLD VERSION OF THE TEMPMAIL API.     /
 * THIS IS AN OLD VERSION OF THE TEMPMAIL API.    /=====================================================================
 * THIS IS AN OLD VERSION OF THE TEMPMAIL API.   <======================================================================
 * THIS IS AN OLD VERSION OF THE TEMPMAIL API.    \=====================================================================
 * THIS IS AN OLD VERSION OF THE TEMPMAIL API.     \
 * THIS IS AN OLD VERSION OF THE TEMPMAIL API.      \
 * THIS IS AN OLD VERSION OF THE TEMPMAIL API.       \
 * 
 * 
 * 
 * No new updates will be made to version 1 of the API.  THIS WILL BE REMOVED STARTING 2024.
 * 
 * @param req {IncomingMessage}
 * @param res {ServerResponse}
 * @param ip {string}
 * @param account_id {string | undefined}
 * @param account_token {string | undefined}
 * @param premiumTier {PremiumTier}
 */
export default async function v1(req: IncomingMessage, res: ServerResponse, ip: string, account_id: string | undefined, account_token: string | undefined, premiumTier: PremiumTier): Promise<any> {
    
    req.url = req.url as string; //ts fix
    
    if(req.url.includes("/generate")) {
        const b = RateLimitUtil.checkRateLimitGenerate(ip, account_id, premiumTier);
        if(b) {
            res.writeHead(429);
            return res.end(JSON.stringify({
                error: `rate limited (${premiumTier})`,
            }));
        }
    }
    
    if(req.url.startsWith("/addpublic/")) {
        const domain = req.url.substring(11);
        if(!domain || domain.length === 0 || domain.length > 64) {
            res.writeHead(400);
            return res.end("no domain");
        }
        
        // @ts-ignore
        if(RateLimitUtil.checkRateLimitPubDomain(ip || "")) {
            res.writeHead(429);
            return res.end("rate limited");
        }
        
        if(!domain.match(/^(?!.*\.\.)[\w.\-]+(\.[a-zA-Z]{2,16})+(\/[\w.?%#&=\/\-]*)?$/)) {
            res.writeHead(400);
            return res.end("invalid domain");
        }
        
        try {
            const banned_words_raw = readFileSync("./banned_words.txt").toString();
            
            const bw = JSON.parse(Buffer.from(banned_words_raw.split("~")[1] as string, "base64").toString());
            
            for(let i = 0; i < bw.banned_words.length; i++){
                const b: string = bw.banned_words[i];
                if(domain.includes(b)) {
                    console.log(`Domain ${domain} violates verification.`);
                    res.writeHead(200);
                    return res.end("ok");
                }
            }
            
        } catch(e) {
            console.error(`Error reading banned words`);
            console.error(e);
        }
        
        Config.checking_domains.push(domain);
        
        res.writeHead(200);
        res.end("ok");
    } else if(req.url.startsWith("/generate/") && req.url.length > "/generate/".length + 3 && req.url !== "/generate/rush") {
        const domain = req.url.substring(10);
        
        try {
            const address = EmailStorage.generateAddress(domain, premiumTier, account_id, account_token);
            
            res.writeHead(201, {
                "Content-Type": "application/json",
            });
            
            res.end(JSON.stringify({
                address: address.address,
                token: address.token,
            }));
        } catch(e: any) {
            res.setHeader("Content-Type", "application/json");
            res.writeHead(400);
            
            return res.end(JSON.stringify({
                "error": "invalid domain",
            }));
        }
    } else if(req.url === "/generate") {
        const address = EmailStorage.generateAddress(undefined, premiumTier, account_id, account_token);
        
        res.writeHead(201, {
            "Content-Type": "application/json",
        });
        
        res.end(JSON.stringify({
            address: address.address,
            token: address.token,
        }));
    } else if(req.url === "/generate/rush") {
        const address = EmailStorage.generateAddress(EmailStorage.getRandomCommunityDomain(), premiumTier, account_id, account_token);
        
        res.writeHead(201, {
            "Content-Type": "application/json",
        });
        
        res.end(JSON.stringify({
            address: address.address,
            token: address.token,
        }));
    } else if(req.url.startsWith("/auth/")) {
        const token = req.url.substring("/auth/".length);
        const emails = await EmailStorage.getInbox(token);
        
        res.writeHead(200, {
            "Content-Type": "application/json",
        });
        
        if(!emails) {
            return res.end(JSON.stringify({
                email: null,
                token: "invalid",
            }));
        } else {
            return res.end(JSON.stringify({
                email: emails,
            }))
        }
    } else if(req.url === "/stats") {
        RedisController.instance.getStats().then((r) => {
            res.writeHead(200);
            return res.end(JSON.stringify({
                emails_received: r,
                clients_connected: 0,
            }));
        });
    } else if(req.url.startsWith("/custom/")) {
        
        try {
            if(premiumTier === PremiumTier.NONE) {
                res.writeHead(402);
                res.end(JSON.stringify({
                    "error": "Not logged in or out of time"
                }));
                
                return;
            }
            
            let token, domain;
            token = req.url.split("/")[2] as string;
            domain = req.url.split("/")[3] as string;
            const emails = await EmailStorage.getCustomInboxLegacy(token, domain);
            
            res.writeHead(200, {
                "Content-Type": "application/json",
            });
            
            if(emails.length === 0) {
                return res.end(JSON.stringify({
                    email: null,
                }));
            }
            
            return res.end(JSON.stringify({
                email: emails,
            }));
        } catch(e) {
            console.error(e);
            res.writeHead(500);
            return res.end("internal server error");
        }
    } else if(req.url.startsWith("/webhook/")) {
        
        if(!account_id) {
            res.writeHead(401);
            res.end(JSON.stringify({
                error: "You must be logged in to modify webhooks!",
            }));
            return;
        }
        
        if(premiumTier !== PremiumTier.TEMPMAIL_ULTRA) {
            res.writeHead(402);
            res.end(JSON.stringify({
                error: "You must have TempMail Ultra to modify webhooks!",
            }));
            return;
        }
        
        if(req.url.startsWith("/webhook/add/")) {
            try {
                //do not split by / because the webhook URL may contain /
                let webhook = req.url.substring("/webhook/add/".length);
                
                if(webhook.length > 256) {
                    //414
                    res.writeHead(414);
                    return res.end(JSON.stringify({
                        "success": false,
                        "error": "Webhook URL too long (please keep it under 256 characters)",
                    }));
                }
                
                if(!webhook.startsWith("https://") && !webhook.startsWith("http://")) {
                    webhook = "https://" + webhook;
                }
                
                //match any valid URL
                if(!webhook.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/)) {
                    res.writeHead(400);
                    return res.end(JSON.stringify({
                        "success": false,
                        "error": "Invalid URL",
                    }));
                }
                const id = await RedisController.instance.setIDWebhook(account_id, webhook as string);
                res.writeHead(200);
                return res.end(JSON.stringify({
                    "success": true,
                    "id": id,
                }));
            } catch(e) {
                console.error(e);
                res.writeHead(500);
                return res.end(JSON.stringify({
                    "success": false,
                }));
            }
        } else if(req.url.startsWith("/webhook/remove")) {
            try {
                await RedisController.instance.deleteIDWebhook(account_id);
                res.writeHead(200);
                return res.end(JSON.stringify({
                    "success": true,
                }));
            } catch(e) {
                console.error(e);
                res.writeHead(500);
                return res.end(JSON.stringify({
                    "success": false,
                }));
            }
        } else {
            res.writeHead(404);
            return res.end(JSON.stringify({
                "error": "Invalid URL",
            }));
        }
        
    } else {
        res.setHeader("Location", "https://github.com/tempmail-lol/server/wiki/API-Endpoints");
        res.writeHead(302);
        
        return res.end(JSON.stringify({
            error: "See https://github.com/tempmail-lol/server/wiki/API-Endpoints for more information on how to use the API.",
        }));
    }
}
