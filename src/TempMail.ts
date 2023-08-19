#!/usr/env node

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

import EmailServer from "./srv/EmailServer";
import Config from "./Config";
import EmailStorage from "./util/EmailStorage";
import HTTPServer from "./srv/HTTPServer";
import Email from "./entity/Email";
import registerv2Endpoints from "./srv/api/helpers/registerv2Endpoints";

//pipe emails from the email server to the email storage
new EmailServer(Config.MAIL_PORT, (email: Email[]) => {
    //convert the `to` field to lowercase
    for(const e of email) {
        e.to = e.to.toLowerCase();
    }
    
    //add the emails to the storage
    email.forEach(async (email) => {
        await EmailStorage.addEmail(email);
    });
});

//start the http server
const http_server = new HTTPServer(Config.HTTP_PORT);
http_server.start();

registerv2Endpoints();
