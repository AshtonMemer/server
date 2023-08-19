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

export default async function v2(req: IncomingMessage, res: ServerResponse, ip: string, account_id: string | undefined, account_token: string | undefined, premiumTier: PremiumTier): Promise<any> {
    try {
        console.log(req.method + " " + req.url);
        res.setHeader("Content-Type", "application/json");
        
        const url_noquery = req.url?.split("?")[0];
        let query: URLSearchParams | undefined = undefined
        
        if(req.url?.includes("?")) {
            
            const u = new URL("https://api.tempmail.lol" + req.url);
            req.url = u.pathname;
            
            query = u.searchParams;
            
            console.log("Query: " + u.search);
            console.log("Path: " + u.pathname)
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
            }))
        }
        
        //get the endpoint
        const endpoint = RegisteredEndpoints.endpoints.find((endpoint) => {
            return endpoint.path === url_noquery;
        });
        
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
