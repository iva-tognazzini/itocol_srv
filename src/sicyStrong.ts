import { lewHash32 } from "joto/lib/lewHash";
import { mulberry32 } from "joto/lib/rand";

export const mimeZipPrefix = `data:application/zip;base92,`;


let sicyCache: ReturnType<typeof sicy2generator> | undefined;
export function sicy2() {
	return sicyCache || (sicyCache = sicy2generator());
}

function sicy2generator() {
	function padStart(s: string, toSize: number, char = ' ') {
		return char.repeat(Math.max(0, toSize - s.length)) + s;
	}
	const D = 100000;

	type expType = {
		encode: (s: string, key?: number, fixKey?: boolean) => string;
		decode: (s: string, ifWrong?: string | undefined) => string | undefined;
		valid: (s: string) => string | false;
	};
	const sicy = {} as expType;
	const strKeyLen = 5,
		rMin = 32,
		rMax = 128; // non inclusive!
	const dist = rMax - rMin;
	function fromCharCode(n: number) {
		return String.fromCharCode(n);
	}
	const A = ',.[];:&)(}{-+=*@%\\#$!_|^'.split(''),
		B = A.map((x, i) => i.toString(36));
	//alert(B);
	function key2str(key: number, fixKey = false) {
		const k = key
			.toString(36)
			.slice(-strKeyLen)
		return fixKey ? k : k
			.split('')
			.map((a) => {
				const p = B.indexOf(a);
				const r = p != -1 && Math.random() < 0.5 ? A[p] : a;
				return Math.random() < 0.5 ? r : r.toUpperCase();
			})
			.join('');
	}
	function checksum(str: string, fixKey: boolean) {
		return key2str(lewHash32(str, 1)[0], fixKey);
	}
	function isValid(candidate: string) {
		const pre = candidate.slice(0, -strKeyLen);
		const postStr = candidate.slice(-strKeyLen);
		const post = str2key(postStr);
		const sum = str2key(checksum(pre, false));
		return sum == post ? pre : false;
	}
	function str2key(str: string) {
		const v36 = str
			.toLowerCase()
			.split('')
			.map((a) => {
				const p = A.indexOf(a);
				return p != -1 ? B[p] : a;
			})
			.join('');
		return parseInt(v36, 36);
	}
	sicy.valid = (s) => isValid(s);
	sicy.encode = (s, key, fixKey = false) => {
		function attempt(s: string, key?: number) {
			const max = 60466174;
			key = key || Math.floor(Math.random() * max);
			key = key % max;
			if (key < 10 ** 5) key += 10 ** 5;
			const seed =
				typeof key != 'undefined'
					? key
					: Math.floor((Date.now() / D) * 100) * D +
					Math.floor(Math.random() * D);
			const rand = mulberry32(seed);
			const upOne = (char: string, num: number) => {
				const code = char.charCodeAt(0);
				if (code < rMin || code >= rMax) return char;
				const r = (code - rMin + num) % dist;
				//return ',' + (r + rMin);
				return fromCharCode(r + rMin);
			};
			let metrics = '';
			for (let i = 0; i < s.length; ++i)
				metrics += upOne(s[i], (rand() % (rMax * 2)) + Math.round(i * Math.PI));

			const data = `${metrics}${padStart(key2str(key, fixKey), strKeyLen, '0')}`;
			return data + checksum(data, fixKey);
		}
		const food = s;
		let canned = ``,
			n = 8;
		while (n--) {
			canned = attempt(food, key);
			const cannedStr = JSON.stringify({ _: canned });
			if (sicy.decode(JSON.parse(cannedStr)._) === food) break;
		}
		return canned;
	};

	sicy.decode = (encodedWithChecksum, ifWrong = undefined) => {
		const encoded = isValid(encodedWithChecksum);
		if (!encoded) return ifWrong;
		const a = str2key(encoded.slice(-strKeyLen)),
			b = encoded.slice(0, -strKeyLen);
		const s = { timestampNano: a, length: b.length, metrics: b };
		const rand = mulberry32(s.timestampNano);
		const downOne = (char: string, num: number) => {
			const code = char.charCodeAt(0);
			if (code < rMin || code >= rMax) return char;
			let r = code - rMin - num;
			while (r < 0) r += dist;
			return fromCharCode(r + rMin);
		};
		let result = '';
		for (let i = 0; i < s.metrics.length; ++i)
			result += downOne(
				s.metrics[i],
				(rand() % (rMax * 2)) + Math.round(i * Math.PI)
			);
		return result;
	};
	return sicy;
}


function testSicy2() {
	let x = 15000, failed = 0;
	// eslint-disable-next-line no-console
	console.log(`Testing sicy2... ${x} times...`);
	while (x--) {
		const hello = (`Hello, ` + new Date().toISOString() + `!` + Math.random()).repeat(11);
		const enc = sicy2().encode(hello);
		const dec = sicy2().decode(enc);
		if (hello !== dec) failed++;
	}
	// eslint-disable-next-line no-console
	console.log(`sicy2 failed ${failed} times`);

}