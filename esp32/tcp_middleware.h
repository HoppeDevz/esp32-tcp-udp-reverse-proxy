// "149.56.174.85"
// "192.168.1.183"

const char* reverseProxyAddress = "192.168.1.183";

struct tcpMiddleware {

  int reverseProxyPort;
  int localPort;
  char* localIpv4;
  
  WebSocketsClient* reverseProxyClient;
  int lastHeartBeat;
  int heartBeatInterval;
  
  ConnectionsLinkedList* connections;
};
