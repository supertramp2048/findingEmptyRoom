# Empty Room Filter - Find Classrooms Based on Schedule

Ứng dụng tìm phòng học trống dựa trên thời khóa biểu từ file Excel.

## Cài đặt

```bash
npm install
```

## Cấu hình Database

Tạo file `.env`:

```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=empty_room_db
DB_SYNC=false

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_TTL=300

NODE_ENV=development
```

## Khởi chạy

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## API Documentation

### 1. Find Available Rooms

**GET** `/api/rooms/available`

Query Parameters:
- `thu`: number (2-7, 2=Monday, 7=Saturday)
- `tiet_bd`: number (start session)
- `tiet_kt`: number (end session)
- `building`: string (A1, A2, B1, ...)
- `min_continuous`: number (minimum continuous empty sessions)

Example:
```
GET /api/rooms/available?thu=3&tiet_bd=4&tiet_kt=6&building=A1&min_continuous=2
```

Response:
```json
{
  "thu": 3,
  "tiet": "4-6",
  "building": "A1",
  "rooms": [
    {
      "room": "301",
      "continuous_slots": [4, 5]
    },
    {
      "room": "302",
      "continuous_slots": [4, 5, 6]
    }
  ]
}
```

### 2. Upload Schedule (Excel)

**POST** `/api/schedule/upload`

Content-Type: `multipart/form-data`
Field: `file` (Excel file)

Response:
```json
{
  "success": true,
  "message": "Schedule imported successfully",
  "rows_imported": 150
}
```

## Folder Structure

```
src/
├── config/
│   ├── database.config.ts
│   ├── redis.config.ts
│   └── typeorm.config.ts
├── entities/
│   ├── building.entity.ts
│   ├── room.entity.ts
│   └── schedule.entity.ts
├── modules/
│   ├── schedule/
│   │   ├── schedule.module.ts
│   │   ├── schedule.service.ts
│   │   ├── schedule.controller.ts
│   │   ├── excel-parser.service.ts
│   │   └── room-availability.service.ts
│   └── building/
│       ├── building.module.ts
│       ├── building.service.ts
│       └── building.controller.ts
├── common/
│   ├── decorators/
│   ├── dto/
│   └── pipes/
├── app.module.ts
└── main.ts
```

## Key Features

✅ Parse Excel file dengan layout bất chuẩn
✅ Query phòng trống với điều kiện liên tục
✅ Redis cache để tăng performance
✅ Clear cache khi upload schedule mới
✅ Support multiple buildings
✅ Overlap detection logic

## Development

Linting:
```bash
npm run lint
npm run format
```

Testing:
```bash
npm test
npm run test:watch
npm run test:cov
```
