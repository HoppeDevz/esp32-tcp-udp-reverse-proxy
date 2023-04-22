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
            const packet = { socketId: socket.id, packet: "__SOCKET_DISCONNECTED__" };
            this.reverseProxyClient.send(JSON.stringify(packet));
        }
    }
    onTcpData(socket, data) {
        if (this.reverseProxyClient !== "NOT_CONNECTED_YET") {
            const packet = { socketId: socket.id, packet: data.toString() };
            this.reverseProxyClient.send(JSON.stringify(packet));
            console.log("[WEBSOCKET-SERVER] - Sended packet!", packet);
        }
    }
    createTcpServer() {
        return net_1.default.createServer(socket => {
            const customSocket = socket;
            const socketId = (0, uuid_1.v4)();
            customSocket.id = socketId;
            this.clientsMap.set(socketId, customSocket);
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
            socket.addEventListener("message", event => {
                const message = event.data;
                console.log(`[WEBSOCKET-SERVER] - Received message`, message);
                if (typeof message !== "string")
                    return;
                const parsedMessage = JSON.parse(message);
                const targetClient = this.clientsMap.get(parsedMessage.socketId);
                if (targetClient) {
                    if (parsedMessage.packet === "__SOCKET_DISCONNECTED__") {
                        targetClient.end();
                        targetClient.destroy();
                        this.clientsMap.delete(parsedMessage.socketId);
                        return;
                    }
                    targetClient.write(parsedMessage.packet);
                }
            });
            socket.on("close", stream => {
                console.log(`[WEBSOCKET-SERVER] - Client disconnected!`);
                this.reverseProxyClient = "NOT_CONNECTED_YET";
            });
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
