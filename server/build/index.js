"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tcp_middleware_1 = require("./lib/tcp_middleware");
const config_1 = __importDefault(require("./config"));
for (const config of config_1.default.TCP_CONFIG) {
    new tcp_middleware_1.TcpMiddleware(config.tcpPort, config.webSocketPort);
}
