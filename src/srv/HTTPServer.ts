import {IncomingMessage, Server, ServerResponse} from "http";
import handleTorRequest from "./tor/handleTorRequest";
import EmailStorage from "../util/EmailStorage";
import GetStats from "../db/GetStats";
import sendDiscordMessage from "../util/sendDiscordMessage";

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
    private static async onRequest(req: IncomingMessage, res: ServerResponse) {
        //if the user is connecting to the onion URL
        //other hosts are managed by nginx
        if(req.headers.host === "ttqp5vp3ylxrhpnfkehpzsslabaa7qxdur255jxgwmiisshv2wdntkid.onion") {
            return handleTorRequest(req, res);
        }
        
        if(!req.url) {
            res.writeHead(400);
            return res.end("something broke idk");
        }
        
        if(req.url.startsWith("/addpublic/")) {
            const domain = req.url.substring(11);
            if(!domain || domain.length === 0 || domain.length > 100) {
                res.writeHead(400);
                return res.end("no domain");
            }
            
            if(!domain.match(/^(?!.*\.\.)[\w.\-]+(\.[a-zA-Z]{2,16})+(\/[\w.?%#&=\/\-]*)?$/)) {
                res.writeHead(400);
                return res.end("invalid domain");
            }
            
            sendDiscordMessage(`New public domain: ${domain}`);
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
            res.writeHead(302);
            res.setHeader("Location", "https://tempmail.lol/news/2022/05/17/how-to-use-the-tempmail-api/");
            
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
