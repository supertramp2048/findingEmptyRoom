import {
    Controller,
    Get,
    Post,
    Query,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    Inject,
    Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ScheduleService } from './schedule.service';
import { RoomAvailabilityService } from './room-availability.service';
import { FindAvailableRoomsDto, FindAvailableRoomsResponseDto } from '@/common/dtos/schedule.dto';
import { query } from 'express';

/**
 * Schedule Controller
 *
 * REST API endpoints:
 * - GET /api/rooms/available - Tìm phòng trống
 * - POST /api/schedule/upload - Upload Excel file
 * - GET /api/schedule/stats - Lấy thông tin stats
 */
@Controller('api')
export class ScheduleController {
    private readonly logger = new Logger(ScheduleController.name);

    constructor(
        private scheduleService: ScheduleService,
        private roomAvailabilityService: RoomAvailabilityService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) { }

    /**
     * GET /api/health
     * Simple health check endpoint
     */
    @Get('health')
    getHealth(): { status: string; timestamp: string } {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * GET /api/rooms/available
     *
     * Tìm phòng trống dựa trên điều kiện
     *
     * Query params:
     * - thu: number (2-7)
     * - tiet_bd: number
     * - tiet_kt: number
     * - building: string
     * - min_continuous: number
     */
    @Get('rooms/available')
    async findAvailableRooms(
        @Query('thu') thu?: string,
        @Query('tiet_bd') tiet_bd?: string,
        @Query('tiet_kt') tiet_kt?: string,
        @Query('building') building?: string,
        @Query('min_continuous') min_continuous?: string,
        @Query('date') date?: string
    ): Promise<FindAvailableRoomsResponseDto> {
        // Validate input
        const parsedThu = parseInt(thu || '');
        const parsedTietBd = parseInt(tiet_bd || '');
        const parsedTietKt = parseInt(tiet_kt || '');
        const parsedMinContinuous = parseInt(min_continuous || '');

        if (
            isNaN(parsedThu) ||
            isNaN(parsedTietBd) ||
            isNaN(parsedTietKt) ||
            isNaN(parsedMinContinuous) ||
            !building
        ) {
            throw new BadRequestException(
                'Missing or invalid query parameters: thu, tiet_bd, tiet_kt, building, min_continuous',
            );
        }

        if (parsedThu < 2 || parsedThu > 7) {
            throw new BadRequestException('thu must be between 2 and 7');
        }

        if (parsedTietBd > parsedTietKt) {
            throw new BadRequestException('tiet_bd must be <= tiet_kt');
        }

        if (parsedMinContinuous <= 0) {
            throw new BadRequestException('min_continuous must be > 0');
        }

        // Try cache
        const cacheKey = this.roomAvailabilityService.getCacheKey(
            parsedThu,
            parsedTietBd,
            parsedTietKt,
            building,
            parsedMinContinuous,
        );

        const cached = await this.cacheManager.get<FindAvailableRoomsResponseDto>(
            cacheKey,
        );
        if (cached) {
            this.logger.debug(`Cache hit: ${cacheKey}`);
            return cached;
        }

        // Find available rooms
        this.logger.debug(
            `Cache miss: ${cacheKey}, querying database...`,
        );
        const result = await this.roomAvailabilityService.findAvailableRooms(
            parsedThu,
            parsedTietBd,
            parsedTietKt,
            building,
            parsedMinContinuous,
            String(date),
        );

        // Cache result (TTL: 5 minutes = 300 seconds)
        await this.cacheManager.set(cacheKey, result, 300000); // milliseconds

        return result;
    }

    /**
     * POST /api/schedule/upload
     *
     * Upload Excel file chứa thời khóa biểu
     *
     * Multipart form-data:
     * - file: Excel file (.xlsx)
     *
     * Response:
     * {
     *   "success": true,
     *   "message": "Schedule imported successfully",
     *   "rows_imported": 150
     * }
     */
    @Post('schedule/upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadSchedule(
        @UploadedFile() file?: any,
    ): Promise<{
        success: boolean;
        message: string;
        rows_imported: number;
    }> {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        if (!file.originalname.match(/\.(xlsx|xls)$/i)) {
            throw new BadRequestException('Only Excel files are supported (.xlsx, .xls)');
        }

        try {
            // Import schedule
            const result = await this.scheduleService.importScheduleFromExcel(
                file.buffer,
            );

            // Clear cache
            this.logger.log('Clearing cache after schedule import...');
            await this.cacheManager.reset();

            return result;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error uploading schedule: ${errorMsg}`);
            throw new BadRequestException(errorMsg);
        }
    }

    /**
     * GET /api/schedule/stats
     *
     * Lấy thông tin stats
     */
    @Get('schedule/stats')
    async getStats(): Promise<{
        total_schedules: number;
        total_buildings: number;
        total_rooms: number;
    }> {
        const buildings = await this.scheduleService.getAllBuildings();
        let totalRooms = 0;

        for (const building of buildings) {
            const rooms = await this.scheduleService.getRoomsByBuilding(building.code);
            totalRooms += rooms.length;
        }

        const totalSchedules = await this.scheduleService.getScheduleCount();

        return {
            total_schedules: totalSchedules,
            total_buildings: buildings.length,
            total_rooms: totalRooms,
        };
    }

    @Get('rooms/status')
    async getRoomStatus(
        @Query('date') date? :string,
        @Query('thu') thu?: string,
        @Query('tiet_bat_dau') tiet_bat_dau?: string,
        @Query('tiet_ket_thuc') tiet_ket_thuc?: string,
        @Query('building') building?: string,
    ) {
        const parsedThu = parseInt(thu || '');
        const parsedTietBatDau = parseInt(tiet_bat_dau || '');
        const parsedTietKetThuc = parseInt(tiet_ket_thuc || '');
        if (isNaN(parsedThu) || isNaN(parsedTietBatDau) || isNaN(parsedTietKetThuc)) {
            throw new BadRequestException('thu và tiet là bắt buộc');
        }

        if (parsedThu < 2 || parsedThu > 6) {
            throw new BadRequestException('thu must be between 2 and 6');
        }

        return this.roomAvailabilityService.getRoomStatus(
            String(date),
            parsedThu,
            parsedTietBatDau,
            parsedTietKetThuc,
            building,
        );
    }
}
