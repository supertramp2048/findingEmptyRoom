# Testing Guide - Empty Room Filter

## Prerequisites

- Node.js >= 16
- Docker & Docker Compose
- PostgreSQL 15
- Redis 7
- Postman (optional, for API testing)

## Setup

### 1. Clone & Install

```bash
cd "f:\learnNodejs\empty room filter"
npm install
```

### 2. Start Services (Docker)

```bash
docker-compose up -d
```

Verify services:
```bash
docker-compose ps
```

### 3. Configure Environment

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` if needed (defaults usually work)

### 4. Run Application

Development mode:
```bash
npm run start:dev
```

Production build:
```bash
npm run build
npm run start:prod
```

Server should be running at `http://localhost:3000`

### 5. Seed Database (Optional)

```bash
npx ts-node src/seeders/seed.ts
```

This creates sample buildings, rooms, and schedules for testing.

## API Testing

### Using cURL

```bash
# Check stats
curl http://localhost:3000/api/schedule/stats

# Search available rooms
curl "http://localhost:3000/api/rooms/available?thu=3&tiet_bd=4&tiet_kt=6&building=A1&min_continuous=2"

# Upload Excel file
curl -X POST \
  http://localhost:3000/api/schedule/upload \
  -F "file=@schedule.xlsx"
```

### Using Postman

1. Import `examples/postman-collection.json` into Postman
2. Select appropriate requests
3. Send requests

### Using JavaScript/Fetch

```javascript
// Find available rooms
const response = await fetch(
  'http://localhost:3000/api/rooms/available?thu=3&tiet_bd=4&tiet_kt=6&building=A1&min_continuous=2'
);
const data = await response.json();
console.log(data);

// Upload Excel
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const uploadResponse = await fetch(
  'http://localhost:3000/api/schedule/upload',
  {
    method: 'POST',
    body: formData
  }
);
const uploadData = await uploadResponse.json();
console.log(uploadData);
```

## Database Management

### Access PostgreSQL

```bash
# Connect to database
psql -U postgres -d empty_room_db -h localhost

# List tables
\dt

# View schedules
SELECT * FROM schedules;

# View buildings
SELECT * FROM buildings;

# View rooms
SELECT * FROM rooms;
```

### Reset Database

```bash
# Drop all tables
npm run migration:revert

# Recreate tables
npm run migration:run

# Or just seed again
npx ts-node src/seeders/seed.ts
```

## Redis Cache Testing

```bash
# Connect to Redis
redis-cli

# Check cache keys
KEYS available:*

# View specific key
GET available:3:4:6:A1:2

# Clear all cache
FLUSHDB

# Exit
EXIT
```

## Performance Testing

### Load Testing with Apache Bench

```bash
# Single request
ab -n 100 -c 10 "http://localhost:3000/api/rooms/available?thu=3&tiet_bd=4&tiet_kt=6&building=A1&min_continuous=2"

# More concurrent requests
ab -n 1000 -c 50 "http://localhost:3000/api/rooms/available?thu=3&tiet_bd=4&tiet_kt=6&building=A1&min_continuous=2"
```

### Cache Verification

1. Make first request → takes longer (cache miss)
2. Make same request again → much faster (cache hit)
3. Upload new schedule → cache cleared
4. Make request again → takes longer (cache miss)

## Testing Scenarios

### Scenario 1: Basic Room Search

```bash
# Should return available rooms
curl "http://localhost:3000/api/rooms/available?thu=3&tiet_bd=4&tiet_kt=6&building=A1&min_continuous=2"

# Expected: JSON with available rooms and continuous slots
```

### Scenario 2: No Available Rooms

```bash
# Query for time when all rooms are occupied
curl "http://localhost:3000/api/rooms/available?thu=2&tiet_bd=4&tiet_kt=6&building=A1&min_continuous=5"

# Expected: Empty rooms array
```

### Scenario 3: Upload Schedule

```bash
# Create sample.xlsx with schedule data
# Then upload
curl -X POST \
  http://localhost:3000/api/schedule/upload \
  -F "file=@sample.xlsx"

# Expected: Success message with row count
# Cache should be cleared after this
```

### Scenario 4: Cache Behavior

```bash
# First request (cache miss, should take ~100ms)
time curl "http://localhost:3000/api/rooms/available?thu=3&tiet_bd=4&tiet_kt=6&building=A1&min_continuous=2"

# Second request (cache hit, should be <10ms)
time curl "http://localhost:3000/api/rooms/available?thu=3&tiet_bd=4&tiet_kt=6&building=A1&min_continuous=2"

# Upload new schedule (clears cache)
curl -X POST \
  http://localhost:3000/api/schedule/upload \
  -F "file=@sample.xlsx"

# Next request (cache miss again)
time curl "http://localhost:3000/api/rooms/available?thu=3&tiet_bd=4&tiet_kt=6&building=A1&min_continuous=2"
```

### Scenario 5: Error Handling

```bash
# Invalid day (not 2-7)
curl "http://localhost:3000/api/rooms/available?thu=10&tiet_bd=4&tiet_kt=6&building=A1&min_continuous=2"
# Expected: 400 error

# Missing parameters
curl "http://localhost:3000/api/rooms/available?thu=3"
# Expected: 400 error

# Invalid file type
curl -X POST \
  http://localhost:3000/api/schedule/upload \
  -F "file=@document.pdf"
# Expected: 400 error

# No file uploaded
curl -X POST http://localhost:3000/api/schedule/upload
# Expected: 400 error
```

## Troubleshooting

### Database Connection Error

```bash
# Check if PostgreSQL is running
docker-compose ps

# Check logs
docker-compose logs postgres

# Restart services
docker-compose restart
```

### Redis Connection Error

```bash
# Check if Redis is running
docker-compose ps

# Check logs
docker-compose logs redis

# Restart Redis
docker-compose restart redis
```

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm run start:dev
```

### Excel Parser Issues

- Ensure Excel file has header row
- Check column names contain keywords: "mã", "lớp", "phòng", "thứ", "tiết"
- Verify data format matches expected patterns

## Testing Utilities

### Generate Test Excel File

```bash
npm run build
node scripts/generate-test-excel.js
```

### Run Unit Tests

```bash
npm test
```

### Run E2E Tests

```bash
npm run test:e2e
```

### Code Coverage

```bash
npm run test:cov
```

## Performance Checklist

- [ ] First request takes ~100-200ms
- [ ] Cached requests take <10ms
- [ ] Cache is cleared after Excel upload
- [ ] Database queries are optimized
- [ ] No N+1 query problems
- [ ] Large Excel files (>10MB) process within 5 seconds
- [ ] Concurrent requests don't cause issues

## Production Deployment

```bash
# Build
npm run build

# Start production server
npm run start:prod

# With PM2
pm2 start dist/main.js --name "empty-room-filter"

# Monitor
pm2 monit
```

## Cleanup

```bash
# Stop all services
docker-compose down

# Remove volume data
docker-compose down -v

# Remove all containers
docker-compose down --remove-orphans
```
