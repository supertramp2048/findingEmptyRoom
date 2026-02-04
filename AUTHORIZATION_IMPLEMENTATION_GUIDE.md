# Hướng Dẫn Thêm Phân Quyền (Authorization/Roles) Vào Backend NestJS

> 📖 Hướng dẫn chi tiết cách thêm bảng Users, Roles, Permissions vào database để làm phân quyền.

---

## 📋 Mục Lục

1. [Kiến Trúc Phân Quyền](#kiến-trúc-phân-quyền)
2. [Tạo Entities (Bảng Database)](#tạo-entities-bảng-database)
3. [Thiết Lập Relationships](#thiết-lập-relationships)
4. [Migration Database](#migration-database)
5. [Seed Dữ Liệu Ban Đầu](#seed-dữ-liệu-ban-đầu)
6. [Sử Dụng Guards & Decorators](#sử-dụng-guards--decorators)
7. [Flow Xác Thực & Phân Quyền](#flow-xác-thực--phân-quyền)

---

## 🏗️ Kiến Trúc Phân Quyền

### Mô Hình RBAC (Role-Based Access Control)

```
Users
  ↓
  ├─ Has Roles (user_roles table)
  │   ↓
  │   └─ Roles (admin, teacher, student, ...)
  │       ↓
  │       ├─ Has Permissions (role_permissions table)
  │       │   ↓
  │       │   └─ Permissions (create_schedule, edit_rooms, upload_file, ...)
  │
  └─ Can be checked in Guards/Decorators for API access
```

### Ví Dụ Thực Tế

```
User: Nguyễn Văn A
  ├─ Role: Teacher
  │   ├─ Permission: view_rooms (xem phòng)
  │   ├─ Permission: view_schedules (xem thời khóa biểu)
  │   └─ Permission: upload_schedule (tải lên thời khóa biểu)
  │
  └─ Role: Admin
      ├─ Permission: view_rooms
      ├─ Permission: edit_rooms
      ├─ Permission: delete_rooms
      └─ Permission: manage_users
```

---

## 📦 Tạo Entities (Bảng Database)

### 1️⃣ User Entity

**File:** `src/entities/user.entity.ts`

```typescript
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Role } from './role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;  // Hashed password!

  @Column()
  full_name: string;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Many-to-Many: Một user có nhiều roles
  @ManyToMany(() => Role, (role) => role.users, {
    eager: true,  // Auto load roles khi query user
  })
  @JoinTable({
    name: 'user_roles',  // Tên bảng join
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];
}
```

**SQL Tương Đương:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### 2️⃣ Role Entity

**File:** `src/entities/role.entity.ts`

```typescript
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { User } from './user.entity';
import { Permission } from './permission.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;  // 'admin', 'teacher', 'student'

  @Column({ nullable: true })
  description: string;

  @Column({ default: true })
  is_active: boolean;

  // Inverse side of user_roles
  @ManyToMany(() => User, (user) => user.roles)
  users: User[];

  // Many-to-Many: Một role có nhiều permissions
  @ManyToMany(() => Permission, (permission) => permission.roles, {
    eager: true,  // Auto load permissions khi query role
  })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: Permission[];
}
```

**SQL Tương Đương:**
```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- Join table cho User-Role (Many-to-Many)
CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);
```

---

### 3️⃣ Permission Entity

**File:** `src/entities/permission.entity.ts`

```typescript
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToMany,
} from 'typeorm';
import { Role } from './role.entity';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;  // 'view_rooms', 'edit_rooms', 'delete_rooms', etc.

  @Column({ nullable: true })
  description: string;

  @Column({ default: true })
  is_active: boolean;

  // Inverse side of role_permissions
  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];
}
```

**SQL Tương Đương:**
```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- Join table cho Role-Permission (Many-to-Many)
CREATE TABLE role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);
```

---

## 🔗 Thiết Lập Relationships

### Diagram Relationships

```
users (1) ─── (M) user_roles (M) ─── (1) roles
                                        ↓
                                   role_permissions
                                        ↓
                                   permissions
```

### Cách Truy Vấn

```typescript
// 1. Lấy user với roles và permissions
const user = await this.userRepository.findOne({
  where: { id: userId },
  relations: ['roles', 'roles.permissions'],  // Nested relations
});

// 2. Kiểm tra user có role nào
const hasAdminRole = user.roles.some(r => r.name === 'admin');

// 3. Kiểm tra user có permission nào
const hasEditPermission = user.roles.some(r =>
  r.permissions.some(p => p.name === 'edit_rooms')
);
```

---

## 🗂️ Migration Database

### Cách 1: Sử Dụng TypeORM CLI (Tự Động)

**Bước 1: Cấu hình migration**

```typescript
// src/config/typeorm.config.ts
export class TypeOrmConfigService {
  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      
      entities: ['src/entities/**/*.entity.ts'],
      migrations: ['src/migrations/**/*.ts'],  // ← Thêm migrations path
      
      // Auto-generate migration từ entity changes
      migrationsRun: true,  // Auto-run migrations khi app start
    };
  }
}
```

**Bước 2: Tạo migration file**

```bash
npx typeorm migration:generate src/migrations/CreateAuthTables -d ormconfig.ts
```

TypeORM sẽ tự động so sánh database hiện tại với entities và tạo file migration.

**Bước 3: Migration file sẽ như này:**

```typescript
// src/migrations/1706758000000-CreateAuthTables.ts
import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateAuthTables1706758000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tạo bảng users
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'email',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'password',
            type: 'varchar',
          },
          {
            name: 'full_name',
            type: 'varchar',
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Tạo bảng roles
    await queryRunner.createTable(
      new Table({
        name: 'roles',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'name',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
        ],
      }),
      true,
    );

    // Tạo bảng permissions
    await queryRunner.createTable(
      new Table({
        name: 'permissions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'name',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
        ],
      }),
      true,
    );

    // Tạo join table user_roles
    await queryRunner.createTable(
      new Table({
        name: 'user_roles',
        columns: [
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'role_id',
            type: 'uuid',
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
          new TableForeignKey({
            columnNames: ['role_id'],
            referencedTableName: 'roles',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
        uniques: [
          {
            name: 'UQ_user_roles',
            columnNames: ['user_id', 'role_id'],
          },
        ],
      }),
      true,
    );

    // Tạo join table role_permissions
    await queryRunner.createTable(
      new Table({
        name: 'role_permissions',
        columns: [
          {
            name: 'role_id',
            type: 'uuid',
          },
          {
            name: 'permission_id',
            type: 'uuid',
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['role_id'],
            referencedTableName: 'roles',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
          new TableForeignKey({
            columnNames: ['permission_id'],
            referencedTableName: 'permissions',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
        uniques: [
          {
            name: 'UQ_role_permissions',
            columnNames: ['role_id', 'permission_id'],
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: Xóa tables (ngược lại)
    await queryRunner.dropTable('role_permissions');
    await queryRunner.dropTable('user_roles');
    await queryRunner.dropTable('permissions');
    await queryRunner.dropTable('roles');
    await queryRunner.dropTable('users');
  }
}
```

**Bước 4: Chạy migration**

```bash
# Run migration
npm run typeorm migration:run

# Rollback migration (nếu có lỗi)
npm run typeorm migration:revert
```

### Cách 2: Manual (Không Sử Dụng Migration)

Nếu không muốn dùng migrations, bạn có thể:

1. Set `synchronize: true` trong TypeORM config (⚠️ chỉ dev)
2. Chạy SQL commands trực tiếp vào database

```bash
# Kết nối PostgreSQL
psql -U postgres -d empty_room_db

# Chạy SQL từ trên
```

---

## 🌱 Seed Dữ Liệu Ban Đầu

### Tạo Seeder File

**File:** `src/seeders/auth-seed.ts`

```typescript
import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '@/entities/user.entity';
import { Role } from '@/entities/role.entity';
import { Permission } from '@/entities/permission.entity';
import * as bcrypt from 'bcrypt';

const logger = new Logger('AuthSeeder');

export async function seedAuth(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(User);
  const roleRepository = dataSource.getRepository(Role);
  const permissionRepository = dataSource.getRepository(Permission);

  // 1. Tạo Permissions
  logger.log('Creating permissions...');

  const permissionsData = [
    { name: 'view_rooms', description: 'Xem danh sách phòng' },
    { name: 'create_rooms', description: 'Tạo phòng mới' },
    { name: 'edit_rooms', description: 'Chỉnh sửa phòng' },
    { name: 'delete_rooms', description: 'Xóa phòng' },
    { name: 'view_schedules', description: 'Xem thời khóa biểu' },
    { name: 'upload_schedules', description: 'Tải lên thời khóa biểu' },
    { name: 'manage_users', description: 'Quản lý người dùng' },
    { name: 'manage_roles', description: 'Quản lý roles' },
  ];

  const permissions = await Promise.all(
    permissionsData.map(async (p) => {
      const existing = await permissionRepository.findOne({
        where: { name: p.name },
      });
      if (existing) return existing;
      return permissionRepository.save(
        permissionRepository.create(p)
      );
    }),
  );

  logger.log(`✓ Created ${permissions.length} permissions`);

  // 2. Tạo Roles
  logger.log('Creating roles...');

  const adminPermissions = permissions;  // Admin có tất cả permissions

  const teacherPermissions = permissions.filter(p =>
    ['view_rooms', 'view_schedules', 'upload_schedules'].includes(p.name)
  );

  const studentPermissions = permissions.filter(p =>
    ['view_rooms', 'view_schedules'].includes(p.name)
  );

  const adminRole = await roleRepository.save(
    roleRepository.create({
      name: 'admin',
      description: 'Quản trị viên hệ thống',
      permissions: adminPermissions,
    }),
  );

  const teacherRole = await roleRepository.save(
    roleRepository.create({
      name: 'teacher',
      description: 'Giáo viên',
      permissions: teacherPermissions,
    }),
  );

  const studentRole = await roleRepository.save(
    roleRepository.create({
      name: 'student',
      description: 'Sinh viên',
      permissions: studentPermissions,
    }),
  );

  logger.log('✓ Created 3 roles: admin, teacher, student');

  // 3. Tạo Users Test
  logger.log('Creating test users...');

  const adminUser = await userRepository.save(
    userRepository.create({
      email: 'admin@example.com',
      password: await bcrypt.hash('admin123', 10),
      full_name: 'Admin User',
      roles: [adminRole],
    }),
  );

  const teacherUser = await userRepository.save(
    userRepository.create({
      email: 'teacher@example.com',
      password: await bcrypt.hash('teacher123', 10),
      full_name: 'Nguyễn Văn A',
      roles: [teacherRole],
    }),
  );

  const studentUser = await userRepository.save(
    userRepository.create({
      email: 'student@example.com',
      password: await bcrypt.hash('student123', 10),
      full_name: 'Trần Văn B',
      roles: [studentRole],
    }),
  );

  logger.log('✓ Created 3 test users');
  logger.log('Test Credentials:');
  logger.log('  Admin: admin@example.com / admin123');
  logger.log('  Teacher: teacher@example.com / teacher123');
  logger.log('  Student: student@example.com / student123');
}
```

**Chạy seeder:**

```bash
# Thêm vào package.json
"seed": "ts-node src/seeders/seed.ts"

# Chạy
npm run seed
```

---

## 🔐 Sử Dụng Guards & Decorators

### 1️⃣ Tạo Auth Guard

**File:** `src/common/guards/auth.guard.ts`

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token);
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractToken(request: any): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) return undefined;

    // Format: "Bearer <token>"
    const [scheme, credentials] = authHeader.split(' ');
    return scheme === 'Bearer' ? credentials : undefined;
  }
}
```

---

### 2️⃣ Tạo Role Guard

**File:** `src/common/guards/role.guard.ts`

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User } from '@/entities/user.entity';
import { ROLES_KEY } from '@/common/decorators/roles.decorator';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Lấy required roles từ decorator
    const requiredRoles = this.reflector.get<string[]>(
      ROLES_KEY,
      context.getHandler(),
    );

    // Nếu không có required roles, cho phép truy cập
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: User = request.user;

    // Kiểm tra user có role yêu cầu không
    const hasRole = user.roles.some(role =>
      requiredRoles.includes(role.name),
    );

    if (!hasRole) {
      throw new ForbiddenException(
        `User does not have required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
```

---

### 3️⃣ Tạo Permission Guard

**File:** `src/common/guards/permission.guard.ts`

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User } from '@/entities/user.entity';
import { PERMISSIONS_KEY } from '@/common/decorators/permissions.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>(
      PERMISSIONS_KEY,
      context.getHandler(),
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: User = request.user;

    // Kiểm tra user có permission yêu cầu không
    const hasPermission = user.roles.some(role =>
      role.permissions.some(permission =>
        requiredPermissions.includes(permission.name),
      ),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `User does not have required permissions: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
```

---

### 4️⃣ Tạo Decorators

**File:** `src/common/decorators/roles.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

**File:** `src/common/decorators/permissions.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
```

---

### 5️⃣ Sử Dụng Trong Controller

```typescript
// src/modules/schedule/schedule.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/common/guards/auth.guard';
import { RoleGuard } from '@/common/guards/role.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { ScheduleService } from './schedule.service';

@Controller('api')
@UseGuards(AuthGuard)  // Tất cả routes phải authenticate
export class ScheduleController {
  constructor(private scheduleService: ScheduleService) {}

  // Chỉ authenticated users mới vào
  @Get('rooms/available')
  async findAvailableRooms() {
    return this.scheduleService.findAvailableRooms();
  }

  // Chỉ admin và teacher mới vào
  @Get('schedule/stats')
  @UseGuards(RoleGuard)
  @Roles('admin', 'teacher')
  async getStats() {
    return this.scheduleService.getStats();
  }

  // Chỉ có permission 'upload_schedules' mới upload
  @Post('schedule/upload')
  @UseGuards(PermissionGuard)
  @Permissions('upload_schedules')
  async uploadSchedule(@UploadedFile() file: any) {
    return this.scheduleService.importScheduleFromExcel(file.buffer);
  }

  // Chỉ admin mới delete
  @Delete('rooms/:id')
  @UseGuards(RoleGuard)
  @Roles('admin')
  async deleteRoom(@Param('id') id: string) {
    return this.scheduleService.deleteRoom(id);
  }
}
```

---

## 🔄 Flow Xác Thực & Phân Quyền

### Sequence Diagram

```
Client                Backend              Database
  │                      │                      │
  ├─ POST /login ────────>│                      │
  │  (email, password)    │                      │
  │                      ├─ Find User ─────────>│
  │                      │                      │
  │                      │  Return User + Roles │
  │                      │<─────────────────────┤
  │                      │                      │
  │                      ├─ Verify Password     │
  │                      ├─ Generate JWT        │
  │                      │                      │
  │  JWT Token          │                      │
  │<─ Return token ──────┤                      │
  │                      │                      │
  │                      │                      │
  ├─ GET /rooms ─────────>│                      │
  │  (Authorization: Bearer JWT)                │
  │                      ├─ Verify JWT          │
  │                      ├─ Extract User ID     │
  │                      │                      │
  │                      ├─ Check AuthGuard ✓   │
  │                      │                      │
  │                      ├─ Query Rooms ───────>│
  │                      │                      │
  │                      │  Return Rooms        │
  │  Return Rooms       │<─────────────────────┤
  │<─ 200 OK ───────────┤                      │
  │                      │                      │
  │                      │                      │
  ├─ POST /upload ───────>│                      │
  │  (Authorization: Bearer JWT)                │
  │                      ├─ Verify JWT ✓        │
  │                      ├─ Check RoleGuard     │
  │                      │  (require: admin)    │
  │                      │                      │
  │  403 Forbidden       │                      │
  │<─ Not authorized ────┤ (không phải admin)   │
  │                      │                      │
```

---

## 📊 Ví Dụ: Kiểm Tra Quyền Trong Thực Tế

### Scenario: Upload Schedule

**1. User Login & Get Token**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "teacher123"
  }'

# Response:
# {
#   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "user": {
#     "id": "uuid-123",
#     "email": "teacher@example.com",
#     "roles": [
#       {
#         "name": "teacher",
#         "permissions": [
#           { "name": "view_rooms" },
#           { "name": "view_schedules" },
#           { "name": "upload_schedules" }  ← Teacher có permission này
#         ]
#       }
#     ]
#   }
# }
```

**2. Upload File với Token**

```bash
curl -X POST http://localhost:3000/api/schedule/upload \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "file=@schedule.xlsx"

# Response: 200 OK (Success)
```

**3. Nếu User Không Có Permission**

```bash
# Nếu student@example.com login và try upload:
# Student role không có 'upload_schedules' permission

curl -X POST http://localhost:3000/api/schedule/upload \
  -H "Authorization: Bearer <student-token>" \
  -F "file=@schedule.xlsx"

# Response: 403 Forbidden
# {
#   "statusCode": 403,
#   "message": "User does not have required permissions: upload_schedules"
# }
```

---

## ✅ Checklist Thực Hiện

- [ ] 1. Tạo 3 entity files: `User`, `Role`, `Permission`
- [ ] 2. Thiết lập relationships (Many-to-Many)
- [ ] 3. Tạo migration file hoặc set `synchronize: true`
- [ ] 4. Chạy migration: `npm run typeorm migration:run`
- [ ] 5. Tạo seeder file để seed data
- [ ] 6. Chạy seeder: `npm run seed`
- [ ] 7. Tạo 3 guard files: `AuthGuard`, `RoleGuard`, `PermissionGuard`
- [ ] 8. Tạo 2 decorator files: `@Roles()`, `@Permissions()`
- [ ] 9. Update `ScheduleModule` để export guards
- [ ] 10. Thêm `@UseGuards()` vào controllers
- [ ] 11. Test với curl/Postman

---

## 🚀 Các Bước Tiếp Theo

1. **Implement Auth Service**
   - Login endpoint (JWT generation)
   - Register endpoint
   - Token refresh endpoint

2. **Add More Guards**
   - OwnershipGuard (check if user owns resource)
   - CustomGuard (multiple conditions)

3. **Add Interceptors**
   - Logging who accessed what
   - Audit trail

4. **Update Other Services**
   - Add @UseGuards() vào các endpoints khác
   - Assign permissions cho operations

5. **Frontend Integration** (Vue)
   - Store JWT token từ login
   - Include token vào requests
   - Hide UI elements nếu user không có permission

---

## 📝 SQL Queries Hữu Ích

```sql
-- Lấy tất cả permissions của user
SELECT u.id, u.email, r.name as role, p.name as permission
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE u.email = 'teacher@example.com';

-- Kiểm tra user có permission không
SELECT COUNT(*) as has_permission
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE u.id = 'user-id' AND p.name = 'upload_schedules';

-- Thêm role cho user
INSERT INTO user_roles (user_id, role_id)
VALUES ('user-id', (SELECT id FROM roles WHERE name = 'teacher'));

-- Thêm permission cho role
INSERT INTO role_permissions (role_id, permission_id)
VALUES (
  (SELECT id FROM roles WHERE name = 'teacher'),
  (SELECT id FROM permissions WHERE name = 'upload_schedules')
);
```

---

**Happy Coding! 🎉**
