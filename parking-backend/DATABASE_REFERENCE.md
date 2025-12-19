# MySQL Database Quick Reference

## Database Connection Details
- **Host**: localhost
- **Port**: 3306
- **User**: root
- **Password**: just123
- **Database**: smart_parking

## Quick Commands

### Connect to Database
```bash
mysql -u root -pjust123 smart_parking
```

### View All Tables
```sql
SHOW TABLES;
```

### Check Parking Slots
```sql
SELECT * FROM slots;
```

### Check Users
```sql
SELECT * FROM users;
```

### View Active Parking Sessions
```sql
SELECT ps.*, u.name, s.slot_number 
FROM parking_sessions ps 
JOIN users u ON ps.rfid = u.rfid 
JOIN slots s ON ps.slot_id = s.id 
WHERE ps.status = 'active';
```

### Check Available Slots
```sql
SELECT * FROM slots WHERE status = 'available';
```

### View Total Revenue
```sql
SELECT SUM(fee) as total_revenue 
FROM parking_sessions 
WHERE fee IS NOT NULL;
```

### Recent Bookings
```sql
SELECT b.*, u.name, s.slot_number 
FROM bookings b 
JOIN users u ON b.rfid = u.rfid 
JOIN slots s ON b.slot_id = s.id 
ORDER BY b.created_at DESC 
LIMIT 10;
```

### Open Problems
```sql
SELECT p.*, s.slot_number 
FROM problems p 
LEFT JOIN slots s ON p.slot_id = s.id 
WHERE p.status = 'open';
```

## Sample Test Data

### Test Users
- **RFID001** - John Doe (Balance: $100)
- **RFID002** - Jane Smith (Balance: $150)
- **RFID003** - Bob Johnson (Balance: $75)

### Parking Slots
- **1st Floor**: A01, A02, A03, A04
- **2nd Floor**: B01, B02, B03, B04
- **3rd Floor**: C01, C02, C03, C04

### Roles
- **admin** - Full access
- **manager** - Operational management
- **user** - Regular parking user
- **staff** - Facility staff

## Testing API with Sample Data

### Test Entry
```bash
curl -X POST http://localhost:3000/rfid-entry \
  -H "Content-Type: application/json" \
  -d '{"rfid": "RFID001"}'
```

### Test Exit
```bash
curl -X POST http://localhost:3000/rfid-exit \
  -H "Content-Type: application/json" \
  -d '{"rfid": "RFID001"}'
```

### Get Parking Status
```bash
curl http://localhost:3000/parking-status
```

## Database Maintenance

### Backup Database
```bash
mysqldump -u root -pjust123 smart_parking > backup.sql
```

### Restore Database
```bash
mysql -u root -pjust123 smart_parking < backup.sql
```

### Reset Database
```bash
mysql -u root -pjust123 -e "DROP DATABASE smart_parking;"
Get-Content database.sql | mysql -u root -pjust123
```
