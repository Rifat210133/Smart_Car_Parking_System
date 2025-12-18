require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const RATE = Number(process.env.RATE_PER_MINUTE);

// ===== ENTRY RFID =====
app.post("/rfid-entry", async (req, res) => {
  const { rfid } = req.body;

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("rfid", rfid)
    .single();

  if (!user) return res.json({ allowed: false, message: "Invalid RFID" });

  const { data: slot } = await supabase
    .from("slots")
    .select("*")
    .eq("status", "available")
    .limit(1)
    .single();

  if (!slot) return res.json({ allowed: false, message: "Parking Full" });

  if (user.balance <= 0)
    return res.json({ allowed: false, message: "Low Balance" });

  await supabase.from("slots").update({
    status: "occupied",
    rfid,
  }).eq("id", slot.id);

  await supabase.from("parking_sessions").insert({
    rfid,
    slot_id: slot.id,
    entry_time: new Date(),
  });

  res.json({ allowed: true, slotId: slot.id });
});

// ===== EXIT RFID =====
app.post("/rfid-exit", async (req, res) => {
  const { rfid } = req.body;

  const { data: session } = await supabase
    .from("parking_sessions")
    .select("*")
    .eq("rfid", rfid)
    .is("exit_time", null)
    .single();

  if (!session) return res.json({ allowed: false });

  const exitTime = new Date();
  const durationMin = Math.ceil(
    (exitTime - new Date(session.entry_time)) / 60000
  );

  const fee = durationMin * RATE;

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("rfid", rfid)
    .single();

  if (user.balance < fee)
    return res.json({ allowed: false, message: "Insufficient Balance" });

  await supabase.from("users").update({
    balance: user.balance - fee,
  }).eq("rfid", rfid);

  await supabase.from("parking_sessions").update({
    exit_time: exitTime,
    fee,
  }).eq("id", session.id);

  await supabase.from("slots").update({
    status: "available",
    rfid: null,
  }).eq("id", session.slot_id);

  res.json({
    allowed: true,
    duration: durationMin,
    fee,
    balance: user.balance - fee,
  });
});

// ===== APP DATA =====
app.get("/parking-status", async (req, res) => {
  const { data: slots } = await supabase.from("slots").select("*");
  res.json({ slots });
});

app.listen(3000, () => console.log("Server running"));
