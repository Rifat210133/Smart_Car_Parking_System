import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Modal,
  Dimensions,
  TextInput,
} from "react-native";
import axios from "axios";

const { width } = Dimensions.get("window");

export default function App() {
  const [activeScreen, setActiveScreen] = useState("login");
  const [slots, setSlots] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFloor, setSelectedFloor] = useState("1st Floor");
  const [menuVisible, setMenuVisible] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSlots();
      const interval = setInterval(fetchSlots, 3000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const fetchSlots = async () => {
    try {
      const res = await axios.get(
        "http://192.168.0.103:3000/parking-status",
        { timeout: 5000 }
      );

      if (res.data && Array.isArray(res.data.slots)) {
        setSlots(res.data.slots);
        setLoading(false);
      }
    } catch (err) {
      console.log("FETCH ERROR:", err.toString());
    }
  };

  const handleNavigation = (screen) => {
    setActiveScreen(screen);
    setMenuVisible(false);
  };

  const handleLogin = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    setIsAuthenticated(true);
    setActiveScreen(userData.role === "admin" ? "admin-dashboard" : "dashboard");
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    setActiveScreen("login");
    setSlots(null);
  };

  // Show login/signup screens if not authenticated
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        {activeScreen === "login" ? (
          <LoginScreen onLogin={handleLogin} onNavigate={setActiveScreen} />
        ) : (
          <SignupScreen onNavigate={setActiveScreen} />
        )}
      </View>
    );
  }

  if (loading || !slots) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading Parking Manager...</Text>
      </View>
    );
  }

  const occupiedSlots = slots.filter((s) => s.status === "occupied").length;
  const availableSlots = slots.length - occupiedSlots;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header with Hamburger Menu */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuVisible(true)}
        >
          <View style={styles.menuBar} />
          <View style={styles.menuBar} />
          <View style={styles.menuBar} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.logo}>Parking Manager</Text>
        </View>
        
        <View style={styles.headerRight} />
      </View>

      {/* Hamburger Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.menuContainer}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Menu</Text>
              <TouchableOpacity onPress={() => setMenuVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <NavItem
              icon="📊"
              label="Dashboard"
              active={activeScreen === "dashboard"}
              onPress={() => handleNavigation("dashboard")}
            />
            
            {/* User-only menu items */}
            {user?.role === "user" && (
              <>
                <NavItem
                  icon="💳"
                  label="My Wallet"
                  active={activeScreen === "wallet"}
                  onPress={() => handleNavigation("wallet")}
                />
                <NavItem
                  icon="📅"
                  label="Booking"
                  active={activeScreen === "booking"}
                  onPress={() => handleNavigation("booking")}
                />
                <NavItem
                  icon="🚗"
                  label="Parking Spaces"
                  active={activeScreen === "parking"}
                  onPress={() => handleNavigation("parking")}
                />
              </>
            )}
            
            {/* Admin-only menu items */}
            {user?.role === "admin" && (
              <>
                <NavItem
                  icon="💰"
                  label="Wallet Management"
                  active={activeScreen === "admin-money"}
                  onPress={() => handleNavigation("admin-money")}
                />
                <NavItem
                  icon="🚗"
                  label="Parking History"
                  active={activeScreen === "parking-history"}
                  onPress={() => handleNavigation("parking-history")}
                />
                <NavItem
                  icon="📝"
                  label="Reports"
                  active={activeScreen === "reports"}
                  onPress={() => handleNavigation("reports")}
                />
                <NavItem
                  icon="⚠️"
                  label="Problems"
                  active={activeScreen === "problems"}
                  onPress={() => handleNavigation("problems")}
                />
                <NavItem
                  icon="👥"
                  label="Roles & Permissions"
                  active={activeScreen === "roles"}
                  onPress={() => handleNavigation("roles")}
                />
              </>
            )}
            
            {/* Logout button */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Text style={styles.navIcon}>🚪</Text>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Main Content Area */}
      <ScrollView style={styles.contentArea}>
        {activeScreen === "dashboard" && (
          <DashboardScreen slots={slots} occupiedSlots={occupiedSlots} availableSlots={availableSlots} />
        )}
        {activeScreen === "admin-dashboard" && (
          <AdminDashboardScreen token={token} />
        )}
        {activeScreen === "parking" && (
          <ParkingSpacesScreen
            slots={slots}
            selectedFloor={selectedFloor}
            setSelectedFloor={setSelectedFloor}
            occupiedSlots={occupiedSlots}
            availableSlots={availableSlots}
          />
        )}
        {activeScreen === "booking" && <BookingScreen slots={slots} />}
        {activeScreen === "reports" && <ReportsScreen slots={slots} />}
        {activeScreen === "problems" && <ProblemsScreen />}
        {activeScreen === "roles" && <RolesScreen />}
        {activeScreen === "wallet" && <WalletScreen user={user} token={token} />}
        {activeScreen === "admin-money" && <AdminMoneyScreen token={token} />}
        {activeScreen === "parking-history" && <ParkingHistoryScreen token={token} />}
      </ScrollView>
    </View>
  );
}

