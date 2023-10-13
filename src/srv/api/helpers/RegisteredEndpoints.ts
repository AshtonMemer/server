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

import {APIResponse} from "../../../struct/api_data/v2/APIResponse";
import {HTTPEndpointParams} from "../../../struct/api_data/v2/HTTPEndpointParams";
import Logger from "../../../util/Logger";

export default class RegisteredEndpoints {
    
    private constructor() {}
    
    public static endpoints: {path: string, function: (data: HTTPEndpointParams) => Promise<APIResponse>}[] = [];
    
    public static register(path: string, func: (data: HTTPEndpointParams) => Promise<APIResponse>) {
        Logger.log(`Registered endpoint ${path}`);
        
        this.endpoints.push({
            path: path,
            function: func,
        });
    }
}
