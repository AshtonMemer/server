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

import {contains} from "cidr-tools";
import isIP from "./isIP";

export default class RateLimitUtil {
    
    private constructor() {}
    
    public static readonly RATE_LIMITS_PUBDOMAIN: Map<string, number> = new Map();
    
    public static readonly RATE_LIMITS_GENERATE: Map<string, number> = new Map();
    
    public static readonly BANNED_IPS: string[] = [];
    
    public static readonly STRICTNESS_IPV4 = 30; //max 32, low = more strict
    public static readonly STRICTNESS_IPV6 = 115; //max 128, low = more strict
    
    public static checkRateLimitPubDomain(ip: string): boolean {
        const last_access = RateLimitUtil.RATE_LIMITS_PUBDOMAIN.get(ip);
        
        if(last_access) {
            if(Date.now() - last_access < 5000) {
                return true;
            }
        }
        
        RateLimitUtil.RATE_LIMITS_PUBDOMAIN.set(ip, Date.now());
        
        return false;
    }
    
    public static checkRateLimitGenerate(ip: string): boolean {
        //The IP is allowed to generate up to 30 inboxes every 5 minutes
        //Instead of having the value in the map be last access, it is the number of times the IP has accessed
        //the generate endpoint in the last 5 minutes.
        const count = RateLimitUtil.RATE_LIMITS_GENERATE.get(ip);
        
        for(const value of this.BANNED_IPS) {
            if(value === ip) {
                return true;
            }
            
            if(isIP(value) === "4") {
                if(contains(`${value}/${this.STRICTNESS_IPV4}`, ip)) {
                    console.log("yes");
                    return true;
                }
            }
            
            if(isIP(value) === "6") {
                if(contains(`${value}/${this.STRICTNESS_IPV6}`, ip)) {
                    console.log("yes");
                    return true;
                }
            }
            
        }
        
        if(count) {
            if(count >= 15) {
                const ver = isIP(ip);
                if(!ver) {
                    console.log(`Invalid IP: ${ip}`);
                    this.BANNED_IPS.push(ip);
                }
                
                if(ver === "4") {
                    this.BANNED_IPS.push(ip);
                    console.log(`Banned IP: ${ip}/${this.STRICTNESS_IPV4}`);
                }
                
                if(ver === "6") {
                    this.BANNED_IPS.push(ip);
                    console.log(`Banned IP: ${ip}/${this.STRICTNESS_IPV6}`);
                }
                
                return true;
            }
            
            RateLimitUtil.RATE_LIMITS_GENERATE.set(ip, count + 1);
        } else {
            RateLimitUtil.RATE_LIMITS_GENERATE.set(ip, 1);
        }
        return false;
    }
    
}

setInterval(() => {
    RateLimitUtil.RATE_LIMITS_PUBDOMAIN.clear();
    RateLimitUtil.RATE_LIMITS_GENERATE.clear();
}, 1000 * 60 * 5); //Clear the rate limits every 5 minutes.
