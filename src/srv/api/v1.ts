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
import RateLimitUtil from "../../util/RateLimitUtil";
import {readFileSync} from "fs";
import Config from "../../Config";
import EmailStorage from "../../util/EmailStorage";
import DatabaseController from "../../db/DatabaseController";
import {PremiumTier} from "../../entity/PremiumTier";
import Logger from "../../util/Logger";
import { APIResponse } from "../../struct/api_data/v2/APIResponse";

/**
 * THIS IS AN OLD VERSION OF THE TEMPMAIL API.       /
 * THIS IS AN OLD VERSION OF THE TEMPMAIL API.      /
 * THIS IS AN OLD VERSION OF THE TEMPMAIL API.     /
 * THIS IS AN OLD VERSION OF THE TEMPMAIL API.    /=====================================================================
 * THIS IS AN OLD VERSION OF THE TEMPMAIL API.   <======================================================================
 * THIS IS AN OLD VERSION OF THE TEMPMAIL API.    \=====================================================================
 * THIS IS AN OLD VERSION OF THE TEMPMAIL API.     \
 * THIS IS AN OLD VERSION OF THE TEMPMAIL API.      \
 * THIS IS AN OLD VERSION OF THE TEMPMAIL API.       \
 * 
 * 
 * 
 * No new updates will be made to version 1 of the API.  THIS WILL BE REMOVED STARTING 2025.
 * 
 * @param path {string}
 * @param ip {string}
 * @param account_id {string | undefined} 
 * @param account_token {string | undefined}
 * @param premiumTier {PremiumTier}
 */
