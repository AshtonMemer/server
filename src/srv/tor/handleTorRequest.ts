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

import {IncomingMessage, ServerResponse} from "http";

/**
 * Handles TOR requests for index.
 * 
 * @param req {IncomingMessage} the IncomingMessage from the client.
 * @param res {ServerResponse} the ServerResponse to respond to.
 */
export default function(req: IncomingMessage, res: ServerResponse): any {
    req; res;
    // if(!req.url || !req.url.startsWith("/token/")) {
    //     res.writeHead(302, {
    //         "Location": `http://ttqp5vp3ylxrhpnfkehpzsslabaa7qxdur255jxgwmiisshv2wdntkid.onion/token/${address.token}/email/${address.address}`,
    //     });
    //     res.end();
    //     return;
    // }
    //
    // try {
    //     //the url will have the email address and token, so substring won't work.
    //     const token = req.url.split("/")[2];
    //     const address = req.url.split("/")[4];
    //    
    //     res.writeHead(200, {
    //         "Content-Type": "text/plain",
    //     });
    //    
    //     if(!token || !address) {
    //         return res.end("do you even url bro\ngo to ttqp5vp3ylxrhpnfkehpzsslabaa7qxdur255jxgwmiisshv2wdntkid.onion to generate a new inbox");
    //     }
    //    
    //     const emails = EmailStorage.getInbox(token);
    //    
    //     const head = `your inbox is: ${address}`;
    //    
    //     if(!emails) {
    //         res.end(head + "\nyou do not have any emails currently.  refresh to check.");
    //         return;
    //     }
    //    
    //     let email_body = "";
    //    
    //     emails.forEach((e) => {
    //         email_body += JSON.stringify(e, null, 4);
    //     });
    //    
    //     res.end(`${head}\nNote: refreshing will delete the email(s) currently on this page.\nEmail(s):\n\n${email_body}`);
    //    
    // } catch(e) {
    //     res.writeHead(400);
    //     res.end("something went wrong.  it's not me, it's you.  error 400.");
    //     return;
    // }
    //
}
