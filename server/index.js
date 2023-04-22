const net = require('net');

// Criação do servidor TCP
const server = net.createServer((socket) => {
  console.log('Cliente conectado');

  const httpServer = net.createConnection({
    host: '127.0.0.1', // Hostname do servidor HTTP de destino
    port: 9999 // Porta do servidor HTTP de destino
  });

  // Evento de recebimento de dados do cliente
  socket.on('data', (data) => {

    console.log(`Dados recebidos: ${data.toString()}`);

    httpServer.write(data);
  });

  httpServer.on('data', (data) => {

    console.log(`Dados recebidos do servidor HTTP: ${data.toString()}`);
    
    socket.write(data);
  });

  // Evento de fechamento da conexão com o cliente
  socket.on('close', () => {

    console.log('Cliente desconectado');
  });

});

// Define a porta em que o servidor irá escutar
const PORT = 8888;
server.listen(PORT, () => {
  console.log(`Servidor TCP escutando na porta ${PORT}`);
});