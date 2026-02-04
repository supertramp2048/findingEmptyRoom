/**
 * Architecture Overview
 *
 * Clean Architecture with NestJS + TypeORM
 */

// ============================================================================
// FOLDER STRUCTURE
// ============================================================================

project/
├── src/
│   ├── config/
│   │   ├── typeorm.config.ts          # TypeORM configuration
│   │   └── redis.config.ts            # Redis configuration
│   │
│   ├── entities/
│   │   ├── building.entity.ts         # Building model
│   │   ├── room.entity.ts             # Room model
│   │   └── schedule.entity.ts         # Schedule model
│   │
│   ├── modules/
│   │   └── schedule/
│   │       ├── schedule.module.ts      # Module definition
│   │       ├── schedule.service.ts     # Business logic - import
│   │       ├── schedule.controller.ts  # REST endpoints
│   │       ├── excel-parser.service.ts # Excel parsing logic
│   │       └── room-availability.service.ts # Query logic
│   │
│   ├── common/
│   │   └── dtos/
│   │       └── schedule.dto.ts         # Data Transfer Objects
│   │
│   ├── app.module.ts                  # Root module
│   └── main.ts                        # Entry point
│
├── examples/
│   ├── client-react-native.tsx         # React Native mobile app
│   ├── client-web-react.tsx            # React web app
│   ├── client-web-react.css            # Styles
│   ├── postman-collection.json         # Postman requests
│   ├── api-examples.js                 # cURL & JS examples
│   └── sample-data.js                  # Test data samples
│
├── src/seeders/
│   └── seed.ts                        # Database seeding
│
├── docker-compose.yml                 # Docker services
├── tsconfig.json                      # TypeScript config
├── package.json                       # Dependencies
├── .env.example                       # Environment template
├── README.md                          # Documentation
├── TESTING.md                         # Testing guide
└── ARCHITECTURE.md                    # This file

// ============================================================================
// DATA FLOW
// ============================================================================

CLIENT REQUEST
    ↓
[Schedule Controller]
    ↓
[Route Handler]
    ├─→ Validate input
    ├─→ Check Redis cache
    │   ├─→ HIT: Return cached result
    │   └─→ MISS: Continue
    ├─→ [Room Availability Service]
    │   ├─→ Fetch rooms from DB
    │   ├─→ Fetch schedules from DB
    │   └─→ Calculate available slots
    ├─→ Cache result in Redis
    └─→ Return response

EXCEL UPLOAD
    ↓
[Schedule Controller]
    ↓
[POST /upload]
    ├─→ Validate file
    ├─→ [Excel Parser Service]
    │   ├─→ Read Excel workbook
    │   ├─→ Find header row
    │   ├─→ Parse each row
    │   │   ├─→ Extract: mã_hp, lớp, phòng, thứ, tiết
    │   │   ├─→ Parse: tiết (4->6 → 4,6)
    │   │   ├─→ Parse: building từ phòng
    │   │   └─→ Return ParsedScheduleRow
    │   └─→ Return array of rows
    ├─→ [Schedule Service]
    │   ├─→ Start transaction
    │   ├─→ Delete old schedules
    │   ├─→ Create/ensure buildings & rooms
    │   ├─→ Insert new schedules
    │   └─→ Commit transaction
    ├─→ Clear Redis cache
    └─→ Return success response

// ============================================================================
// KEY ALGORITHMS
// ============================================================================

1. OVERLAP DETECTION
   ─────────────────

   Schedule 1: tiet_bd=4, tiet_kt=6  (sessions 4, 5, 6)
   Schedule 2: tiet_bd=5, tiet_kt=7  (sessions 5, 6, 7)

   Overlap if: NOT (end1 < start2 OR start1 > end2)
            = NOT (6 < 5 OR 4 > 7)
            = NOT (false OR false)
            = true ✓ (overlaps)

   This is used to mark occupied sessions in the bitmap.


2. CONTINUOUS EMPTY SLOTS
   ─────────────────────────

   Query: tiet_bd=1, tiet_kt=10, min_continuous=2
   Schedules: 4->6, 7->9

   Bitmap (0=empty, 1=occupied):
   [0, 0, 0, 1, 1, 1, 0, 1, 1, 0]
    1  2  3  4  5  6  7  8  9  10

   Find sequences of N (or more) consecutive 0s:
   - [0, 0, 0] at position 1 → starts at session 1 ✓
   - [0] at position 7 → only 1, needs 2 ✗
   - [0] at position 10 → only 1, needs 2 ✗

   Result: [1] (only session 1 can start a sequence of ≥2 continuous sessions)
   Meaning: Sessions 1-3 are all empty (continuous)


3. CACHE KEY GENERATION
   ──────────────────────

   Format: available:{thu}:{tiet_bd}:{tiet_kt}:{building}:{min_continuous}

   Example: available:3:4:6:A1:2

   This ensures exact same query conditions return cached result.


