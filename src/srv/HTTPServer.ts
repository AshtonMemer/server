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

import { Server } from "bun";
import {PremiumTier} from "../entity/PremiumTier";
import login from "./helper/login";
import v1 from "./api/v1";
import v2 from "./api/v2";
import { TempMailErrorCode } from "../static/TempMailErrorCode";

export default class HTTPServer {
    
    public readonly http_server: Server;
    
    /**
     * Constructor
     * @param port {number}
     */
    public constructor(
        public readonly port: number,
        public readonly production: boolean = false
    ) {
        this.http_server = Bun.serve({
            port: port,
            development: !production,
            fetch: HTTPServer.fetch
        })
    }
    
    /**
     * On request.
     *
     * @param req {IncomingMessage}
     * @param res {ServerResponse}
     * @private
     */
    private static async fetch(req: Request): Promise<Response> {
        
        //check IP addresses to make sure this isn't a bad request
        let ip = req.headers.get("cf-connecting-ip") || undefined;
        if(typeof ip === "object") ip = ip[0];
        if(!ip) return new Response(JSON.stringify({ error: "No IP address"}), { status: 400 });

        //set url to its path
        let url = new URL(req.url);
        let path = url.pathname + url.search;
        
        //bananacrumbs account
        let premiumTier: PremiumTier = PremiumTier.NONE;
        let account_id: string | undefined = undefined;
        let token: string | undefined = undefined;
        
        const li_info = await login(req);
        
        //if the user has an account, log him or her in here
        if(typeof li_info !== "undefined" && typeof li_info !== "number") {
            account_id = li_info.account_id;
            premiumTier = li_info.login_status;
            token = li_info.account_token;
        }
        else if(typeof li_info === "number") {
            if (li_info == TempMailErrorCode.LOGIN_EXPIRED)
                return new Response(JSON.stringify({ error: "Expired account (please add more time)\nYou do not need an account to use the Free Tier.", code: li_info }), { status: 401 });
            else if(li_info == TempMailErrorCode.LOGIN_INVALID)
                return new Response(JSON.stringify({ error: "Invalid login, bad BananaCrumbs login.", code: li_info }), { status: 401 });
            else
                return new Response(JSON.stringify({ error: "Generic error", code: li_info }), { status: 400 })
        }
        
        let api_version: string;
        
        //get the api version
        if(path.startsWith("/v1/")) {
            api_version = "v1";
            path = path.substring(3);
        } else if(path.startsWith("/v2/")) {
            api_version = "v2";
            path = path.substring(3);
        } else {
            api_version = "v1";
        }
        
        if(api_version === "v1") {
            let response = await v1(path, ip, account_id, token, premiumTier);
            return new Response(response.body, {
                status: response.status_code,
                headers: response.headers || {}
            });
        } else if(api_version === "v2") {
            let response = await v2(req, path.split('?')[0] as string, url.searchParams, ip, account_id, token, premiumTier);
            return new Response(response.body, {
                status: response.status_code,
                headers: response.headers || {}
            });
        } else {
            return new Response(JSON.stringify({ error: "Invalid API version" }), { status: 400 });
        }
    } 
}
