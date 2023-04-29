import { Configuration, CreateChatCompletionRequest, CreateCompletionRequest, OpenAIApi } from "openai";
import { jot, jotErr } from "./debug";
import { getEnvVar } from "./enviro";
import { o2sB, s2o } from "./misc";
import { Sock } from "./Sock";
import { sicy2 } from "./sicyStrong";

function getOpenAPI() {
	const me = getOpenAPI as unknown as { openai?: OpenAIApi };
	if (me.openai) return me.openai;
	const configuration = new Configuration({
		apiKey: getEnvVar(`OPENAI_API_KEY`),
	});
	// console.log(`configuration:`, configuration);

	return me.openai = new OpenAIApi(configuration);

}

/// START OF copy from itocol/.../sysPrompt.ts types
enum SysModelMode {
	chat = `chat`,
	completion = `completion`,
}

export const sysModelsConfig = [
	{ model: `gpt-3.5-turbo-0301`, max: 3000, mode: SysModelMode.chat },
	{ model: `text-davinci-003`, max: 4000, mode: SysModelMode.completion },
	{ model: `gpt-4-0314`, max: 8000, mode: SysModelMode.chat },
	{ model: `gpt-4`, max: 8000, mode: SysModelMode.chat },
	{ model: `gpt-4-32k`, max: 32000, mode: SysModelMode.chat },
] as const;



export type PromptModel = typeof sysModelsConfig[number][`model`];
export type PromptConf = {
	prompt: string;
	model: PromptModel,
	tokens: number;
	temperature: number;
	top_p?: number;
	fp?: number;
	pp?: number;
	stop?: string[];
}
/// END OF copy from itocol/.../sysPrompt.ts types


type UnPromisify<T> = T extends Promise<infer U> ? U : T;

type RetGetOpenAI = ReturnType<typeof getOpenAPI>;
type RetCompletion =
	UnPromisify<ReturnType<RetGetOpenAI[`createCompletion`]>>
	| UnPromisify<ReturnType<RetGetOpenAI[`createChatCompletion`]>>

type SimpleAiConf = PromptConf & {
	onToken?: (s: string, full: string) => void;
}

// type T1 = CreateCompletionRequest;
// type T2 = CreateChatCompletionRequest;
// const x1 = {} as T2;
const defaultModel = `chat`;
export async function openAIPromptStream(param: SimpleAiConf) {
	// jot(`input conf is ${o2sB(param)}`);
	const conf = sysModelsConfig.find(a => a.model === param.model);
	if (!conf) throw new Error(`ERROR:: model ${param.model} not found in sysModelsConfig. Use one of these: ${sysModelsConfig.map(a => a.model).join(`, `)}`);

	const isChat = conf.mode === SysModelMode.chat;
	const openaiConf = {
		model: param.model,
		max_tokens: param.tokens ?? 100,
		temperature: param.temperature ?? 0.8,
		stream: true,
		top_p: param.top_p ?? 1,
		presence_penalty: param.pp ?? 0,
		frequency_penalty: param.fp ?? 0,
		...(param.stop && param.stop.length ? { stop: param.stop } : {}),
		// stop: param.stop || undefined,
		// stop: ["I:", "AI:", "You:"],
	};
	// jot(`current model conf is? ${o2sB(conf)}. `);
	jot(`current key is ${getEnvVar(`OPENAI_API_KEY`)}`);
	jot(`openai conf is ${o2sB(openaiConf)}`);
	let completion: RetCompletion;
	try {
		completion =
			isChat
				? await getOpenAPI().createChatCompletion(
					{ ...openaiConf, messages: [{ role: "user", content: param.prompt }], },
					{ responseType: "stream" }
				)
				: await getOpenAPI().createCompletion(
					{ ...openaiConf, prompt: param.prompt, },
					{ responseType: "stream" }
				);
	} catch (e: any) {
		jot(e.response);
		throw new Error(`Model Error: ${e?.response?.data?.error?.message || e?.message || o2sB(e)}`);
	}
	const onToken = (s: string, full: string) => param.onToken && param.onToken(s, full);
	return new Promise<string>((resolve, reject) => {
		let timeoutId: NodeJS.Timeout, isTimedOut = false;
		const resetTimeout = () => {
			if (timeoutId) clearTimeout(timeoutId);
			timeoutId = setTimeout(() => {
				isTimedOut = true;
				reject(`ERROR:: Timeout`);
			}, 1000 * 10);
		}
		resetTimeout();
		let acc = "", prevAcc = ``;
		const choice2text = (c: any) => {
			// jot(`current choice: ${o2sB(c)}`);
			return (isChat
				? c?.delta?.content
				|| c?.message?.content
				|| c?.message?.text
				: c?.text)
				|| ``;
		};
		(completion.data as any).on("data", (bufData: any) => {
			if (isTimedOut) return;
			resetTimeout();
			const key = `data:`;
			const allData = `` + (bufData?.toString() || ``);
			const lines = allData.split(`\n`).map(a => a.cutFirst(key).trim()).filter(a => a);
			lines.forEach(data => {
				// console.log(`<<<`, data?.toString(), `>>>`);
				if (data === "[DONE]") {
					const choices = completion.data?.choices;
					const res = choices ? choice2text(choices[0]) : ``;
					// jot(`res from completion:`, res);

					// onToken(result);
					resolve(acc);
				} else {
					try {
						const token = choice2text(JSON.parse(data)?.choices?.[0]);
						acc += token;
						if (acc !== prevAcc) {
							onToken(token, acc);
							prevAcc = acc;
						}
					} catch (e: any) {
						jotErr(`Error parsing! `, data, `\n\nERR:`, e)
					}
				}
			});
		});
	});
}


