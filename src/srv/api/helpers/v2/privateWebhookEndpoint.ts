import {HTTPEndpointParams} from "../../../../struct/api_data/v2/HTTPEndpointParams";
import {APIResponse} from "../../../../struct/api_data/v2/APIResponse";
import makeError from "../../../helper/makeError";
import RedisController from "../../../../db/RedisController";
import privateWebhookEndpointPOST from "./helper/privateWebhookEndpointPOST";
import privateWebhookEndpointGET from "./helper/privateWebhookEndpointGET";
import {DeleteCustomWebhookRedisResponseType} from "../../../../entity/DeleteCustomWebhookRedisResponseType";

/**
 * Endpoint for setting the private domain webhook.
 * 
 * @param data {HTTPEndpointParams} HTTP endpoint parameters
 */
export default async function privateWebhookEndpoint(data: HTTPEndpointParams): Promise<APIResponse> {
    
    if(!data.bananacrumbs_id || !data.bananacrumbs_token && data.method !== "DELETE") {
        return makeError("You must be logged in to use this endpoint (TempMail Plus or higher NOT required for DELETE).");
    }
    
    if(data.method === "DELETE") {
        if(!data.query) return makeError("No query string found (required for DELETE)");
        
        const domain = data.query.get("domain");
        
        if(!domain) {
            return makeError("Missing 'domain' in query parameter");
        }
        
        const r = await RedisController.instance.deleteCustomWebhook(domain, data.bananacrumbs_id);
        
        switch(r) {
            case DeleteCustomWebhookRedisResponseType.INVALID_BANANACRUMBS_ID:
                return makeError("Invalid BananaCrumbs ID", 400);
            case DeleteCustomWebhookRedisResponseType.DID_NOT_EXIST:
            case DeleteCustomWebhookRedisResponseType.INVALID_DOMAIN_REGEX:
                return makeError("No such domain exists", 400);
            case DeleteCustomWebhookRedisResponseType.SUCCESS:
                return {
                    body: JSON.stringify({
                        success: true,
                        message: "OK",
                    }),
                    status_code: 200,
                };
        }
    } else if(data.method === "GET") {
        return await privateWebhookEndpointGET(data);
    } else if(data.method === "POST") {
        return await privateWebhookEndpointPOST(data);
    } else {
        return makeError("Cannot " + data.method, 405);
    }
    
}
