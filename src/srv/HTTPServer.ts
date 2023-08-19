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
import {PremiumTier} from "../entity/PremiumTier";
import login from "./helper/login";
import v1 from "./api/v1";
import v2 from "./api/v2";

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
        
        //check IP addresses to make sure this isn't a bad request
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
        
        //bananacrumbs account
        let premiumTier: PremiumTier = PremiumTier.NONE;
        let account_id: string | undefined = undefined;
        let token: string | undefined = undefined;
        
        const li_info = await login(req, res);
        
        //if the user has an account, log him or her in here
        if(li_info) {
            account_id = li_info.account_id;
            premiumTier = li_info.login_status;
            token = li_info.account_token;
        } else if(li_info === false) { //function returned
            return;
        }
        
        let api_version: string;
        
        //get the api version
        if(req.url.startsWith("/v1/")) {
            api_version = "v1";
            req.url = req.url.substring(3);
        } else if(req.url.startsWith("/v2/")) {
            api_version = "v2";
            req.url = req.url.substring(3);
        } else {
            api_version = "v1";
        }
        
        if(api_version === "v1") {
            await v1(req, res, ip, account_id, token, premiumTier);
        } else if(api_version === "v2") {
            await v2(req, res, ip, account_id, token, premiumTier);
        } else {
            res.writeHead(404);
            res.end("Not Found");
        }
    }
    
    /**
     * Start the HTTP server.
     */
    public start() {
        this.http_server.listen(this.port);
    }
    
}
