#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ESP32Servo.h>
#include <LiquidCrystal_I2C.h>
#include <Wire.h>
#include <ArduinoJson.h>

/* ========== WiFi Configuration ========== */
const char* ssid = "MM-227";          // Change to your WiFi name
const char* password = "Galib@cse";  // Change to your WiFi password
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

/* ------------ IR SENSORS ----------- */
#define IR_SLOT1 32  // IR sensor for slot 1
#define IR_SLOT2 33  // IR sensor for slot 2

/* --------- VARIABLES ---------- */
const int MAX_CARS = 10;  // Maximum number of cars that can be tracked
String activeUIDs[MAX_CARS];  // Array to store active RFIDs
unsigned long entryTimes[MAX_CARS];  // Array to store entry times
int activeCarCount = 0;  // Number of cars currently inside
unsigned long lastScanTime = 0;
int totalSlots = 2;  // Total parking slots available

// Slot monitoring variables
bool slot1Occupied = false;
bool slot2Occupied = false;
unsigned long lastSlotUpdateTime = 0;
const unsigned long SLOT_UPDATE_INTERVAL = 2000;  // Update every 2 seconds

// LCD display variables
unsigned long lastLCDUpdateTime = 0;
const unsigned long LCD_UPDATE_INTERVAL = 3000;  // Alternate LCD every 3 seconds
bool showWelcome = true;

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
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Entry Granted!");
        lcd.setCursor(0, 1);
        lcd.print("Welcome!");
        
        Serial.println("Entry granted.");
        http.end();
        return true;
      } else {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Entry Denied!");
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
        lcd.setCursor(0, 0);
        lcd.print("Exit Success!");
        lcd.setCursor(0, 1);
        lcd.print("Fee: Tk ");
        lcd.print(fee);
        
        Serial.print("Exit approved. Fee: ");
        Serial.print(fee);
        Serial.print(" Tk, Balance: ");
        Serial.println(newBalance);
        
        http.end();
        return true;
      } else {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Exit Denied!");
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

void updateLCDDisplay() {
  // Calculate physically occupied slots from IR sensors
  int physicallyOccupied = 0;
  if (slot1Occupied) physicallyOccupied++;
  if (slot2Occupied) physicallyOccupied++;
  
  // Available slots = total - physically occupied
  int availableSlots = totalSlots - physicallyOccupied;
  if (availableSlots < 0) availableSlots = 0;

  lcd.clear();
  if (showWelcome) {
    lcd.setCursor(0, 0);
    lcd.print("Welcome To");
    lcd.setCursor(0, 1);
    lcd.print("Smart Parking");
  } else {
    lcd.setCursor(0, 0);
    if (availableSlots > 0) {
      lcd.print("Slots Available:");
      lcd.setCursor(0, 1);
      lcd.print(availableSlots);
      lcd.print(" Space(s) Free");
    } else {
      lcd.print("Parking Full");
      lcd.setCursor(0, 1);
      lcd.print("No Space Available");
    }
  }
  showWelcome = !showWelcome;
}

void updateSlotStatus() {
  // Read IR sensors (LOW = car detected, HIGH = no car)
  bool slot1Detected = (digitalRead(IR_SLOT1) == LOW);
  bool slot2Detected = (digitalRead(IR_SLOT2) == LOW);

  // Check if status changed
  if (slot1Detected != slot1Occupied || slot2Detected != slot2Occupied) {
    slot1Occupied = slot1Detected;
    slot2Occupied = slot2Detected;

    Serial.println("Slot status changed:");
    Serial.print("Slot 1: ");
    Serial.println(slot1Occupied ? "OCCUPIED" : "FREE");
    Serial.print("Slot 2: ");
    Serial.println(slot2Occupied ? "OCCUPIED" : "FREE");

    // Send update to server
    sendSlotUpdateToServer();
  }
}

void sendSlotUpdateToServer() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(serverURL) + "/update-slots";
    
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    
    // Create JSON payload with slot statuses
    String payload = "{\"slots\":[";
    payload += "{\"slotNumber\":\"A01\",\"status\":\"" + String(slot1Occupied ? "occupied" : "available") + "\"},";
    payload += "{\"slotNumber\":\"A02\",\"status\":\"" + String(slot2Occupied ? "occupied" : "available") + "\"}";
    payload += "]}";
    
    Serial.println("Updating server...");
    Serial.println("Payload: " + payload);
    
    int httpCode = http.POST(payload);
    
    if (httpCode > 0) {
      String response = http.getString();
      Serial.println("Server response: " + response);
    } else {
      Serial.print("Update failed: ");
      Serial.println(httpCode);
    }
    
    http.end();
  }
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

  /* IR Sensors */
  pinMode(IR_SLOT1, INPUT);
  pinMode(IR_SLOT2, INPUT);

  /* RFID */
  SPI.begin(18, 19, 23, SS_PIN);
  rfid.PCD_Init();
  delay(100);
  rfid.PCD_DumpVersionToSerial();

  /* WiFi Connection */
  connectWiFi();

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Welcome To");
  lcd.setCursor(0, 1);
  lcd.print("Smart Parking");
  delay(3000);
  
  // Read initial IR sensor state and sync with server
  Serial.println("Syncing initial slot status with server...");
  slot1Occupied = (digitalRead(IR_SLOT1) == LOW);
  slot2Occupied = (digitalRead(IR_SLOT2) == LOW);
  Serial.print("Initial Slot 1: ");
  Serial.println(slot1Occupied ? "OCCUPIED" : "FREE");
  Serial.print("Initial Slot 2: ");
  Serial.println(slot2Occupied ? "OCCUPIED" : "FREE");
  sendSlotUpdateToServer();
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

  // Update slot status periodically
  if (millis() - lastSlotUpdateTime > SLOT_UPDATE_INTERVAL) {
    updateSlotStatus();
    lastSlotUpdateTime = millis();
  }

  // Update LCD display periodically
  if (millis() - lastLCDUpdateTime > LCD_UPDATE_INTERVAL) {
    updateLCDDisplay();
    lastLCDUpdateTime = millis();
  }

  if (millis() - lastScanTime < 1500) return;

  String uid = readRFID();
  if (uid == "") return;

  lastScanTime = millis();

  /* -------- ENTRY -------- */
  // Check if this RFID is already inside
  bool alreadyInside = false;
  for (int i = 0; i < activeCarCount; i++) {
    if (activeUIDs[i] == uid) {
      alreadyInside = true;
      break;
    }
  }
  
  if (!alreadyInside) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Verifying...");
    lcd.setCursor(0, 1);
    lcd.print("Please Wait");
    
    if (callEntryAPI(uid)) {
      delay(2000);  // Show "Entry Granted!" message
      
      openGate5Sec();
      
      // Add to active cars array if there's space
      if (activeCarCount < MAX_CARS) {
        activeUIDs[activeCarCount] = uid;
        entryTimes[activeCarCount] = millis();
        activeCarCount++;
      }

      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Gate Closing...");
      lcd.setCursor(0, 1);
      lcd.print("Drive Safely");
      delay(2000);
    }
  }

  /* -------- EXIT -------- */
  else if (alreadyInside) {
    // Find the car's entry time
    int carIndex = -1;
    unsigned long entryTime = 0;
    for (int i = 0; i < activeCarCount; i++) {
      if (activeUIDs[i] == uid) {
        carIndex = i;
        entryTime = entryTimes[i];
        break;
      }
    }
    
    if (carIndex >= 0) {
      unsigned long durationMin = (millis() - entryTime) / 60000;
      if (durationMin == 0) durationMin = 1;

      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Processing Exit");
      lcd.setCursor(0, 1);
      lcd.print("Duration: ");
      lcd.print(durationMin);
      lcd.print("min");
      
      delay(2000);

      if (callExitAPI(uid, durationMin)) {
        delay(2000);  // Show "Exit Success!" and fee message
        
        openGate5Sec();

        Serial.print("PARK TIME (min): ");
        Serial.println(durationMin);

        // Remove this car from active array
        for (int i = carIndex; i < activeCarCount - 1; i++) {
          activeUIDs[i] = activeUIDs[i + 1];
          entryTimes[i] = entryTimes[i + 1];
        }
        activeCarCount--;
        activeUIDs[activeCarCount] = "";  // Clear last slot
        entryTimes[activeCarCount] = 0;

        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Thank You!");
        lcd.setCursor(0, 1);
        lcd.print("Drive Safely");
        delay(2000);
      }
    }
  }

  /* -------- WRONG CARD -------- */
  else {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Wrong Card!");
    lcd.setCursor(0, 1);
    lcd.print("Access Denied");
    delay(2000);
  }
}
