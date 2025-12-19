require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "smart_parking_secret_key_2025";

// MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "just123",
  database: process.env.DB_NAME || "smart_parking",
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const RATE = Number(process.env.RATE_PER_MINUTE) || 2;

// ===== AUTHENTICATION MIDDLEWARE =====
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token." });
    }
    req.user = user;
    next();
  });
}

function isAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Access denied. Admin only." });
  }
  next();
}

// ===== USER SIGNUP =====
app.post("/signup", async (req, res) => {
  const { rfid, name, email, phone, password, carNumberPlate, address } = req.body;

  if (!rfid || !name || !password || !carNumberPlate) {
    return res.json({ success: false, message: "All fields are required" });
  }

  try {
    const connection = await pool.getConnection();

    // Check if RFID already exists
    const [existing] = await connection.query(
      "SELECT * FROM users WHERE rfid = ? OR email = ?",
      [rfid, email]
    );

    if (existing.length > 0) {
      connection.release();
      return res.json({ success: false, message: "RFID or Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    await connection.query(
      "INSERT INTO users (rfid, name, email, phone, password, car_number_plate, address, balance, role) VALUES (?, ?, ?, ?, ?, ?, ?, 0.00, 'user')",
      [rfid, name, email, phone, hashedPassword, carNumberPlate, address]
    );

    connection.release();
    res.json({ success: true, message: "Registration successful! Please login." });
  } catch (error) {
    console.error("Signup error:", error);
    res.json({ success: false, message: "Registration failed: " + error.message });
  }
});

// ===== USER LOGIN =====
app.post("/login", async (req, res) => {
  const { rfid, password } = req.body;

  if (!rfid || !password) {
    return res.json({ success: false, message: "RFID and password are required" });
  }

  try {
    const connection = await pool.getConnection();

    // Get user
    const [users] = await connection.query(
      "SELECT * FROM users WHERE rfid = ?",
      [rfid]
    );

    if (users.length === 0) {
      connection.release();
      return res.json({ success: false, message: "Invalid RFID or password" });
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      connection.release();
      return res.json({ success: false, message: "Account is deactivated. Contact admin." });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      connection.release();
      return res.json({ success: false, message: "Invalid RFID or password" });
    }

    // Update last login
    await connection.query(
      "UPDATE users SET last_login = NOW() WHERE rfid = ?",
      [rfid]
    );

    // Create login history
    await connection.query(
      "INSERT INTO login_history (rfid, ip_address) VALUES (?, ?)",
      [rfid, req.ip]
    );

    connection.release();

    // Generate JWT token
    const token = jwt.sign(
      { rfid: user.rfid, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        rfid: user.rfid,
        name: user.name,
        email: user.email,
        balance: user.balance,
        carNumberPlate: user.car_number_plate,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.json({ success: false, message: "Login failed: " + error.message });
  }
});

// ===== GET USER PROFILE =====
app.get("/profile", authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      "SELECT rfid, name, email, phone, balance, car_number_plate, address, role, created_at, last_login FROM users WHERE rfid = ?",
      [req.user.rfid]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ===== GET WALLET BALANCE =====
app.get("/wallet", authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      "SELECT balance FROM users WHERE rfid = ?",
      [req.user.rfid]
    );

    const [transactions] = await pool.query(
      "SELECT * FROM wallet_transactions WHERE rfid = ? ORDER BY created_at DESC LIMIT 10",
      [req.user.rfid]
    );

    res.json({
      success: true,
      balance: users[0].balance,
      transactions
    });
  } catch (error) {
    console.error("Wallet error:", error);
    res.json({ success: false, message: "Failed to fetch wallet", error: error.message });
  }
});

// ===== ADMIN: REFILL USER WALLET =====
app.post("/admin/refill-wallet", authenticateToken, isAdmin, async (req, res) => {
  const { rfid, amount } = req.body;

  if (!rfid || !amount || amount <= 0) {
    return res.json({ success: false, message: "Valid RFID and amount required" });
  }

  try {
    const connection = await pool.getConnection();

    // Get current balance
    const [users] = await connection.query(
      "SELECT balance FROM users WHERE rfid = ?",
      [rfid]
    );

    if (users.length === 0) {
      connection.release();
      return res.json({ success: false, message: "User not found" });
    }

    const oldBalance = parseFloat(users[0].balance);
    const newBalance = oldBalance + parseFloat(amount);

    // Update balance
    await connection.query(
      "UPDATE users SET balance = ? WHERE rfid = ?",
      [newBalance, rfid]
    );

    // Record transaction
    await connection.query(
      "INSERT INTO wallet_transactions (rfid, transaction_type, amount, balance_before, balance_after, description, processed_by) VALUES (?, 'credit', ?, ?, ?, 'Wallet refill by admin', ?)",
      [rfid, amount, oldBalance, newBalance, req.user.rfid]
    );

    connection.release();
    res.json({
      success: true,
      message: "Wallet refilled successfully",
      newBalance
    });
  } catch (error) {
    console.error("Refill error:", error);
    res.json({ success: false, message: "Refill failed: " + error.message });
  }
});

// ===== ADMIN: GET ALL USERS =====
app.get("/admin/users", authenticateToken, isAdmin, async (req, res) => {
  try {
    const [users] = await pool.query(
      "SELECT rfid, name, email, phone, balance, car_number_plate, address, role, is_active, created_at, last_login FROM users WHERE role = 'user' ORDER BY created_at DESC"
    );

    res.json({ success: true, users });
  } catch (error) {
    console.error("Get users error:", error);
    res.json({ success: false, message: "Failed to fetch users", error: error.message });
  }
});

// ===== ADMIN: GET ENTRY/EXIT HISTORY =====
app.get("/admin/parking-history", authenticateToken, isAdmin, async (req, res) => {
  try {
    const [sessions] = await pool.query(
      "SELECT ps.*, u.name, u.car_number_plate, s.slot_number FROM parking_sessions ps LEFT JOIN users u ON ps.rfid = u.rfid LEFT JOIN slots s ON ps.slot_id = s.id ORDER BY ps.entry_time DESC LIMIT 100"
    );

    res.json({ sessions });
  } catch (error) {
    console.error("Parking history error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ===== ADMIN: GET DASHBOARD STATS =====
app.get("/admin/dashboard", authenticateToken, isAdmin, async (req, res) => {
  try {
    const [totalUsers] = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE role = 'user'"
    );
    
    const [activeUsers] = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE role = 'user' AND is_active = 1"
    );
    
    const [totalRevenue] = await pool.query(
      "SELECT SUM(fee) as total FROM parking_sessions WHERE fee IS NOT NULL"
    );
    
    const [todayRevenue] = await pool.query(
      "SELECT SUM(fee) as total FROM parking_sessions WHERE DATE(entry_time) = CURDATE() AND fee IS NOT NULL"
    );
    
    const [activeSessions] = await pool.query(
      "SELECT COUNT(*) as count FROM parking_sessions WHERE status = 'active'"
    );
    
    const [slots] = await pool.query("SELECT * FROM slots");
    
    res.json({
      totalUsers: totalUsers[0].count,
      activeUsers: activeUsers[0].count,
      totalRevenue: totalRevenue[0].total || 0,
      todayRevenue: todayRevenue[0].total || 0,
      activeSessions: activeSessions[0].count,
      totalSlots: slots.length,
      occupiedSlots: slots.filter(s => s.status === "occupied").length,
      availableSlots: slots.filter(s => s.status === "available").length
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ===== ENTRY RFID =====
app.post("/rfid-entry", async (req, res) => {
  const { rfid } = req.body;
  const connection = await pool.getConnection();

  try {
    // Get user
    const [users] = await connection.query(
      "SELECT * FROM users WHERE rfid = ?",
      [rfid]
    );

    if (users.length === 0) {
      return res.json({ allowed: false, message: "Invalid RFID" });
    }

    const user = users[0];

    // Get available slot
    const [slots] = await connection.query(
      "SELECT * FROM slots WHERE status = 'available' LIMIT 1"
    );

    if (slots.length === 0) {
      return res.json({ allowed: false, message: "Parking Full" });
    }

    const slot = slots[0];

    if (user.balance <= 0) {
      return res.json({ allowed: false, message: "Low Balance" });
    }

    // Update slot status
    await connection.query(
      "UPDATE slots SET status = 'occupied', rfid = ? WHERE id = ?",
      [rfid, slot.id]
    );

    // Create parking session
    await connection.query(
      "INSERT INTO parking_sessions (rfid, slot_id, status) VALUES (?, ?, 'active')",
      [rfid, slot.id]
    );

    res.json({ allowed: true, slotId: slot.id, slotNumber: slot.slot_number });
  } catch (error) {
    console.error("Entry error:", error);
    res.status(500).json({ allowed: false, message: "Server error" });
  } finally {
    connection.release();
  }
});

// ===== EXIT RFID =====
app.post("/rfid-exit", async (req, res) => {
  const { rfid } = req.body;
  const connection = await pool.getConnection();

  try {
    // Get active session
    const [sessions] = await connection.query(
      "SELECT * FROM parking_sessions WHERE rfid = ? AND exit_time IS NULL ORDER BY entry_time DESC LIMIT 1",
      [rfid]
    );

    if (sessions.length === 0) {
      return res.json({ allowed: false, message: "No active session" });
    }

    const session = sessions[0];
    const exitTime = new Date();
    const durationMin = Math.ceil(
      (exitTime - new Date(session.entry_time)) / 60000
    );

    const fee = durationMin * RATE;

    // Get user
    const [users] = await connection.query(
      "SELECT * FROM users WHERE rfid = ?",
      [rfid]
    );

    const user = users[0];

    if (user.balance < fee) {
      return res.json({ allowed: false, message: "Insufficient Balance" });
    }

    // Update user balance
    await connection.query(
      "UPDATE users SET balance = balance - ? WHERE rfid = ?",
      [fee, rfid]
    );

    // Update session
    await connection.query(
      "UPDATE parking_sessions SET exit_time = ?, duration_minutes = ?, fee = ?, status = 'completed' WHERE id = ?",
      [exitTime, durationMin, fee, session.id]
    );

    // Update slot
    await connection.query(
      "UPDATE slots SET status = 'available', rfid = NULL WHERE id = ?",
      [session.slot_id]
    );

    res.json({
      allowed: true,
      duration: durationMin,
      fee,
      balance: user.balance - fee,
    });
  } catch (error) {
    console.error("Exit error:", error);
    res.status(500).json({ allowed: false, message: "Server error" });
  } finally {
    connection.release();
  }
});

// ===== APP DATA =====
app.get("/parking-status", async (req, res) => {
  try {
    const [slots] = await pool.query("SELECT * FROM slots ORDER BY id");
    res.json({ slots });
  } catch (error) {
    console.error("Get slots error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ===== DASHBOARD STATS =====
app.get("/dashboard-stats", async (req, res) => {
  try {
    const [slots] = await pool.query("SELECT * FROM slots");
    const [sessions] = await pool.query(
      "SELECT * FROM parking_sessions ORDER BY entry_time DESC LIMIT 10"
    );

    const occupied = slots.filter((s) => s.status === "occupied").length;
    const available = slots.length - occupied;

    res.json({
      totalSlots: slots.length,
      occupied,
      available,
      recentSessions: sessions,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ===== BOOKING MANAGEMENT =====
app.post("/booking", async (req, res) => {
  const { rfid, slotId, bookingTime } = req.body;
  
  console.log("Booking request:", { rfid, slotId, bookingTime });

  try {
    const connection = await pool.getConnection();

    // Check if user exists
    const [users] = await connection.query(
      "SELECT * FROM users WHERE rfid = ?",
      [rfid]
    );

    if (users.length === 0) {
      connection.release();
      return res.json({ success: false, message: "Invalid user" });
    }

    // Check if slot exists and is available
    const [slots] = await connection.query(
      "SELECT * FROM slots WHERE id = ?",
      [slotId]
    );

    if (slots.length === 0) {
      connection.release();
      return res.json({ success: false, message: "Invalid slot" });
    }

    if (slots[0].status === "occupied") {
      connection.release();
      return res.json({ success: false, message: "Slot already occupied" });
    }

    // Create booking
    const [result] = await connection.query(
      "INSERT INTO bookings (rfid, slot_id, booking_time, status) VALUES (?, ?, ?, 'confirmed')",
      [rfid, slotId, bookingTime || new Date()]
    );

    console.log("Booking created successfully:", result.insertId);
    
    connection.release();
    res.json({ success: true, message: "Booking created successfully", bookingId: result.insertId });
  } catch (error) {
    console.error("Booking error:", error);
    res.json({ success: false, message: "Booking failed: " + error.message });
  }
});

// ===== GET BOOKINGS =====
app.get("/bookings", async (req, res) => {
  try {
    const [bookings] = await pool.query(
      "SELECT b.*, u.name as user_name, s.slot_number FROM bookings b LEFT JOIN users u ON b.rfid = u.rfid LEFT JOIN slots s ON b.slot_id = s.id ORDER BY b.booking_time DESC"
    );

    res.json({ bookings });
  } catch (error) {
    console.error("Get bookings error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ===== REPORTS =====
app.get("/reports", async (req, res) => {
  try {
    const [sessions] = await pool.query(
      "SELECT ps.*, u.name as user_name, s.slot_number FROM parking_sessions ps LEFT JOIN users u ON ps.rfid = u.rfid LEFT JOIN slots s ON ps.slot_id = s.id ORDER BY ps.entry_time DESC"
    );

    const totalRevenue = sessions
      .filter((s) => s.fee)
      .reduce((sum, s) => sum + parseFloat(s.fee), 0);

    const completedSessions = sessions.filter((s) => s.exit_time);
    const avgDuration = completedSessions.length
      ? completedSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / completedSessions.length
      : 0;

    res.json({
      totalSessions: sessions.length,
      totalRevenue: totalRevenue.toFixed(2),
      avgDuration: Math.round(avgDuration),
      sessions,
    });
  } catch (error) {
    console.error("Reports error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ===== PROBLEMS =====
app.get("/problems", async (req, res) => {
  try {
    const [problems] = await pool.query(
      "SELECT p.*, s.slot_number, u.name as reporter_name FROM problems p LEFT JOIN slots s ON p.slot_id = s.id LEFT JOIN users u ON p.reported_by = u.rfid ORDER BY p.created_at DESC"
    );

    res.json({ problems });
  } catch (error) {
    console.error("Get problems error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/problems", async (req, res) => {
  const { slotId, reportedBy, title, description, priority } = req.body;

  try {
    await pool.query(
      "INSERT INTO problems (slot_id, reported_by, title, description, priority) VALUES (?, ?, ?, ?, ?)",
      [slotId, reportedBy, title, description, priority || 'medium']
    );

    res.json({ success: true, message: "Problem reported" });
  } catch (error) {
    console.error("Report problem error:", error);
    res.status(500).json({ success: false, message: "Failed to report problem" });
  }
});

// ===== ROLES & PERMISSIONS =====
app.get("/roles", async (req, res) => {
  try {
    const [roles] = await pool.query("SELECT * FROM roles");
    res.json({ roles });
  } catch (error) {
    console.error("Get roles error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/permissions", async (req, res) => {
  try {
    const [permissions] = await pool.query("SELECT * FROM permissions");
    res.json({ permissions });
  } catch (error) {
    console.error("Get permissions error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ===== ESP32 SLOT UPDATE ENDPOINT =====
app.post("/update-slots", async (req, res) => {
  const { slots } = req.body;
  
  console.log("Slot update from ESP32:", slots);

  try {
    const connection = await pool.getConnection();

    for (const slot of slots) {
      // Accept either 'occupied'/'available' or boolean 'occupied' field
      const status = slot.status || (slot.occupied ? "occupied" : "available");
      
      await connection.query(
        "UPDATE slots SET status = ? WHERE slot_number = ?",
        [status, slot.slotNumber]
      );
    }

    connection.release();
    res.json({ success: true, message: "Slots updated" });
  } catch (error) {
    console.error("Update slots error:", error);
    res.status(500).json({ success: false, message: "Update failed" });
  }
});

// ===== ESP32 STATUS ENDPOINT =====
app.get("/esp32-status", async (req, res) => {
  try {
    const [slots] = await pool.query("SELECT * FROM slots ORDER BY id");
    const [activeSessions] = await pool.query(
      "SELECT COUNT(*) as count FROM parking_sessions WHERE status = 'active'"
    );
    
    res.json({
      totalSlots: slots.length,
      occupied: slots.filter(s => s.status === "occupied").length,
      available: slots.filter(s => s.status === "available").length,
      activeSessions: activeSessions[0].count,
      slots: slots
    });
  } catch (error) {
    console.error("ESP32 status error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Test database connection
pool.getConnection()
  .then(connection => {
    console.log("✅ MySQL Database connected successfully");
    connection.release();
  })
  .catch(err => {
    console.error("❌ MySQL Database connection failed:", err.message);
  });

app.listen(3000, () => console.log("🚀 Server running on port 3000"));
