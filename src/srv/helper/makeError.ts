import {HTTPCode} from "../../struct/HTTPCode";
import {APIResponse} from "../../struct/api_data/v2/APIResponse";
import {TempMailErrorCode} from "../../static/TempMailErrorCode";

export default function makeError(error: string, code: HTTPCode, errorCode: TempMailErrorCode): APIResponse {
    return {
        body: JSON.stringify({
            error,
            code: errorCode,
        }),
        status_code: code,
    };
}
