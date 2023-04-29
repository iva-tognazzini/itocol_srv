import { Filk } from "filk";
import { jot, jotB } from "../debug";
import { o2sB } from "../misc";
import { resolve } from 'path';
import { isAModuleAtPath } from "./isAModule";
import { fullPath } from "../micro/micro";

const { execSync } = require('child_process')


const fs = require('fs');
type ResultCompiler = {
	err?: string;
}
export class Compiler {
	constructor() {

	}
	pathToVarName = (path: string) => `_` + path.swap(`.`, `_`).swap(`/`, `__`);
	async compileAgent(agentPath: string) {
		const paths = this.findProjectPaths(agentPath);
		// this.testSave(paths);
		jot(o2sB(paths));
		jot(`############`)//\ncompileAgent(${agentPath})`);
		const binPath = this.buildBotInclude(paths);
		// return { err: `just a test error, do not worry\nI will compile the agent\n${agentPath} soon` };
		return { err: ``, binPath };
	}
	buildBotInclude(paths: ProjPaths) {
		const agentVarName = paths.agentName.swap(`.`, `_`);
		const fullPaths = Filk.readEntireDir(paths.agentPath).map(f => f.swap(`//`, `/`));
		const relToSrc = fullPaths.map(f => f.slice(paths.src.length));
		const relToSrc_tsOnlyModules = relToSrc.filter(f => f.endsWith(`.ts`) && isAModuleAtPath(paths.src + `/` + f));
		const cdnDict: { [key: string]: string } = {};
		fullPaths/*.filter(f => !f.endsWith(`.ts`))*/.forEach(f => {
			cdnDict[`src/` + f.slice(paths.src.length)] = Filk.readFile(f);
		});
		jot(`before saving to ${paths.botInclude}`);






		this.saveFile(paths.botInclude, `
		${`/** ⚡️⚡️⚡️ this file was automatically generated at ${new Date().toISOString()}, do not edit it! ⚡️⚡️⚡️ */\n`.toUpperCase().repeat(10)}import { ITOCOL } from "itocol";
		${relToSrc_tsOnlyModules.map((f, i) =>
			`import/*!*/ * as in_${agentVarName}_${i} from './${f.cutLast(`.`)}';`
		).join(`\n`)}
		
		
		
		export const _b_${agentVarName}_ = "${paths.agentName}";
		
		ITOCOL.compilationCurrent = {name: "${paths.agentName}", path:"${paths.agentPathRel}"};
		ITOCOL.compilationDirectives["${paths.agentPathRel}"] = 
		{
			executables:{\n  
				${relToSrc_tsOnlyModules.map((f, i) =>
			`"src/${f}": in_${agentVarName}_${i}`).join(`,
				`)}
			},
			cdn: ${o2sB(cdnDict)},
		};
		
		`);






		this.saveFile(paths.botsLink, `
		import {_b_${agentVarName}_} from './${paths.botInclude.getLast(`/`).cutLast(`.`)}';
		export const currentAgBot = _b_${agentVarName}_;
		`);





		this.saveFile(paths.tsconfig, Filk.readFile(paths.tsconfigOrig)
			.swap(`tmp_js`, `tmp_js.${paths.agentName}`));




		this.saveFile(paths.botMain, `
		import { AgGate } from "itocol/lib/agBrowser/sys/AgGate";
		import { currentAgBot } from "./_CTB.all";
		import { ITOCOL } from "itocol";		
		const current = currentAgBot;		
		declare global {
			interface Window {
				ITOCOL_GATE: AgGate;
			}
		}		
		function deployItocolGate() {
			window.ITOCOL_GATE = ITOCOL.gate();
		}		
		deployItocolGate();		
/*
	compile with:
tsc -p ${paths.tsconfig.getLast(`/`)}

browserify tmp_js.${paths.agentName}/${paths.botMain.getLast(`/`).cutLast(`.`)}.js -o ./dist/${paths.agentName}.max.js -v

uglifyjs --compress --mangle -o ./dist/${paths.agentName}.min.js -- ./dist/${paths.agentName}.max.js

	*/
		`);
		jot(`Saved to ${paths.root}`);

		exec(`tsc -p ${paths.tsconfig.getLast(`/`)}`);
		exec(`browserify tmp_js.${paths.agentName}/${paths.botMain.getLast(`/`).cutLast(`.`)}.js -o ./dist/${paths.agentName}.max.js -v`);
		exec(`uglifyjs --compress --mangle -o ./dist/${paths.agentName}.min.js -- ./dist/${paths.agentName}.max.js`);
		function exec(cmd: string) {
			jot(`executing: ${cmd}`);
			return execSync(cmd, { cwd: paths.root }).toString();
		}
		const resultPath = `${paths.root}dist/${paths.agentName}.min.js`;
		jot(`Compiled to ${resultPath}`);
		return resultPath;

	}
	findProjectPaths(agentPath: string): ProjPaths {
		const agentPathRel = agentPath;
		agentPath = fullPath(agentPath);
		agentPath = Filk.folderize(agentPath);
		function folderUp(folder: string) {
			return Filk.folderize(resolve(folder + `/..`));
		}
		function exists(path: string) { return Filk.exists(path) }
		let current = agentPath;
		const r: ProjPaths = {
			src: ``, root: ``,
			agentPath, agentPathRel,
			agentName: Filk.unfolderize(agentPath).getLast(`/`),
			main: ``, botInclude: ``, botsLink: ``, botMain: ``, tsconfig: ``, tsconfigOrig: ``
		};
		for (let i = 0; i < 10; i++) {
			const xSrc = current + `src/`;
			if (exists(xSrc) && exists(xSrc + `main.ts`)) {
				r.src = xSrc;
				r.main = xSrc + `main.ts`;
				const pre = `${xSrc}_CTB.`;
				r.botInclude = `${pre}inc.${r.agentName}.ts`;
				r.botMain = `${pre}MAIN.${r.agentName}.ts`;
				r.botsLink = `${pre}all.ts`;
				r.tsconfig = current + `tsconfig.${r.agentName}.json`;
				r.tsconfigOrig = current + `tsconfig.json`;
			}
			if (exists(current + `package.json`) && exists(current + `tsconfig.json`)) {
				r.root = current;
				break;
			}
			current = folderUp(current);
		}

		return r;
	}
	private saveFile(name: string, cont: string) {
		fs.writeFileSync(name, cont);
	}
}


type ProjPaths = {
	agentName: string;
	agentPath: string;
	agentPathRel: string;
	src: string;
	root: string;
	main: string;
	botInclude: string;
	botMain: string;
	botsLink: string;
	tsconfig: string;
	tsconfigOrig: string;
}
