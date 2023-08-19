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
import {HTTPCode} from "../../../../struct/HTTPCode";
import {PremiumTier} from "../../../../entity/PremiumTier";
import validateWebhook from "../../../helper/validateWebhook";
import RedisController from "../../../../db/RedisController";

function makeError(error: string, code: HTTPCode = 400): APIResponse {
    return {
        body: JSON.stringify({
            error
        }),
        status_code: code,
    };
}

export default async function webhookEndpoint(data: HTTPEndpointParams): Promise<APIResponse> {
    if(!data.bananacrumbs_token || !data.bananacrumbs_id) {
        return makeError("You must be logged in to interact with webhooks.");
    }
    
    if(data.method === "POST") {
        if(data.premium_tier === PremiumTier.TEMPMAIL_ULTRA) {
            const json = JSON.parse(data.body);
            
            if(!json.url) {
                return makeError("'url' parameter missing in POST request body");
            }
            
            const v = validateWebhook(json.url);
            
            if(v === "too_long") {
                return makeError("Webhook URL is too long (cannot exceed 256 characters).");
            } else if(v === "invalid") {
                return makeError("Invalid webhook URL.");
            }
            
            await RedisController.instance.setIDWebhook(data.bananacrumbs_id, json.url);
            
            return {
                body: "",
                status_code: 204,
            };
        }
        
        return makeError("You must have TempMail Ultra to set webhooks on your account.");
    } else if(data.method === "DELETE") {
        await RedisController.instance.deleteIDWebhook(data.bananacrumbs_id);
        
        return {
            body: "",
            status_code: 204,
        };
    } else {
        return makeError("Invalid method", 400);
    }
}
