import fs from 'fs';
import url from 'url';
import express, { Request, Response } from 'express';
import { resolve } from 'path';
import { projPath } from '../server';
import { jot, jotErr } from '../debug';
import { o2s } from '../misc';
import { Compiler } from '../compiler/compiler';
export const micro = express.Router();

type ResultObj = {
	err: boolean;
	non: string[];
	files: string[];
	dirs: { [key: string]: string[] };
	risky: string[];
	failed: string[];
}

type Queries = {
	listNonExistent?: string;
	fingerprintAg?: string;
	path?: string;
	compilePath?: string;
}
export function fullPath(rel: string) {
	return resolve(projPath + `/` + rel);
}
const tplExt = [`.hbs`, `.md`];
const checkExt = (tester: (ext: string) => boolean) => tplExt.find(tester);
const getExt = (path: string) => `.` + path.getLast(`.`);
micro.all('*', (req, res) => {
	// res.setHeader('Access-Control-Allow-Origin', '*');
	const query = url.parse(req.url || ``, true).query as Queries;
	// res.json({ hello: `world`, query }); return;

	function err(why: string) {
		res.json({ err: why });
	}

	const listNonExistent = query.listNonExistent;
	const compilePathRelative = query.compilePath;

	if (compilePathRelative) {
		if (!isSecurePath(fullPath(compilePathRelative))) return;
		new Compiler().compileAgent(compilePathRelative).then((result) => {
			res.json(result);
		}).catch(jotErr);
	} else if (typeof listNonExistent === 'string') {
		const arr = listNonExistent.split(`,`);
		const obj: ResultObj = { err: false, non: [], files: [], dirs: {}, risky: [], failed: [] };
		arr.forEach(x => {
			let exists = false;
			let rel = x;
			x = fullPath(x);
			try {
				exists = fs.existsSync(x);
			} catch (err) {
				// obj.failed.push(rel);
			}
			if (!exists)
				try {
					const found = checkExt(e => {
						jot(`checking if ${x + e} exists :::` + fs.existsSync(x + e));
						return fs.existsSync(x + e);
					});
					exists = !!found;
					if (found) {
						const ext = getExt(found);
						rel += ext;
						x += ext;
					}
					jot(`report: ${o2s({ exists, rel, x })}`);
				} catch (err) {
					obj.failed.push(rel);
				}

			if (exists && !isSecurePath(x, () => { }))
				obj.risky.push(rel);
			else
				try {
					if (!exists)
						obj.non.push(rel);
					else if (fs.lstatSync(x).isDirectory())
						obj.dirs = { ...obj.dirs, [rel]: listFilesInFolder(x).list };
					else
						obj.files.push(rel);
				} catch (err) {
					obj.failed.push(rel);
				}
		});
		res.end(JSON.stringify(obj));
	} else if (query.fingerprintAg) {
		const path = fullPath(query.fingerprintAg);
		if (!isSecurePath(path)) return;
		if (!fs.existsSync(path)) {
			err(`path not found`);
			return;
		}
		const obj = readEntireDir(path);
		res.end(hashStrArr(obj));
		// res.end(JSON.stringify(obj, null, 2));

		// } else if (query.path) {
		// 	const path = fullPath(query.path);
		// 	if (!securePath(path)) return;
		// 	// get the list of files in the path:
		// 	const obj = listFilesInFolder(path);
		// 	obj.list = obj.list.filter(x => isAllowedType(x));
		// 	// send the list of files as a response:
		// 	res.end(JSON.stringify(obj));
	} else {
		// send an error response:
		res.end(JSON.stringify({ err: `no action item, sorry` }));
		// res.end(JSON.stringify({ myReq: JSON.stringify(req) }));
	}
	function isSecurePath(path: string, err_?: (reason: string) => void) {
		if (!err_) err_ = err;
		path = path.replace(/\\/g, `/`);
		path = path.replace(/\/\//g, `/`);
		if (!path.startsWith(projPath)) {
			err_(`path must start with "${projPath}"`);
			return false;
		}
		if (path.includes(`/../`)) {
			err_(`path must not include ".."`);
			return false;
		}
		if (!path.includes(`.ag`)) {
			err_(`path must include ".ag" folder, but it is \`${path}\``);
			return false;
		}
		return path;

	}
});

function isAllowedType(x: string) {
	return checkExt(e => x.endsWith(e)) || x.endsWith('.ts');
}

function lewHash32(key: string, size: number) {
	const hash = Array(size).fill(1981), limitToBits = (x: number, bits: number) => x & (2 ** bits - 1), pass = (acc: number, val: number) => {
		acc += val;
		acc += acc << 10;
		acc ^= acc >> 6;
		return acc;
	};
	let i = key.length;
	while (i--) {
		const b = i % size;
		hash[b] = pass(hash[b], key.charCodeAt(i));
	}
	for (let u = size - 1; u >= 0; --u)
		for (i = 1; i < size; ++i) {
			hash[i] = pass(hash[i], hash[u]);
			hash[u] = pass(hash[u], hash[i]);
		}
	if (hash.length == 1)
		return [limitToBits(hash[0], 32)];
	return hash.map((x, i) => limitToBits(x, 32));
}


function isStr(x: any) {
	return typeof x === 'string' || x instanceof String;
}
function readEntireDir(path: fs.PathLike) {
	if (!fs.existsSync(path)) return [];
	const paths = readEntireDirPaths(path).filter(isAllowedType);
	const contents = paths.map(fn => {
		return `file:${fn}, cont: ${fs.readFileSync(fn, 'utf8')}`;
	});
	return contents;
}
function hashStrArr(arr: string[]) {
	return lewHash32(arr.join(``), 8).map(x => x.toString(36)).join(``);
}

function readEntireDirPaths(path: fs.PathLike) {
	const walk = (dir: fs.PathLike) => {
		let results: string[] = [];
		const list = fs.readdirSync(dir);
		list.forEach((file) => {
			file = dir + '/' + file;
			const stat = fs.statSync(file);
			if (stat && stat.isDirectory()) {
				/* Recurse into a subdirectory */
				results = [...results, ...walk(file)];
			} else {
				/* Is a file */
				results.push(file);
			}
		});
		return results;
	};
	return walk(path);
}

function listFilesInFolder(path: fs.PathLike) {
	try {
		const files = fs.readdirSync(path);
		return { err: false, list: files }
	} catch (err: any) {
		return { err: `Reading error: ${err.message || JSON.stringify(err)}`, list: [] };
	}
}


