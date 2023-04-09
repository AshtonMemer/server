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
     * @param premium {boolean} true if this is a premium inbox, false otherwise
     */
    public constructor(
        public readonly address: string,
        public readonly token: string,
        public readonly expiration: number,
        public emails: Email[],
        public readonly premium: boolean,
    ) {}
    
}
