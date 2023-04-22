#include "TaskScheduler.h"

class TcpRelay {
  
  public:
  
    TcpRelay(tcpRelay relay, Scheduler scheduler) {

      this->relay = relay;
      this->scheduler = scheduler;
    }

    void thread() {

      // this->localTargetThread();
      this->reverseProxyThread();
    }
  
    void reverseProxyThread() {

      if (!this->client.connected()) {

        if (this->client.connect((char*)REVERSE_PROXY_IP, (uint16_t)this->relay.proxyPort)) {

          Serial.print("Connection stabilished to reverse proxy at port: ");
          Serial.println(String(this->relay.proxyPort));
  
          this->client.print("SET_REVERSE_PROXY_CLIENT");
          
        } else {

          return;
        }
        
      }
      
      if (this->client.available()) {
        
        String message = this->client.readString();
        int pos = message.indexOf('\0');

        if (pos != -1) {

          String socketId = message.substring(0, pos);
          String packet = message.substring(pos + 1);
          
          // Faça algo com o ID e o pacote
          Serial.println("Socket ID: " + socketId);
          Serial.println("Pacote: " + packet);

          if (this->localClient.connected()) {

            this->localClient.print(packet);
          }
        }
      }
    }
    
  private:
    Scheduler scheduler;
    tcpRelay relay;
    WiFiClient client;
    WiFiClient localClient;
    
};
