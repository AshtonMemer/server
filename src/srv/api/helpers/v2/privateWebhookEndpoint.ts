import {HTTPEndpointParams} from "../../../../struct/api_data/v2/HTTPEndpointParams";
import {APIResponse} from "../../../../struct/api_data/v2/APIResponse";
import makeError from "../../../helper/makeError";
import validateWebhook from "../../../helper/validateWebhook";
import {PremiumTier} from "../../../../entity/PremiumTier";
import RedisController from "../../../../db/RedisController";
import {createHash} from "crypto";
import {readFileSync} from "fs";
import verifyCustomDomainOwner from "../verifyCustomDomainOwner";

type PrivateWebhookResponseType = {
    txt_name: string,
    txt_value: string,
}

const secrets = JSON.parse(readFileSync("./src/secrets.json").toString());

if(!secrets.custom_domain_random) {
    console.error(`NO CUSTOM DOMAIN RANDOM VALUE!`);
    process.exit(1);
}

const domain_random = secrets.custom_domain_random as string;

/**
 * Endpoint for setting the private domain webhook.
 * 
 * @param data {HTTPEndpointParams} HTTP endpoint parameters
 */
export default async function privateWebhookEndpoint(data: HTTPEndpointParams): Promise<APIResponse> {
    
    if(!data.bananacrumbs_id || !data.bananacrumbs_token) {
        return makeError("You must be logged in to use this endpoint (TempMail Plus or higher NOT required for DELETE).");
    }
    
    
    if(data.method === "DELETE") {
        if(!data.query) return makeError("No query string found (required for DELETE)");
        
        const domain = data.query.get("domain");
        
        if(!domain) {
            return makeError("Missing 'domain' in query parameter");
        }
        
        await RedisController.instance.deleteCustomWebhook(domain, data.bananacrumbs_id);
    } else if(data.method === "GET") {
        if(!data.query) return makeError("No query string found (required for GET)");
        
        const domain = data.query.get("domain");
    
        if(!domain) {
            return makeError("Missing 'domain' in query parameter");
        }
        
        const hash = createHash("SHA512").update(data.bananacrumbs_id + (domain_random).repeat(2) + domain);
        
        const value = hash.digest("hex").substring(16);
        
        return {
            body: JSON.stringify({
                txt_name: value,
                txt_value: "tm-custom-domain-verification",
            } as PrivateWebhookResponseType),
            status_code: 200,
        };
    } else if(data.method !== "POST") {
        return makeError("Invalid method. Must be POST or DELETE.", 405);
    }
    
    //POST
    
    const body = JSON.parse(data.body);
    
    if(!body || !body.url) {
        return makeError("Missing 'url' in JSON POST data.", 400);
    } else if(!body.domain) {
        return makeError("Missing 'domain' in JSON POST data.", 400);
    }
    
    if(data.premium_tier !== PremiumTier.TEMPMAIL_ULTRA) {
        return makeError("You must have TempMail Ultra or have Private Webhooks on TempMail Enterprise to use this endpoint.\n" +
            "To delete a webhook, make a DELETE request this endpoint.");
    }
    
    const url = body.url as string;
    
    const v = validateWebhook(url);
    
    if(v === "invalid") {
        return makeError("Webhook URL is not valid", 400);
    } else if(v === "too_long") {
        return makeError("Webhook URL is too long", 400);
    }
    
    if(!(await verifyCustomDomainOwner(data.bananacrumbs_id, body.domain))) {
        return makeError("Could not verify ownership of domain.", 400);
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
