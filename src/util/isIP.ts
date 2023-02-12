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

import {isMatch} from "super-regex";
import ipRegex from "ip-regex";

/**
 * Checks if the address is an IP address.
 * 
 * @param address {string} the address to check.
 * @returns {"4" | "6" | false} the IP version, or false if it is not an IP address.
 */
export default function isIP(address: string): "4" | "6" | false {
    const ip = isMatch(ipRegex({exact: true}), address.slice(0, 45), {timeout: 500});
    
    const v6 = isMatch(ipRegex.v6({exact: true}), address.slice(0, 45), {timeout: 500});
    
    return ip ? (v6 ? "6" : "4") : false;
}
