/*
 * Smart Parking System - ESP32 Code
 * Features:
 * - RFID Reader (RC522)
 * - Servo Motor for Gate Control
 * - IR Sensors for Slot Detection
 * - WiFi Connection to Backend Server
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ESP32Servo.h>
#include <ArduinoJson.h>

// WiFi Credentials
const char* ssid = "YOUR_WIFI_SSID";          // Change to your WiFi name
const char* password = "YOUR_WIFI_PASSWORD";   // Change to your WiFi password

// Server Configuration
const char* serverURL = "http://192.168.0.103:3000";  // Your backend server IP

// Pin Definitions
#define RST_PIN         22    // RFID Reset Pin
#define SS_PIN          21    // RFID Slave Select Pin
#define SERVO_PIN       13    // Servo Motor Pin (Gate)
#define IR_ENTRY_PIN    14    // IR Sensor at Entry
#define IR_EXIT_PIN     27    // IR Sensor at Exit
#define LED_GREEN       26    // Green LED (Success)
#define LED_RED         25    // Red LED (Error)
#define BUZZER_PIN      33    // Buzzer for alerts

// IR Sensors for Parking Slots (6 slots example)
int slotSensors[] = {32, 35, 34, 39, 36, 4};  // GPIO pins for slot IR sensors
int totalSlots = 6;

// RFID and Servo Objects
MFRC522 rfid(SS_PIN, RST_PIN);
Servo gateServo;

// Variables
String lastRFID = "";
unsigned long lastScanTime = 0;
const unsigned long scanCooldown = 2000;  // 2 seconds between scans

void setup() {
  Serial.begin(115200);
  
  // Initialize pins
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_RED, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(IR_ENTRY_PIN, INPUT);
  pinMode(IR_EXIT_PIN, INPUT);
  
  // Initialize slot sensors
  for (int i = 0; i < totalSlots; i++) {
    pinMode(slotSensors[i], INPUT);
  }
  
  // Initialize RFID
  SPI.begin();
  rfid.PCD_Init();
  
  // Initialize Servo
  gateServo.attach(SERVO_PIN);
  gateServo.write(0);  // Gate closed position
  
  // Connect to WiFi
  connectWiFi();
  
  Serial.println("Smart Parking System Ready!");
  blinkLED(LED_GREEN, 3);
}

void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }
  
  // Check for RFID card at entry
  if (digitalRead(IR_ENTRY_PIN) == HIGH) {
    handleEntry();
  }
  
  // Check for RFID card at exit
  if (digitalRead(IR_EXIT_PIN) == HIGH) {
    handleExit();
  }
  
  // Update slot status every 5 seconds
  static unsigned long lastUpdate = 0;
  if (millis() - lastUpdate > 5000) {
    updateSlotStatus();
    lastUpdate = millis();
  }
  
  delay(100);
}

void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi Connection Failed!");
    blinkLED(LED_RED, 5);
  }
}

void handleEntry() {
  String rfid = readRFID();
  
  if (rfid != "" && rfid != lastRFID) {
    Serial.println("Entry RFID: " + rfid);
    
    // Send to backend
    if (sendEntryRequest(rfid)) {
      openGate();
      digitalWrite(LED_GREEN, HIGH);
      tone(BUZZER_PIN, 1000, 200);
      delay(3000);
      closeGate();
      digitalWrite(LED_GREEN, LOW);
    } else {
      digitalWrite(LED_RED, HIGH);
      tone(BUZZER_PIN, 500, 500);
      delay(1000);
      digitalWrite(LED_RED, LOW);
    }
    
    lastRFID = rfid;
    lastScanTime = millis();
  }
}

void handleExit() {
  String rfid = readRFID();
  
  if (rfid != "" && rfid != lastRFID) {
    Serial.println("Exit RFID: " + rfid);
    
    // Send to backend
    if (sendExitRequest(rfid)) {
      openGate();
      digitalWrite(LED_GREEN, HIGH);
      tone(BUZZER_PIN, 1000, 200);
      delay(3000);
      closeGate();
      digitalWrite(LED_GREEN, LOW);
    } else {
      digitalWrite(LED_RED, HIGH);
      tone(BUZZER_PIN, 500, 500);
      delay(1000);
      digitalWrite(LED_RED, LOW);
    }
    
    lastRFID = rfid;
    lastScanTime = millis();
  }
}

String readRFID() {
  if (millis() - lastScanTime < scanCooldown) {
    return "";
  }
  
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    return "";
  }
  
  String content = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    content += String(rfid.uid.uidByte[i] < 0x10 ? "0" : "");
    content += String(rfid.uid.uidByte[i], HEX);
  }
  content.toUpperCase();
  
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  
  return content;
}

bool sendEntryRequest(String rfid) {
  if (WiFi.status() != WL_CONNECTED) return false;
  
  HTTPClient http;
  http.begin(String(serverURL) + "/rfid-entry");
  http.addHeader("Content-Type", "application/json");
  
  String payload = "{\"rfid\":\"" + rfid + "\"}";
  int httpCode = http.POST(payload);
  
  bool success = false;
  if (httpCode == 200) {
    String response = http.getString();
    Serial.println("Entry Response: " + response);
    
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, response);
    success = doc["allowed"];
  }
  
  http.end();
  return success;
}

bool sendExitRequest(String rfid) {
  if (WiFi.status() != WL_CONNECTED) return false;
  
  HTTPClient http;
  http.begin(String(serverURL) + "/rfid-exit");
  http.addHeader("Content-Type", "application/json");
  
  String payload = "{\"rfid\":\"" + rfid + "\"}";
  int httpCode = http.POST(payload);
  
  bool success = false;
  if (httpCode == 200) {
    String response = http.getString();
    Serial.println("Exit Response: " + response);
    
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, response);
    success = doc["allowed"];
  }
  
  http.end();
  return success;
}

void updateSlotStatus() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  http.begin(String(serverURL) + "/update-slots");
  http.addHeader("Content-Type", "application/json");
  
  // Read all slot sensors
  String slotsData = "[";
  for (int i = 0; i < totalSlots; i++) {
    int status = digitalRead(slotSensors[i]);
    slotsData += "{\"id\":" + String(i + 1) + ",\"occupied\":" + (status == LOW ? "true" : "false") + "}";
    if (i < totalSlots - 1) slotsData += ",";
  }
  slotsData += "]";
  
  String payload = "{\"slots\":" + slotsData + "}";
  int httpCode = http.POST(payload);
  
  if (httpCode == 200) {
    Serial.println("Slots updated successfully");
  }
  
  http.end();
}

void openGate() {
  Serial.println("Opening gate...");
  for (int pos = 0; pos <= 90; pos++) {
    gateServo.write(pos);
    delay(15);
  }
}

void closeGate() {
  Serial.println("Closing gate...");
  for (int pos = 90; pos >= 0; pos--) {
    gateServo.write(pos);
    delay(15);
  }
}

void blinkLED(int pin, int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(pin, HIGH);
    delay(200);
    digitalWrite(pin, LOW);
    delay(200);
  }
}

void tone(int pin, int frequency, int duration) {
  ledcSetup(0, frequency, 8);
  ledcAttachPin(pin, 0);
  ledcWriteTone(0, frequency);
  delay(duration);
  ledcWriteTone(0, 0);
}
