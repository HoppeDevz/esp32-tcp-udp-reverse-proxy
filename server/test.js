const net = require("net");

const tcpMiddleware = net.createConnection({
    host: "192.168.1.183",
    port: 3120
});

tcpMiddleware.write("IIIIXXXXYYYYZZZZESTE-E-O-PACOTE");