const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Initial slots
let slots = [
  { id: 1, status: "available" },
  { id: 2, status: "available" },
  { id: 3, status: "available" },
  { id: 4, status: "available" },
  { id: 5, status: "available" },
  { id: 6, status: "available" },
];

// ESP32 updates slot
app.post("/update-slot", (req, res) => {
  const { slotId, status } = req.body;

  slots = slots.map(slot =>
    slot.id === slotId ? { ...slot, status } : slot
  );

  res.json({ success: true });
});

// App reads slot status
app.get("/parking-status", (req, res) => {
  res.json({
    totalSlots: slots.length,
    slots,
  });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
