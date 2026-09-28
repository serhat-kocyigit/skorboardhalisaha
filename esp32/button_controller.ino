/**
 * ESP32 Buton Kutusu - Arduino Kodu
 * 4 buton ile skor kontrolü
 * 
 * Buton 1: Ev Sahibi +1
 * Buton 2: Ev Sahibi -1
 * Buton 3: Deplasman +1
 * Buton 4: Deplasman -1
 * 
 * Wi-Fi üzerinden HTTP GET istekleri gönderir
 */

/*
#include <WiFi.h>
#include <HTTPClient.h>

// Wi-Fi Ayarları
const char* ssid = "WIFI_ISMI";
const char* password = "WIFI_SIFRE";

// Sunucu Ayarları
const char* serverUrl = "http://SUNUCU_IP:3000/api/esp32/score";

// Buton Pinleri
const int BTN_HOME_PLUS = 12;   // Ev Sahibi +1
const int BTN_HOME_MINUS = 14;  // Ev Sahibi -1
const int BTN_AWAY_PLUS = 27;   // Deplasman +1
const int BTN_AWAY_MINUS = 26;  // Deplasman -1

// LED Pin (durum göstergesi)
const int LED_PIN = 2;

// Debounce
unsigned long lastDebounce = 0;
const unsigned long debounceDelay = 300;

void setup() {
  Serial.begin(115200);
  
  // Buton pinleri
  pinMode(BTN_HOME_PLUS, INPUT_PULLUP);
  pinMode(BTN_HOME_MINUS, INPUT_PULLUP);
  pinMode(BTN_AWAY_PLUS, INPUT_PULLUP);
  pinMode(BTN_AWAY_MINUS, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  
  // Wi-Fi bağlantısı
  Serial.println("Wi-Fi'ye bağlanılıyor...");
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\nWi-Fi bağlandı!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
  
  // Bağlandı LED
  digitalWrite(LED_PIN, HIGH);
  delay(500);
  digitalWrite(LED_PIN, LOW);
}

void loop() {
  unsigned long now = millis();
  
  // Debounce kontrolü
  if (now - lastDebounce < debounceDelay) return;
  
  // Buton 1: Ev Sahibi +1
  if (digitalRead(BTN_HOME_PLUS) == LOW) {
    sendScore("home", "increment");
    lastDebounce = now;
  }
  
  // Buton 2: Ev Sahibi -1
  if (digitalRead(BTN_HOME_MINUS) == LOW) {
    sendScore("home", "decrement");
    lastDebounce = now;
  }
  
  // Buton 3: Deplasman +1
  if (digitalRead(BTN_AWAY_PLUS) == LOW) {
    sendScore("away", "increment");
    lastDebounce = now;
  }
  
  // Buton 4: Deplasman -1
  if (digitalRead(BTN_AWAY_MINUS) == LOW) {
    sendScore("away", "decrement");
    lastDebounce = now;
  }
  
  delay(50);
}

// HTTP ile skor güncelleme isteği gönder
void sendScore(const char* team, const char* action) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi baglantisi yok!");
    return;
  }
  
  HTTPClient http;
  String url = String(serverUrl) + "?team=" + team + "&action=" + action;
  
  Serial.print("Istek: ");
  Serial.println(url);
  
  http.begin(url);
  int httpCode = http.GET();
  
  if (httpCode > 0) {
    Serial.print("Yanit: ");
    Serial.println(httpCode);
    
    // Başarı LED flash
    digitalWrite(LED_PIN, HIGH);
    delay(100);
    digitalWrite(LED_PIN, LOW);
  } else {
    Serial.print("Hata: ");
    Serial.println(http.errorToString(httpCode));
    
    // Hata LED flash (3 kez)
    for (int i = 0; i < 3; i++) {
      digitalWrite(LED_PIN, HIGH);
      delay(50);
      digitalWrite(LED_PIN, LOW);
      delay(50);
    }
  }
  
  http.end();
}
*/

// NOT: Bu kod ESP32 Arduino IDE'sinde derlenmelidir.
// Yukarıdaki kodu kullanmak için comment'leri kaldırın.
// Wi-Fi ve sunucu bilgilerini kendi ortamınıza göre güncelleyin.
