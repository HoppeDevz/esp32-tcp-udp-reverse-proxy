#include "WiFi.h"
#include "TaskScheduler.h"
#include "config.h"
#include "port_forward.h"

const char* ssid = "Rancho Wifi";
const char* password = "guga@123";

Scheduler scheduler;
TcpRelay* invokedRelays[TCP_RELAYS_AMOUNT];
bool createdRelays = false;

void createTcpRelays() {

  for (int i = 0; i < TCP_RELAYS_AMOUNT; i++) {

    TcpRelay* relay = new TcpRelay(TCP_RELAYS[i], scheduler);
    invokedRelays[i] = relay;
  }

  createdRelays = true;
};

void setup() {
  // put your setup code here, to run once:

  Serial.begin(115200);
  
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to Wi-Fi...");
  }
  
  Serial.println("Connected to Wi-Fi!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  createTcpRelays();
}

void loop() {

  for (int j = 0; j < TCP_RELAYS_AMOUNT; j++) {
    
    invokedRelays[j]->thread();
  }
}
