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


import  *  as  winston  from  'winston';
import 'winston-daily-rotate-file';

const transport = new winston.transports.DailyRotateFile({
    filename: 'application-%DATE%.log',
    datePattern: 'YYYY-MM-DD-HH',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    dirname: 'logs',
});

export default class Logger {
    
    private constructor() {}
    
    private static logger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss:ms',
            }),
            winston.format.json(),
        ),
        transports: [
            transport
        ],
    });
    
    public static log(message: string): void {
        this.logger.log("info", message);
    }
    
    public static warn(message: string): void {
        this.logger.log("warn", message);
    }
    
    public static error(message: string): void {
        this.logger.log("error", message);
    }
    
}
