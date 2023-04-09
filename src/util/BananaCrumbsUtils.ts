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

import fetch from "node-fetch";
import {readFileSync} from "fs";

const secrets = JSON.parse(readFileSync("./src/secrets.json").toString());

export default class BananaCrumbsUtils {
    
    private constructor() {}
    
    /**
     * 
     * @private
     */
    private static user_cache = new Map<string, string>();
    
    private static subcode = secrets.subcode;
    
    /**
     * Test a user account by logging in.
     * 
     * On success, the User will be cached for 10 minutes to save API requests to
     * the BananaCrumbs server.  In this case, `true` will be returned.
     * 
     * On failure, either `false` or "expired" will be returned.  If false, there
     * was an issue with the login, user does not exist, or other error.  On
     * the "expire" string, the user exists, but does not have any time left on
     * their TempMail account.
     * 
     * @param id {string} the 24-number ID of the user.
     * @param mfa_code {string} the 6-number two-factor code.
     * @param token {string} the 36-ish character MFA token.
     * @returns {Promise<boolean | "expired">}
     */
    public static async login(id: string, mfa_code: string, token: string): Promise<boolean | "expired"> {
        
        //if the user has logged in recently, don't contact the master server
        if(this.user_cache.has(id)) {
            if(this.user_cache.get(id) === token) {
                return true;
            }
        }
        
        //some tests
        if(!/^[0-9]{24}$/.test(id)) {
            return false;
        }
        
        //my regex wasn't working for some reason
        if(mfa_code.length !== 6) {
            return false;
        }
        
        if(isNaN(Number(mfa_code))) return false;
        
        const url = `https://passport.bananacrumbs.us/login?id=${id}&mfa=${mfa_code}&subcode=${this.subcode}`;
        
        console.log(`url: ${url}`);
        
        //make a request to the master server
        const ft = await fetch(url);
        
        try {
            if(!ft.ok) {
                return false;
            }
            
            const data = await ft.text();
            
            //3am programming
            if(data === "oopsie") {
                return false;
            }
            
            const json: any = JSON.parse(data);
            
            if(json?.tempmail_plus_until < Date.now()) {
                console.log(`expired!`)
                return "expired";
            }
            
            this.user_cache.set(id, token);
            
            return true;
            
            
        } catch(e) {
            return false;
        }
    }
    
    /**
     * Clear the user cache map in this class
     */
    public static clearUserCache() {
        this.user_cache.clear();
    }
    
}

//every 10 minutes, clear the user cache
setInterval(() => {
    BananaCrumbsUtils.clearUserCache();
}, 1000 * 60 * 10);
