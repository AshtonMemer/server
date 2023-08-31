import {HTTPCode} from "../../struct/HTTPCode";
import {APIResponse} from "../../struct/api_data/v2/APIResponse";

export default function makeError(error: string, code: HTTPCode = 400): APIResponse {
    return {
        body: JSON.stringify({
            error
        }),
        status_code: code,
    };
}
