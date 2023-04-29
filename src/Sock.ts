import { jot, jotErr } from "./debug";
import { o2s, pause } from "./misc";



const END = `~<^END^>~`;

export class Sock {
    static #servers: Sock[] = [];
    static getServer(port: number) {
        const server = this.#servers.find(s => s.port === port);
        if (server) {
            throw new Error(`Server already exists on port ${port}, do not fetch the same server twice!`);
            return server;
        }
        const newServer = new Sock(port);
        this.#servers.push(newServer);
        return newServer;
    }
    private constructor(private readonly port: number) {
        const WebSocket = require("ws");

        this.server = new WebSocket.Server({ port: this.port });

    }
    private readonly server: any;
    onRequest(cb: (message: string, acts: {
        writeHere: (s: string) => void,
        end: () => void,
        error: (e: any) => void,
    }) => void) {
        this.server.on("connection", (socket: any) => {
            socket.on("message", (message: any) => {
                cb(message, {
                    writeHere: (s: string) => {
                        jot(`writeHere:`, s);
                        socket.send(s);
                    },
                    end: () => socket.send(END),
                    error: (e: any) => {
                        jotErr(e);
                        socket.send(`ERROR:: ${e.message || o2s(e)}`);
                        socket.send(END);
                    }
                });
            });
        });
    }
}
export function testSock() {
    const server = Sock.getServer(25449);
    server && server.onRequest((message, acts) => {
        const words = [
            "Yo there!",
            "You sent me a random number",
            message,
            "thank you!",
        ].join(` `).split(` `);

        (async () => {
            while (words.length) {
                const word = words.shift()!;
                acts.writeHere(word + ` `);
                jot(word);
                await pause(100);
            }
            acts.end();
        })().catch(jotErr);
    });
}