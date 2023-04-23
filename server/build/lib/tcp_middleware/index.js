"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TcpMiddleware = void 0;
const net_1 = __importDefault(require("net"));
const ws_1 = require("ws");
const uuid_1 = require("uuid");
class TcpMiddleware {
    constructor(tcpPort, webSocketPort) {
        this.clientsMap = new Map();
        this.tcpPort = tcpPort;
        this.webSocketPort = webSocketPort;
        this.reverseProxyClient = "NOT_CONNECTED_YET";
        this.tcpServer = this.createTcpServer();
        this.webSocketServer = this.createWebsocketServer();
        this.startTcpServer();
    }
    onTcpError(socket, error) {
        console.log("[TCP-MIDDLEWARE] - Error!", socket.id, error);
    }
    onClientDisconnect(socket, hadError) {
        console.log("[TCP-MIDDLEWARE] - Client disconnected!", socket.id, hadError);
        if (this.reverseProxyClient !== "NOT_CONNECTED_YET") {
            const packet = { socketId: socket.id, event: "__SOCKET_DISCONNECTED__", packet: [] };
            this.reverseProxyClient.send(JSON.stringify(packet));
        }
    }
    onTcpData(socket, data) {
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
    createTcpServer() {
        return net_1.default.createServer(socket => {
            const customSocket = socket;
            const socketId = (0, uuid_1.v4)();
            customSocket.id = socketId;
            this.clientsMap.set(socketId, customSocket);
            console.log(`[TCP-SERVER] - Client connected! ${customSocket.id}`);
            customSocket.on("data", data => this.onTcpData(customSocket, data));
            customSocket.on("error", err => this.onTcpError(customSocket, err));
            customSocket.on("close", hadError => this.onClientDisconnect(customSocket, hadError));
        });
    }
    createWebsocketServer() {
        const websocketServer = new ws_1.Server({ port: this.webSocketPort });
        console.log(`[WEBSOCKET-SERVER] - Listening at ${this.webSocketPort}`);
        websocketServer.on("connection", socket => {
            console.log(`[WEBSOCKET-SERVER] - Client connected successfull`);
            this.reverseProxyClient = socket;
            socket.addEventListener("message", messageEvent => {
                const message = messageEvent.data;
                if (typeof message !== "string")
                    return;
                const parsedMessage = JSON.parse(message);
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
                }
                catch (err) {
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
    startTcpServer() {
        this.tcpServer.listen(this.tcpPort, () => {
            console.log(`[TCP-MIDDLEWARE] - TCP Server started at ${this.tcpPort}`);
        });
    }
}
exports.TcpMiddleware = TcpMiddleware;
