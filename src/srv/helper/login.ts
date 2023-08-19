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

import BananaCrumbsUtils from "../../util/BananaCrumbsUtils";
import {PremiumTier} from "../../entity/PremiumTier";
import {generateToken} from "node-2fa";
import {IncomingMessage, ServerResponse} from "http";

/**
 * Authenticates a from an HTTP request with his or her BCID
 * 
 * @param req {IncomingMessage} the incoming server message
 * @param res {ServerResponse} the server response for this request
 * 
 * @returns {false | undefined | {login_status: PremiumTier, account_id: string}} the account details, false if the user did not authenticate, or undefined if the user did not attempt to login.
 */
export default async function login(req: IncomingMessage, res: ServerResponse): Promise<false | undefined | {login_status: PremiumTier, account_id: string, account_token: string}> {
    //try logging into an account (if present)
    try {
        let bananacrumbs_id = req.headers["X-BananaCrumbs-ID".toLowerCase()] as string;
        let mfa_token = req.headers["X-BananaCrumbs-MFA".toLowerCase()] as string;
        
        if(!bananacrumbs_id || !mfa_token) {
            if(req.headers["authorization"]) {
                const auth = req.headers["authorization"];
                if(!auth || !auth.includes(",")) {
                    throw new Error();
                } else {
                    bananacrumbs_id = auth.split(",")[0] as string;
                    mfa_token = auth.split(",")[1] as string;
                }
            }
        }
        
        if(!mfa_token || !bananacrumbs_id) throw new Error();
        
        const tfa = generateToken(mfa_token);
        
        if(!tfa?.token) throw new Error();
        
        const login_status = await BananaCrumbsUtils.login(bananacrumbs_id, tfa?.token);
        
        //if the account is expired or has no time left
        if(login_status === "expired" || login_status === PremiumTier.NONE) {
            res.writeHead(402);
            res.end(JSON.stringify({
                "error": "expired account (please add more time)\nYou do not need an account to use the Free Tier.",
            }));
            return false;
        } else if(!login_status) {
            res.writeHead(403);
            res.end(JSON.stringify({
                "error": "Invalid account details (bad BananaCrumbs ID or Token)",
            }));
            return false;
        }
        
        return {
            login_status,
            account_id: bananacrumbs_id,
            account_token: mfa_token,
        };
        
    } catch(e) {}
    
    return undefined;
}
