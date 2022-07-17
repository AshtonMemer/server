/**
 * Describes an inbox.
 */
import Email from "./Email";

export default class Inbox {
    
    /**
     * Constructor.
     *
     * @param address {string} the address of the inbox
     * @param token {string} the resume token.
     * @param expiration {number} the expiration time of the inbox.
     * @param emails {Email[]} the emails in this inbox.
     */
    public constructor(
        public readonly address: string,
        public readonly token: string,
        public readonly expiration: number,
        public emails: Email[],
    ) {}
    
}
