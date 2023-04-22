import { TcpMiddleware } from "./lib/tcp_middleware";
import CONFIG from "./config";

for  (const config of CONFIG.TCP_CONFIG) {

    new TcpMiddleware(config.tcpPort, config.webSocketPort);
}