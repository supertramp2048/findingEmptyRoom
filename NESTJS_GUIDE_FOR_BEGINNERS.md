# NestJS, Redis & PostgreSQL - Hướng Dẫn Toàn Diện Cho Người Mới

> 📖 Hướng dẫn này dành cho những người có kinh nghiệm với Express nhưng chưa biết NestJS.

---

## 📑 Mục Lục

1. [NestJS Là Gì?](#nestjs-là-gì)
2. [Kiến Trúc NestJS](#kiến-trúc-nestjs)
3. [PostgreSQL Trong NestJS](#postgresql-trong-nestjs)
4. [Redis & Caching](#redis--caching)
5. [Luồng Request Trong Project Này](#luồng-request-trong-project-này)
6. [So Sánh Express vs NestJS](#so-sánh-express-vs-nestjs)

---

## NestJS Là Gì?

### Định Nghĩa
**NestJS** là một framework để xây dựng **Node.js server-side applications** (giống Express), nhưng:
- ✅ **Sử dụng TypeScript mặc định** (Express là optional)
- ✅ **Có cấu trúc tổ chức rõ ràng** (Controllers, Services, Modules...)
- ✅ **Dựa trên decorators** (Python/Java style)
- ✅ **Hỗ trợ Dependency Injection** (giống Spring Boot)
- ✅ **Có Guards, Interceptors, Pipes** (tổ chức code tốt hơn)

### So Sánh Nhanh Với Express

```
EXPRESS (Tự do, linh hoạt):
app.get('/rooms', (req, res) => {
  // Tất cả logic ở đây
  // Không có quy tắc cấu trúc
})

NESTJS (Có quy tắc):
@Controller('rooms')
export class RoomsController {
  constructor(private roomService: RoomService) {}
  
  @Get()
  findAll() {
    return this.roomService.findAll();
  }
}
```

---

## Kiến Trúc NestJS

### Các Thành Phần Chính

```
NestJS Application
├── main.ts          ← Điểm khởi động (giống server.js trong Express)
├── app.module.ts    ← Module chính (quản lý toàn bộ ứng dụng)
├── modules/         ← Chia nhỏ ứng dụng theo feature
│   ├── schedule/
│   │   ├── schedule.controller.ts    ← Xử lý HTTP request (giống route handler)
│   │   ├── schedule.service.ts       ← Business logic (giống model/service)
│   │   ├── schedule.module.ts        ← Đăng ký controller + service
│   │   └── room-availability.service.ts
│   └── ...
├── entities/        ← Database models (giống ORM models)
├── config/          ← Configuration (environment variables)
└── common/          ← Shared utils, DTOs, interceptors
```

### 1️⃣ CONTROLLER (Điểm vào cho HTTP request)

**Controller** = Route handler trong Express

```typescript
// src/modules/schedule/schedule.controller.ts
import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ScheduleService } from './schedule.service';

@Controller('api')  // Base URL: /api
export class ScheduleController {
  
  // Dependency Injection: NestJS tự inject ScheduleService
  constructor(private scheduleService: ScheduleService) {}
  
  @Get('rooms/available')  // GET /api/rooms/available
  async findAvailableRooms(
    @Query('thu') thu?: string,
    @Query('tiet_bd') tiet_bd?: string,
  ) {
    // Validate input
    const parsedThu = parseInt(thu || '');
    if (isNaN(parsedThu)) {
      throw new BadRequestException('Invalid thu parameter');
    }
    
    // Gọi service để xử lý logic
    return this.scheduleService.findAvailableRooms(parsedThu, tiet_bd);
  }
}
```

**Tương đương với Express:**
```javascript
// Express style
app.get('/api/rooms/available', (req, res) => {
  const thu = req.query.thu;
  if (!thu) return res.status(400).send('Invalid thu');
  
  const result = scheduleService.findAvailableRooms(thu);
  res.json(result);
});
```

**Các Decorator Quan Trọng:**
```typescript
@Get()              // HTTP GET
@Post()             // HTTP POST
@Put()              // HTTP PUT
@Delete()           // HTTP DELETE
@Query('name')      // Lấy query parameter
@Param('id')        // Lấy URL parameter (/users/:id)
@Body()             // Lấy request body
@Request()          // Toàn bộ request object
@Response()         // Response object
```

---

### 2️⃣ SERVICE (Xử lý Business Logic)

**Service** = Logic layer, nơi xử lý database queries, calculations, etc.

```typescript
// src/modules/schedule/schedule.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Schedule } from '@/entities/schedule.entity';

@Injectable()  // Decorator cho phép NestJS inject service này vào controller
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);
  
  constructor(
    @InjectRepository(Schedule)
    private scheduleRepository: Repository<Schedule>,
  ) {}
  
  // Business logic ở đây
  async findAvailableRooms(thu: number, tiet_bd: number) {
    this.logger.log(`Finding rooms: thu=${thu}, tiet=${tiet_bd}`);
    
    // Query database
    const schedules = await this.scheduleRepository.find({
      where: { thu, tiet_bat_dau: tiet_bd }
    });
    
    return schedules;
  }
}
```

**Tương đương với Express:**
```javascript
// Express style
class ScheduleService {
  async findAvailableRooms(thu, tiet_bd) {
    const schedules = await db.query('SELECT * FROM schedules WHERE...');
    return schedules;
  }
}

// Sau đó gọi từ route handler
app.get('/api/rooms/available', async (req, res) => {
  const result = await scheduleService.findAvailableRooms(req.query.thu);
  res.json(result);
});
```

---

### 3️⃣ MODULE (Gom nhóm Controller + Service)

**Module** = Cách NestJS tổ chức các thành phần liên quan

```typescript
// src/modules/schedule/schedule.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { RoomAvailabilityService } from './room-availability.service';
import { Schedule } from '@/entities/schedule.entity';
import { Room } from '@/entities/room.entity';

@Module({
  // Đăng ký repositories để sử dụng trong service
  imports: [TypeOrmModule.forFeature([Schedule, Room])],
  
  // Thành phần của module này
  controllers: [ScheduleController],
  providers: [ScheduleService, RoomAvailabilityService],
  
  // Export để module khác có thể sử dụng
  exports: [ScheduleService, RoomAvailabilityService],
})
export class ScheduleModule {}
```

**Tương đương với Express:**
```javascript
// Express style - không có module, chỉ manually import/export
const scheduleController = require('./schedule.controller');
const scheduleService = require('./schedule.service');

module.exports = {
  controller: scheduleController,
  service: scheduleService,
};

// Rồi import vào main file
const { controller, service } = require('./modules/schedule');
app.use('/api', controller);
```

---

### 4️⃣ MAIN.TS (Điểm Khởi Động)

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  // Tạo NestJS app từ module chính
  const app = await NestFactory.create(AppModule);
  
  // Sử dụng global pipes (validators)
  app.useGlobalPipes(new ValidationPipe());
  
  // Bật CORS
  app.enableCors();
  
  // Lắng nghe port
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Server listening on port ${port}`);
}

bootstrap();
```

**Tương đương với Express:**
```javascript
// Express style
const express = require('express');
const app = express();

app.use(cors());
app.use(express.json());

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
```

---

### 5️⃣ APP MODULE (Module Chính)

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from './modules/schedule/schedule.module';

@Module({
  imports: [
    // Load environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Configure database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useClass: TypeOrmConfigService,
    }),
    
    // Configure cache (Redis)
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: (configService: ConfigService) => ({
        store: 'memory',
        ttl: 300 * 1000, // 5 minutes
      }),
      inject: [ConfigService],
    }),
    
    // Các modules khác
    ScheduleModule,
  ],
})
export class AppModule {}
```

---

## PostgreSQL Trong NestJS

### Khái Niệm Cơ Bản

NestJS sử dụng **TypeORM** để kết nối và quản lý PostgreSQL:
- ✅ **ORM** (Object-Relational Mapping) - Map database tables → TypeScript classes
- ✅ **Query Builder** - Viết SQL dễ hơn
- ✅ **Migrations** - Version control cho database schema

### 1️⃣ ENTITY (Database Model)

**Entity** = Một table trong database, được biểu diễn dưới dạng TypeScript class

```typescript
// src/entities/room.entity.ts
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

@Entity('rooms')  // Tên table: 'rooms'
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;  // Column: id (UUID)
  
  @Column({ length: 100 })
  name: string;  // Column: name (VARCHAR 100)
  
  // Foreign key: phòng thuộc tòa nhà
  @ManyToOne(() => Building, (building) => building.rooms)
  @JoinColumn({ name: 'building_id' })
  building: Building;
  
  @Column({ default: true })
  is_active: boolean;  // Column: is_active (BOOLEAN)
  
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;  // Column: created_at (TIMESTAMP)
  
  // Một phòng có nhiều schedules
  @OneToMany(() => Schedule, (schedule) => schedule.room)
  schedules: Schedule[];
}
```

**Tương đương SQL:**
```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Tương đương với Express + Sequelize:**
```javascript
// Express style
const Room = sequelize.define('Room', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

Room.belongsTo(Building, { foreignKey: 'building_id' });
```

### 2️⃣ RELATIONSHIPS (Quan Hệ Giữa Các Bảng)

**One-to-Many: Một tòa nhà có nhiều phòng**
```typescript
// Building.entity.ts
@OneToMany(() => Room, (room) => room.building)
rooms: Room[];

// Room.entity.ts
@ManyToOne(() => Building, (building) => building.rooms)
@JoinColumn({ name: 'building_id' })
building: Building;
```

**Many-to-Many: Nhiều sinh viên có nhiều lớp**
```typescript
@ManyToMany(() => Course, (course) => course.students)
@JoinTable()
courses: Course[];
```

### 3️⃣ REPOSITORY (Query Database)

**Repository** = Interface để query/update database table

```typescript
// src/modules/schedule/schedule.service.ts
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from '@/entities/room.entity';

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
  ) {}
  
  // Các cách query:
  
  // 1. Find all
  async findAllRooms() {
    return this.roomRepository.find();
  }
  
  // 2. Find with conditions
  async findRoomsByBuilding(buildingId: string) {
    return this.roomRepository.find({
      where: { building: { id: buildingId } },
    });
  }
  
  // 3. Find one
  async findRoomById(id: string) {
    return this.roomRepository.findOne({
      where: { id },
      relations: ['building', 'schedules'],  // Join relationships
    });
  }
  
  // 4. Query builder (phức tạp hơn)
  async findAvailableRooms(buildingId: string, tiet: number) {
    return this.roomRepository
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.schedules', 'schedule')
      .where('room.building_id = :buildingId', { buildingId })
      .andWhere('schedule.tiet_bat_dau > :tiet', { tiet })
      .getMany();
  }
  
  // 5. Save/Create
  async createRoom(name: string, buildingId: string) {
    const room = this.roomRepository.create({
      name,
      building: { id: buildingId },
    });
    return this.roomRepository.save(room);
  }
  
  // 6. Update
  async updateRoom(id: string, data: Partial<Room>) {
    return this.roomRepository.update(id, data);
  }
  
  // 7. Delete
  async deleteRoom(id: string) {
    return this.roomRepository.delete(id);
  }
}
```

**Tương đương SQL:**
```sql
-- Find all
SELECT * FROM rooms;

-- Find with conditions
SELECT * FROM rooms WHERE building_id = 'xxx';

-- Find one
SELECT r.*, b.* FROM rooms r
LEFT JOIN buildings b ON r.building_id = b.id
WHERE r.id = 'xxx';

-- Complex query
SELECT r.* FROM rooms r
LEFT JOIN schedules s ON r.id = s.room_id
WHERE r.building_id = 'xxx' AND s.tiet_bat_dau > 5;

-- Create
INSERT INTO rooms (name, building_id) VALUES ('101', 'xxx');

-- Update
UPDATE rooms SET is_active = false WHERE id = 'xxx';

-- Delete
DELETE FROM rooms WHERE id = 'xxx';
```

### 4️⃣ TYPEORM CONFIG (Kết Nối Database)

```typescript
// src/config/typeorm.config.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

@Injectable()
export class TypeOrmConfigService {
  constructor(private configService: ConfigService) {}
  
  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'postgres',  // Database type
      host: this.configService.get('DB_HOST', 'localhost'),
      port: this.configService.get('DB_PORT', 5432),
      username: this.configService.get('DB_USERNAME', 'postgres'),
      password: this.configService.get('DB_PASSWORD', 'password'),
      database: this.configService.get('DB_NAME', 'empty_room_db'),
      
      // Register entities
      entities: [Building, Room, Schedule],
      
      // Auto-create/update tables (development only)
      synchronize: true,
      
      // Log SQL queries
      logging: this.configService.get('NODE_ENV') === 'development',
    };
  }
}
```

**.env file:**
```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=mypassword
DB_NAME=empty_room_db
```

---

## Redis & Caching

### Redis Là Gì?

**Redis** = In-memory data store (lưu dữ liệu trong RAM, không phải disk):
- ✅ **Rất nhanh** (read/write từ memory)
- ✅ **Key-Value store** (như JavaScript object)
- ✅ **Thường dùng cho caching** (lưu kết quả query lâu)
- ✅ **TTL** (Time To Live - tự xóa sau thời gian nhất định)

### Caching Logic

**Không có cache:**
```
User request
    ↓
Query database (1 giây)
    ↓
Return result
```

**Có cache (Redis):**
```
User request
    ↓
Check Redis cache (1ms) → Nếu có → Return immediately ⚡
    ↓
Query database (1 giây) → Save to Redis (TTL: 5 min) → Return result
```

### Sử Dụng Cache Trong NestJS

```typescript
// src/modules/schedule/schedule.controller.ts
import { Inject, Controller, Get, Query } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ScheduleService } from './schedule.service';

@Controller('api')
export class ScheduleController {
  constructor(
    private scheduleService: ScheduleService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}
  
  @Get('rooms/available')
  async findAvailableRooms(
    @Query('thu') thu?: string,
    @Query('tiet_bd') tiet_bd?: string,
  ) {
    // Tạo cache key từ parameters
    const cacheKey = `available:${thu}:${tiet_bd}`;
    
    // 1. Check cache
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      console.log('Cache hit! Returning cached result');
      return cached;  // ⚡ Return ngay, không query database
    }
    
    // 2. Cache miss - Query database
    console.log('Cache miss! Querying database...');
    const result = await this.scheduleService.findAvailableRooms(
      parseInt(thu),
      parseInt(tiet_bd),
    );
    
    // 3. Save to cache (TTL: 5 minutes = 300,000ms)
    await this.cacheManager.set(cacheKey, result, 300000);
    
    return result;
  }
}
```

### Cache Manager Configuration

```typescript
// src/app.module.ts
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,  // Accessible everywhere
      useFactory: (configService: ConfigService) => {
        const redisHost = configService.get('REDIS_HOST', 'localhost');
        const redisPort = configService.get('REDIS_PORT', 6379);
        const redisTtl = configService.get('REDIS_TTL', 300) * 1000;
        
        // Production: sử dụng Redis
        if (configService.get('NODE_ENV') === 'production') {
          return {
            store: 'redis',
            host: redisHost,
            port: redisPort,
            ttl: redisTtl,
          };
        }
        
        // Development: sử dụng memory cache (không cần Redis server)
        return {
          store: 'memory',
          ttl: redisTtl,
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### Xóa Cache Khi Update Data

```typescript
// Khi upload schedule mới, xóa tất cả cache
@Post('schedule/upload')
async uploadSchedule(@UploadedFile() file: any) {
  // Process upload...
  
  // Xóa tất cả cache
  await this.cacheManager.reset();
  
  return { success: true };
}
```

---

## Luồng Request Trong Project Này

### Flow: GET /api/rooms/available

```
1. HTTP Request đến
   ↓
2. ScheduleController.findAvailableRooms() được gọi
   ├─ Validate parameters
   ├─ Tạo cache key
   └─ Check Redis cache
      ├─ HIT → Return cached result ⚡
      └─ MISS → Continue
   ↓
3. Gọi ScheduleService.findAvailableRooms()
   ├─ Query database bằng Repository
   ├─ Loop through rooms
   └─ Kiểm tra overlapping schedules
   ↓
4. Gọi RoomAvailabilityService.findContinuousSlots()
   ├─ Find continuous empty sessions
   └─ Build response DTO
   ↓
5. Save result to Redis cache (TTL: 5 min)
   ↓
6. Return response to client
```

### Code Flow

```typescript
// 1. Request đến controller
@Get('rooms/available')
async findAvailableRooms(
  @Query('thu') thu?: string,
  @Query('tiet_bd') tiet_bd?: string,
) {
  // 2. Validate
  const parsedThu = parseInt(thu || '');
  if (isNaN(parsedThu)) throw new BadRequestException('Invalid thu');
  
  // 3. Check cache
  const cacheKey = `available:${parsedThu}:${tiet_bd}`;
  const cached = await this.cacheManager.get(cacheKey);
  if (cached) return cached;
  
  // 4. Call service
  const result = await this.scheduleService.findAvailableRooms(
    parsedThu,
    parseInt(tiet_bd),
    parseInt(tiet_kt),
    building,
  );
  
  // 5. Save cache
  await this.cacheManager.set(cacheKey, result, 300000);
  
  return result;
}

// ScheduleService
async findAvailableRooms(thu, tiet_bd, tiet_kt, building) {
  // 6. Query rooms
  const rooms = await this.roomRepository.find({
    where: { building: { code: building }, is_active: true },
    relations: ['building'],
  });
  
  // 7. Query schedules (tìm conflicts)
  const schedules = await this.scheduleRepository.find({
    where: { thu, room_id: In(rooms.map(r => r.id)) },
  });
  
  // 8. Process results
  const availableRooms = [];
  for (const room of rooms) {
    const conflictingSchedules = schedules.filter(s => s.room_id === room.id);
    
    if (conflictingSchedules.length === 0) {
      // Phòng trống
      availableRooms.push({
        room: room.name,
        continuous_slots: [tiet_bd, tiet_bd + 1, tiet_bd + 2],
      });
    }
  }
  
  return { rooms: availableRooms };
}
```

---

## So Sánh Express vs NestJS

### 1. Project Structure

**Express (Tự do):**
```
src/
├── routes/
│   ├── rooms.js
│   └── schedule.js
├── controllers/
│   ├── roomController.js
│   └── scheduleController.js
├── services/
│   ├── roomService.js
│   └── scheduleService.js
└── server.js
```

**NestJS (Có quy tắc):**
```
src/
├── modules/
│   ├── rooms/
│   │   ├── rooms.controller.ts
│   │   ├── rooms.service.ts
│   │   ├── rooms.module.ts
│   │   └── rooms.entity.ts
│   └── schedule/
│       ├── schedule.controller.ts
│       ├── schedule.service.ts
│       └── schedule.module.ts
├── entities/
├── config/
└── main.ts
```

### 2. Dependency Injection

**Express (Manual):**
```javascript
const roomService = new RoomService(database);

app.get('/rooms', (req, res) => {
  const rooms = roomService.findAll();
  res.json(rooms);
});
```

**NestJS (Automatic):**
```typescript
@Controller('rooms')
export class RoomsController {
  constructor(private roomService: RoomService) {}  // Auto-injected!
  
  @Get()
  findAll() {
    return this.roomService.findAll();
  }
}
```

### 3. Validation

**Express (Manual):**
```javascript
app.post('/rooms', (req, res) => {
  if (!req.body.name) {
    return res.status(400).json({ error: 'Name required' });
  }
  // Phải validate từng field...
});
```

**NestJS (Automatic):**
```typescript
class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

@Post()
create(@Body() createRoomDto: CreateRoomDto) {
  // Automatically validated!
  return this.roomService.create(createRoomDto);
}
```

### 4. Error Handling

**Express (Manual):**
```javascript
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({ error: err.message });
});
```

**NestJS (Built-in):**
```typescript
throw new BadRequestException('Invalid room');  // Auto handled!
```

### 5. Database Queries

**Express + Sequelize:**
```javascript
const rooms = await Room.findAll({
  where: { building_id: buildingId },
  include: [{ association: 'building' }],
});
```

**NestJS + TypeORM:**
```typescript
const rooms = await this.roomRepository.find({
  where: { building: { id: buildingId } },
  relations: ['building'],
});
```

### 6. Caching

**Express (Manual):**
```javascript
const cache = {};

