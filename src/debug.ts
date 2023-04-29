/* eslint-disable no-console */

import { isObj, o2sB } from "./misc";



export function isDebug() { return true; }

export function debuggerIf(moreReasons?: () => boolean) {
    if (isDebug() && (!moreReasons || moreReasons())) debugger;
}

type NotAPromise =
    (string | number | boolean | Record<string, any>) &
    Partial<Record<keyof PromiseLike<any>, never>>;


type JArg = NotAPromise | null | undefined;

export function jot(...args: JArg[]) {
    if (isDebug()) {
        // if (TRACE) {
        // console.groupCollapsed(...args);
        // console.trace(); // hidden in collapsed group
        // console.groupEnd();
        // } else {
        // jotCSS(...stack2info(getStack()));
        console.log(...args);
    }
}
export function jotty(...args: JArg[]) {
    if (isDebug())
        console.debug(...args);

}

export function jotCSS(...args: JArg[]) {
    // here, every even arg is a color, every odd - the text to be colored:
    if (isDebug()) {
        let str = ``;
        for (let i = 0; i < args.length; i += 2) {
            const color = args[i] + `;font-weight:bold;`;
            const text = args[i + 1];
            str += `%c${stringifyDebug(text)}%c`;
            args[i + 1] = color;
        }
        args[0] = str.slice(0, -2);
        jot(...args);
    }
}
function stringifyDebug(o: any) { return isObj(o) ? o2sB(o) : o; }
export function jotB(...args: JArg[]) {
    if (isDebug())
        jot(...args.map(stringifyDebug));

}
export function jotErr(...args: JArg[]) {
    if (isDebug()) {
        // jotCSS(...args);
        console.error(...args);
        // console.trace();
    }

}