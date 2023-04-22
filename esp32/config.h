struct internalIpAddress {
  char* ipv4;
  int port;
};

struct tcpRelay {
  int proxyPort;
  internalIpAddress target;
};

const char* REVERSE_PROXY_IP = "192.168.1.183";

const int TCP_RELAYS_AMOUNT = 2;
tcpRelay TCP_RELAYS[TCP_RELAYS_AMOUNT] = {

  { 3120, { "192.168.1.80", 30120 } },
  { 3121, { "192.168.1.80", 30121 } }
};
