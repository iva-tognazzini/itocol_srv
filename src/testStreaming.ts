import { Request, Response } from "express";
import { jot, jotErr } from "./debug";
export function testStreaming(app: any) {
    app.all('/words', (req: Request, res: Response) => {
        (async () => {
            res.writeHead(200, {
                'Content-Type': 'text/plain',
                'Transfer-Encoding': 'chunked'
            });

            async function write(str: string) {
                if (!res.write(str))
                    await new Promise(resolve => res.once('drain', resolve));
                else
                    await new Promise(resolve => process.nextTick(resolve));
            }

            let words = 'Each word will be sent one by one! '.repeat(1);
            // mix words:
            for (let i = 0; i < 50; i++)
                words = words.split(' ').sort(() => Math.random() - 0.5).join(' ');
            const wordArray = words.split(' ');

            for (let i = 0; i < wordArray.length; i++) {
                const str = ` ` + wordArray[i];
                jot(str);

                await write(str);
                // res.flush()
                // wait for a short time before sending the next word
                await new Promise(resolve => setTimeout(resolve, 200));
                if (i === wordArray.length - 1) {
                    res.end();
                }
            }
        })().catch(jotErr);
    });

}



export function testSocket_raw() {
    const WebSocket = require("ws");

    const server = new WebSocket.Server({ port: 5449 });

    server.on("connection", (socket: any) => {
        socket.on("message", (message: any) => {
            const messageParts = [
                "hello there!",
                "You sent me a random number",
                message,
                "thank you!",
            ].join().split(` `);

            // Stream the message word by word
            messageParts.forEach((word, index) => {
                setTimeout(() => {
                    socket.send(word);
                }, 1000 * index);
            });
        });
    });
}