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

import {HTTPEndpointParams} from "../../../../struct/api_data/v2/HTTPEndpointParams";
import {APIResponse} from "../../../../struct/api_data/v2/APIResponse";
import RedisController from "../../../../db/RedisController";

type StatsResponse = {
    emails_received: number,
    clients_connected: number,
};

export default async function statsEndpoint(_data: HTTPEndpointParams): Promise<APIResponse> {
    const res: StatsResponse = {
        emails_received: await RedisController.instance.getStats(),
        clients_connected: RedisController.instance.getConnectedCached(),
    };
    
    return {
        status_code: 200,
        body: JSON.stringify(res),
    };
};
