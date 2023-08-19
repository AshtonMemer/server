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

export default function registerv2Endpoints() {
    RegisteredEndpoints.register("/inbox", inboxEndpoint);
    RegisteredEndpoints.register("/inbox/create", createInbox);
    RegisteredEndpoints.register("/stats", statsEndpoint);
}
