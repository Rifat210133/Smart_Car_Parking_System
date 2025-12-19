-- Smart Parking System Database Schema

-- Create Database
CREATE DATABASE IF NOT EXISTS smart_parking;
USE smart_parking;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rfid VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    balance DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Parking Slots Table
CREATE TABLE IF NOT EXISTS slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slot_number VARCHAR(10) UNIQUE NOT NULL,
    status ENUM('available', 'occupied') DEFAULT 'available',
    rfid VARCHAR(50),
    floor VARCHAR(20) DEFAULT '1st Floor',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (rfid) REFERENCES users(rfid) ON DELETE SET NULL
);

-- Parking Sessions Table
CREATE TABLE IF NOT EXISTS parking_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rfid VARCHAR(50) NOT NULL,
    slot_id INT NOT NULL,
    entry_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    exit_time TIMESTAMP NULL,
    duration_minutes INT,
    fee DECIMAL(10, 2),
    status ENUM('active', 'completed') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rfid) REFERENCES users(rfid) ON DELETE CASCADE,
    FOREIGN KEY (slot_id) REFERENCES slots(id) ON DELETE CASCADE
);

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rfid VARCHAR(50) NOT NULL,
    slot_id INT NOT NULL,
    booking_time TIMESTAMP NOT NULL,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (rfid) REFERENCES users(rfid) ON DELETE CASCADE,
    FOREIGN KEY (slot_id) REFERENCES slots(id) ON DELETE CASCADE
);

-- Problems/Issues Table
CREATE TABLE IF NOT EXISTS problems (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slot_id INT,
    reported_by VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (slot_id) REFERENCES slots(id) ON DELETE SET NULL,
    FOREIGN KEY (reported_by) REFERENCES users(rfid) ON DELETE SET NULL
);

-- Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Roles Table (Many-to-Many relationship)
CREATE TABLE IF NOT EXISTS user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rfid VARCHAR(50) NOT NULL,
    role_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rfid) REFERENCES users(rfid) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_role (rfid, role_id)
);

-- Permissions Table
CREATE TABLE IF NOT EXISTS permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    permission_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Role Permissions Table (Many-to-Many relationship)
CREATE TABLE IF NOT EXISTS role_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_role_permission (role_id, permission_id)
);

-- Insert Sample Data

-- Sample Users
INSERT INTO users (rfid, name, email, phone, balance) VALUES
('RFID001', 'John Doe', 'john@example.com', '1234567890', 100.00),
('RFID002', 'Jane Smith', 'jane@example.com', '0987654321', 150.00),
('RFID003', 'Bob Johnson', 'bob@example.com', '5555555555', 75.00);

-- Sample Parking Slots
INSERT INTO slots (slot_number, status, rfid, floor) VALUES
('A01', 'available', NULL, '1st Floor'),
('A02', 'available', NULL, '1st Floor'),
('A03', 'available', NULL, '1st Floor'),
('A04', 'available', NULL, '1st Floor'),
('B01', 'available', NULL, '2nd Floor'),
('B02', 'available', NULL, '2nd Floor'),
('B03', 'available', NULL, '2nd Floor'),
('B04', 'available', NULL, '2nd Floor'),
('C01', 'available', NULL, '3rd Floor'),
('C02', 'available', NULL, '3rd Floor'),
('C03', 'available', NULL, '3rd Floor'),
('C04', 'available', NULL, '3rd Floor');

-- Sample Roles
INSERT INTO roles (role_name, description) VALUES
('admin', 'Full system access and control'),
('manager', 'Manage parking operations'),
('user', 'Regular parking user'),
('staff', 'Parking facility staff');

-- Sample Permissions
INSERT INTO permissions (permission_name, description) VALUES
('view_dashboard', 'View dashboard statistics'),
('manage_bookings', 'Create and manage bookings'),
('manage_slots', 'Manage parking slots'),
('view_reports', 'View system reports'),
('manage_users', 'Manage user accounts'),
('resolve_problems', 'Resolve reported problems');

-- Assign Permissions to Roles
-- Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id) 
SELECT 1, id FROM permissions;

-- Manager gets most permissions
INSERT INTO role_permissions (role_id, permission_id) 
SELECT 2, id FROM permissions WHERE permission_name IN 
('view_dashboard', 'manage_bookings', 'manage_slots', 'view_reports', 'resolve_problems');

-- Regular users get basic permissions
INSERT INTO role_permissions (role_id, permission_id) 
SELECT 3, id FROM permissions WHERE permission_name IN 
('view_dashboard', 'manage_bookings');

-- Staff gets operational permissions
INSERT INTO role_permissions (role_id, permission_id) 
SELECT 4, id FROM permissions WHERE permission_name IN 
('view_dashboard', 'manage_slots', 'resolve_problems');
