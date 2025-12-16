import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
} from "react-native";

export default function App() {
  const TOTAL_SLOTS = 6;

  const [slots] = useState([
    { id: 1, status: "available" },
    { id: 2, status: "occupied" },
    { id: 3, status: "available" },
    { id: 4, status: "occupied" },
    { id: 5, status: "available" },
    { id: 6, status: "available" },
  ]);

  const occupiedSlots = slots.filter(s => s.status === "occupied").length;
  const availableSlots = TOTAL_SLOTS - occupiedSlots;

  const gateOpen = availableSlots > 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <Text style={styles.header}>Smart Parking System</Text>

      {/* INFO CARDS */}
      <View style={styles.infoRow}>
        <InfoCard title="Total Slots" value={TOTAL_SLOTS} />
        <InfoCard title="Available" value={availableSlots} color="#2ecc71" />
        <InfoCard title="Occupied" value={occupiedSlots} color="#e74c3c" />
      </View>

      {/* GATE STATUS */}
      <View style={styles.gateBox}>
        <Text style={styles.gateTitle}>Gate Status</Text>
        <Text style={[
          styles.gateText,
          { color: gateOpen ? "#27ae60" : "#c0392b" }
        ]}>
          {gateOpen ? "OPEN" : "CLOSED"}
        </Text>
      </View>

      {/* SLOT GRID */}
      <Text style={styles.sectionTitle}>Parking Slots</Text>

      <FlatList
        data={slots}
        numColumns={3}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View
            style={[
              styles.slotCard,
              item.status === "available"
                ? styles.slotAvailable
                : styles.slotOccupied
            ]}
          >
            <Text style={styles.slotId}>S{item.id}</Text>
            <Text style={styles.slotStatus}>{item.status}</Text>
          </View>
        )}
      />
    </View>
  );
}

function InfoCard({ title, value, color }) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={[styles.infoValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f8",
    paddingTop: 45,
    paddingHorizontal: 15,
  },
  header: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
    color: "#2c3e50",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: "#fff",
    width: "31%",
    padding: 15,
    borderRadius: 15,
    alignItems: "center",
    elevation: 4,
  },
  infoTitle: {
    fontSize: 13,
    color: "#7f8c8d",
  },
  infoValue: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 5,
  },
  gateBox: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginBottom: 25,
    elevation: 4,
  },
  gateTitle: {
    fontSize: 16,
    color: "#34495e",
  },
  gateText: {
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    color: "#2c3e50",
  },
  slotCard: {
    flex: 1,
    margin: 8,
    paddingVertical: 25,
    borderRadius: 16,
    alignItems: "center",
    elevation: 3,
  },
  slotAvailable: {
    backgroundColor: "#dff5e3",
  },
  slotOccupied: {
    backgroundColor: "#fde2e2",
  },
  slotId: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  slotStatus: {
    fontSize: 14,
    marginTop: 5,
    color: "#555",
    textTransform: "capitalize",
  },
});
