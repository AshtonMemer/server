import {createTransport} from "nodemailer";

const secrets = require("../../secrets.json");

export default class SendEmail {
    
    private static readonly SMTP_SERVER = "smtp.email.us-phoenix-1.oci.oraclecloud.com";
    private static readonly PORT = 587;
    
    private static sendEmail(content: string, to: string, subject: string) {
        const t = createTransport({
            host: this.SMTP_SERVER,
            port: this.PORT,
            secure: false,
            auth: {
                user: secrets.smtp.username,
                pass: secrets.smtp.password,
            },
        });
        
        t.sendMail({
            to: to,
            from: "noreply@tempmail.lol",
            sender: "noreply@tempmail.lol",
            encoding: "utf-8",
            subject: subject,
            text: content,
            html: `<html lang='en'><p>${content.replace(/\n/g, "<br>")}</p></html>`,
        }).then((info) => {
            console.log(`Email sent to ${to}: ${info.messageId}`);
        }).catch((e) => {
            console.error(`Error sending email to ${to}`);
            console.error(e);
        });
    }
    
    public static sendVerificationEmail(to: string, code: string, requestingIP: string) {
        this.sendEmail(`Your verification code for TempMail.lol is ${code}
        
        If you did not request this, someone probably entered their email wrong, and can be safely ignored.
        If you continue to get unwanted emails, feel free to block this email address through your email provider.
        
        This email was requested from the IP address ${requestingIP}.`,
            to, "Your verification code is " + code);
    }
    
    public static sendLoginEmail(to: string, code: string, requestingIP: string) {
        this.sendEmail(`Your login code for TempMail.lol is ${code}
        
        If you did not request this, someone probably entered their email wrong, and can be safely ignored.
        If you continue to get unwanted emails, feel free to block this email address through your email provider.
        
        This email was requested from the IP address ${requestingIP}.`,
            to, "Your login code is " + code);
    }
    
}
