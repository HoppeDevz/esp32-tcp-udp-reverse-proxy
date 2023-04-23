import net from "net";
import { Server as WebsocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";

import type { WebSocket } from "ws";
import type { Server } from "net";
import type { SocketWithID } from "../../@types";


export class TcpMiddleware {

    private tcpPort: number;
    private webSocketPort: number;

    private reverseProxyClient: WebSocket | "NOT_CONNECTED_YET";

    private tcpServer: Server;
    private webSocketServer: WebsocketServer;

    private clientsMap = new Map() as Map<string, SocketWithID>;

    constructor(tcpPort: number, webSocketPort: number) {

        this.tcpPort = tcpPort;
        this.webSocketPort = webSocketPort;

        this.reverseProxyClient = "NOT_CONNECTED_YET";

        this.tcpServer = this.createTcpServer();
        this.webSocketServer = this.createWebsocketServer();

        this.startTcpServer();
    }

    private onTcpError(socket: SocketWithID, error: Error) {

        console.log("[TCP-MIDDLEWARE] - Error!", socket.id, error);
    }

    private onClientDisconnect(socket: SocketWithID, hadError: boolean) {

        console.log("[TCP-MIDDLEWARE] - Client disconnected!", socket.id, hadError);

        if (this.reverseProxyClient !== "NOT_CONNECTED_YET") {

            const packet = { socketId: socket.id, event: "__SOCKET_DISCONNECTED__", packet: [] };

            this.reverseProxyClient.send(JSON.stringify(packet));

        }
    }

    private onTcpData(socket: SocketWithID, data: Buffer) {

        if (this.reverseProxyClient !== "NOT_CONNECTED_YET") {


            // Each byte is equal 16 bytes on DynamicJsonDocument
            // let's reserve 100 bytes for the socketId
            // 1024 - 100 = 924 bytes
            // 924 / 16 = 57 bytes

            const MAX_PACKET_SIZE = 57;

            while (data.length > 0) {

                const removedBytes = data.slice(0, MAX_PACKET_SIZE);
                const newBuffer = Buffer.concat([data.slice(0, 0), data.slice(0 + MAX_PACKET_SIZE)]);

                data = newBuffer;

                const packet = { socketId: socket.id, packet: Array.from(removedBytes) };

                console.log("[WEBSOCKET-SERVER] - Sended packet!", packet);

                this.reverseProxyClient.send(JSON.stringify(packet));
            }
        }
        
    }

    private createTcpServer() {

        return net.createServer(socket => {

            const customSocket = socket as SocketWithID;
            const socketId = uuidv4();

            customSocket.id = socketId;

            this.clientsMap.set(socketId, customSocket);

            console.log(`[TCP-SERVER] - Client connected! ${customSocket.id}`);

            customSocket.on("data", data => this.onTcpData(customSocket, data));
            customSocket.on("error", err => this.onTcpError(customSocket, err));
            customSocket.on("close", hadError => this.onClientDisconnect(customSocket, hadError));
        });
    }

    private createWebsocketServer() {

        const websocketServer = new WebsocketServer({ port: this.webSocketPort });

        console.log(`[WEBSOCKET-SERVER] - Listening at ${this.webSocketPort}`);

        websocketServer.on("connection", socket => {

            console.log(`[WEBSOCKET-SERVER] - Client connected successfull`);

            this.reverseProxyClient = socket;

            socket.addEventListener("message", messageEvent => {

                const message = messageEvent.data;

                if (typeof message !== "string") return;

                const parsedMessage = JSON.parse(message) as { socketId: string, event: string, packet: number[] };
                
                const socketId = parsedMessage.socketId;
                const event = parsedMessage.event;
                const packet = Buffer.from(parsedMessage.packet);

                const targetClient = this.clientsMap.get(socketId);

                console.log(`[WEBSOCKET-SERVER] - Received message`, { socketId: socketId, packet, stringifyPacket: packet.toString() });

                try {

                    if (targetClient) {

                        if (event === "__SOCKET_DISCONNECTED__") {

                            targetClient.end();
                            targetClient.destroy();

                            this.clientsMap.delete(socketId);

                            return;
                        }

                        targetClient.write(packet);

                    }

                } catch(err) {

                    console.log("Error to send packet", parsedMessage);
                }
                

            });

            socket.on("close", stream => {

                console.log(`[WEBSOCKET-SERVER] - Client disconnected!`);

                this.reverseProxyClient = "NOT_CONNECTED_YET";
            });

            socket.on("error", err => console.log("[WEBSOCKET-SERVER] - Client error", err));
        });

        return websocketServer;
    }

    private startTcpServer() {

        this.tcpServer.listen(this.tcpPort, () => {

            console.log(`[TCP-MIDDLEWARE] - TCP Server started at ${this.tcpPort}`);
        });
    }
}