import fetch from "node-fetch";
import Email from "../entity/Email";
import FormData from "form-data";

export default function webhookSender(url: string, emails: Email[]) {
    
    if(url.startsWith("https://discord.com/api/webhooks/")) {
        console.log(`Sending ${emails.length} emails to a Discord webhook`);
        emails.forEach((email) => {
            const form = new FormData();
            const content = {
                content: "## TempMail Ultra Webhook\n" +
                    "**Subject**: " + email.subject + "\n" +
                    "**From**: " + email.from + "\n" +
                    "**To**: " + email.to + "\n",
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

webhookSender("https://discord.com/api/webhooks/1121639850555215875/AG0IvtDuHMTffrS2Q4hNIkx4SFy6EqjDnywHyw5aXQOySpz0AVLA4hTU0DsN4EBktGPX", [
    {
        body: "body1",
        from: "from1",
        html: "html1",
        to: "to1",
        subject: "subject1",
        ip: "ip1",
        date: 1
    },
    {
        body: "body2",
        from: "from2",
        html: "html2",
        to: "to2",
        subject: "subject2",
        ip: "ip2",
        date: 2
    }
]);
