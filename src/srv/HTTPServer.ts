import {IncomingMessage, Server, ServerResponse} from "http";
import handleTorRequest from "./tor/handleTorRequest";
import EmailStorage from "../util/EmailStorage";
import GetStats from "../db/GetStats";

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
            HTTPServer.onRequest(req, res);
        });
    }
    
    /**
     * On request.
     *
     * @param req {IncomingMessage}
     * @param res {ServerResponse}
     * @private
     */
    private static onRequest(req: IncomingMessage, res: ServerResponse) {
        //if the user is connecting to the onion URL
        //other hosts are managed by nginx
        if(req.headers.host === "ttqp5vp3ylxrhpnfkehpzsslabaa7qxdur255jxgwmiisshv2wdntkid.onion") {
            return handleTorRequest(req, res);
        }
        
        if(!req.url) {
            res.writeHead(400);
            return res.end("something broke idk");
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
        } else {
            return res.destroy();
        }
    }
    
    /**
     * Start the HTTP server.
     */
    public start() {
        this.http_server.listen(this.port);
    }
    
}
