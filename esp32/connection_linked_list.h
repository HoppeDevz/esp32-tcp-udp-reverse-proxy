

struct Node {
    String socketId;
    WiFiClient tcpClient;
    Node* next;
};

class ConnectionsLinkedList {
  
  public:
      Node* head;
      ConnectionsLinkedList() : head(nullptr) {}
  
      // Método para inserir um novo nó na lista
      void insert(String socketId, WiFiClient tcpClient) {
          Node* newNode = new Node;
          newNode->socketId = socketId;
          newNode->tcpClient = tcpClient;
          newNode->next = nullptr;
  
          if (head == nullptr) {
              head = newNode;
          } else {
              Node* current = head;
              while (current->next != nullptr) {
                  current = current->next;
              }
              current->next = newNode;
          }
      }
  
      // Método para remover um nó da lista pelo socketId
      void remove(String socketId) {
          if (head == nullptr) {
              // cout << "A lista está vazia." << endl;
              return;
          }
  
          if (head->socketId == socketId) {
              Node* temp = head;
              head = head->next;
              delete temp;
              return;
          }
  
          Node* current = head;
          while (current->next != nullptr && current->next->socketId != socketId) {
              current = current->next;
          }
  
          if (current->next == nullptr) {
              // cout << "Nó com socketId " << socketId << " não encontrado na lista." << endl;
              return;
          }
  
          Node* temp = current->next;
          current->next = current->next->next;
          delete temp;
      }

      Node* getBySocketId(String socketId) {
        Node* current = head;
        while (current != nullptr) {
            if (current->socketId == socketId) {
                return current;
            }
            current = current->next;
        }
        return nullptr;
      }

  private:
      
};
