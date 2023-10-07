import {HTTPCode} from "../../struct/HTTPCode";
import {APIResponse} from "../../struct/api_data/v2/APIResponse";
import {TempMailErrorCodes} from "../../static/TempMailErrorCodes";

export default function makeError(error: string, code: HTTPCode, errorCode: TempMailErrorCodes): APIResponse {
    return {
        body: JSON.stringify({
            error,
            code: errorCode,
        }),
        status_code: code,
    };
}
