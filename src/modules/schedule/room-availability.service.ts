import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Room } from '@/entities/room.entity';
import { Schedule } from '@/entities/schedule.entity';
import { AvailableRoomDto, FindAvailableRoomsResponseDto } from '@/common/dtos/schedule.dto';

/**
 * Room Availability Service
 *
 * Xử lý logic tìm phòng trống với điều kiện liên tục
 *
 * LOGIC QUAN TRỌNG:
 *
 * 1. OVERLAP DETECTION:
 *    Hai tiết overlap nếu: NOT (end1 < start2 OR start1 > end2)
 *    => Overlap nếu: (end1 >= start2 AND start1 <= end2)
 *
 * 2. CONTINUOUS EMPTY SLOTS:
 *    - Để check tiết [4, 5, 6] có N tiết trống liên tục
 *    - Tạo bitmap: [1, 1, 0, 1, 1, 1, 0, ...]
 *      (1 = bận, 0 = trống)
 *    - Tìm chuỗi N số 0 liên tiếp
 *    - Trả về tất cả vị trí bắt đầu của chuỗi đó
 *
 * 3. CACHE KEY FORMAT:
 *    available:{thu}:{tiet_bd}:{tiet_kt}:{building}:{min_continuous}
 */
@Injectable()
export class RoomAvailabilityService {
    private readonly logger = new Logger(RoomAvailabilityService.name);

    constructor(
        @InjectRepository(Room)
        private roomRepository: Repository<Room>,

        @InjectRepository(Schedule)
        private scheduleRepository: Repository<Schedule>,
    ) { }

    /**
     * Tìm phòng trống dựa trên điều kiện
     *
     * @param thu - Thứ trong tuần (2-7)
     * @param tiet_bd - Tiết bắt đầu
     * @param tiet_kt - Tiết kết thúc
     * @param building - Code tòa nhà
     * @param min_continuous - Số tiết trống liên tục tối thiểu
     */
    async findAvailableRooms(
        thu: number,
        tiet_bd: number,
        tiet_kt: number,
        building: string,
        min_continuous: number,
        date: string,
    ): Promise<FindAvailableRoomsResponseDto> {
        this.logger.debug(
            `Finding available rooms: thu=${thu}, tiet=${tiet_bd}-${tiet_kt}, building=${building}, min_continuous=${min_continuous}`,
        );
        const dateToday = new Date(date)
        // Lấy tất cả phòng của tòa nhà
        const rooms = await this.roomRepository.find({
            where: {
                building: {
                    code: building,
                },
                is_active: true,
            },
            relations: ['building'],
        });

        if (rooms.length === 0) {
            return {
                thu,
                ngay: String(dateToday),
                tiet: `${tiet_bd}-${tiet_kt}`,
                building,
                rooms: [],
            };
        }

        // Lấy tất cả schedule của các phòng vào thứ này
        const schedules = await this.scheduleRepository
            .createQueryBuilder('s')
            .where('s.thu = :thu', { thu })
            .andWhere('s.room_id IN (:...roomIds)', {
                roomIds: rooms.map((r) => r.id),
            })
            .andWhere(':date BETWEEN s.ngay_bat_dau AND s.ngay_ket_thuc', {
                date: dateToday, // "2026-02-08"
            })
            .andWhere('s.deleted = false')
            .getMany();

        const availableRooms: AvailableRoomDto[] = [];

        // Check từng phòng
        for (const room of rooms) {
            // Tìm schedules của phòng này
            const roomSchedules = schedules.filter((s) => s.room_id === room.id);

            // Tìm tiết trống liên tục
            const continuousSlots = this.findContinuousEmptySlots(
                tiet_bd,
                tiet_kt,
                roomSchedules,
                min_continuous,
            );

            if (continuousSlots.length > 0) {
                availableRooms.push({
                    room: room.name,
                    continuous_slots: continuousSlots,
                });
            }
        }

        return {
            thu,
            ngay: String(dateToday),
            tiet: `${tiet_bd}-${tiet_kt}`,
            building,
            rooms: availableRooms,
        };
    }

