# Smart Parking System - MySQL Database Setup

## Prerequisites
- MySQL Server installed and running on port 3306
- MySQL root password: `just123`

## Step 1: Import Database Schema

### Option A: Using MySQL Command Line
```bash
mysql -u root -p < database.sql
```
Enter password: `just123`

### Option B: Using MySQL Workbench
1. Open MySQL Workbench
2. Connect to your MySQL server (localhost:3306)
3. Go to File → Open SQL Script
4. Select `database.sql`
5. Click the Execute (⚡) button

### Option C: Using Command Prompt
```bash
mysql -u root -pjust123 < database.sql
```

## Step 2: Verify Database Setup

Connect to MySQL and verify:
```sql
USE smart_parking;
SHOW TABLES;
```

You should see these tables:
- users
- slots
- parking_sessions
- bookings
- problems
- roles
- permissions
- user_roles
- role_permissions

## Step 3: Check Sample Data

```sql
SELECT * FROM users;
SELECT * FROM slots;
SELECT * FROM roles;
```

## Database Schema Overview

### Tables:

1. **users** - User information and RFID cards
   - rfid (primary key)
   - name, email, phone
   - balance (account balance)

2. **slots** - Parking slot information
   - id (primary key)
   - slot_number (A01, A02, etc.)
   - status (available/occupied)
   - floor (1st Floor, 2nd Floor, 3rd Floor)

3. **parking_sessions** - Track parking usage
   - entry_time, exit_time
   - duration_minutes, fee
   - status (active/completed)

4. **bookings** - Advance parking reservations
   - booking_time, start_time, end_time
   - status (pending/confirmed/cancelled/completed)

5. **problems** - Issue tracking
   - title, description
   - status (open/in_progress/resolved/closed)
   - priority (low/medium/high/critical)

6. **roles** - User roles (admin, manager, user, staff)

7. **permissions** - System permissions

8. **user_roles** - Link users to roles

9. **role_permissions** - Link roles to permissions

## Environment Configuration

The `.env` file is already configured with:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=just123
DB_NAME=smart_parking
DB_PORT=3306
RATE_PER_MINUTE=2
```

## Testing the Connection

Start the server:
```bash
node server.js
```

You should see:
```
✅ MySQL Database connected successfully
🚀 Server running on port 3000
```

## API Endpoints

All endpoints are now connected to MySQL:
- GET `/parking-status` - Get all parking slots
- GET `/dashboard-stats` - Dashboard statistics
- POST `/rfid-entry` - Entry with RFID
- POST `/rfid-exit` - Exit with RFID
- GET `/bookings` - Get all bookings
- POST `/booking` - Create booking
- GET `/reports` - View reports
- GET `/problems` - Get all problems
- POST `/problems` - Report a problem
- GET `/roles` - Get all roles
- GET `/permissions` - Get all permissions

## Sample Data Included

- 3 sample users (RFID001, RFID002, RFID003)
- 12 parking slots across 3 floors
- 4 roles with permissions
- 6 permissions

## Troubleshooting

If connection fails:
1. Verify MySQL is running: `mysql -u root -pjust123`
2. Check if database exists: `SHOW DATABASES;`
3. Verify password in `.env` file matches your MySQL root password
4. Check port 3306 is not blocked by firewall
