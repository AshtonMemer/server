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
import EmailStorage from "../../../../util/EmailStorage";
import {TempMailErrorCodes} from "../../../../static/TempMailErrorCodes";

/**
 * Create a new temporary email inbox
 * 
 * Possible POST parameters:
 * - domain: Specific domain to use to create an inbox
 * - community: Create a random inbox with a community domain
 * - prefix: Prefix of the created inbox, otherwise random letters
 * 
 * https://github.com/tempmail-lol/server/wiki/v2-API-Endpoints#create-new-inbox
 * 
 * @param data {HTTPEndpointParams} the data passed to the endpoint
 * @returns {Promise<APIResponse>} the response
 */
export default async function createInbox(data: HTTPEndpointParams): Promise<APIResponse> {
    try {
        const json = JSON.parse(data.body);
        
        let domain: string | undefined;
        
        if(json.community) {
            domain = EmailStorage.getRandomCommunityDomain();
        }
        
        json.prefix = (json.prefix || "!").toString().toLowerCase();
        
        //if the prefix is invalid, set it to undefined to be made random
        if(!json.prefix.match(/^[0-9a-z]{0,12}$/)) {
            json.prefix = undefined;
        }
        
        //create an email address with the specified parameters
        const address = EmailStorage.generateAddress(domain || json.domain,
            data.premium_tier,
            data.bananacrumbs_id,
            data.bananacrumbs_token,
            json.prefix,
        );
        
        //return the created inbox with a status of `201 Created`
        return {
            status_code: 201,
            body: JSON.stringify({
                address: address.address,
                token: address.token,
            }),
        };
    } catch(e) {
        return {
            status_code: 400,
            body: JSON.stringify({
                error: `BananaCrumbs.US TempMail Endpoint ${e}.  Did you provide a valid domain name?`,
                code: TempMailErrorCodes.INVALID_DOMAIN_NAME,
            }),
        }
    }
}
