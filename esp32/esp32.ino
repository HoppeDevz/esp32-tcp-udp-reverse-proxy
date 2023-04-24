#include "WiFi.h"
#include "WebSocketsClient.h"
#include "ArduinoJson.h"

#include "connection_linked_list.h"
#include "tcp_middleware.h"

const int bufferSize = 1024;
uint8_t buffer[bufferSize];

const char* ssid = "Rancho Wifi";
const char* password = "guga@123";

const int tcpMiddlewareAmount = 1;
tcpMiddleware tcpMiddlewares[tcpMiddlewareAmount] = {
  { 32512, 30120, "192.168.1.80", new WebSocketsClient(), millis(), 20 * 1000, new ConnectionsLinkedList() }
};

struct socketData {
  const String socketId;
  const String event;
  char* packet;
};

socketData getSocketReceivedData(char* payload) {

  StaticJsonDocument<1024> JSON;
  DeserializationError error = deserializeJson(JSON, (char*)payload);

  if (error) {
    return { "ERROR", "ERROR" };
  }

  const String socketId = JSON["socketId"];
  const String event = JSON["event"];
  const String packet = JSON["packet"];
  const JsonArray bytesArr = JSON["packet"].as<JsonArray>();

  Serial.print("Received socket Data JSON Size:");
  Serial.print(JSON.memoryUsage());

  char* packetBuffer = (char*)malloc(bytesArr.size() + 1);

  for (int i = 0; i < bytesArr.size(); i++) {
    
    packetBuffer[i] = (char)bytesArr[i].as<int>();
  }
  
  return { socketId, event, packetBuffer };
}
    
void initializeSockets() {

  for (int currentIndex = 0; currentIndex < tcpMiddlewareAmount; currentIndex++) {

    tcpMiddlewares[currentIndex].reverseProxyClient->begin(reverseProxyAddress, tcpMiddlewares[currentIndex].reverseProxyPort);
    tcpMiddlewares[currentIndex].reverseProxyClient->onEvent([currentIndex](WStype_t type, uint8_t * payload, size_t length) {

      switch(type) {
    
        case WStype_DISCONNECTED:
          Serial.println("Disconnected from WebSocket Server");
          break;
          
        case WStype_CONNECTED:
          Serial.println("Connected to WebSocket Server");
          break;
          
        case WStype_TEXT:
        
          Serial.println("Message received from WebSocket Server: " + String((char *)payload));

          socketData data = getSocketReceivedData((char*)payload);
    
          if (data.socketId == "ERROR") {
            Serial.println("Error while trying to read JSON");
            return;
          }
    
          const String socketId = data.socketId;
          const String event = data.event;
          const char* packet = data.packet;
    
          Node* targetConnection = tcpMiddlewares[currentIndex].connections->getBySocketId(socketId);
        
          if (targetConnection == nullptr) {
    
            Serial.print("Creating TCP connection to ");
            Serial.print(tcpMiddlewares[currentIndex].localIpv4);
            Serial.print(":" + String(tcpMiddlewares[currentIndex].localPort));
            Serial.println(" for socketId: " + socketId);
            
            WiFiClient tcpClient;
    
            if (tcpClient.connect(tcpMiddlewares[currentIndex].localIpv4, tcpMiddlewares[currentIndex].localPort)) {
              
              tcpClient.print(packet);
              tcpMiddlewares[currentIndex].connections->insert(socketId, tcpClient);
    
              Serial.print("Created TCP connection to ");
              Serial.print(tcpMiddlewares[currentIndex].localIpv4);
              Serial.print(":" + String(tcpMiddlewares[currentIndex].localPort));
              Serial.println(" for socketId: " + socketId);
            }
            
          } else {
    
            if (event == "__SOCKET_DISCONNECTED__") {
    
              targetConnection->tcpClient.stop();
              tcpMiddlewares[currentIndex].connections->remove(targetConnection->socketId);
              
            } else {
    
              targetConnection->tcpClient.print(packet);
            }
            
          }
          
          break;
      }
    });
  }
}

void setup() {

  Serial.begin(115200);
  
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to Wi-Fi...");
  }
  
  Serial.println("Connected to Wi-Fi!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  initializeSockets();
}

void loop() {

  for (int i = 0; i < tcpMiddlewareAmount; i++) {

    tcpMiddlewares[i].reverseProxyClient->loop();

    if (millis() - tcpMiddlewares[i].lastHeartBeat > tcpMiddlewares[i].heartBeatInterval) {

      Serial.print("Sending Heartbeat to: ");
      Serial.print(reverseProxyAddress);
      Serial.print(":");
      Serial.println(tcpMiddlewares[i].reverseProxyPort);
      
      tcpMiddlewares[i].reverseProxyClient->sendPing();
      tcpMiddlewares[i].lastHeartBeat = millis();
    }

    Node* current = tcpMiddlewares[i].connections->head;
    while (current != nullptr) {

        Serial.println();
        Serial.print("Verifying connection: ");
        Serial.println(current->socketId);
        Serial.println();
        
        DynamicJsonDocument JSONArray(2048);
        int bytesReaded = 0;

        // Each byte is equal 16 bytes on DynamicJsonDocument
        // 100 bytes = 1600 bytes
        // let's reserve 100 bytes for the socketId
        // 2048 - 100 = 1948
        // 1948 / 16 = 121 bytes.
        
        while (current->tcpClient.available() > 0 && bytesReaded < 121) {

          current->tcpClient.readBytes(buffer, 1);

          JSONArray.add(buffer[0]);
          bytesReaded += 1;
        }

        if (bytesReaded > 0) {

          Serial.print("Total of bytes readed: ");
          Serial.println(bytesReaded);

          Serial.print("Array JSON memory size: ");
          Serial.println(JSONArray.memoryUsage());
          
          StaticJsonDocument<2048> JSON;
  
          JSON["socketId"] = current->socketId;
          JSON["packet"] = JSONArray;

          Serial.print("JSON memory size: ");
          Serial.println(JSON.memoryUsage());
          
          String stringifyJSON;
          serializeJson(JSON, stringifyJSON);
  
          Serial.println("StringifyJSON");
          Serial.println(stringifyJSON);
          
          tcpMiddlewares[i].reverseProxyClient->sendTXT(stringifyJSON);
  
          if (!current->tcpClient.connected()) {
  
              Serial.println("Socket: " + current->socketId + "disconnected!");
  
              StaticJsonDocument<1024> JSON;
  
              JSON["socketId"] = current->socketId;
              JSON["event"] = "__SOCKET_DISCONNECTED__";
              JSON.createNestedArray("packet");
  
              String stringifyJSON;
              serializeJson(JSON, stringifyJSON);
            
              tcpMiddlewares[i].reverseProxyClient->sendTXT(stringifyJSON);
              tcpMiddlewares[i].connections->remove(current->socketId);
          }
        }
        
        current = current->next;
    }
   
  }

}
