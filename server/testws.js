const WebSocket = require('ws');

// Endereço do servidor WebSocket
const url = 'ws://192.168.1.183:3120/ws';

// Cria uma nova instância do WebSocket
const socket = new WebSocket(url);

// Evento que é disparado quando a conexão é aberta
socket.addEventListener('open', (event) => {
  console.log('Conexão aberta');

  // Envia uma mensagem para o servidor
  socket.send('Olá, servidor!');
});

// Evento que é disparado quando uma mensagem é recebida do servidor
socket.addEventListener('message', (event) => {
  console.log('Mensagem recebida:', event.data);
});

// Evento que é disparado quando a conexão é fechada
socket.addEventListener('close', (event) => {
  console.log('Conexão fechada:', event);
});

// Evento que é disparado quando ocorre um erro na conexão
socket.addEventListener('error', (event) => {
  console.log('Erro:', event);
});