// Login Screen
function LoginScreen({ onLogin, onNavigate }) {
  const [rfid, setRfid] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async () => {
    if (!rfid || !password) {
      setMessage("Please enter RFID and password");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await axios.post(
        "http://192.168.0.103:3000/login",
        { rfid, password },
        { timeout: 5000 }
      );

      if (response.data.success) {
        onLogin(response.data.user, response.data.token);
      } else {
        setMessage(response.data.message);
      }
    } catch (error) {
      setMessage("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.authContainer}>
      <View style={styles.authCard}>
        <Text style={styles.authTitle}>🅿️ Smart Parking</Text>
        <Text style={styles.authSubtitle}>Login to Continue</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>RFID Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your RFID"
            value={rfid}
            onChangeText={setRfid}
            autoCapitalize="characters"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {message ? (
          <Text style={styles.errorMessage}>{message}</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.authButton, loading && styles.authButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.authButtonText}>
            {loading ? "Logging in..." : "Login"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onNavigate("signup")}>
          <Text style={styles.linkText}>
            Don't have an account? <Text style={styles.linkTextBold}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// Signup Screen
function SignupScreen({ onNavigate }) {
  const [formData, setFormData] = useState({
    rfid: "",
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    carNumberPlate: "",
    address: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const updateField = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSignup = async () => {
    if (!formData.rfid || !formData.name || !formData.password || !formData.carNumberPlate) {
      setMessage("Please fill all required fields");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await axios.post(
        "http://192.168.0.103:3000/signup",
        {
          rfid: formData.rfid,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          carNumberPlate: formData.carNumberPlate,
          address: formData.address,
        },
        { timeout: 5000 }
      );

      if (response.data.success) {
        alert("Registration successful! Please login.");
        onNavigate("login");
      } else {
        setMessage(response.data.message);
      }
    } catch (error) {
      setMessage("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.authContainer}>
      <View style={styles.authCard}>
        <Text style={styles.authTitle}>🅿️ Create Account</Text>
        <Text style={styles.authSubtitle}>Sign up to get started</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>RFID Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="Your RFID card number"
            value={formData.rfid}
            onChangeText={(val) => updateField("rfid", val)}
            autoCapitalize="characters"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            value={formData.name}
            onChangeText={(val) => updateField("name", val)}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            value={formData.email}
            onChangeText={(val) => updateField("email", val)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Phone</Text>
          <TextInput
            style={styles.input}
            placeholder="Phone number"
            value={formData.phone}
            onChangeText={(val) => updateField("phone", val)}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Car Number Plate *</Text>
          <TextInput
            style={styles.input}
            placeholder="ABC-123"
            value={formData.carNumberPlate}
            onChangeText={(val) => updateField("carNumberPlate", val)}
            autoCapitalize="characters"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Your address"
            value={formData.address}
            onChangeText={(val) => updateField("address", val)}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Password *</Text>
          <TextInput
            style={styles.input}
            placeholder="Create password"
            value={formData.password}
            onChangeText={(val) => updateField("password", val)}
            secureTextEntry
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Confirm Password *</Text>
          <TextInput
            style={styles.input}
            placeholder="Re-enter password"
            value={formData.confirmPassword}
            onChangeText={(val) => updateField("confirmPassword", val)}
            secureTextEntry
          />
        </View>

        {message ? (
          <Text style={styles.errorMessage}>{message}</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.authButton, loading && styles.authButtonDisabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          <Text style={styles.authButtonText}>
            {loading ? "Creating Account..." : "Sign Up"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onNavigate("login")}>
          <Text style={styles.linkText}>
            Already have an account? <Text style={styles.linkTextBold}>Login</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// Navigation Item Component
function NavItem({ icon, label, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.navItem, active && styles.navItemActive]}
      onPress={onPress}
    >
      <Text style={styles.navIcon}>{icon}</Text>
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// Dashboard Screen
function DashboardScreen({ slots, occupiedSlots, availableSlots }) {
  return (
    <View style={styles.dashboardContainer}>
      <Text style={styles.screenTitle}>Dashboard</Text>
      
      <View style={styles.statsRow}>
        <StatCard title="Total Spaces" value={slots.length} color="#6366F1" icon="🅿️" />
        <StatCard title="Available" value={availableSlots} color="#10B981" icon="✓" />
        <StatCard title="Occupied" value={occupiedSlots} color="#EF4444" icon="🚗" />
      </View>

      <View style={styles.quickActionsCard}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>📅</Text>
            <Text style={styles.actionText}>Book Slot</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>🔍</Text>
            <Text style={styles.actionText}>Find Car</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.recentActivity}>
        <Text style={styles.sectionTitle}>Parking Status</Text>
        {slots.slice(0, 6).map((slot) => (
          <View key={slot.id} style={styles.activityItem}>
            <View style={[styles.activityDot, { backgroundColor: slot.status === "occupied" ? "#EF4444" : "#10B981" }]} />
            <Text style={styles.activityText}>
              Slot {slot.id}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: slot.status === "occupied" ? "#FEE2E2" : "#D1FAE5" }]}>
              <Text style={[styles.statusText, { color: slot.status === "occupied" ? "#EF4444" : "#10B981" }]}>
                {slot.status === "occupied" ? "Occupied" : "Available"}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// Parking Spaces Screen - Pick Parking Spot
function ParkingSpacesScreen({ slots, selectedFloor, setSelectedFloor, occupiedSlots, availableSlots }) {
  const floors = ["1st Floor", "2nd Floor", "3rd Floor"];
  const [selectedSlot, setSelectedSlot] = useState(null);

  return (
    <View style={styles.parkingContainer}>
      <Text style={styles.parkingTitle}>Pick Parking Spot</Text>
      
      {/* Floor Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.floorScrollView}>
        <View style={styles.floorSelector}>
          {floors.map((floor) => (
            <TouchableOpacity
              key={floor}
              style={[
                styles.floorBtn,
                selectedFloor === floor && styles.floorBtnActive,
              ]}
              onPress={() => setSelectedFloor(floor)}
            >
              <Text
                style={[
                  styles.floorBtnText,
                  selectedFloor === floor && styles.floorBtnTextActive,
                ]}
              >
                {floor}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Entry Label */}
      <View style={styles.entrySection}>
        <Text style={styles.entryLabel}>Entry</Text>
        <Text style={styles.entryArrow}>↓</Text>
      </View>

      {/* Parking Grid */}
      <View style={styles.parkingGrid}>
        <Text style={styles.trafficLabel}>WAY TRAFFIC →</Text>
        
        <View style={styles.gridRows}>
          {createParkingLayout(slots).map((row, rowIndex) => (
            <View key={rowIndex} style={styles.gridRow}>
              {row.map((slot, colIndex) => (
                <ParkingSlotMobile 
                  key={`${rowIndex}-${colIndex}`} 
                  slot={slot} 
                  isSelected={selectedSlot === slot?.id}
                  onSelect={() => slot && setSelectedSlot(slot.id)}
                />
              ))}
            </View>
          ))}
        </View>
      </View>

      {selectedSlot && (
        <View style={styles.selectedIndicator}>
          <Text style={styles.selectedText}>Slot {selectedSlot} Selected</Text>
        </View>
      )}
    </View>
  );
}

// Parking Slot Component for Mobile
function ParkingSlotMobile({ slot, isSelected, onSelect }) {
  if (!slot) {
    return <View style={styles.emptySlot} />;
  }

  const isOccupied = slot.status === "occupied";
  const isAvailable = slot.status === "available";

  return (
    <TouchableOpacity 
      style={[
        styles.parkingSlotMobile, 
        isSelected && styles.parkingSlotSelected
      ]}
      onPress={onSelect}
      disabled={isOccupied}
    >
      {isOccupied ? (
        <View style={styles.carOccupied}>
          <View style={styles.carTopOccupied} />
          <View style={styles.carBodyOccupied} />
        </View>
      ) : (
        <View style={styles.emptySpot}>
          <Text style={styles.slotLabelMobile}>A {String(slot.id).padStart(2, '0')}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// Helper function to create parking layout
function createParkingLayout(slots) {
  const layout = [];
  const slotsPerRow = 4;
  
  for (let i = 0; i < slots.length; i += slotsPerRow) {
    layout.push(slots.slice(i, i + slotsPerRow));
  }
  
  return layout;
}

// Booking Screen
function BookingScreen({ slots }) {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingStatus, setBookingStatus] = useState("");
  const availableSlots = slots.filter(s => s.status === "available");
  
  const handleBooking = async (slot) => {
    try {
      setBookingStatus("Booking...");
      const response = await axios.post(
        "http://192.168.0.103:3000/booking",
        {
          rfid: "RFID001",
          slotId: slot.id,
          bookingTime: new Date().toISOString(),
        },
        { timeout: 5000 }
      );

      if (response.data.success) {
        setBookingStatus(`✓ Slot ${slot.slot_number} booked successfully!`);
        setSelectedSlot(slot.id);
        setTimeout(() => setBookingStatus(""), 3000);
      } else {
        setBookingStatus(`✗ ${response.data.message}`);
        setTimeout(() => setBookingStatus(""), 3000);
      }
    } catch (error) {
      setBookingStatus("✗ Booking failed. Please try again.");
      setTimeout(() => setBookingStatus(""), 3000);
    }
  };

  return (
    <View style={styles.screenContainer}>
      <Text style={styles.screenTitle}>Booking</Text>
      <Text style={styles.subtitle}>Reserve a parking spot in advance</Text>
      
      {bookingStatus ? (
        <View style={[styles.statusMessage, { backgroundColor: bookingStatus.includes("✓") ? "#D1FAE5" : "#FEE2E2" }]}>
          <Text style={[styles.statusText, { color: bookingStatus.includes("✓") ? "#10B981" : "#EF4444" }]}>
            {bookingStatus}
          </Text>
        </View>
      ) : null}
      
      <View style={styles.bookingCard}>
        <Text style={styles.cardTitle}>Available Slots: {availableSlots.length}</Text>
        
        <ScrollView style={styles.bookingList}>
          {availableSlots.map((slot) => (
            <View key={slot.id} style={styles.bookingItem}>
              <View style={styles.bookingInfo}>
                <Text style={styles.bookingSlot}>{slot.slot_number}</Text>
                <Text style={styles.bookingFloor}>{slot.floor}</Text>
                <Text style={styles.bookingStatus}>Available</Text>
              </View>
              <TouchableOpacity 
                style={[
                  styles.bookButton,
                  selectedSlot === slot.id && styles.bookButtonBooked
                ]}
                onPress={() => handleBooking(slot)}
                disabled={selectedSlot === slot.id}
              >
                <Text style={styles.bookButtonText}>
                  {selectedSlot === slot.id ? "Booked ✓" : "Book Now"}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

// Reports Screen
function ReportsScreen({ slots }) {
  return (
    <View style={styles.screenContainer}>
      <Text style={styles.screenTitle}>Reports & Analytics</Text>
      <View style={styles.reportCard}>
        <Text style={styles.reportTitle}>Daily Usage Report</Text>
        <Text style={styles.reportValue}>{slots.filter(s => s.status === "occupied").length}/{slots.length} slots occupied</Text>
      </View>
    </View>
  );
}

// Problems Screen
function ProblemsScreen() {
  return (
    <View style={styles.screenContainer}>
      <Text style={styles.screenTitle}>Problem Reports</Text>
      <Text style={styles.placeholder}>No issues reported</Text>
    </View>
  );
}

// Roles Screen
function RolesScreen() {
  return (
    <View style={styles.screenContainer}>
      <Text style={styles.screenTitle}>Roles & Permissions</Text>
      <Text style={styles.placeholder}>Manage user access and permissions</Text>
    </View>
  );
}

// Wallet Screen (User Only)
function WalletScreen({ user, token }) {
  const [walletData, setWalletData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      const response = await axios.get("http://192.168.0.103:3000/wallet", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setWalletData(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch wallet data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.screenContainer}>
        <Text style={styles.loadingText}>Loading wallet...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screenContainer}>
      <Text style={styles.screenTitle}>💳 My Wallet</Text>
      
      <View style={styles.walletCard}>
        <Text style={styles.walletLabel}>Wallet ID (RFID)</Text>
        <Text style={styles.walletRfid}>{user.rfid}</Text>
        
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>৳{walletData?.balance || 0}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent Transactions</Text>
      {walletData?.transactions && walletData.transactions.length > 0 ? (
        walletData.transactions.map((transaction) => (
          <View key={transaction.id} style={styles.transactionCard}>
            <View style={styles.transactionHeader}>
              <Text style={[
                styles.transactionType,
                { color: transaction.type === 'credit' ? '#4CAF50' : '#f44336' }
              ]}>
                {transaction.type === 'credit' ? '+ ৳' : '- ৳'}{transaction.amount}
              </Text>
              <Text style={styles.transactionDate}>
                {new Date(transaction.created_at).toLocaleDateString()}
              </Text>
            </View>
            <Text style={styles.transactionDesc}>{transaction.description}</Text>
            <Text style={styles.transactionBalance}>Balance: ৳{transaction.balance_after}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.placeholder}>No transactions yet</Text>
      )}
    </ScrollView>
  );
}

// Admin Money Management Screen (Admin Only)
function AdminMoneyScreen({ token }) {
  const [users, setUsers] = useState([]);
  const [searchRfid, setSearchRfid] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [refillAmount, setRefillAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchRfid) {
      setFilteredUsers(
        users.filter((u) =>
          u.rfid.toLowerCase().includes(searchRfid.toLowerCase())
        )
      );
    } else {
      setFilteredUsers(users);
    }
  }, [searchRfid, users]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get("http://192.168.0.103:3000/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setUsers(response.data.users);
        setFilteredUsers(response.data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefill = async () => {
    if (!selectedUser || !refillAmount || parseFloat(refillAmount) <= 0) {
      setMessage("Please select a user and enter a valid amount");
      return;
    }

    try {
      const response = await axios.post(
        "http://192.168.0.103:3000/admin/refill-wallet",
        {
          rfid: selectedUser.rfid,
          amount: parseFloat(refillAmount),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setMessage(`✓ Successfully added ৳${refillAmount} to ${selectedUser.name}'s wallet`);
        setRefillAmount("");
        setSelectedUser(null);
        fetchUsers();
      } else {
        setMessage(response.data.message);
      }
    } catch (error) {
      setMessage("Failed to refill wallet");
    }
  };

  if (loading) {
    return (
      <View style={styles.screenContainer}>
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screenContainer}>
      <Text style={styles.screenTitle}>💰 Wallet Management</Text>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by RFID..."
          value={searchRfid}
          onChangeText={setSearchRfid}
          autoCapitalize="characters"
        />
      </View>

      {message ? (
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>User Wallets ({filteredUsers.length})</Text>

      {filteredUsers.map((user) => (
        <View key={user.rfid} style={styles.userWalletCard}>
          <View style={styles.userWalletHeader}>
            <View>
              <Text style={styles.userWalletName}>{user.name}</Text>
              <Text style={styles.userWalletRfid}>RFID: {user.rfid}</Text>
              {user.car_number_plate && (
                <Text style={styles.userWalletCar}>🚗 {user.car_number_plate}</Text>
              )}
            </View>
            <Text style={styles.userWalletBalance}>৳{user.balance}</Text>
          </View>

          {selectedUser?.rfid === user.rfid ? (
            <View style={styles.refillForm}>
              <TextInput
                style={styles.refillInput}
                placeholder="Enter amount"
                value={refillAmount}
                onChangeText={setRefillAmount}
                keyboardType="numeric"
              />
              <View style={styles.refillButtons}>
                <TouchableOpacity
                  style={styles.refillButton}
                  onPress={handleRefill}
                >
                  <Text style={styles.refillButtonText}>Add Money</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setSelectedUser(null);
                    setRefillAmount("");
                    setMessage("");
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.refillTrigger}
              onPress={() => {
                setSelectedUser(user);
                setMessage("");
              }}
            >
              <Text style={styles.refillTriggerText}>+ Add Money</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

// Admin Dashboard Screen
function AdminDashboardScreen({ token }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      const response = await axios.get("http://192.168.0.103:3000/admin/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch admin stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.screenContainer}>
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <Text style={styles.screenTitle}>📊 Admin Dashboard</Text>
      
      <View style={styles.adminStatsGrid}>
        <View style={styles.adminStatCard}>
          <Text style={styles.adminStatIcon}>👥</Text>
          <Text style={styles.adminStatValue}>{stats?.totalUsers || 0}</Text>
          <Text style={styles.adminStatLabel}>Total Users</Text>
        </View>
        
        <View style={styles.adminStatCard}>
          <Text style={styles.adminStatIcon}>💰</Text>
          <Text style={styles.adminStatValue}>৳{stats?.totalRevenue || 0}</Text>
          <Text style={styles.adminStatLabel}>Total Revenue</Text>
        </View>
        
        <View style={styles.adminStatCard}>
          <Text style={styles.adminStatIcon}>🚗</Text>
          <Text style={styles.adminStatValue}>{stats?.activeSessions || 0}</Text>
          <Text style={styles.adminStatLabel}>Active Sessions</Text>
        </View>
        
        <View style={styles.adminStatCard}>
          <Text style={styles.adminStatIcon}>🅿️</Text>
          <Text style={styles.adminStatValue}>{stats?.occupiedSlots || 0}/{stats?.totalSlots || 0}</Text>
          <Text style={styles.adminStatLabel}>Occupied Slots</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <Text style={styles.placeholder}>
        Use the menu to manage wallets, view parking history, and handle reports
      </Text>
    </View>
  );
}

// Parking History Screen (Admin Only)
function ParkingHistoryScreen({ token }) {
  const [sessions, setSessions] = useState([]);
  const [searchPlate, setSearchPlate] = useState("");
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchParkingHistory();
  }, []);

  useEffect(() => {
    if (searchPlate) {
      setFilteredSessions(
        sessions.filter((s) =>
          s.car_number_plate?.toLowerCase().includes(searchPlate.toLowerCase())
        )
      );
    } else {
      setFilteredSessions(sessions);
    }
  }, [searchPlate, sessions]);

  const fetchParkingHistory = async () => {
    try {
      const response = await axios.get("http://192.168.0.103:3000/admin/parking-history", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.sessions) {
        setSessions(response.data.sessions);
        setFilteredSessions(response.data.sessions);
      }
    } catch (error) {
      console.error("Failed to fetch parking history:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.screenContainer}>
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screenContainer}>
      <Text style={styles.screenTitle}>🚗 Parking History</Text>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by car plate number..."
          value={searchPlate}
          onChangeText={setSearchPlate}
          autoCapitalize="characters"
        />
      </View>

      <Text style={styles.sectionTitle}>
        Entry/Exit Records ({filteredSessions.length})
      </Text>

      {filteredSessions.length > 0 ? (
        filteredSessions.map((session, index) => (
          <View key={session.id || index} style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyName}>{session.name || "Unknown"}</Text>
              <Text style={[
                styles.historyStatus,
                { color: session.exit_time ? "#666" : "#4CAF50" }
              ]}>
                {session.exit_time ? "Completed" : "Active"}
              </Text>
            </View>

            <View style={styles.historyDetails}>
              <Text style={styles.historyLabel}>🚗 Car Plate:</Text>
              <Text style={styles.historyValue}>{session.car_number_plate || "N/A"}</Text>
            </View>

            <View style={styles.historyDetails}>
              <Text style={styles.historyLabel}>🅿️ Slot:</Text>
              <Text style={styles.historyValue}>{session.slot_number || "N/A"}</Text>
            </View>

            <View style={styles.historyDetails}>
              <Text style={styles.historyLabel}>⏰ Entry:</Text>
              <Text style={styles.historyValue}>
                {new Date(session.entry_time).toLocaleString()}
              </Text>
            </View>

            {session.exit_time && (
              <>
                <View style={styles.historyDetails}>
                  <Text style={styles.historyLabel}>⏰ Exit:</Text>
                  <Text style={styles.historyValue}>
                    {new Date(session.exit_time).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.historyDetails}>
                  <Text style={styles.historyLabel}>💰 Fee:</Text>
                  <Text style={styles.historyFee}>৳{session.fee || 0}</Text>
                </View>
              </>
            )}
          </View>
        ))
      ) : (
        <Text style={styles.placeholder}>No parking records found</Text>
      )}
    </ScrollView>
  );
}

// Stat Card Component
function StatCard({ title, value, color, icon }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
}

// Stat Badge Component
function StatBadge({ label, value }) {
  return (
    <View style={styles.statBadge}>
      <Text style={styles.statBadgeValue}>{value}</Text>
      <Text style={styles.statBadgeLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  // Authentication Styles
  authContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#1a1a2e",
  },
  authCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  authTitle: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
    color: "#1a1a2e",
  },
  authSubtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#666",
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  authButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  authButtonDisabled: {
    backgroundColor: "#ccc",
  },
  authButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  linkText: {
    textAlign: "center",
    color: "#666",
    fontSize: 14,
  },
  linkTextBold: {
    color: "#4CAF50",
    fontWeight: "bold",
  },
  errorMessage: {
    color: "#f44336",
    textAlign: "center",
    marginBottom: 15,
    fontSize: 14,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingText: {
    fontSize: 18,
    color: "#6B7280",
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  menuButton: {
    padding: 8,
    width: 40,
  },
  menuBar: {
    width: 24,
    height: 3,
    backgroundColor: "#1F2937",
    marginVertical: 3,
    borderRadius: 2,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  logo: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
  },
  headerRight: {
    width: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-start",
  },
  menuContainer: {
    backgroundColor: "#fff",
    width: "80%",
    height: "100%",
    paddingTop: 50,
    paddingBottom: 20,
  },
  menuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  menuTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
  },
  closeButton: {
    fontSize: 30,
    color: "#6B7280",
    fontWeight: "300",
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 10,
    marginVertical: 4,
    borderRadius: 10,
  },
  navItemActive: {
    backgroundColor: "#6366F1",
  },
  navIcon: {
    fontSize: 22,
    marginRight: 15,
  },
  navLabel: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
  navLabelActive: {
    color: "#fff",
    fontWeight: "600",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    backgroundColor: "#ffebee",
    borderRadius: 10,
    marginHorizontal: 10,
  },
  logoutText: {
    fontSize: 16,
    color: "#f44336",
    fontWeight: "600",
    marginLeft: 15,
  },
  contentArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  dashboardContainer: {
    padding: 20,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 20,
    marginTop: -10,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    borderTopWidth: 4,
    alignItems: "center",
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  quickActionsCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 15,
  },
  actionButton: {
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 5,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  recentActivity: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 15,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  activityText: {
    fontSize: 15,
    color: "#1F2937",
    fontWeight: "500",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  parkingContainer: {
    padding: 20,
  },
  parkingTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 20,
  },
  floorScrollView: {
    marginBottom: 20,
  },
  floorSelector: {
    flexDirection: "row",
    paddingRight: 20,
  },
  floorBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginRight: 10,
    backgroundColor: "#FFE8D6",
    borderWidth: 1,
    borderColor: "#FFE8D6",
  },
  floorBtnActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  floorBtnText: {
    fontSize: 15,
    color: "#F97316",
    fontWeight: "600",
  },
  floorBtnTextActive: {
    color: "#fff",
  },
  entrySection: {
    marginBottom: 20,
  },
  entryLabel: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "600",
  },
  entryArrow: {
    fontSize: 24,
    color: "#6B7280",
    marginTop: 5,
  },
  trafficLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    letterSpacing: 2,
    marginBottom: 20,
    fontWeight: "600",
  },
  parkingGrid: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  gridRows: {
    gap: 15,
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  parkingSlotMobile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    padding: 8,
  },
  parkingSlotSelected: {
    backgroundColor: "#DBEAFE",
    borderWidth: 2,
    borderColor: "#2563EB",
  },
  emptySpot: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  slotLabelMobile: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
  },
  carOccupied: {
    width: "80%",
    height: "80%",
    justifyContent: "center",
    alignItems: "center",
  },
  carTopOccupied: {
    width: "60%",
    height: "30%",
    backgroundColor: "#374151",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  carBodyOccupied: {
    width: "100%",
    height: "60%",
    backgroundColor: "#1F2937",
    borderRadius: 4,
  },
  selectedIndicator: {
    backgroundColor: "#2563EB",
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    alignItems: "center",
  },
  selectedText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  emptySlot: {
    flex: 1,
    aspectRatio: 1,
  },
  screenContainer: {
    padding: 20,
  },
  placeholder: {
    fontSize: 16,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 50,
  },
  reportCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 10,
  },
  reportValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#6366F1",
  },
  bookingCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 15,
  },
  bookingList: {
    maxHeight: 500,
  },
  bookingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  bookingInfo: {
    flex: 1,
  },
  bookingSlot: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  bookingFloor: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4,
  },
  bookingStatus: {
    fontSize: 14,
    color: "#10B981",
    fontWeight: "500",
  },
  bookButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  bookButtonBooked: {
    backgroundColor: "#10B981",
  },
  bookButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  statusMessage: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: "center",
  },
  statusText: {
    fontSize: 15,
    fontWeight: "600",
  },
  // Wallet Screen Styles
  walletCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 25,
    marginBottom: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  walletLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  walletRfid: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1a1a2e",
    marginBottom: 20,
  },
  balanceContainer: {
    backgroundColor: "#f0f9ff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  balanceLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 15,
    marginTop: 10,
  },
  transactionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  transactionType: {
    fontSize: 18,
    fontWeight: "bold",
  },
  transactionDate: {
    fontSize: 12,
    color: "#999",
  },
  transactionDesc: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  transactionBalance: {
    fontSize: 12,
    color: "#999",
  },
  // Admin Money Screen Styles
  searchContainer: {
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  messageBox: {
    backgroundColor: "#e8f5e9",
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  messageText: {
    color: "#2e7d32",
    fontSize: 14,
    textAlign: "center",
  },
  userWalletCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 18,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userWalletHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  userWalletName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  userWalletRfid: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  userWalletCar: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  userWalletBalance: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  refillTrigger: {
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  refillTriggerText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  refillForm: {
    marginTop: 10,
  },
  refillInput: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginBottom: 10,
  },
  refillButtons: {
    flexDirection: "row",
    gap: 10,
  },
  refillButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  refillButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "600",
  },
  // Admin Dashboard Styles
  adminStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
    marginBottom: 25,
  },
  adminStatCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  adminStatIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  adminStatValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 5,
  },
  adminStatLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  // Parking History Styles
  historyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  historyName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  historyStatus: {
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: "#f0f0f0",
  },
  historyDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  historyLabel: {
    fontSize: 14,
    color: "#666",
  },
  historyValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  historyFee: {
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "bold",
  },
});
