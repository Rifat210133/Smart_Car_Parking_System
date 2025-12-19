-- Remove all slots except the 2 monitored by IR sensors
DELETE FROM slots WHERE slot_number NOT IN ('A01', 'A02');

-- Ensure the monitored slots are available
UPDATE slots SET status = 'available', rfid = NULL WHERE slot_number IN ('A01', 'A02');

-- Verify the slots
SELECT * FROM slots ORDER BY slot_number;
