-- Fix admin password
UPDATE users 
SET password = '$2b$10$rlB2b6DRoDIF6z38WyWmN.ulNjF/3LQC6IDaAoCJbrnyI3y5RyjmO'
WHERE rfid = 'ADMIN001';

-- Verify update
SELECT rfid, name, role, password 
FROM users 
WHERE rfid = 'ADMIN001';