4. EXCEL PARSER HEURISTICS
   ───────────────────────

   Column Detection (case-insensitive):
   - "mã hp" / "mã học phần" / "course code" → ma_hp
   - "lớp" / "class" / "lớp học phần" → lop
   - "phòng" / "room" → room
   - "thứ" / "day" / "day of week" → thu
   - "tiết" / "session" / "lessons" → tiet

   Tiet Parsing:
   "4->6" → split by "->" → [4, 6] → {tiet_bd: 4, tiet_kt: 6}
   "4-6"  → split by "-" → [4, 6] → {tiet_bd: 4, tiet_kt: 6}
   "4:6"  → split by ":" → [4, 6] → {tiet_bd: 4, tiet_kt: 6}
   "4"    → only one → {tiet_bd: 4, tiet_kt: 4}

   Thu Parsing:
   2 / "2" → 2 (Monday)
   "Thứ 2" / "Monday" / "Mon" → 2
   3 / "3" / "Thứ 3" / "Tuesday" → 3
   ...

   Room/Building Parsing:
   "A1-301" → building="A1", room="301"
   "301A"   → building="A", room="301"
   "301"    → building="A1" (default), room="301"


// ============================================================================
// DATABASE RELATIONSHIPS
// ============================================================================

Building (1) ──→ (Many) Room
   ├─ id (UUID)                    Room
   ├─ code (unique, A1, B1)        ├─ id (UUID)
   ├─ name                         ├─ name (301, 302A)
   ├─ is_active                    ├─ building_id (FK)
   └─ created_at, updated_at       ├─ is_active
                                   └─ created_at, updated_at
                                        ↓
                                   (Many) Schedule
                                   ├─ id (UUID)
                                   ├─ room_id (FK)
                                   ├─ thu (2-7)
                                   ├─ tiet_bat_dau
                                   ├─ tiet_ket_thuc
                                   ├─ ma_hp, lop, mon_hoc
                                   ├─ giang_vien
                                   ├─ ngay_bat_dau, ngay_ket_thuc
                                   └─ created_at, updated_at

Indices (for performance):
- Schedule: (room_id, thu)
- Schedule: (thu, tiet_bat_dau, tiet_ket_thuc)


// ============================================================================
// CACHING STRATEGY
// ============================================================================

Cache Layer (Redis)
    ├─ Key: available:{thu}:{tiet_bd}:{tiet_kt}:{building}:{min_continuous}
    ├─ Value: FindAvailableRoomsResponseDto (JSON)
    └─ TTL: 5 minutes (300 seconds)

Cache Invalidation:
    ├─ After Excel upload → FLUSHDB (clear all)
    ├─ Reason: Schedule data changed, all queries might be affected
    └─ Alternative: Could invalidate by building code only

Cache Hit Rate:
    ├─ Expected: 80-90% (same queries repeated)
    ├─ Benefit: Reduces DB queries from 10ms → <1ms
    └─ Tradeoff: 5-min stale data is acceptable


// ============================================================================
// ERROR HANDLING
// ============================================================================

Input Validation:
    ├─ thu: 2-7 range check
    ├─ tiet_bd <= tiet_kt
    ├─ min_continuous > 0
    ├─ building: not empty
    └─ Return 400 Bad Request

File Upload:
    ├─ File required check
    ├─ Extension check (.xlsx, .xls)
    ├─ Size limit (optional)
    ├─ Parse error handling (try-catch)
    └─ Transaction rollback on error

Database:
    ├─ Connection timeout handling
    ├─ Query error handling
    ├─ Transaction rollback on error
    └─ Return 500 Server Error


// ============================================================================
// PERFORMANCE CONSIDERATIONS
// ============================================================================

1. Database Queries
   ─────────────────
   Room search (worst case): 2 queries
   - SELECT rooms WHERE building_id = ? AND is_active = true
   - SELECT schedules WHERE thu = ? AND room_id IN (...)

   Can be optimized with indexes:
   - Index on (building_id, is_active)
   - Index on (thu, room_id)

2. Memory Usage
   ─────────────
   Schedule bitmap: O(tiet_kt - tiet_bd) → typically 10 bytes per room
   For 100 rooms × 10 sessions = 1KB per query

3. Redis Cache Benefits
   ──────────────────────
   Without cache: ~100-200ms per query
   With cache: <10ms per hit
   Hit rate: 80-90% expected

4. Batch Operations
   ──────────────────
   Excel import:
   - Single transaction for all inserts
   - Bulk insert if DB supports it
   - Faster than individual inserts


// ============================================================================
// FUTURE ENHANCEMENTS
// ============================================================================

1. Filtering & Sorting
   - Order rooms by capacity, distance
   - Filter by room features (projector, AC, capacity)

2. Advanced Queries
   - Find N consecutive free sessions across multiple days
   - Suggest optimal meeting times

3. Real-time Updates
   - WebSocket for live schedule updates
   - Admin: Live schedule broadcast

4. Analytics
   - Room utilization reports
   - Peak hours analysis
   - Usage patterns

5. Notifications
   - Room available alerts
   - Schedule change notifications

6. Integrations
   - Google Calendar sync
   - Email reminders
   - SMS alerts

7. Mobile App
   - Full React Native app
   - Offline mode with sync
   - QR code for room check-in

8. API Enhancements
   - GraphQL endpoint
   - Batch queries
   - Advanced filtering
   - Rate limiting
