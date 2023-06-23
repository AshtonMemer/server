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

import {IncomingMessage, Server, ServerResponse} from "http";
import EmailStorage from "../util/EmailStorage";
import GetStats from "../db/GetStats";
import RateLimitUtil from "../util/RateLimitUtil";
import Config from "../Config";
import {readFileSync} from "fs";
import BananaCrumbsUtils from "../util/BananaCrumbsUtils";
import {generateToken} from "node-2fa";
import {PremiumTier} from "../entity/PremiumTier";

export default class HTTPServer {
    
    public readonly http_server: Server;
    
    /**
     * Constructor
     * @param port {number}
     */
    public constructor(
        public readonly port: number
    ) {
        this.http_server = new Server((req, res) => {
            HTTPServer.onRequest(req, res).catch(() => {});
        });
    }
    
    /**
     * On request.
     *
     * @param req {IncomingMessage}
     * @param res {ServerResponse}
     * @private
     */
    private static async onRequest(req: IncomingMessage, res: ServerResponse): Promise<any> {
        
        let ip = req.headers["CF-Connecting-IP".toLowerCase()];
        
        if(!ip) {
            res.writeHead(200, {"Content-Type": "text/plain"});
            return res.end("error");
        }
        
        //array
        if(typeof ip === "object") {
            ip = ip[0];
        }
        
        if(!ip) {
            res.writeHead(200, {"Content-Type": "text/plain"});
            return res.end("Not Found");
        }
        
        // @ts-ignore
        if(!req.url) {
            res.writeHead(400);
            return res.end("something broke idk");
        }
        
        let logged_in: PremiumTier = PremiumTier.NONE;
        let account_id: string | undefined = undefined;
        
        //try logging into an account (if present)
        try {
            let bananacrumbs_id = req.headers["X-BananaCrumbs-ID".toLowerCase()] as string;
            let mfa_token = req.headers["X-BananaCrumbs-MFA".toLowerCase()] as string;
            
            if(!bananacrumbs_id || !mfa_token) {
                if(req.headers["authorization"]) {
                    const auth = req.headers["authorization"];
                    if(!auth || !auth.includes(",")) {
                        throw new Error();
                    } else {
                        bananacrumbs_id = auth.split(",")[0] as string;
                        mfa_token = auth.split(",")[1] as string;
                    }
                }
            }
            
            if(!mfa_token || !bananacrumbs_id) throw new Error();
            
            const tfa = generateToken(mfa_token);
            
            if(!tfa?.token) throw new Error();
            
            const login_status = await BananaCrumbsUtils.login(bananacrumbs_id, tfa?.token);
            
            if(login_status === "expired" || login_status === PremiumTier.NONE) {
                res.writeHead(402);
                res.end(JSON.stringify({
                    "error": "expired account (please add more time)\nYou do not need an account to use the Free Tier.",
                }));
                return;
            } else if(!login_status) {
                res.writeHead(400);
                res.end(JSON.stringify({
                    "error": "Invalid account details (bad BananaCrumbs ID or Token)",
                }));
                return;
            }
            
            logged_in = login_status;
            account_id = bananacrumbs_id;
        } catch(e) {}
        
        if(req.url.includes("/generate")) {
            const b = RateLimitUtil.checkRateLimitGenerate(ip, account_id, logged_in);
            if(b) {
                res.writeHead(429);
                return res.end(JSON.stringify({
                    error: `rate limited (${logged_in})`,
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
                const address = EmailStorage.generateAddress(domain, logged_in, account_id);
                
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
            const address = EmailStorage.generateAddress(undefined, logged_in, account_id);
            
            res.writeHead(201, {
                "Content-Type": "application/json",
            });
            
            res.end(JSON.stringify({
                address: address.address,
                token: address.token,
            }));
        } else if(req.url === "/generate/rush") {
            const address = EmailStorage.generateAddress(EmailStorage.getRandomRushDomain(), logged_in, account_id);
            
            res.writeHead(201, {
                "Content-Type": "application/json",
            });
            
            res.end(JSON.stringify({
                address: address.address,
                token: address.token,
            }));
        } else if(req.url.startsWith("/auth/")) {
            const token = req.url.substring("/auth/".length);
            const emails = EmailStorage.getInbox(token);
            
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
            GetStats.instance.getStats().then((r) => {
                res.writeHead(200);
                return res.end(JSON.stringify({
                    emails_received: r,
                    clients_connected: EmailStorage.getConnected(),
                }));
            });
        } else if(req.url.startsWith("/custom/")) {
            
            if(!logged_in) {
                res.writeHead(402);
                res.end(JSON.stringify({
                    "error": "Not logged in or out of time"
                }));
                
                return;
            }
            
            let token, domain;
            token = req.url.split("/")[2] as string;
            domain = req.url.split("/")[3] as string;
            const emails = await EmailStorage.getCustomInbox(token, domain);
            
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
        } else if(req.url.startsWith("/webhook/")) {
            
            if(!account_id) {
                res.writeHead(401);
                res.end(JSON.stringify({
                    error: "You must be logged in to modify webhooks!",
                }));
                return;
            }
            
            if(logged_in !== PremiumTier.TEMPMAIL_ULTRA) {
                res.writeHead(402);
                res.end(JSON.stringify({
                    error: "You must have TempMail Ultra to modify webhooks!",
                }));
                return;
            }
            
            if(req.url.startsWith("/webhook/add/")) {
                try {
                    const webhook = req.url.split("/")[3] as string;
                    
                    //match any valid URL
                    if(!webhook.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/)) {
                        res.writeHead(400);
                        return res.end(JSON.stringify({
                            "success": false,
                            "error": "Invalid URL",
                        }));
                    }
                    const id = await GetStats.instance.setIDWebhook(account_id, req.url.split("/")[3] as string);
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
            } else if(req.url.startsWith("/webhook/remove/")) {
                try {
                    await GetStats.instance.deleteIDWebhook(account_id);
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
            res.setHeader("Location", "https://tempmail.lol/news/2022/05/17/how-to-use-the-tempmail-api/");
            res.writeHead(302);
            
            return res.end(JSON.stringify({
                error: "See https://tempmail.lol/news/2022/05/17/how-to-use-the-tempmail-api/ for more information on how to use the API.",
            }));
        }
    }
    
    /**
     * Start the HTTP server.
     */
    public start() {
        this.http_server.listen(this.port);
    }
    
}
