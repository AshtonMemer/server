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
 * Email entity
 */
export default class Email {
    
    /**
     * Email constructor.
     *
     * @param from {string} the sender.
     * @param to {string} the recipient.
     * @param subject {string} the subject.
     * @param body {string} the body.
     * @param date {number} the date in unix millis.
     * @param ip {string} the ip address sending the email.
     * @param html {string | undefined} the HTML data of the email.
     */
    public constructor(
        public readonly from: string,
        public to: string,
        public readonly subject: string,
        public readonly body: string,
        public readonly date: number,
        public readonly ip: string,
        public readonly html: string | undefined,
    ) {}
}
