/**
 * Database Seeding Script
 *
 * Chạy để populate test data
 *
 * Usage:
 * npx ts-node src/seeders/seed.ts
 */

import { createConnection, DataSource } from 'typeorm';
import { Building } from '../entities/building.entity';
import { Room } from '../entities/room.entity';
import { Schedule } from '../entities/schedule.entity';

const seedDatabase = async () => {
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'password',
    database: 'empty_room_db',
    entities: [Building, Room, Schedule],
    synchronize: true,
  });

  await dataSource.initialize();
  console.log('Database connected');

  // Clear existing data
  await dataSource.manager.delete(Schedule, {});
  await dataSource.manager.delete(Room, {});
  await dataSource.manager.delete(Building, {});

  // Create buildings
  const buildings = await dataSource.manager.save(Building, [
    {
      code: 'A1',
      name: 'Tòa A1',
      is_active: true,
    },
    {
      code: 'A2',
      name: 'Tòa A2',
      is_active: true,
    },
    {
      code: 'B1',
      name: 'Tòa B1',
      is_active: true,
    },
  ]);

  console.log(`Created ${buildings.length} buildings`);

  // Create rooms
  const roomsData = [
    // Tòa A1
    { name: '301', building: buildings[0] },
    { name: '302', building: buildings[0] },
    { name: '303', building: buildings[0] },
    { name: '304', building: buildings[0] },
    { name: '305', building: buildings[0] },
    // Tòa A2
    { name: '201', building: buildings[1] },
    { name: '202', building: buildings[1] },
    { name: '203', building: buildings[1] },
    { name: '204', building: buildings[1] },
    // Tòa B1
    { name: '101', building: buildings[2] },
    { name: '102', building: buildings[2] },
    { name: '103', building: buildings[2] },
    { name: '104', building: buildings[2] },
    { name: '105', building: buildings[2] },
  ];

  const rooms = await dataSource.manager.save(
    Room,
    roomsData.map((r) => ({
      name: r.name,
      building_id: r.building.id,
      is_active: true,
    })),
  );

  console.log(`Created ${rooms.length} rooms`);

  // Create schedules
  const schedulesData = [
    // Monday (Thứ 2)
    { thu: 2, tiet_bat_dau: 4, tiet_ket_thuc: 6, room: rooms[0], ma_hp: 'CS101', lop: 'CQ17-01', mon_hoc: 'Lập Trình Cơ Bản' },
    { thu: 2, tiet_bat_dau: 7, tiet_ket_thuc: 9, room: rooms[1], ma_hp: 'CS102', lop: 'CQ17-02', mon_hoc: 'Web Development' },
    { thu: 2, tiet_bat_dau: 1, tiet_ket_thuc: 3, room: rooms[5], ma_hp: 'MATH202', lop: 'DQ18-01', mon_hoc: 'Toán Cao Cấp II' },

    // Tuesday (Thứ 3)
    { thu: 3, tiet_bat_dau: 7, tiet_ket_thuc: 9, room: rooms[0], ma_hp: 'CS101', lop: 'CQ17-01', mon_hoc: 'Lập Trình Cơ Bản' },
    { thu: 3, tiet_bat_dau: 1, tiet_ket_thuc: 3, room: rooms[2], ma_hp: 'ENG301', lop: 'AQ19-01', mon_hoc: 'Tiếng Anh 3' },
    { thu: 3, tiet_bat_dau: 4, tiet_ket_thuc: 6, room: rooms[6], ma_hp: 'PHYS101', lop: 'CQ17-03', mon_hoc: 'Vật Lý Đại Cương' },

    // Wednesday (Thứ 4)
    { thu: 4, tiet_bat_dau: 4, tiet_ket_thuc: 6, room: rooms[3], ma_hp: 'CS103', lop: 'CQ17-04', mon_hoc: 'Database' },
    { thu: 4, tiet_bat_dau: 7, tiet_ket_thuc: 9, room: rooms[9], ma_hp: 'CHEM201', lop: 'DQ18-02', mon_hoc: 'Hóa Học Đại Cương' },

    // Thursday (Thứ 5)
    { thu: 5, tiet_bat_dau: 1, tiet_ket_thuc: 3, room: rooms[4], ma_hp: 'HISTORY101', lop: 'SH19-01', mon_hoc: 'Lịch Sử Việt Nam' },
    { thu: 5, tiet_bat_dau: 7, tiet_ket_thuc: 8, room: rooms[7], ma_hp: 'BIO101', lop: 'SH19-02', mon_hoc: 'Sinh Học' },

    // Friday (Thứ 6)
    { thu: 6, tiet_bat_dau: 4, tiet_ket_thuc: 6, room: rooms[1], ma_hp: 'CS104', lop: 'CQ17-05', mon_hoc: 'Software Engineering' },
    { thu: 6, tiet_bat_dau: 7, tiet_ket_thuc: 9, room: rooms[10], ma_hp: 'ART101', lop: 'HA19-01', mon_hoc: 'Mỹ Thuật' },

    // Saturday (Thứ 7)
    { thu: 7, tiet_bat_dau: 1, tiet_ket_thuc: 3, room: rooms[2], ma_hp: 'PE101', lop: 'EX19-01', mon_hoc: 'Thể Dục' },
  ];

  const schedules = await dataSource.manager.save(
    Schedule,
    schedulesData.map((s) => ({
      ...s,
      room_id: s.room.id,
    })),
  );

  console.log(`Created ${schedules.length} schedules`);
  console.log('Database seeding completed!');

  await dataSource.destroy();
};

seedDatabase().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
