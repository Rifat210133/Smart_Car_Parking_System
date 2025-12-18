import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
} from "react-native";
import axios from "axios";

export default function App() {
  const TOTAL_SLOTS = 6;

  const [slots, setSlots] = useState(null); // 👈 IMPORTANT
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSlots();
    const interval = setInterval(fetchSlots, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchSlots = async () => {
    try {
      const res = await axios.get(
        "http://192.168.0.105:3000/parking-status",
        { timeout: 5000 }
      );

      console.log("API DATA:", res.data);

      if (res.data && Array.isArray(res.data.slots)) {
        setSlots(res.data.slots);
        setLoading(false);
      }
    } catch (err) {
      console.log("FETCH ERROR:", err.toString());
    }
  };

  // 🔴 VERY IMPORTANT GUARD
  if (loading || !slots) {
    return (
      <View style={styles.center}>
        <Text>Loading parking slots...</Text>
      </View>
    );
  }

  const occupiedSlots = slots.filter(
    s => s.status === "occupied"
  ).length;

  const availableSlots = TOTAL_SLOTS - occupiedSlots;
  const gateOpen = availableSlots > 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <Text style={styles.header}>Smart Parking System</Text>

      {/* INFO */}
      <View style={styles.infoRow}>
        <InfoCard title="Total" value={TOTAL_SLOTS} />
        <InfoCard title="Available" value={availableSlots} color="green" />
        <InfoCard title="Occupied" value={occupiedSlots} color="red" />
      </View>

      {/* GATE */}
      <View style={styles.gateBox}>
        <Text style={styles.gateTitle}>Gate Status</Text>
        <Text
          style={[
            styles.gateText,
            { color: gateOpen ? "green" : "red" },
          ]}
        >
          {gateOpen ? "OPEN" : "CLOSED"}
        </Text>
      </View>

      {/* SLOTS */}
      <Text style={styles.sectionTitle}>Parking Slots</Text>

      <FlatList
        data={slots}
        extraData={slots}   // 👈 CRITICAL
        numColumns={3}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View
            style={[
              styles.slot,
              item.status === "available"
                ? styles.available
                : styles.occupied,
            ]}
          >
            <Text style={{ fontWeight: "bold" }}>
              Slot {item.id}
            </Text>
            <Text>{item.status}</Text>
          </View>
        )}
      />
    </View>
  );
}

function InfoCard({ title, value, color }) {
  return (
    <View style={styles.card}>
      <Text>{title}</Text>
      <Text style={{ fontSize: 20, color }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f4f6f8",
  },
  header: {
    fontSize: 24,
    textAlign: "center",
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    width: "30%",
    alignItems: "center",
  },
  gateBox: {
    backgroundColor: "#fff",
    marginVertical: 20,
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  gateTitle: {
    fontSize: 16,
  },
  gateText: {
    fontSize: 24,
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 10,
  },
  slot: {
    flex: 1,
    margin: 8,
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  available: {
    backgroundColor: "#d4f8d4",
  },
  occupied: {
    backgroundColor: "#f8d4d4",
  },
});
