#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ESP32Servo.h>
#include <LiquidCrystal_I2C.h>
#include <Wire.h>
#include <ArduinoJson.h>

/* ========== WiFi Configuration ========== */
const char* ssid = "YOUR_WIFI_SSID";          // Change to your WiFi name
const char* password = "YOUR_WIFI_PASSWORD";  // Change to your WiFi password
const char* serverURL = "http://192.168.0.103:3000";  // Your backend server IP

/* ------------ RFID ------------ */
#define SS_PIN 5
#define RST_PIN 22
MFRC522 rfid(SS_PIN, RST_PIN);

/* ------------ SERVO ----------- */
#define SERVO_PIN 26
Servo gate;

/* ------------ LCD ------------- */
LiquidCrystal_I2C lcd(0x27, 16, 2);

/* --------- VARIABLES ---------- */
String activeUID = "";
unsigned long entryTime = 0;
bool carInside = false;
unsigned long lastScanTime = 0;
int assignedSlotId = 0;
String assignedSlotNumber = "";

/* ============================== */

void connectWiFi() {
  lcd.clear();
  lcd.print("Connecting WiFi");
  
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    lcd.setCursor(0, 1);
    lcd.print("Attempt: ");
    lcd.print(attempts + 1);
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    
    lcd.clear();
    lcd.print("WiFi Connected");
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP());
    delay(2000);
  } else {
    Serial.println("\nWiFi Connection Failed!");
    lcd.clear();
    lcd.print("WiFi Failed!");
    lcd.setCursor(0, 1);
    lcd.print("Check Settings");
    delay(3000);
  }
}

String readRFID() {
  if (!rfid.PICC_IsNewCardPresent()) return "";
  if (!rfid.PICC_ReadCardSerial()) return "";

  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (i > 0) uid += " ";  // Add space between bytes
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }

  uid.toUpperCase();
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();

  Serial.print("RFID UID: ");
  Serial.println(uid);

  delay(500);
  return uid;
}

void openGate5Sec() {
  gate.write(90);
  delay(5000);
  gate.write(0);
}

bool callEntryAPI(String rfid) {
  if (WiFi.status() != WL_CONNECTED) {
    lcd.clear();
    lcd.print("No WiFi!");
    delay(2000);
    return false;
  }

  HTTPClient http;
  String url = String(serverURL) + "/rfid-entry";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON payload
  String payload = "{\"rfid\":\"" + rfid + "\"}";
  
  Serial.println("Calling Entry API...");
  Serial.println("URL: " + url);
  Serial.println("Payload: " + payload);
  
  int httpCode = http.POST(payload);
  
  if (httpCode > 0) {
    String response = http.getString();
    Serial.println("Response: " + response);
    
    // Parse JSON response
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, response);
    
    if (!error) {
      bool allowed = doc["allowed"];
      const char* message = doc["message"];
      
      if (allowed) {
        assignedSlotId = doc["slotId"];
        assignedSlotNumber = String((const char*)doc["slotNumber"]);
        
        lcd.clear();
        lcd.print("ENTRY GRANTED");
        lcd.setCursor(0, 1);
        lcd.print("Slot: ");
        lcd.print(assignedSlotNumber);
        
        Serial.println("Entry granted. Slot: " + assignedSlotNumber);
        http.end();
        return true;
      } else {
        lcd.clear();
        lcd.print("ENTRY DENIED");
        lcd.setCursor(0, 1);
        lcd.print(message);
        
        Serial.print("Entry denied: ");
        Serial.println(message);
        delay(3000);
        http.end();
        return false;
      }
    } else {
      Serial.print("JSON parse error: ");
      Serial.println(error.c_str());
      http.end();
      return false;
    }
  } else {
    Serial.print("HTTP Error: ");
    Serial.println(httpCode);
    lcd.clear();
    lcd.print("Server Error");
    delay(2000);
    http.end();
    return false;
  }
}

