import { Filk } from "filk";
import { jot, jotB } from "../debug";

import ts from "typescript";



export function isAModule(theSrc: string): boolean {
	const isModule = isAModule_inner(theSrc);
	if (theSrc.includes(`export type Tw4Exe<VARS`)) {
		jot(`##################`);
		jot(`##################`);
		jot(`##################`);
		jot(`##################`);
		jot(`##################`);
		jot(`##################`);
		jot(theSrc);
		jot(`##################`);
		jot(`##################`);
		jot(`is module? ${isModule}`);

	}
	return isModule;
}

function isAModule_inner(theSrc: string): boolean {
	const sourceFile = ts.createSourceFile("temp.ts", theSrc, ts.ScriptTarget.ES2015, true, ts.ScriptKind.TS);
	for (const statement of sourceFile.statements) {
		if (
			ts.isExportDeclaration(statement) ||
			ts.isImportDeclaration(statement) ||
			(ts.isExpressionStatement(statement) &&
				ts.isCallExpression(statement.expression) &&
				statement.expression.expression.getText() === "define")
		) {
			return true;
		}
	}
	return false;
}

export function isAModuleAtPath(filePath: string) {
	return filePath.endsWith(`emptyState.ts`) || Filk.existsFile(filePath) && isAModule(Filk.readFile(filePath));
}