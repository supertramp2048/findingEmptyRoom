import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Building } from '@/entities/building.entity';
import { Room } from '@/entities/room.entity';
import { Schedule } from '@/entities/schedule.entity';
import { ExcelParserService, ParsedScheduleRow } from './excel-parser.service';

/**
 * Schedule Service
 *
 * Xử lý import schedule từ Excel và quản lý dữ liệu schedule
 *
 * FLOW UPLOAD:
 * 1. Parse Excel file → danh sách ParsedScheduleRow
 * 2. Clear schedule cũ (dùng clear() hoặc raw query)
 * 3. Ensure buildings và rooms tồn tại
 * 4. Bulk insert schedules mới
 * 5. Clear Redis cache (ngoài service, gọi từ controller)
 */
@Injectable()
export class ScheduleService {
    private readonly logger = new Logger(ScheduleService.name);

    constructor(
        @InjectRepository(Building)
        private buildingRepository: Repository<Building>,

        @InjectRepository(Room)
        private roomRepository: Repository<Room>,

        @InjectRepository(Schedule)
        private scheduleRepository: Repository<Schedule>,

        private excelParserService: ExcelParserService,
        private dataSource: DataSource,
    ) { }

    /**
     * Import schedule từ Excel file
     *
     * @param fileBuffer - Buffer của Excel file
     * @returns { success: boolean, message: string, rows_imported: number }
     */
    async importScheduleFromExcel(fileBuffer: Buffer): Promise<{
        success: boolean;
        message: string;
        rows_imported: number;
    }> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Parse Excel
            this.logger.log('Parsing Excel file...');
            const parsedRows = this.excelParserService.parseExcelFile(fileBuffer);
            if (parsedRows.length === 0) {
                throw new Error('No valid schedule rows found in Excel file');
            }
            this.logger.log(`Parsed ${parsedRows.length} schedule rows`);
            // 2. Clear old schedules
            this.logger.log('Clearing old schedules...');
            await queryRunner.manager.clear(Schedule);

            // 3. Lookup all rooms in DB (KHÔNG tạo mới room)
            this.logger.log('Looking up rooms in DB...');
            const roomRepo = queryRunner.manager.getRepository(Room);

            const allRooms = await roomRepo
                .createQueryBuilder('room')
                .innerJoinAndSelect('room.building', 'building')
                .getMany();
            this.logger.log(`Found ${allRooms.length} rooms in DB`);
            const roomMap = new Map<string, Room>();

            for (const r of allRooms) {

                const rawRoom = r.name;
                const rawBuilding = r.building.code;

                const room = rawRoom.trim();
                const building = rawBuilding.trim();

                const key = `${building}-${room}`;

                this.logger.log(
                    `DB ROOM: [${rawBuilding}] [${rawRoom}] -> key=[${key}]`
                );

                roomMap.set(key, r);
            }



            this.logger.log('=== ROOM DEBUG START ===');

            for (const r of allRooms) {

                if (!r.building) {
                    this.logger.error(
                        `ROOM WITHOUT BUILDING: id=${r.id}, name=${r.name}`
                    );
                    continue; // tránh crash
                }

                const key = `${r.building.code}-${r.name}`;

                this.logger.log(
                    `ROOM OK: ${key}`
                );

                roomMap.set(key, r);
            }

            this.logger.log('=== ROOM DEBUG END ===');

            // Log toàn bộ key mapping lookup từ DB
            this.logger.log('--- ROOM KEYS IN DB ---');
            for (const key of roomMap.keys()) {
                this.logger.log(`DB ROOM KEY: ${key}`);
            }

            // Log toàn bộ danh sách phòng đọc từ Excel
            this.logger.log('--- ROOMS FROM EXCEL ---');
            for (const row of parsedRows) {
                this.logger.log(`EXCEL: room=${row.room}, building=${row.building}, key=${row.building}-${row.room}`);
            }

            // 4. Insert new schedules
            this.logger.log('Inserting new schedules...');
            const schedulesToInsert: Partial<Schedule>[] = [];
            for (const row of parsedRows) {
                if (row.building === 'ONLINE' || row.building === 'KCNTT' || row.building === 'SPORT') {
                    continue;
                }

                const key = `${row.building}-${row.room.trim()}`;
                const room = roomMap.get(key);
                if (!room) {
                    this.logger.error(`ROOM NOT FOUND: key=${key} | room=${row.room} | building=${row.building}`);
                    throw new Error(`Không tìm thấy phòng: ${row.room} (building: ${row.building}) trong database. Vui lòng kiểm tra lại dữ liệu phòng học!`);
                }
                schedulesToInsert.push({
                    room_id: room.id,
                    thu: row.thu,
                    tiet_bat_dau: row.tietBatDau,
                    tiet_ket_thuc: row.tietKetThuc,
                    ma_hp: row.maHp,
                    lop: row.lop,
                    mon_hoc: row.monHoc,
                    giang_vien: row.giangVien,
                    ngay_bat_dau: row.ngayBatDau,
                    ngay_ket_thuc: row.ngayKetThuc,
                });
            }
            if (schedulesToInsert.length > 0) {
                await queryRunner.manager.insert(Schedule, schedulesToInsert);
                this.logger.log(`Bulk inserted ${schedulesToInsert.length} schedules`);
            }
            await queryRunner.commitTransaction();
            this.logger.log(`Successfully imported ${schedulesToInsert.length} schedules`);
            return {
                success: true,
                message: 'Schedule imported successfully',
                rows_imported: schedulesToInsert.length,
            };
        } catch (error) {
            await queryRunner.rollbackTransaction();
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error importing schedule: ${errorMsg}`);
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Lấy thông tin tất cả buildings
     */
    async getAllBuildings(): Promise<Building[]> {
        return this.buildingRepository.find({
            where: { is_active: true },
        });
    }

    /**
     * Lấy thông tin tất cả rooms của một building
     */
    async getRoomsByBuilding(buildingCode: string): Promise<Room[]> {
        const building = await this.buildingRepository.findOne({
            where: { code: buildingCode },
        });

        if (!building) {
            return [];
        }

        return this.roomRepository.find({
            where: {
                building: {
                    id: building.id,
                },
                is_active: true,
            }
        });
    }

    /**
     * Lấy count schedules (để kiểm tra có import data chưa)
     */
    async getScheduleCount(): Promise<number> {
        return this.scheduleRepository.count();
    }
}