app.get('/rooms', (req, res) => {
  const key = `rooms:${req.query.building}`;
  
  if (cache[key]) {
    return res.json(cache[key]);
  }
  
  const rooms = roomService.findAll(req.query.building);
  cache[key] = rooms;
  
  res.json(rooms);
});
```

**NestJS (Built-in):**
```typescript
@Inject(CACHE_MANAGER) private cacheManager: Cache,

@Get()
async findAll(@Query('building') building: string) {
  const cached = await this.cacheManager.get(`rooms:${building}`);
  if (cached) return cached;
  
  const rooms = await this.roomService.findAll(building);
  await this.cacheManager.set(`rooms:${building}`, rooms, 300000);
  
  return rooms;
}
```

---

## Các Decorator Quan Trọng Khác

### Guard (Bảo vệ route)
```typescript
@UseGuards(AuthGuard)  // Chỉ user authenticated mới vào
@Get('admin/rooms')
getAdminRooms() { }
```

### Interceptor (Xử lý request/response)
```typescript
@UseInterceptors(LoggingInterceptor)  // Log tất cả requests
@Get('rooms')
findAll() { }
```

### Pipe (Transform/Validate data)
```typescript
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
  // id tự động convert thành number
}
```

---

## Summary

| Khái Niệm | Giải Thích |
|----------|-----------|
| **NestJS** | Framework tổ chức cho Node.js (Express + Architecture) |
| **Controller** | Xử lý HTTP requests (route handler) |
| **Service** | Business logic (database queries, calculations) |
| **Module** | Gom nhóm Controller + Service + Providers |
| **Entity** | Database model/table |
| **Repository** | Interface để query database |
| **DTO** | Data Transfer Object (validate input/output) |
| **Pipe** | Transform/Validate dữ liệu |
| **Guard** | Bảo vệ routes (authentication) |
| **Interceptor** | Process request/response (logging, caching) |
| **Middleware** | Xử lý trước Controller |
| **PostgreSQL** | Database quan hệ (relational database) |
| **TypeORM** | ORM tool để kết nối NestJS + PostgreSQL |
| **Redis** | In-memory cache store |
| **Cache Manager** | NestJS module để quản lý cache |

---

## Tiếp Theo

1. **Đọc documentation:** https://docs.nestjs.com
2. **Xem TypeORM docs:** https://typeorm.io
3. **Experiment:** Thêm tính năng mới (POST, PUT, DELETE endpoints)
4. **Learn Guards:** Authentication & Authorization
5. **Learn Interceptors:** Logging, Error handling

Happy Learning! 🚀
