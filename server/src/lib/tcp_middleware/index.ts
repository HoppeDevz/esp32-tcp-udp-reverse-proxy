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

            const packet = { socketId: socket.id, packet: "__SOCKET_DISCONNECTED__" };

            this.reverseProxyClient.send(JSON.stringify(packet));

        }
    }

    private onTcpData(socket: SocketWithID, data: Buffer) {

        if (this.reverseProxyClient !== "NOT_CONNECTED_YET") {

            const packet = { socketId: socket.id, packet: data.toString() };

            this.reverseProxyClient.send(JSON.stringify(packet));

            console.log("[WEBSOCKET-SERVER] - Sended packet!", packet);
        }
        
    }

    private createTcpServer() {

        return net.createServer(socket => {

            const customSocket = socket as SocketWithID;
            const socketId = uuidv4();

            customSocket.id = socketId;

            this.clientsMap.set(socketId, customSocket);

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

            socket.addEventListener("message", event => {

                const message = event.data;

                if (typeof message !== "string") return;

                const parsedMessage = JSON.parse(message) as { socketId: string, packet: number[] };
                const targetClient = this.clientsMap.get(parsedMessage.socketId);

                const packet = Buffer.from(parsedMessage.packet);
                const stringifyPacked = packet.toString();

                console.log(`[WEBSOCKET-SERVER] - Received message`, { socketId: parsedMessage.socketId, packet, stringifyPacket: packet.toString() });

                try {

                    if (targetClient) {

                        if (stringifyPacked === "__SOCKET_DISCONNECTED__") {

                            targetClient.end();
                            targetClient.destroy();

                            this.clientsMap.delete(parsedMessage.socketId);

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