
import cors from 'cors';
import express, { Request, Response } from 'express';
import fs from 'fs';
import https from 'https';
import { Stri } from "stri";
import { jot, jotErr } from './debug';
import { getEnvVar } from "./enviro";
import { initOpenSimpleWebsocket } from "./openSimple";
import { testSock } from "./Sock";
import { resolve } from 'path';
import { micro } from './micro/micro';

const HOST = '0.0.0.0';
Stri.includeMe();
// App
export const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '50mb' }));
// app.use(express.urlencoded({ extended: true }));
// app.use(bodyparser.json({limit: '3mb'}));
// export const isEmulator = fs.existsSync(`../emuProof/src`);

const cwd = process.cwd();

const args = process.argv.slice(2);
export const projPath = resolve(args[0] || `./`);
const PORT = args[1] || 55808;

// const useHTTPS = !true;
// jot(`yo! useHTTPS=${useHTTPS}`);
// if (useHTTPS) {
//     const path = `./certs/`;
//     const options = {
//         key: fs.readFileSync(`${path}privkey.pem`),
//         cert: fs.readFileSync(`${path}cert.pem`),
//     };
//     https.createServer(options, app).listen(PORT, () => {
//         jot(`args: ` + args.join(` `));
//         jot("Express server listening on port " + PORT);
//     });


// }
app.listen(PORT, () => {
	jot(`Listening on ${PORT}, at ${projPath} , cwd=${cwd}`);
});

const style = `<style>body{background-color:#001;color:#cc8;font-size:18px;}</style>`;

// app.all('/hello-aristocrat-8568a', (req: Request, res: Response) => {
//     (async () => {
//         res.send(style + (await aristocrat()).join(`<hr>`));
//     })().catch(jotErr);
// });

app.use(`/test-gate`, express.static(resolve(`../itocol_gate_test`)));

app.use(`/micro`, micro);

// app.all('/req/in', (req: Request, res: Response) => {

//     const sendStr = (str: string) => res.send(str);
//     const bodyObj = (req.body) || {};
//     // jot(`body obj is `, o2s(bodyObj));

//     function reqVar(name: string) {
//         return bodyObj[name] || req.query[name];
//     }
//     (async () => {
//         // const result = `did you say "${reqVar(`text`)}"?`;
//         // const result = `body is ${o2s(req.body)}`;
//         const result = await openAIPrompt(reqVar(`text`) as string);
//         sendStr(result || ``);
//     })().catch(jotErr);

// });


app.all(`/promitocol/list-flat`, (req: Request, res: Response) => {
	const path = req.query.path as string;
	function err(why: string) { res.json({ error: why, list: [] }); }
	function send(list: string[]) { res.json({ error: ``, list }); }
	if (!path.startsWith(`./`)) {
		err(`path must start with "./"`);
		return;
	}
	const myExePath = process.cwd();
	send([myExePath]); return;
	// get the listing of files in this path to const list:
	const list = fs.readdirSync(path);
	send(list.filter(n => n.endsWith(`.hbs`)));
});
app.use(`/`, express.static(projPath));

// testStreaming(app);
// testSock();
initOpenSimpleWebsocket().catch(jotErr);

// app.all('/*', (req: Request, res: Response) => {
//     const subPath = req.url || ``;
//     res.send(`${style}req.url=${subPath}<hr>[${getEnvVar(`a`)}]`);
// });

