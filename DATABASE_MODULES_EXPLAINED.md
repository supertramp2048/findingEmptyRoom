# 📦 Database Modules Trong Backend - Giải Thích Thực Tế

> 📍 Vị trí thực tế của các database modules trong project emptyRoomFilter

---

## 🗂️ Cấu Trúc Thư Mục Database

```
src/
├── config/
│   ├── typeorm.config.ts        ← PostgreSQL Configuration
│   └── redis.config.ts          ← Redis Configuration
├── entities/
│   ├── building.entity.ts       ← Database Model: Buildings
│   ├── room.entity.ts           ← Database Model: Rooms
│   └── schedule.entity.ts       ← Database Model: Schedules
├── app.module.ts                ← Kết nối tất cả modules
└── main.ts                      ← Entry point
```

---

## 🔌 1. TypeORM Config - Kết Nối PostgreSQL

**File:** `src/config/typeorm.config.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Building } from '../entities/building.entity';
import { Room } from '../entities/room.entity';
import { Schedule } from '../entities/schedule.entity';

@Injectable()
export class TypeOrmConfigService {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      // ⚙️ Database Connection Settings
      type: 'postgres',                                      // Database type
      host: this.configService.get('DB_HOST', 'localhost'), // Server address
      port: this.configService.get('DB_PORT', 5432),        // PostgreSQL port
      username: this.configService.get('DB_USERNAME', 'postgres'),  // Username
      password: this.configService.get('DB_PASSWORD', 'password'),  // Password
      database: this.configService.get('DB_NAME', 'empty_room_db'), // Database name

      // 📋 Entity (Table) Registration
      entities: [Building, Room, Schedule],  // ORM sẽ tạo/update tables từ entities này

      // 🔄 Auto-Sync Mode
      synchronize: true,   // ⚠️ Dev only - Auto create/update tables
                          // 🔴 Production: Set false (dùng migrations)

      // 📝 Logging
      logging: this.configService.get('NODE_ENV') === 'development',

      // 🚫 Schema Management
      dropSchema: false,   // Không xóa schema khi khởi động
    };
  }
}
```

### ⚙️ Cấu Hình từ `.env` file:

```env
# Database Connection
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=empty_room_db

# Node Environment
NODE_ENV=development
```

---

## 🚀 2. Redis Config - Caching

**File:** `src/config/redis.config.ts`

```typescript
import Redis from 'redis';
import type { RedisClientOptions } from 'redis';

/**
 * Redis Store custom implementation
 * Tích hợp Redis với cache-manager của NestJS
 */
export const createRedisStore = async (
  options: RedisClientOptions,
): Promise<any> => {
  const client = await Redis.createClient(options).connect();

  return {
    // Lấy value từ cache
    get: async (key: string) => {
      return await client.get(key);
    },

    // Lưu value vào cache (có TTL tùy chọn)
    set: async (key: string, value: any, ttl?: number) => {
      if (ttl) {
        // Set với expiration time (tự xóa sau ttl giây)
        await client.setEx(key, ttl, typeof value === 'string' ? value : JSON.stringify(value));
      } else {
        // Set vô thời hạn
        await client.set(key, typeof value === 'string' ? value : JSON.stringify(value));
      }
    },

    // Xóa một key từ cache
    del: async (key: string) => {
      await client.del(key);
    },

    // Xóa tất cả cache
    reset: async () => {
      await client.flushDb();
    },
  } as any;
};
```

### 🔴 Hiện tại dùng Memory Cache:

Trong `app.module.ts`, Redis hiện được thay thế bằng **memory cache** (vì dev không cần Redis server):

```typescript
CacheModule.registerAsync({
  isGlobal: true,
  useFactory: (configService: ConfigService) => {
    return {
      store: 'memory',  // ← Lưu cache trong RAM
      ttl: 300 * 1000,  // TTL: 5 minutes
    };
  },
})
```

**Để dùng Redis thực tế:**

