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
        }
        
        if(req.url === "/generate") {
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
// } else if(req.url.startsWith("/register/")) {
//     const email = req.url.substring("/register/".length);
//     Accounts.makeAccount(email, req.headers["CF-Connecting-IP"] as string || req.socket.remoteAddress as string).then((r) => {
//         if(!r) {
//             res.writeHead(400);
//             return res.end("{}");
//         } else {
//             res.writeHead(201);
//             return res.end("{}");
//         }
//     });
// } else if(req.url.startsWith("/verify/")) {
//     try {
//         //get the email and token from the URL (format: /verify/<email>/<token>)
//         const email = req.url.substring("/verify/".length, req.url.indexOf("/", "/verify/".length));
//         const token = req.url.substring(req.url.indexOf("/", "/verify/".length) + 1);
//        
//         console.log(email, token);
//        
//         //verify the account
//         Accounts.verifyAccount(email, token).then((r) => {
//             console.log(`verification result: ${r}`);
//             if(!r) {
//                 res.writeHead(400);
//                 return res.end("{}");
//             } else {
//                 res.writeHead(200);
//                 return res.end("{}");
//             }
//         });
//     } catch(e) {
//         res.writeHead(400);
//         return res.end("{}");
//     }
// } else if(req.url.startsWith("/login/")) {
//     const email = req.url.substring("/login/".length);
//     Accounts.login(email, req.headers["CF-Connecting-IP"] as string || req.socket.remoteAddress as string);
//     res.writeHead(200);
//     return res.end("{}");
// } else if(req.url.startsWith("/verifylogin/")) {
//     try {
//         (async () => {
//             req.url = req.url as string;
//            
//             //get the email and token from the URL
//             const email = req.url.substring("/verifylogin/".length, req.url.indexOf("/", "/verifylogin/".length));
//             const token = req.url.substring(req.url.indexOf("/", "/verifylogin/".length) + 1);
//            
//             setTimeout(() => {
//                 if(!r) {
//                     res.writeHead(400);
//                     return res.end("{}");
//                 } else {
//                     res.writeHead(200);
//                     const account = Accounts.getAccount(r);
//                     return res.end(JSON.stringify({
//                         account: account,
//                         token: r,
//                     }));
//                 }
//             }, 3000);
//            
//             //verify the account
//             const r = await Accounts.verifyLogin(email, token);
//            
//         })();
//     } catch(e) {
//         res.writeHead(400);
//         return res.end("{}");
//     }
