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
import {PremiumTier} from "../entity/PremiumTier";

const secrets = JSON.parse(readFileSync("./src/secrets.json").toString());

export default class BananaCrumbsUtils {
    
    private constructor() {}
    
    /**
     * 
     * @private
     */
    private static user_cache = new Map<string, string>();
    
    /**
     * 
     * @private
     */
    private static tmu_cache: string[] = [];
    
    private static subcode = secrets.subcode;
    
    /**
     * Check time for TempMail Ultra.
     * 
     * This is used only for webhook checking because only the user's BCID
     * is stored in the database.
     * 
     * @param id {string}
     * @returns {boolean} true if the user has TMU time, false otherwise
     */
    public static async checkTempMailUltraTime(id: string): Promise<boolean> {
        //no tests need to be done on the BCID since it has already been checked
        //before it was entered into the database
        
        const url = `https://passport.bananacrumbs.us/tempmail_ultra_login?id=${id}&subcode=${this.subcode}`;
        
        //check cache for ID hit
        if(this.tmu_cache.includes(id)) {
            return true;
        }
        
        try {
            const res = await fetch(url, {
                method: "GET",
            });
            
            //200 on success, 400+ on fail
            if(res.ok) {
                this.tmu_cache.push(id);
                return true;
            }
            
            return false;
        } catch(e) {
            return false;
        }
    }
    
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
     * @returns {Promise<boolean | "expired">}
     */
    public static async login(id: string, mfa_code: string): Promise<PremiumTier | "expired"> {
        
        //some tests
        if(!/^[0-9]{24}$/.test(id)) {
            return PremiumTier.NONE;
        }
        
        //my regex wasn't working for some reason
        if(mfa_code.length !== 6) {
            return PremiumTier.NONE;
        }
        
        if(isNaN(Number(mfa_code))) return PremiumTier.NONE;
        
        const url = `https://passport.bananacrumbs.us/login?id=${id}&mfa=${mfa_code}&subcode=${this.subcode}`;
        
        //make a request to the master server
        const ft = await fetch(url);
        
        try {
            if(!ft.ok) {
                return PremiumTier.NONE;
            }
            
            const data = await ft.text();
            
            if(data === "oopsie") {
                return PremiumTier.NONE;
            }
            
            const json: any = JSON.parse(data);
            
            let plus: boolean;
            let ultra: boolean;
            
            plus = json?.tempmail_plus_until > Date.now();
            ultra = json?.tempmail_ultra_until > Date.now();
            
            if(!plus && !ultra) {
                return "expired";
            }
            
            if(plus)
                return PremiumTier.TEMPMAIL_PLUS;
            else if(ultra)
                return PremiumTier.TEMPMAIL_ULTRA;
            
            return PremiumTier.NONE;
        } catch(e) {
            return PremiumTier.NONE;
        }
    }
    
    /**
     * Clear the user cache map in this class
     */
    public static clearUserCache() {
        this.user_cache.clear();
        this.tmu_cache = [];
    }
    
}

//every 10 minutes, clear the user cache
setInterval(() => {
    BananaCrumbsUtils.clearUserCache();
}, 1000 * 60 * 10);
