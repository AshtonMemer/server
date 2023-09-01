import makeError from "../../../../helper/makeError";
import {createHash} from "crypto";
import {HTTPEndpointParams} from "../../../../../struct/api_data/v2/HTTPEndpointParams";
import {APIResponse} from "../../../../../struct/api_data/v2/APIResponse";
import {readFileSync} from "fs";

type PrivateWebhookResponseType = {
    txt_name: string,
    txt_value: string,
}

const secrets = JSON.parse(readFileSync("./src/secrets.json").toString());

if(!secrets.custom_domain_random) {
    console.error(`Custom domain random value missing from secrets.json`);
    process.exit(1);
}


const domain_random = secrets.custom_domain_random as string;

export default async function privateWebhookEndpointGET(data: HTTPEndpointParams): Promise<APIResponse> {
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
}