    /**
     * Tìm các khoảng tiết trống liên tục
     *
     * LOGIC:
     * 1. Tạo bitmap từ tiet_bd đến tiet_kt
     *    - 1 = tiết bận (có schedule overlap)
     *    - 0 = tiết trống
     *
     * 2. Scan bitmap tìm chuỗi N số 0 liên tiếp
     *    (N = min_continuous)
     *
     * 3. Trả về danh sách tiết bắt đầu của mỗi chuỗi
     *
     * @param tiet_bd - Tiết bắt đầu của query
     * @param tiet_kt - Tiết kết thúc của query
     * @param schedules - Danh sách schedule bận
     * @param min_continuous - Độ dài minimum của chuỗi trống
     * @returns Mảng tiết trống liên tục (tối thiểu min_continuous tiết)
     */
    private findContinuousEmptySlots(
        tiet_bd: number,
        tiet_kt: number,
        schedules: Schedule[],
        min_continuous: number,
    ): number[] {
        // Tạo bitmap: index i đại diện cho tiết (tiet_bd + i)
        // Chiều dài = tiet_kt - tiet_bd + 1
        const bitmapLength = tiet_kt - tiet_bd + 1;
        const bitmap = new Array(bitmapLength).fill(0); // 0 = trống

        // Đánh dấu tiết bận
        for (const schedule of schedules) {
            // Check overlap với [tiet_bd, tiet_kt]
            // Overlap nếu: NOT (schedule.tiet_ket_thuc < tiet_bd OR schedule.tiet_bat_dau > tiet_kt)
            const isOverlap = !(
                schedule.tiet_ket_thuc < tiet_bd || schedule.tiet_bat_dau > tiet_kt
            );

            if (isOverlap) {
                // Đánh dấu các tiết overlap
                const startIdx = Math.max(0, schedule.tiet_bat_dau - tiet_bd);
                const endIdx = Math.min(bitmapLength - 1, schedule.tiet_ket_thuc - tiet_bd);

                for (let i = startIdx; i <= endIdx; i++) {
                    bitmap[i] = 1; // 1 = bận
                }
            }
        }

        this.logger.debug(
            `Bitmap for tiet ${tiet_bd}-${tiet_kt}: ${bitmap.join('')}`,
        );

        // Tìm chuỗi n số 0 liên tiếp
        const result: number[] = [];
        let consecutiveZeros = 0;
        let startIdx = 0;

        for (let i = 0; i < bitmapLength; i++) {
            if (bitmap[i] === 0) {
                if (consecutiveZeros === 0) {
                    startIdx = i;
                }
                consecutiveZeros++;
            } else {
                // Tiết này bận
                if (consecutiveZeros >= min_continuous) {
                    // Tìm được chuỗi trống
                    result.push(tiet_bd + startIdx);
                }
                consecutiveZeros = 0;
            }
        }

        // Check cuối cùng
        if (consecutiveZeros >= min_continuous) {
            result.push(tiet_bd + startIdx);
        }

        this.logger.debug(
            `Found ${result.length} continuous empty slots: ${result.join(', ')}`,
        );

        return result;
    }

    /**
     * Tính cache key cho Redis
     */
    getCacheKey(
        thu: number,
        tiet_bd: number,
        tiet_kt: number,
        building: string,
        min_continuous: number,
    ): string {
        return `available:${thu}:${tiet_bd}:${tiet_kt}:${building}:${min_continuous}`;
    }

    async getRoomStatus(
        date: string,
        thu: number,
        tiet_bat_dau: number,
        tiet_ket_thuc: number,
        building?: string,
    ) {
        // Format date an toàn
        const dateStr = new Date(date).toISOString().split('T')[0];

        // 1. Lấy danh sách phòng
        const rooms = await this.roomRepository.find({
            where: {
                ...(building ? { building: { code: building } } : {}),
                is_active: true,
            },
            relations: ['building'],
        });

        if (rooms.length === 0) {
            return {
                thu,
                ngay: dateStr,
                tiet: `${tiet_bat_dau}-${tiet_ket_thuc}`,
                rooms: [],
            };
        }

        // 2. Lấy schedule overlap
        const schedules = await this.scheduleRepository
            .createQueryBuilder('s')
            .where('s.thu = :thu', { thu })

            .andWhere('s.tiet_bat_dau <= :tietKt', {
                tietKt: tiet_ket_thuc,
            })

            .andWhere('s.tiet_ket_thuc >= :tietBd', {
                tietBd: tiet_bat_dau,
            })

            .andWhere(':date BETWEEN s.ngay_bat_dau AND s.ngay_ket_thuc', {
                date: dateStr,
            })

            .andWhere('s.room_id IN (:...roomIds)', {
                roomIds: rooms.map((r) => r.id),
            })

            .getMany();

        // 3. Map kết quả
        return {
            thu,
            ngay: dateStr,
            tiet: `${tiet_bat_dau}-${tiet_ket_thuc}`,

            rooms: rooms.map((room: Room) => {
                const schedule = schedules.find(
                    (s: Schedule) => s.room_id === room.id,
                );

                if (!schedule) {
                    return {
                        building: room.building.code,
                        room: room.name,
                        status: 'free',
                    };
                }

                return {
                    building: room.building.code,
                    room: room.name,
                    status: 'occupied',
                    maHp: schedule.ma_hp,
                    monHoc: schedule.mon_hoc,
                    lop: schedule.lop,
                    giangVien: schedule.giang_vien,
                    tiet: `${schedule.tiet_bat_dau}-${schedule.tiet_ket_thuc}`,
                };
            }),
        };
    }
}