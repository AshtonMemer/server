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

import {APIResponse} from "../../../../struct/api_data/v2/APIResponse";
import {HTTPEndpointParams} from "../../../../struct/api_data/v2/HTTPEndpointParams";
import {createHash} from "crypto";
import EmailStorage from "../../../../util/EmailStorage";
import makeError from "../../../helper/makeError";
import {TempMailErrorCodes} from "../../../../static/TempMailErrorCodes";

type CustomDomainType = {
    uuid: string,
};



export default async function customEndpoint(data: HTTPEndpointParams): Promise<APIResponse> {
    if(data.method === "GET") {
        
        const query = data.query;
        
        if(!query) {
            return makeError("Invalid query string", 400, TempMailErrorCodes.BAD_QUERY_STRING);
        }
        
        const domain = query.get("domain");
        const password = query.get("password");
        
        if(!domain || !password) {
            return makeError("Anomalous domain or password in query", 400, TempMailErrorCodes.BAD_QUERY_STRING);
        }
        
        if(!data.bananacrumbs_token || !data.bananacrumbs_id) {
            return makeError("No BananaCrumbs ID/Token provided for this method.  You can create one at https://passport.bananacrumbs.us", 400, TempMailErrorCodes.NO_AUTH);
        }
        
        const emails = await EmailStorage.checkCustomUUIDInbox(password, domain, data.bananacrumbs_id, data.bananacrumbs_token);
        
        if(emails === "invalid_password") {
            return makeError("Invalid password provided for domain.  If you recently set this record, wait several hours for your nameserver to update.",
                403,
                TempMailErrorCodes.INVALID_DOMAIN_PASSWORD);
        }
        
        if(!emails) {
            return makeError("Invalid request.  Is the domain invalid?", 400, TempMailErrorCodes.GENERIC_ERROR);
        }
        
        return {
            body: JSON.stringify({
                email: emails,
            }),
            status_code: 200,
        };
        
    } else if(data.method === "POST") { //set the UUID for the domain
        
        const body = JSON.parse(data.body);
        
        if(!data.body || !body.domain) {
            return {
                body: JSON.stringify({
                    error: "Missing 'domain' field in JSON POST data",
                    code: TempMailErrorCodes.MISSING_DOMAIN_NAME,
                }),
                status_code: 400,
            };
        }
        
        const domain = body.domain;
        
        if(domain.length > 128) {
            return {
                body: JSON.stringify({
                    error: "Domain too long",
                    code: TempMailErrorCodes.DOMAIN_TOO_LONG,
                }),
                status_code: 400,
            };
        }
        
        const long_hash = createHash("sha512").update(domain + data.bananacrumbs_id + data.bananacrumbs_token)
            .digest()
            .toString("hex");
        
        const res: CustomDomainType = {
            uuid: long_hash.substring(128 - 32),
        };
        
        return {
            status_code: 200,
            body: JSON.stringify(res),
        };
    } else {
        return {
            body: JSON.stringify({
                error: "Invalid method",
                code: TempMailErrorCodes.INVALID_DOMAIN_NAME,
            }),
            status_code: 400,
        };
    }
}
