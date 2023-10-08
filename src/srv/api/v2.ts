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

import {IncomingMessage, ServerResponse} from "http";
import {PremiumTier} from "../../entity/PremiumTier";
import RegisteredEndpoints from "./helpers/RegisteredEndpoints";
import {TempMailErrorCodes} from "../../static/TempMailErrorCodes";

export default async function v2(req: IncomingMessage, res: ServerResponse, ip: string, account_id: string | undefined, account_token: string | undefined, premiumTier: PremiumTier): Promise<any> {
    try {
        res.setHeader("Content-Type", "application/json");
        
        // @ts-ignore
        const url_noquery = req.url?.split("?")[0];
        let query: URLSearchParams | undefined = undefined
        
        if(req.url?.includes("?")) {
            
            const u = new URL("https://api.tempmail.lol" + req.url);
            req.url = u.pathname;
            
            // @ts-ignore
            query = u.searchParams;
        }
        
        let body: string = "";
        
        //if this is a POST request, get the body
        if(req.method === "POST") {
            body = await new Promise((resolve, reject) => {
                let body = "";
                req.on("data", (chunk) => {
                    body += chunk;
                });
                req.on("end", () => {
                    resolve(body);
                });
                req.on("error", (err) => {
                    reject(err);
                });
            });
        }
        
        if(body.length === 0) {
            body = "{}"; //prevent some issues
        }
        
        //if the body is not valid JSON, detect it here:
        try {
            JSON.parse(body);
        } catch(e) {
            res.writeHead(400);
            res.end(JSON.stringify({
                error: "Invalid JSON data provided for POST request",
                code: TempMailErrorCodes.BAD_JSON_POST_DATA,
            }))
        }
        
        //get the endpoint
        const endpoint = RegisteredEndpoints.endpoints.find((endpoint) => {
            return endpoint.path === url_noquery;
        });
        
        //supposed to be "=== undefined"
        //don't want to check for empty-ish values
        if(endpoint === undefined) {
            res.writeHead(404);
            res.end(JSON.stringify({
                error: "No endpoint with that name exists on v2.  See https://github.com/tempmail-lol/server/wiki/v2-API-Endpoints",
            }));
            return;
        }
        
        //call the endpoint
        const r = await endpoint.function({
            body: body,
            query: query,
            method: req.method as "GET" | "POST" | "DELETE",
            bananacrumbs_id: account_id,
            bananacrumbs_token: account_token,
            ip: ip,
            premium_tier: premiumTier,
        });
        
        //write the response
        res.writeHead(r.status_code);
        res.end(r.body);
        
    } catch(e) {
        res.writeHead(400);
        res.end("Bad Request\n" + e); //intentionally not json
    }
}