bool callExitAPI(String rfid, unsigned long durationMin) {
  if (WiFi.status() != WL_CONNECTED) {
    lcd.clear();
    lcd.print("No WiFi!");
    delay(2000);
    return false;
  }

  HTTPClient http;
  String url = String(serverURL) + "/rfid-exit";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  String payload = "{\"rfid\":\"" + rfid + "\"}";
  
  Serial.println("Calling Exit API...");
  Serial.println("Payload: " + payload);
  
  int httpCode = http.POST(payload);
  
  if (httpCode > 0) {
    String response = http.getString();
    Serial.println("Response: " + response);
    
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, response);
    
    if (!error) {
      bool allowed = doc["allowed"];
      const char* message = doc["message"];
      
      if (allowed) {
        float fee = doc["fee"];
        float newBalance = doc["newBalance"];
        
        lcd.clear();
        lcd.print("EXIT OK");
        lcd.setCursor(0, 1);
        lcd.print("Fee: ");
        lcd.print(fee);
        lcd.print(" Tk");
        
        Serial.print("Exit approved. Fee: ");
        Serial.print(fee);
        Serial.print(" Tk, Balance: ");
        Serial.println(newBalance);
        
        delay(3000);
        
        lcd.clear();
        lcd.print("Balance: ");
        lcd.print(newBalance);
        lcd.print(" Tk");
        
        http.end();
        return true;
      } else {
        lcd.clear();
        lcd.print("EXIT DENIED");
        lcd.setCursor(0, 1);
        lcd.print(message);
        
        Serial.print("Exit denied: ");
        Serial.println(message);
        delay(3000);
        http.end();
        return false;
      }
    }
  } else {
    Serial.print("HTTP Error: ");
    Serial.println(httpCode);
    lcd.clear();
    lcd.print("Server Error");
    delay(2000);
    http.end();
    return false;
  }
  
  http.end();
  return false;
}

void setup() {
  Serial.begin(115200);

  /* LCD */
  Wire.begin(21, 17);
  lcd.init();
  lcd.backlight();
  lcd.print("Smart Parking");
  lcd.setCursor(0, 1);
  lcd.print("System v2.0");
  delay(2000);

  /* Servo */
  gate.attach(SERVO_PIN);
  gate.write(0);

  /* RFID */
  SPI.begin(18, 19, 23, SS_PIN);
  rfid.PCD_Init();
  delay(100);
  rfid.PCD_DumpVersionToSerial();

  /* WiFi Connection */
  connectWiFi();

  lcd.clear();
  lcd.print("Scan RFID");
}

void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    lcd.clear();
    lcd.print("WiFi Lost!");
    lcd.setCursor(0, 1);
    lcd.print("Reconnecting...");
    connectWiFi();
    lcd.clear();
    lcd.print("Scan RFID");
  }

  if (millis() - lastScanTime < 1500) return;

  String uid = readRFID();
  if (uid == "") return;

  lastScanTime = millis();

  /* -------- ENTRY -------- */
  if (!carInside) {
    lcd.clear();
    lcd.print("Checking...");
    
    if (callEntryAPI(uid)) {
      openGate5Sec();
      
      entryTime = millis();
      activeUID = uid;
      carInside = true;

      delay(2000);
      lcd.clear();
      lcd.print("Car Inside");
      lcd.setCursor(0, 1);
      lcd.print("Slot: ");
      lcd.print(assignedSlotNumber);
      delay(3000);
      lcd.clear();
      lcd.print("Scan RFID");
    }
  }

  /* -------- EXIT -------- */
  else if (carInside && uid == activeUID) {
    unsigned long durationMin = (millis() - entryTime) / 60000;
    if (durationMin == 0) durationMin = 1;

    lcd.clear();
    lcd.print("Checking Exit...");
    lcd.setCursor(0, 1);
    lcd.print("Time: ");
    lcd.print(durationMin);
    lcd.print("m");
    
    delay(2000);

    if (callExitAPI(uid, durationMin)) {
      openGate5Sec();

      Serial.print("PARK TIME (min): ");
      Serial.println(durationMin);

      // Reset system
      carInside = false;
      activeUID = "";
      entryTime = 0;
      assignedSlotId = 0;
      assignedSlotNumber = "";

      delay(3000);
      lcd.clear();
      lcd.print("Scan RFID");
    }
  }

  /* -------- WRONG CARD -------- */
  else {
    lcd.clear();
    lcd.print("WRONG CARD");
    lcd.setCursor(0, 1);
    lcd.print("Not Your Car!");
    delay(2000);
    lcd.clear();
    lcd.print("Scan RFID");
  }
}
