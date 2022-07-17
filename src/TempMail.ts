#!

import EmailServer from "./srv/EmailServer";
import Config from "./Config";
import EmailStorage from "./util/EmailStorage";
import HTTPServer from "./srv/HTTPServer";

new EmailServer(Config.MAIL_PORT, (email) => {
    email.forEach(EmailStorage.addEmail);
});

const http_server = new HTTPServer(Config.HTTP_PORT);
http_server.start();
