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

import mongoose from "mongoose";
import Logger from "../util/Logger";

if(mongoose.connection.readyState !== 1) {
    (async () => {
        await mongoose.connect("mongodb://127.0.0.1:27017/tempmail");
        Logger.log(`Ready state: ${mongoose.connection.readyState}`);
    })();
}

const email = new mongoose.Schema({
    premium: String,
    webhook: String,
    address: String,
    expires: Number,
    token: String,
});

export const Email = mongoose.model("Email", email);
