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

import * as https from "https";
import {RequestOptions} from "https";

import {readFileSync} from "fs";
const secrets = JSON.parse(readFileSync("./src/secrets.json").toString());

if(!secrets.discord.webhook) {
    console.error(`something wrong with the secrets file`);
}

export default function sendDiscordMessage(message: string) {
    
    try {
        
        const webhook_url = secrets.discord.webhook;
        
        const options: RequestOptions = {
            port: 443,
            host: "discord.com",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        };
        
        const body = JSON.stringify({
            content: message,
            allowed_mentions: {
                parse: [],
            }
        });
        
        const req = https.request(webhook_url, options, () => {});
        
        req.write(body);
        req.end();
    } catch(ignored) {}
    
}
