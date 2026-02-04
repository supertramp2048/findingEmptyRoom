# Quick Start Guide

## 5-Minute Setup

### 1. Install Dependencies
```bash
cd "f:\learnNodejs\empty room filter"
npm install
```

### 2. Start Services
```bash
docker-compose up -d
```

### 3. Run Application
```bash
npm run start:dev
```

### 4. Test It Works
```bash
curl http://localhost:3000/api/schedule/stats
```

You should see: `{"total_schedules":0,"total_buildings":0,"total_rooms":0}`

## 5-15 Minutes: Load Sample Data

### 1. Seed Database
```bash
npx ts-node src/seeders/seed.ts
```

### 2. Verify Data
```bash
curl http://localhost:3000/api/schedule/stats
```

Should now show: `{"total_schedules":XX,"total_buildings":3,"total_rooms":XX}`

## Test API

### Find Available Rooms
```bash
curl "http://localhost:3000/api/rooms/available?thu=3&tiet_bd=4&tiet_kt=6&building=A1&min_continuous=2"
```

### Upload Excel
```bash
# Create a test Excel file first, then:
curl -X POST \
  http://localhost:3000/api/schedule/upload \
  -F "file=@schedule.xlsx"
```

## Key API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/rooms/available` | Find empty rooms |
| POST | `/api/schedule/upload` | Import schedule |
| GET | `/api/schedule/stats` | Get database stats |

## Query Parameters (for /api/rooms/available)

- `thu`: Day (2=Mon, 3=Tue, ..., 7=Sat)
- `tiet_bd`: Start session
- `tiet_kt`: End session
- `building`: Building code (A1, A2, B1, ...)
- `min_continuous`: Minimum continuous empty sessions

## Next Steps

1. **Customize**: Edit sample data in `src/seeders/seed.ts`
2. **Test**: Use examples in `examples/` folder
3. **Deploy**: Follow `TESTING.md` for production deployment
4. **Develop**: Check `ARCHITECTURE.md` for system design

## Troubleshooting

**Port 3000 already in use?**
```bash
PORT=3001 npm run start:dev
```

**Database error?**
```bash
docker-compose restart postgres
```

**Need to reset database?**
```bash
docker-compose down -v
docker-compose up -d
npx ts-node src/seeders/seed.ts
```

**Redis connection error?**
```bash
docker-compose restart redis
```

## File Locations

| File | Purpose |
|------|---------|
| `src/entities/*.entity.ts` | Database models |
| `src/modules/schedule/` | Business logic |
| `examples/` | Client examples |
| `.env` | Configuration |
| `docker-compose.yml` | Services setup |

---

**Need help?** Check:
- `README.md` - Full documentation
- `TESTING.md` - Testing guide
- `ARCHITECTURE.md` - System design
- `examples/` - Code examples
