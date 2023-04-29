import http from 'http';

export async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
export function pause(ms: number) { return delay(ms); }


export async function fetchFromUrl(path: string) {
    return new Promise<string>(back => {
        http.get(path, (res) => {
            let body = "";

            res.on("data", (chunk) => {
                body += chunk;
            });

            res.on("end", () => {
                back(body);
            });

        }).on("error", (error) => {
            jotErr(error.message);
        });
    });
}

export async function postToUrl(host: string, port: number, path: string, postJson: any) {
    return new Promise<string>(back => {
        const json = JSON.stringify(postJson);
        const options = {
            hostname: host,
            port,
            path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(json)
            }
        };

        const req = http.request(options, (res) => {
            let body = "";

            res.on("data", (chunk) => {
                body += chunk;
            });

            res.on("end", () => {
                back(body);
            });
        });

        req.on('error', (error) => {
            jotErr(error);
        });

        req.write(json);
        req.end();
    });
}
import tls from 'tls';
import https from 'https';
import { jotErr } from './debug';


const defaultCiphers = ((tls as any).DEFAULT_CIPHERS as string).split(':');
const shuffledCiphers = [
    defaultCiphers[0],
    // Swap the 2nd & 3rd ciphers:
    defaultCiphers[2],
    defaultCiphers[1],
    ...defaultCiphers.slice(3)
].join(':');

export async function fetchFromUrlSSL(path: string) {
    return new Promise<string>(back => {
        https.get(path, {
            ciphers: shuffledCiphers,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36',

            }
        }, res => {
            let body = "";
            res.on("data", (chunk) => {
                body += chunk;
            });

            res.on("end", () => {
                back(body);
            });

        }).on("error", (error) => {
            jotErr(error.message);
        });
    });
}


/**
 * same as JSON.stringify, but simpler
 * @param o object to stringify
 * @param rpl if set to true - it will beautify the output. Otherwise - the "replacer" (same as in JSON.stringify)
 * @param s same as in JSON.stringify
 * @returns stringified 
 */
export function o2s(o: any, rpl?: `uncirculated` | true | null | ((this: any, k: string, v: any) => any), s?: string | number) {
    const cache: any[] = [];
    if (rpl === true) return JSON.stringify(o, null, ' ');
    else if (rpl == `uncirculated`) {
        rpl = (key: string, value: any) => {
            if (typeof value === 'object' && value !== null) {
                // Duplicate reference found, discard key
                if (cache.includes(value)) return;
                // Store value in our collection
                cache.push(value);
            }
            return value;
        };
        s = s || ` `;
    }
    return JSON.stringify(o, rpl as (this: any, key: string, value: any) => any, s);
}
export function o2sB(o: any) { return o2s(o, true) }
/**
 * same as JSON.parse, but won`t throw exception if the string is not valid JSON
 * @param s string to parse
 * @returns object or null if there were errors in the string
 */
export function s2o(s?: string | null): any {
    try {
        return JSON.parse(s || '');
    } catch (e: any) {
        // failed(() => `s2o parse error: ${e.message}\n\n==========\n\n${s}                \n\n==========`);
        return null;
    }
}


export function isArr<T>(x: any): x is T[] { return Array.isArray(x); }
// eslint-disable-next-line @typescript-eslint/ban-types
export function isObj(x: any): x is object { return typeof x === 'object' && !isArr(x); }
