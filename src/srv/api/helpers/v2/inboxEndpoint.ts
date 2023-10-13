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
import Email from "../../../../entity/Email";
import {TempMailErrorCode} from "../../../../static/TempMailErrorCode";

type EmailResponseType = {
    emails: Email[],
    expired: boolean,
};

/**
 * Handles the inbox endpoint.
 * 
 * There are two methods of handling the inbox endpoint: GET and DELETE.
 * 
 * @param data
 */
export default async function inboxEndpoint(data: HTTPEndpointParams): Promise<APIResponse> {
    try {
        
        if(!data.query) {
            throw new Error("Query is undefined");
        }
        
        //get the token from query
        const token = data.query.get("token");
        
        if(!token) {
            return {
                body: JSON.stringify({
                    error: "Unauthenticated",
                    code: TempMailErrorCode.NO_AUTH,
                }),
                status_code: 401,
            };
        }
        
        //get emails from an inbox
        if(data.method === "GET") {
            const emails = await EmailStorage.getInbox(token);
            
            //expired inbox
            if(!emails) {
                return {
                    body: JSON.stringify({
                        emails: [],
                        expired: true,
                    } as EmailResponseType),
                    status_code: 200,
                };
            }
            
            //inbox exists
            return {
                body: JSON.stringify({
                    emails: emails,
                    expired: false,
                } as EmailResponseType),
                status_code: 200,
            };
            
        } else {
            return {
                body: JSON.stringify({
                    error: "Method Not Allowed (POST /inbox/create to create an inbox: https://github.com/tempmail-lol/server/wiki/v2-API-Endpoints)",
                    code: TempMailErrorCode.INVALID_METHOD,
                }),
                status_code: 405,
            };
        }
        
    } catch(e) {
        return {
            body: JSON.stringify({
                error: "Internal Server Error: " + e,
                code: TempMailErrorCode.GENERIC_ERROR,
            }),
            status_code: 500,
        }
    }
}

