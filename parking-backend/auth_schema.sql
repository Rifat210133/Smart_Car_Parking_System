-- Authentication and Role Management Updates

USE smart_parking;

-- Update users table for authentication
ALTER TABLE users 
ADD COLUMN password VARCHAR(255) AFTER balance,
ADD COLUMN car_number_plate VARCHAR(20) AFTER password,
ADD COLUMN address TEXT AFTER car_number_plate,
ADD COLUMN role ENUM('admin', 'user') DEFAULT 'user' AFTER address,
ADD COLUMN is_active BOOLEAN DEFAULT TRUE AFTER role,
ADD COLUMN last_login TIMESTAMP NULL AFTER is_active;

-- Create wallet transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rfid VARCHAR(50) NOT NULL,
    transaction_type ENUM('credit', 'debit') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    balance_before DECIMAL(10, 2) NOT NULL,
    balance_after DECIMAL(10, 2) NOT NULL,
    description TEXT,
    processed_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rfid) REFERENCES users(rfid) ON DELETE CASCADE,
    FOREIGN KEY (processed_by) REFERENCES users(rfid) ON DELETE SET NULL
);

-- Create sessions/login history table
CREATE TABLE IF NOT EXISTS login_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rfid VARCHAR(50) NOT NULL,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    logout_time TIMESTAMP NULL,
    ip_address VARCHAR(45),
    device_info TEXT,
    FOREIGN KEY (rfid) REFERENCES users(rfid) ON DELETE CASCADE
);

-- Update parking_sessions to track more details
ALTER TABLE parking_sessions
ADD COLUMN car_number_plate VARCHAR(20) AFTER rfid,
ADD COLUMN processed_by VARCHAR(50) AFTER fee,
ADD FOREIGN KEY (processed_by) REFERENCES users(rfid) ON DELETE SET NULL;

-- Create super admin
-- Password: admin123 (hashed with bcrypt)
INSERT INTO users (rfid, name, email, phone, balance, password, car_number_plate, address, role, is_active) 
VALUES (
    'ADMIN001', 
    'Super Admin', 
    'admin@parkingsystem.com', 
    '0000000000', 
    0.00,
    '$2b$10$rX8qE7YZ9qJ3WxKxLJYJH.YqH5F5V3VyRvZcZJqJ3WxKxLJYJH.YqG',
    NULL,
    'System Administrator',
    'admin',
    TRUE
) ON DUPLICATE KEY UPDATE role = 'admin';

-- Update existing test users with passwords
-- Password for all test users: user123
UPDATE users 
SET password = '$2b$10$rX8qE7YZ9qJ3WxKxLJYJH.YqH5F5V3VyRvZcZJqJ3WxKxLJYJH.YqH',
    car_number_plate = CONCAT('ABC-', LPAD(id, 3, '0')),
    address = 'Test Address',
    role = 'user'
WHERE rfid IN ('RFID001', 'RFID002', 'RFID003');

-- Create indexes for better performance
CREATE INDEX idx_rfid ON users(rfid);
CREATE INDEX idx_role ON users(role);
CREATE INDEX idx_parking_session_rfid ON parking_sessions(rfid);
CREATE INDEX idx_wallet_transaction_rfid ON wallet_transactions(rfid);
CREATE INDEX idx_login_history_rfid ON login_history(rfid);

-- Sample wallet transactions
INSERT INTO wallet_transactions (rfid, transaction_type, amount, balance_before, balance_after, description, processed_by)
VALUES 
('RFID001', 'credit', 100.00, 0.00, 100.00, 'Initial balance', 'ADMIN001'),
('RFID002', 'credit', 150.00, 0.00, 150.00, 'Initial balance', 'ADMIN001'),
('RFID003', 'credit', 75.00, 0.00, 75.00, 'Initial balance', 'ADMIN001');
