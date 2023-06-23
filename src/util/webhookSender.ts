import fetch from "node-fetch";
import Email from "../entity/Email";
import FormData from "form-data";

export default function webhookSender(url: string, emails: Email[]) {
    
    const form = new FormData();
    
    if(url.startsWith("https://discord.com/api/webhooks/")) {
        emails.forEach((email) => {
            const content = {
                content: "## TempMail Ultra Webhook\n" +
                    "**Subject**: " + email.subject + "\n" +
                    "**From**: " + email.from + "\n" +
                    "**To**: " + email.to + "\n",
                // embeds: [
                //     {
                //         description: email.body.substring(0, 4096),
                //     }
                // ],
                attachments: [
                    {
                        id: 0,
                        description: "html",
                        filename: "email.html",
                    },
                    {
                        id: 1,
                        description: "text",
                        filename: "email.txt",
                    }
                ],
            };
            
            form.append("files[0]", email.html || "", {
                header: {
                    "Content-Type": "text/html",
                },
                filename: "email.html",
            });
            form.append("files[1]", email.body, {
                header: {
                    "Content-Type": "text/plain",
                },
                filename: "email.txt",
            });
            form.append("payload_json", JSON.stringify(content), {
                header: {
                    "Content-Type": "application/json",
                }
            });
            
            fetch(url, {
                method: "POST",
                headers: form.getHeaders(),
                body: form,
            }).then((r) => {
                if(r.status === 429) {
                    console.log("Webhook rate limited, retrying in 5 seconds");
                    setTimeout(() => {
                        webhookSender(url, [email]);
                    }, 5000);
                }
            })
        });
        
        return;
    } else {
        //send generic webhook data
        fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "TempMail Ultra Webhook/1.0",
                "X-Sender-URL": "https://tempmail.lol/",
            },
            body: JSON.stringify(emails),
        }).then((r) => {
            if(r.status === 429) {
                console.log("Webhook rate limited, retrying in 5 seconds");
                setTimeout(() => {
                    webhookSender(url, emails);
                }, 5000);
            }
        });
    }
}