export async function initOpenSimpleWebsocket() {
	const server = Sock.getServer(25449);
	let i = 1;
	const sendFullEvery = 5;
	server && server.onRequest((message, acts) => {
		(async () => {
			const compressed = message.startsWith(`#`);
			function drop(s: string) {
				acts.writeHere(compressed ? sicy2().encode(s) : s);
			}
			if (compressed)
				message = sicy2().decode(message.cutFirst(`#`)) || message;
			const conf: SimpleAiConf = {
				...s2o(message),
				onToken: (currentToken, fullText) => {
					if (i++ % sendFullEvery === 0) drop(`!` + fullText);
					else
						drop(`.` + currentToken);
				}
			};
			// jot(`conf:`, conf);
			const result = await openAIPromptStream(conf);
			jot(`result:`, result);
			drop(`!` + result);
			acts.end();
		})().catch(acts.error);
	});
}

// async function openAIPrompt(prompt: string, tokens = 100, temperature = .9) {
//     const conf = {
//         // model: "text-chat-davinci-002-20230126",
//         model: "text-davinci-003",
//         prompt,
//         max_tokens: tokens,
//         temperature,
//     };
//     // jot(`conf:`, conf);

//     try {
//         const completion = await getOpenAPI().createCompletion(conf);
//         jot(`completion.data:`, completion.data);

//         const ch = completion.data.choices;
//         return ch[0].text;
//     } catch (e: any) {
//         jotErr(e);
//         return `ERROR:: ${e.message || o2sB(e)}`;
//     }
// }



// export async function aristocrat() {
//     const who = `Sir Lord Finterschbach`
//     const prompt = `${who} is very polite, but arrogant and spiteful aristocrat.

//     DIALOGUE:

// ${["What a tedious inconvenience. Hi. Can't you see I am of noble birth and far too important to be bothered by the likes of you?",
//             "Howdy, unfortunate one, but I am an aristocrat, not a commoner like yourself. Show some respect and leave me be.",
//             "Good morning to you too, but how dare you approach me without permission. Do you not realize my social standing is far above yours?",
//             "Hm... hello hello, but keep in mind, I am a member of the aristocracy and do not associate with the plebeian masses. Begone with you.",
//             "Yes, hi, but mind you, I am an aristocrat, not a servant. Show some decorum and do not bother me with your petty requests.", ``].map(a =>
//                 `You: Good Morning!\n${who}: ${a}`).map(x => x.trim()).join(`\n`)}`;
//     jot(`starting at ${new Date()}...`);
//     const result = await openAIPrompt(prompt);
//     jot(`finished`);


//     return [`<h2>Hello world from an Arrogant Noble Person</h2>`, result, `<small style=font-size:.7em;color:#777><pre>${prompt}</pre></small>`,
//         // modelsList.data.data.map(a => a.id).sort().join(`<br> `)
//     ];
// }
