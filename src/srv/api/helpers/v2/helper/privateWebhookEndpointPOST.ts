import makeError from "../../../../helper/makeError";
import {PremiumTier} from "../../../../../entity/PremiumTier";
import validateWebhook from "../../../../helper/validateWebhook";
import verifyCustomDomainOwner from "../../verifyCustomDomainOwner";
import RedisController from "../../../../../db/RedisController";
import {HTTPEndpointParams} from "../../../../../struct/api_data/v2/HTTPEndpointParams";
import {APIResponse} from "../../../../../struct/api_data/v2/APIResponse";
import {TempMailErrorCodes} from "../../../../../static/TempMailErrorCodes";

export default async function privateWebhookEndpointPOST(data: HTTPEndpointParams): Promise<APIResponse> {
    if(!data.bananacrumbs_id || !data.bananacrumbs_token) {
        return makeError("You must be logged in to use this endpoint (BananaCrumbs Plus or higher NOT required for DELETE).",
            400,
            TempMailErrorCodes.NO_AUTH);
    }
    
    const body = JSON.parse(data.body);
    
    if(!body || !body.url) {
        return makeError("Missing 'url' in JSON POST data.", 400, TempMailErrorCodes.BAD_JSON_POST_DATA);
    } else if(!body.domain) {
        return makeError("Missing 'domain' in JSON POST data.", 400, TempMailErrorCodes.BAD_JSON_POST_DATA);
    }
    
    //premium tier
    if(data.premium_tier !== PremiumTier.TEMPMAIL_ULTRA) {
        return makeError("You must have BananaCrumbs Ultra or have Private Webhooks on BananaCrumbs Enterprise to use this endpoint.\n" +
            "To delete a webhook, make a DELETE request this endpoint.", 400, TempMailErrorCodes.NO_AUTH);
    }
    
    const url = body.url as string;
    
    const v = validateWebhook(url);
    
    //check webhook
    if(v === "invalid") {
        return makeError("Webhook URL is not valid", 400, TempMailErrorCodes.BAD_JSON_POST_DATA);
    } else if(v === "too_long") {
        return makeError("Webhook URL is too long", 400, TempMailErrorCodes.BAD_JSON_POST_DATA);
    }
    
    if(!(await verifyCustomDomainOwner(data.bananacrumbs_id, body.domain))) {
        return makeError("Could not verify ownership of domain.", 400, TempMailErrorCodes.INVALID_DOMAIN_PASSWORD);
    }
    
    await RedisController.instance.setCustomWebhook(body.domain, data.bananacrumbs_id);
    
    return {
        body: JSON.stringify({
            success: true,
            message: "Successfully set ownership of " + body.domain + " to this BananaCrumbs ID"
        }),
        status_code: 200,
    };
}