```bash
docker-compose up -d  # Khởi động Redis container
# Sau đó sửa app.module.ts để dùng Redis store thay vì memory
```

---

## 📋 3. Database Entities (Models)

### Entity 1: Building (Tòa Nhà)

**File:** `src/entities/building.entity.ts`

```typescript
import { Column, Entity, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Room } from './room.entity';

@Entity('buildings')  // ← Table name in PostgreSQL
export class Building {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;  // A1, A2, B1, ...

  @Column()
  name: string;  // Tên tòa nhà

  @Column({ default: true })
  is_active: boolean;

  // Relationship: Một tòa nhà có nhiều phòng
  @OneToMany(() => Room, (room) => room.building)
  rooms: Room[];
}
```

**SQL Tương Đương:**
```sql
CREATE TABLE buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE
);
```

---

### Entity 2: Room (Phòng Học)

**File:** `src/entities/room.entity.ts`

```typescript
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';
import { Building } from './building.entity';
import { Schedule } from './schedule.entity';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;  // 101, 201, 301, ...

  // Foreign Key: Phòng thuộc tòa nhà nào
  @ManyToOne(() => Building, (building) => building.rooms, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'building_id' })
  building: Building;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;

  // Relationship: Một phòng có nhiều schedules
  @OneToMany(() => Schedule, (schedule) => schedule.room)
  schedules: Schedule[];
}
```

**SQL Tương Đương:**
```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index để tăng performance
CREATE INDEX idx_rooms_building_id ON rooms(building_id);
```

---

### Entity 3: Schedule (Thời Khóa Biểu)

**File:** `src/entities/schedule.entity.ts`

```typescript
import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';
import { Room } from './room.entity';

@Entity('schedules')
export class Schedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Foreign Key: Thuộc phòng nào
  @ManyToOne(() => Room, (room) => room.schedules, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @Column()
  thu: number;  // 2 (Mon) - 7 (Sat), tránh 1 (Sun)

  @Column()
  tiet_bat_dau: number;  // Session bắt đầu (1-10)

  @Column()
  tiet_ket_thuc: number;  // Session kết thúc (1-10)

  @Column({ nullable: true })
  mon_hoc: string;  // Tên môn học

  @Column({ nullable: true })
  giang_vien: string;  // Tên giảng viên

  @Column({ type: 'date' })
  ngay: Date;  // Ngày cụ thể

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
```

**SQL Tương Đương:**
```sql
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  thu INTEGER NOT NULL,
  tiet_bat_dau INTEGER NOT NULL,
  tiet_ket_thuc INTEGER NOT NULL,
  mon_hoc VARCHAR(255),
  giang_vien VARCHAR(255),
  ngay DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes để tăng performance query
CREATE INDEX idx_schedules_room_id ON schedules(room_id);
CREATE INDEX idx_schedules_thu ON schedules(thu);
CREATE INDEX idx_schedules_ngay ON schedules(ngay);
```

---

## 🔗 4. App Module - Kết Nối Tất Cả

**File:** `src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { TypeOrmConfigService } from './config/typeorm.config';
import { ScheduleModule } from './modules/schedule/schedule.module';

@Module({
  imports: [
    // 1️⃣ Load environment variables
    ConfigModule.forRoot({
      isGlobal: true,        // Accessible everywhere
      envFilePath: '.env',   // Load từ .env file
    }),

    // 2️⃣ Configure PostgreSQL
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useClass: TypeOrmConfigService,  // ← Sử dụng TypeOrmConfigService
    }),

    // 3️⃣ Configure Cache (Memory hoặc Redis)
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: (configService: ConfigService) => {
        return {
          store: 'memory',                                    // 'memory' hoặc 'redis'
          ttl: configService.get('REDIS_TTL', 300) * 1000,  // 5 minutes
        };
      },
      inject: [ConfigService],
    }),

    // 4️⃣ Import Feature Modules
    ScheduleModule,  // Chứa Controllers, Services, Repositories
  ],
})
export class AppModule {}
```

### Flow Khởi Động:

