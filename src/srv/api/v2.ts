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

import {PremiumTier} from "../../entity/PremiumTier";
import RegisteredEndpoints from "./helpers/RegisteredEndpoints";
import {TempMailErrorCode} from "../../static/TempMailErrorCode";
import { APIResponse } from "../../struct/api_data/v2/APIResponse";

export default async function v2(req: Request, path: string, query: URLSearchParams | undefined, ip: string, account_id: string | undefined, account_token: string | undefined, premiumTier: PremiumTier): Promise<APIResponse> {
    try {
        let body = await req.text() || "{}";

        //if the body is not valid JSON, detect it here:
        try {
            JSON.parse(body);
        } catch(e) {
            return {
                body: JSON.stringify({
                    error: "Invalid JSON data provided for POST request",
                    code: TempMailErrorCode.BAD_JSON_POST_DATA,
                }),
                status_code: 400,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        }
        
        //get the endpoint
        const endpoint = RegisteredEndpoints.endpoints.find((endpoint) => {
            return endpoint.path === path;
        });
        
        //supposed to be "=== undefined"
        //don't want to check for empty-ish values
        if(endpoint === undefined) {
            return {
                body: JSON.stringify({
                    error: "No endpoint with that name exists on v2.  See https://github.com/tempmail-lol/server/wiki/v2-API-Endpoints"
                }),
                status_code: 404,
                headers: {
                    "Content-Type": "application/json"
                }
            }
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
        return {
            body: r.body,
            status_code: r.status_code,
            headers: {
                "Content-Type": "application/json"
            }
        }
    } catch(e) {
        return {
            body: JSON.stringify({
                error: "Internal Server Error",
                code: TempMailErrorCode.INTERNAL_SERVER_ERROR
            }),
            status_code: 500,
            headers: {
                "Content-Type": "application/json"
            }
        }
    }
}
