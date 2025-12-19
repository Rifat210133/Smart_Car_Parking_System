# ESP32 Smart Parking System Integration Guide

## Hardware Requirements

### Components Needed:
1. **ESP32 Development Board** (1x)
2. **MFRC522 RFID Reader Module** (1x)
3. **RFID Cards/Tags** (for testing)
4. **SG90 Servo Motor** (1x) - for gate control
5. **IR Obstacle Sensors** (8x minimum)
   - 1 for entry detection
   - 1 for exit detection
   - 6 for parking slot detection
6. **LEDs** (2x)
   - 1 Green LED
   - 1 Red LED
7. **Buzzer** (1x)
8. **Resistors** (220Ω for LEDs)
9. **Breadboard and Jumper Wires**
10. **Power Supply** (5V 2A recommended)

## Pin Connections

### RFID RC522 Module
```
RC522 Pin  →  ESP32 Pin
SDA        →  GPIO 21
SCK        →  GPIO 18
MOSI       →  GPIO 23
MISO       →  GPIO 19
IRQ        →  Not Connected
GND        →  GND
RST        →  GPIO 22
3.3V       →  3.3V
```

### Servo Motor (Gate)
```
Servo      →  ESP32 Pin
Signal     →  GPIO 13
VCC        →  5V
GND        →  GND
```

### IR Sensors
```
Entry IR   →  GPIO 14
Exit IR    →  GPIO 27

Slot IR Sensors:
Slot 1     →  GPIO 32
Slot 2     →  GPIO 35
Slot 3     →  GPIO 34
Slot 4     →  GPIO 39
Slot 5     →  GPIO 36
Slot 6     →  GPIO 4
```

### LEDs and Buzzer
```
Green LED  →  GPIO 26 (+ 220Ω resistor)
Red LED    →  GPIO 25 (+ 220Ω resistor)
Buzzer     →  GPIO 33
```

## Software Setup

### 1. Install Arduino IDE
Download from: https://www.arduino.cc/en/software

### 2. Install ESP32 Board Support
1. Open Arduino IDE
2. Go to File → Preferences
3. Add to "Additional Board Manager URLs":
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Go to Tools → Board → Boards Manager
5. Search "ESP32" and install "esp32 by Espressif Systems"

### 3. Install Required Libraries
Go to Sketch → Include Library → Manage Libraries, then install:
- **MFRC522** by GithubCommunity (for RFID)
- **ESP32Servo** by Kevin Harrington (for servo control)
- **ArduinoJson** by Benoit Blanchon (for JSON parsing)

### 4. Configure WiFi and Server
Edit these lines in the ESP32 code:
```cpp
const char* ssid = "YOUR_WIFI_SSID";          // Your WiFi name
const char* password = "YOUR_WIFI_PASSWORD";   // Your WiFi password
const char* serverURL = "http://192.168.0.103:3000";  // Your PC IP
```

### 5. Upload Code
1. Connect ESP32 to your computer via USB
2. Select Board: Tools → Board → ESP32 Arduino → ESP32 Dev Module
3. Select Port: Tools → Port → (your COM port)
4. Click Upload button

## Testing

### 1. Test WiFi Connection
Open Serial Monitor (115200 baud) and check for:
```
Connecting to WiFi...
WiFi Connected!
IP Address: 192.168.0.XXX
Smart Parking System Ready!
```

### 2. Test RFID Entry
1. Place RFID card near reader at entry sensor
2. Check Serial Monitor for "Entry RFID: XXXXXXXX"
3. Gate should open if valid
4. Green LED should light up

### 3. Test RFID Exit
1. Place RFID card near reader at exit sensor
2. Check Serial Monitor for "Exit RFID: XXXXXXXX"
3. System should calculate parking fee
4. Gate should open

### 4. Test Slot Detection
- Block IR sensors with your hand
- Slots should update in the mobile app
- Check Serial Monitor for "Slots updated successfully"

## API Endpoints Used by ESP32

### Entry
```
POST http://192.168.0.103:3000/rfid-entry
Body: {"rfid": "XXXXXXXX"}
Response: {"allowed": true, "slotId": 1}
```

### Exit
```
POST http://192.168.0.103:3000/rfid-exit
Body: {"rfid": "XXXXXXXX"}
Response: {"allowed": true, "duration": 30, "fee": 60}
```

### Update Slots
```
POST http://192.168.0.103:3000/update-slots
Body: {"slots": [{"id": 1, "occupied": true}, ...]}
Response: {"success": true}
```

### Get Status
```
GET http://192.168.0.103:3000/esp32-status
Response: {"totalSlots": 12, "occupied": 3, "available": 9}
```

## How It Works

1. **Entry Process:**
   - Car arrives at entry
   - IR sensor detects vehicle
   - User scans RFID card
   - ESP32 sends RFID to backend
   - Backend checks user balance and available slots
   - If valid, gate opens and slot is assigned
   - Car parks in assigned slot

2. **Parking Detection:**
   - IR sensors in each slot detect car presence
   - ESP32 updates slot status every 5 seconds
   - Backend updates database
   - Mobile app shows real-time status

3. **Exit Process:**
   - Car arrives at exit
   - User scans RFID card
   - ESP32 sends RFID to backend
   - Backend calculates parking duration and fee
   - Deducts amount from user balance
   - Gate opens
   - Slot becomes available

## Troubleshooting

### ESP32 won't connect to WiFi
- Check WiFi credentials
- Ensure ESP32 is in range of WiFi router
- Try 2.4GHz WiFi (ESP32 doesn't support 5GHz)

### RFID not reading
- Check SPI connections
- Ensure RFID module has 3.3V power
- Try bringing card closer to reader

### Gate not moving
- Check servo power supply (needs 5V)
- Verify servo signal pin connection
- Test servo separately

### Backend not responding
- Ensure backend server is running
- Check IP address matches your PC
- Verify both ESP32 and PC are on same network
- Check firewall settings

## Database RFID Setup

Add RFID card UIDs to database:
```sql
-- Add your RFID cards
INSERT INTO users (rfid, name, email, balance) 
VALUES ('A1B2C3D4', 'Test User', 'test@example.com', 100.00);
```

## Circuit Diagram

```
ESP32 Board
    │
    ├─ RFID RC522 (SPI: 21,18,23,19,22)
    ├─ Servo Motor (PWM: 13)
    ├─ Entry IR (14)
    ├─ Exit IR (27)
    ├─ 6x Slot IR (32,35,34,39,36,4)
    ├─ Green LED (26) + 220Ω
    ├─ Red LED (25) + 220Ω
    └─ Buzzer (33)
```

## Next Steps

1. Connect all hardware components
2. Upload the code to ESP32
3. Test with RFID cards
4. Monitor Serial output
5. Check mobile app for real-time updates

## Support

If you encounter issues:
1. Check Serial Monitor output
2. Verify all pin connections
3. Test each component separately
4. Check backend server logs
5. Ensure proper power supply