```
app.module.ts
  ↓
ConfigModule → Load .env
  ↓
TypeOrmModule → Connect to PostgreSQL
  ↓
  ├─ Create tables từ entities (Building, Room, Schedule)
  ├─ Setup repositories
  └─ Ready for queries
  ↓
CacheModule → Initialize memory/Redis cache
  ↓
ScheduleModule → Load controllers & services
  ↓
Express server ready on port 3000
```

---

## 📊 5. Database Relationships Diagram

```
buildings (1) ──┐
                ├─→ rooms (M)
                │      ↓
                │      └───────┐
                │              │
                │         schedules (M)
                │
           (Foreign Key)
           building_id


rooms (1) ──┐
            ├─→ schedules (M)
            │
        (Foreign Key)
        room_id
```

---

## 🔍 6. Query Examples

### Query 1: Lấy tất cả phòng của tòa nhà A1

```typescript
// In ScheduleService
const rooms = await this.roomRepository.find({
  where: {
    building: { code: 'A1' },
    is_active: true,
  },
  relations: ['building'],  // Include building info
});

// SQL tương đương:
// SELECT r.* FROM rooms r
// JOIN buildings b ON r.building_id = b.id
// WHERE b.code = 'A1' AND r.is_active = true
```

---

### Query 2: Lấy schedules của phòng cụ thể vào thứ 3

```typescript
const schedules = await this.scheduleRepository.find({
  where: {
    room: { id: roomId },
    thu: 3,  // Tuesday
  },
  relations: ['room', 'room.building'],
});

// SQL tương đương:
// SELECT s.* FROM schedules s
// JOIN rooms r ON s.room_id = r.id
// WHERE r.id = 'uuid' AND s.thu = 3
```

---

### Query 3: Tìm phòng trống vào thứ 3, tiết 4-6

```typescript
const occupiedRoomIds = await this.scheduleRepository
  .createQueryBuilder('s')
  .select('DISTINCT s.room_id')
  .where('s.thu = :thu', { thu: 3 })
  .andWhere('s.tiet_bat_dau <= :tiet_kt AND s.tiet_ket_thuc >= :tiet_bd', {
    tiet_bd: 4,
    tiet_kt: 6,
  })
  .getRawMany();

const availableRooms = await this.roomRepository
  .createQueryBuilder('r')
  .leftJoinAndSelect('r.building', 'b')
  .where('r.building.code = :building', { building: 'A1' })
  .andWhere('r.id NOT IN (:...occupiedIds)', {
    occupiedIds: occupiedRoomIds.map(x => x.room_id),
  })
  .getMany();
```

---

## ✅ Database Initialization Flow

```
1. yarn/npm install
   ↓
2. docker-compose up -d
   └─ Start PostgreSQL container
   ↓
3. npm run start:dev
   ↓
4. TypeOrmModule detects entities
   ↓
5. If synchronize: true
   └─ Auto create tables (buildings, rooms, schedules)
   ↓
6. npm run seed
   └─ Insert sample data
   ↓
7. Database ready for API requests
```

---

## 🚀 Các Lệnh Hữu Ích

```bash
# Xem database
psql -U postgres -d empty_room_db

# List tables
\dt

# Describe table
\d buildings

# Run SQL query
SELECT * FROM buildings;
```

---

## 📌 Tóm Tắt

| Component | Vị Trí | Mục Đích |
|-----------|--------|---------|
| **TypeOrmConfigService** | `src/config/typeorm.config.ts` | Cấu hình kết nối PostgreSQL |
| **RedisConfig** | `src/config/redis.config.ts` | Cấu hình Redis cache |
| **Entities** | `src/entities/*.entity.ts` | Database models |
| **AppModule** | `src/app.module.ts` | Kết nối tất cả |
| **Repositories** | Tự động inject từ entities | Query database |
| **Services** | `src/modules/*/**.service.ts` | Business logic + DB queries |
| **Controllers** | `src/modules/*/**.controller.ts` | API endpoints |

**Happy Learning! 🎉**
