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
import {HTTPEndpointParams} from "../../../../struct/api_data/v2/HTTPEndpointParams";
import {APIResponse} from "../../../../struct/api_data/v2/APIResponse";
import RateLimitUtil from "../../../../util/RateLimitUtil";
import {readFileSync} from "fs";
import Config from "../../../../Config";
import makeError from "../../../helper/makeError";
import {TempMailErrorCodes} from "../../../../static/TempMailErrorCodes";
import Logger from "../../../../util/Logger";

export default async function communityEndpoint(data: HTTPEndpointParams): Promise<APIResponse> {
    
    if(data.method !== "POST") {
        return {
            body: JSON.stringify({
                error: "Invalid method (only POST accepted on this path)",
                code: TempMailErrorCodes.INVALID_METHOD,
            }),
            status_code: 400,
        };
    }
    
    const json = JSON.parse(data.body);
    
    if(!json.domain) {
        return makeError("'domain' field missing from JSON POST parameters", 400, TempMailErrorCodes.BAD_JSON_POST_DATA);
    }
    
    const domain = json.domain;
    
    if(!domain || domain.length === 0 || domain.length > 64) {
        return makeError("Domain is an invalid length (cannot be more than 64 characters)", 400, TempMailErrorCodes.BAD_JSON_POST_DATA);
    }
    
    // @ts-ignore
    if(RateLimitUtil.checkRateLimitPubDomain(ip || "")) {
        return makeError("Rate Limited", 429, TempMailErrorCodes.RATE_LIMITED);
    }
    
    if(!domain.match(/^(?!.*\.\.)[\w.\-]+(\.[a-zA-Z]{2,16})+(\/[\w.?%#&=\/\-]*)?$/)) {
        return makeError("Invalid domain", 400, TempMailErrorCodes.BAD_JSON_POST_DATA);
    }
    
    try {
        const banned_words_raw = readFileSync("./banned_words.txt").toString();
        
        const bw = JSON.parse(Buffer.from(banned_words_raw.split("~")[1] as string, "base64").toString());
        
        for(let i = 0; i < bw.banned_words.length; i++){
            const b: string = bw.banned_words[i];
            if(domain.includes(b)) {
                Logger.log(`Domain ${domain} violates verification.`);
                return makeError("Domain contains banned word (trademark infringement).", 400, TempMailErrorCodes.BAD_JSON_POST_DATA);
            }
        }
        
    } catch(e) {
        console.error(`Error reading banned words`);
        console.error(e);
    }
    
    Config.checking_domains.push(domain);
    
    return {
        body: JSON.stringify({
            success: true,
        }),
        status_code: 200,
    };
}