export default async function v1(path: string, ip: string, account_id: string | undefined, account_token: string | undefined, premiumTier: PremiumTier): Promise<APIResponse> {
    if(path.includes("/generate")) {
        const b = RateLimitUtil.checkRateLimitGenerate(ip, account_id, premiumTier);
        if(b) return {
            body: JSON.stringify({ error: `rate limited (${premiumTier})`}),
            status_code: 429
        }
    }
    
    if(path.startsWith("/addpublic/")) {
        const domain = path.substring(11);
        if(!domain || domain.length === 0 || domain.length > 64) return {
            body: "no domain",
            status_code: 400
        }
        
        // @ts-ignore
        if(RateLimitUtil.checkRateLimitPubDomain(ip || "")) return {
            body: "rate limited",
            status_code: 429
        }
        
        if(!domain.match(/^(?!.*\.\.)[\w.\-]+(\.[a-zA-Z]{2,16})+(\/[\w.?%#&=\/\-]*)?$/)) return {
            body: "invalid domain",
            status_code: 400
        }
        
        try {
            const banned_words_raw = readFileSync("./banned_words.txt").toString();
            
            const bw = JSON.parse(Buffer.from(banned_words_raw.split("~")[1] as string, "base64").toString());
            
            for(let i = 0; i < bw.banned_words.length; i++){
                const b: string = bw.banned_words[i];
                if(domain.includes(b)) {
                    Logger.warn(`Domain ${domain} violates verification.`)
                    return {
                        body: "ok",
                        status_code: 200
                    }
                }
            }
            
        } catch(e) {
            Logger.error("Failed to read banned words file")
            Logger.error(JSON.stringify(e));
        }
        
        Config.checking_domains.push(domain);
        
        return {
            body: "ok",
            status_code: 200
        }
    } else if(path.startsWith("/generate/") && path.length > "/generate/".length + 3 && path !== "/generate/rush") {
        const domain = path.substring(10);
        
        try {
            const address = EmailStorage.generateAddress(domain, premiumTier, account_id, account_token);
            Logger.log(`Generated address ${address.address} for ${domain}`);

            return {
                body: JSON.stringify({
                    address: address.address,
                    token: address.token,
                }),
                status_code: 201,
                headers: {
                    "Content-Type": "application/json"
                }
            };
        } catch(e: any) {
            return {
                body: JSON.stringify({
                    error: "invalid domain",
                }),
                status_code: 400,
                headers: {
                    "Content-Type": "application/json"
                }
            };
        }
    } else if(path === "/generate") {
        const address = EmailStorage.generateAddress(undefined, premiumTier, account_id, account_token);
        Logger.log(`Generated address ${address.address}`);

        return {
            body: JSON.stringify({
                address: address.address,
                token: address.token,
            }),
            status_code: 201,
            headers: {
                "Content-Type": "application/json"
            }
        };
    } else if(path === "/generate/rush") {
        const address = EmailStorage.generateAddress(EmailStorage.getRandomCommunityDomain(), premiumTier, account_id, account_token);
        Logger.log(`Generated address ${address.address} (rush)`);

        return {
            body: JSON.stringify({
                address: address.address,
                token: address.token,
            }),
            status_code: 201,
            headers: {
                "Content-Type": "application/json"
            }
        };
    } else if(path.startsWith("/auth/")) {
        const token = path.substring("/auth/".length);
        const emails = await EmailStorage.getInbox(token);
        
        if(!emails) {
            return {
                body: JSON.stringify({
                    email: null,
                    token: "invalid"
                }),
                status_code: 200,
                headers: {
                    "Content-Type": "application/json"
                }
            };
        } else {
            emails.length !== 0 && Logger.log(`Got emails for ${(emails[0]?.to)} (${emails?.length} emails)`);

            return {
                body: JSON.stringify({
                    email: emails
                }),
                status_code: 200,
                headers: {
                    "Content-Type": "application/json"
                }
            };
        }
    } else if(path === "/stats") {
        DatabaseController.instance.getStats().then((r) => {
            return {
                body: JSON.stringify({
                    emails_received: r,
                    clients_connected: DatabaseController.connected,
                }),
                status_code: 200,
                headers: {
                    "Content-Type": "application/json"
                }
            };
        });
    } else if(path.startsWith("/custom/")) {
        
        try {
            if(premiumTier === PremiumTier.NONE) {
                return {
                    body: JSON.stringify({
                        error: "Not logged in or out of time"
                    }),
                    status_code: 402,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            }
            
            let token, domain;
            token = path.split("/")[2] as string;
            domain = path.split("/")[3] as string;
            const emails = await EmailStorage.getCustomInboxLegacy(token, domain);
            
            if(emails.length === 0) {
                return {
                    body: JSON.stringify({
                        email: null,
                    }),
                    status_code: 200,
                    headers: {
                        "Content-Type": "application/json"
                    }
                };
            }
            return {
                body: JSON.stringify({
                    email: emails,
                }),
                status_code: 200,
                headers: {
                    "Content-Type": "application/json"
                }
            };
        } catch(e) {
            Logger.error(`${e}`);
            return {
                body: JSON.stringify({
                    error: "internal server error"
                }),
                status_code: 500,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        }
    } else if(path.startsWith("/webhook/")) {
        
        if(!account_id) {
            return {
                body: JSON.stringify({
                    error: "You must be logged in to modify webhooks!",
                }),
                status_code: 401,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        }
        
        if(premiumTier !== PremiumTier.TEMPMAIL_ULTRA) {
            return {
                body: JSON.stringify({
                    error: "You must have TempMail Ultra to modify webhooks!",
                }),
                status_code: 402,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        }
        
        if(path.startsWith("/webhook/add/")) {
            try {
                //do not split by / because the webhook URL may contain /
                let webhook = path.substring("/webhook/add/".length);
                
                if(webhook.length > 256) {
                    return {
                        body: JSON.stringify({
                            error: "Webhook URL too long (please keep it under 256 characters)",
                        }),
                        status_code: 414,
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }
                }
                
                if(!webhook.startsWith("https://") && !webhook.startsWith("http://")) {
                    webhook = "https://" + webhook;
                }
                
                //match any valid URL
                if(!webhook.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/)) {
                    return {
                        body: JSON.stringify({
                            error: "Invalid URL",
                        }),
                        status_code: 400,
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }
                }
                const id = await DatabaseController.instance.setIDWebhook(account_id, webhook as string);
                return {
                    body: JSON.stringify({
                        success: true,
                        id: id,
                    }),
                    status_code: 200,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            } catch(e) {
                Logger.error(`${e}`);
                return {
                    body: JSON.stringify({
                        success: "false",
                    }),
                    status_code: 500,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            }
        } else if(path.startsWith("/webhook/remove")) {
            try {
                await DatabaseController.instance.deleteIDWebhook(account_id);
                return {
                    body: JSON.stringify({
                        success: true,
                    }),
                    status_code: 200,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            } catch(e) {
                Logger.error(`${e}`);
                return {
                    body: JSON.stringify({
                        success: "false",
                    }),
                    status_code: 500,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            }
        } else {
            return {
                body: JSON.stringify({
                    error: "Invalid URL",
                }),
                status_code: 404,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        }
        
    } else {
        return {
            body: JSON.stringify({
                error: "See https://github.com/tempmail-lol/server/wiki/API-Endpoints for more information on how to use the API.",
            }),
            status_code: 400,
            headers: {
                "Content-Type": "application/json"
            }
        }
    }

    return {
        body: JSON.stringify({
            error: "Invalid URL",
        }),
        status_code: 404,
        headers: {
            "Content-Type": "application/json"
        }
    }
}
