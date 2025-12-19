# ESP32 WiFi Integration Setup Guide

## 📋 Prerequisites

### Required Libraries (Install via Arduino IDE Library Manager)
1. **WiFi** (Built-in with ESP32)
2. **HTTPClient** (Built-in with ESP32)
3. **MFRC522** by GithubCommunity
4. **ESP32Servo** by Kevin Harrington
5. **LiquidCrystal I2C** by Frank de Brabander
6. **ArduinoJson** by Benoit Blanchon (v6.x)

### Hardware Components
- ESP32 Development Board
- MFRC522 RFID Reader
- SG90 Servo Motor
- 16x2 I2C LCD Display
- RFID Cards/Tags
- Jumper Wires
- Power Supply (5V)

## 🔧 Configuration Steps

### Step 1: Update WiFi Credentials
Open `ESP32_SmartParking_WiFi.ino` and modify these lines:

```cpp
const char* ssid = "YOUR_WIFI_SSID";          // Your WiFi network name
const char* password = "YOUR_WIFI_PASSWORD";  // Your WiFi password
const char* serverURL = "http://192.168.0.103:3000";  // Your backend server IP
```

**Important:** 
- Replace `YOUR_WIFI_SSID` with your actual WiFi name
- Replace `YOUR_WIFI_PASSWORD` with your actual WiFi password
- Change `192.168.0.103` to your computer's IP address where the backend is running

### Step 2: Find Your Computer's IP Address

**Windows:**
```powershell
ipconfig
```
Look for "IPv4 Address" under your active network adapter (usually starts with 192.168.x.x or 10.x.x.x)

**Mac/Linux:**
```bash
ifconfig
```
or
```bash
ip addr show
```

### Step 3: Wiring Diagram

```
ESP32          MFRC522 RFID
-------------------------
3.3V    --->   3.3V
GND     --->   GND
GPIO 5  --->   SDA (SS)
GPIO 22 --->   RST
GPIO 23 --->   MOSI
GPIO 19 --->   MISO
GPIO 18 --->   SCK

ESP32          Servo Motor
-------------------------
GPIO 26 --->   Signal (Yellow/Orange)
5V      --->   VCC (Red)
GND     --->   GND (Brown/Black)

ESP32          I2C LCD
-------------------------
GPIO 21 --->   SDA
GPIO 17 --->   SCL
5V      --->   VCC
GND     --->   GND
```

### Step 4: Upload Code to ESP32

1. Open `ESP32_SmartParking_WiFi.ino` in Arduino IDE
2. Select your ESP32 board:
   - Tools → Board → ESP32 Arduino → ESP32 Dev Module
3. Select the correct COM port:
   - Tools → Port → (your ESP32 port)
4. Click **Upload** button
5. Wait for compilation and upload to complete

### Step 5: Monitor Serial Output

1. Open Serial Monitor (Ctrl+Shift+M)
2. Set baud rate to **115200**
3. You should see:
   ```
   Connecting to WiFi.....
   WiFi Connected!
   IP Address: 192.168.x.x
   ```

## 🚀 How It Works

### Entry Process
1. User scans RFID card at entry
2. ESP32 reads RFID UID (e.g., "29096B05")
3. ESP32 calls API: `POST /rfid-entry` with RFID
4. Backend checks:
   - Is user registered?
   - Is there available parking slot?
   - Does user have sufficient balance?
5. If approved:
   - Backend assigns slot (e.g., "A01")
   - Returns: `{allowed: true, slotNumber: "A01"}`
   - LCD shows: "ENTRY GRANTED" + "Slot: A01"
   - Servo opens gate for 5 seconds
   - System tracks entry time

### Exit Process
1. User scans same RFID card at exit
2. ESP32 verifies it's the same card that entered
3. ESP32 calls API: `POST /rfid-exit` with RFID
4. Backend calculates:
   - Parking duration in minutes
   - Fee = duration × ৳2 per minute
5. Backend deducts fee from user wallet
6. If approved:
   - Returns: `{allowed: true, fee: 20, newBalance: 80}`
   - LCD shows: "EXIT OK" + "Fee: 20 Tk"
   - Servo opens gate for 5 seconds
   - LCD shows new balance

## 📱 Mobile App Integration

The mobile app will automatically reflect:
- **Real-time slot status** (available/occupied)
- **User wallet balance** after each transaction
- **Parking history** with entry/exit times
- **Transaction records** in wallet history

Admin can:
- View all entry/exit records in "Parking History"
- Search by car plate number
- Refill user wallets from "Wallet Management"

## 🔍 Troubleshooting

### WiFi Connection Issues
- **Problem:** "WiFi Connection Failed!"
- **Solution:** 
  - Double-check WiFi SSID and password
  - Ensure WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
  - Move ESP32 closer to router

### Server Connection Issues
- **Problem:** "Server Error" on LCD
- **Solution:**
  - Verify backend server is running (node server.js)
  - Check server IP address is correct
  - Ensure ESP32 and computer are on same network
  - Test API manually: `curl http://192.168.0.103:3000/parking-status`

### RFID Not Reading
- **Problem:** Card not detected
- **Solution:**
  - Check RFID wiring connections
  - Verify RFID module power (3.3V, NOT 5V!)
  - Place card closer to reader (within 2-3cm)
  - Try different RFID card

### Gate Not Opening
- **Problem:** Servo doesn't move
- **Solution:**
  - Check servo power connection (needs 5V)
  - Verify GPIO 26 connection
  - Manually test: `gate.write(90);` in loop
  - Use external 5V power supply if needed

### LCD Not Displaying
- **Problem:** Blank LCD screen
- **Solution:**
  - Adjust LCD contrast potentiometer
  - Verify I2C address (try 0x27 or 0x3F)
  - Check SDA/SCL connections
  - Test I2C scanner sketch

## 📊 Testing Checklist

- [ ] ESP32 connects to WiFi successfully
- [ ] LCD displays "WiFi Connected" + IP address
- [ ] RFID cards are detected (Serial Monitor shows UID)
- [ ] Entry API returns slot assignment
- [ ] Servo opens gate for 5 seconds
- [ ] LCD shows assigned slot number
- [ ] Exit API calculates correct fee
- [ ] User balance updates in database
- [ ] Mobile app reflects real-time changes

## 🔐 Security Notes

- Keep backend server on local network (not exposed to internet)
- Use strong WiFi password
- Consider adding API authentication in production
- Regularly update user RFID cards to prevent cloning

## 📞 Support

If you encounter any issues:
1. Check Serial Monitor for error messages
2. Verify all wiring connections
3. Ensure backend server is running
4. Test API endpoints with Postman/curl
5. Check database has test users with balance

## 🎯 Test Users Available

- **RFID001** - John Doe (Balance: ৳100)
- **RFID002** - Jane Smith (Balance: ৳150)
- **RFID003** - Bob Johnson (Balance: ৳75)
- **29096B05** - Rifat (Balance: ৳0) ← Needs wallet refill from admin

Use admin account to refill wallet:
- Login: ADMIN001 / admin123
- Go to Wallet Management
- Search user by RFID
- Click "Add Money" and enter amount
