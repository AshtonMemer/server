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
        
        if(req.url.includes("/generate")) {
            const b = RateLimitUtil.checkRateLimitGenerate(ip);
            if(b) {
                res.writeHead(429);
                return res.end("rate limited");
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
                const address = EmailStorage.generateAddress(domain);
                
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
            const address = EmailStorage.generateAddress();
            
            res.writeHead(201, {
                "Content-Type": "application/json",
            });
            
            res.end(JSON.stringify({
                address: address.address,
                token: address.token,
            }));
        } else if(req.url === "/generate/rush") {
            const address = EmailStorage.generateAddress(EmailStorage.getRandomRushDomain());
            
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
