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

import createInbox from "./v2/createInbox";
import inboxEndpoint from "./v2/inboxEndpoint";
import RegisteredEndpoints from "./RegisteredEndpoints";
import statsEndpoint from "./v2/statsEndpoint";
import webhookEndpoint from "./v2/webhookEndpoint";
import communityEndpoint from "./v2/communityEndpoint";
import customEndpoint from "./v2/customEndpoint";
import privateWebhookEndpoint from "./v2/privateWebhookEndpoint";

export default function registerv2Endpoints() {
    RegisteredEndpoints.register("/inbox", inboxEndpoint);
    RegisteredEndpoints.register("/inbox/create", createInbox);
    RegisteredEndpoints.register("/stats", statsEndpoint);
    RegisteredEndpoints.register("/webhook", webhookEndpoint);
    RegisteredEndpoints.register("/community", communityEndpoint);
    RegisteredEndpoints.register("/custom", customEndpoint);
    RegisteredEndpoints.register("/private_webhook", privateWebhookEndpoint);
}
