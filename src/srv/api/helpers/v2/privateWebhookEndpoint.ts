import {HTTPEndpointParams} from "../../../../struct/api_data/v2/HTTPEndpointParams";
import {APIResponse} from "../../../../struct/api_data/v2/APIResponse";
import makeError from "../../../helper/makeError";
import DatabaseController from "../../../../db/DatabaseController";
import privateWebhookEndpointPOST from "./helper/privateWebhookEndpointPOST";
import privateWebhookEndpointGET from "./helper/privateWebhookEndpointGET";
import {DeleteCustomWebhookRedisResponseType} from "../../../../entity/DeleteCustomWebhookRedisResponseType";
import {TempMailErrorCode} from "../../../../static/TempMailErrorCode";

/**
 * Endpoint for setting the private domain webhook.
 * 
 * @param data {HTTPEndpointParams} HTTP endpoint parameters
 */
export default async function privateWebhookEndpoint(data: HTTPEndpointParams): Promise<APIResponse> {
    
    if(!data.bananacrumbs_id || !data.bananacrumbs_token) {
        return makeError("You must be logged in to use this endpoint (TempMail Plus or higher NOT required for DELETE).", 400, TempMailErrorCode.NO_AUTH);
    }
    
    if(data.method === "DELETE") {
        if(!data.query) return makeError("No query string found (required for DELETE)",
            400,
            TempMailErrorCode.BAD_QUERY_STRING);
        
        const domain = data.query.get("domain");
        
        if(!domain) {
            return makeError("Missing 'domain' in query parameter", 400, TempMailErrorCode.BAD_QUERY_STRING);
        }
        
        const r = await DatabaseController.instance.deleteCustomWebhook(domain, data.bananacrumbs_id);
        
        switch(r) {
            case DeleteCustomWebhookRedisResponseType.INVALID_BANANACRUMBS_ID:
                return makeError("Invalid BananaCrumbs ID", 400, TempMailErrorCode.NO_AUTH);
            case DeleteCustomWebhookRedisResponseType.DID_NOT_EXIST:
                return makeError("No such domain exists", 400, TempMailErrorCode.INVALID_DOMAIN_NAME);
            case DeleteCustomWebhookRedisResponseType.INVALID_DOMAIN_REGEX:
                return makeError("Invalid domain entry", 400, TempMailErrorCode.INVALID_DOMAIN_NAME);
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
        return makeError("Cannot " + data.method, 405, TempMailErrorCode.INVALID_METHOD);
    }
    
}
