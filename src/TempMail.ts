#!

import EmailServer from "./srv/EmailServer";
import Config from "./Config";
import EmailStorage from "./util/EmailStorage";
import HTTPServer from "./srv/HTTPServer";
import Email from "./entity/Email";

new EmailServer(Config.MAIL_PORT, (email: Email[]) => {
    //convert the `to` field to lowercase
    for(const e of email) {
        e.to = e.to.toLowerCase();
    }
    email.forEach(EmailStorage.addEmail);
});

const http_server = new HTTPServer(Config.HTTP_PORT);
http_server.start();
