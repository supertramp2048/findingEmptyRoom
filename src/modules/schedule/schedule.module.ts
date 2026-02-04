import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Building } from '@/entities/building.entity';
import { Room } from '@/entities/room.entity';
import { Schedule } from '@/entities/schedule.entity';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { RoomAvailabilityService } from './room-availability.service';
import { ExcelParserService } from './excel-parser.service';

@Module({
  imports: [TypeOrmModule.forFeature([Building, Room, Schedule])],
  controllers: [ScheduleController],
  providers: [ScheduleService, RoomAvailabilityService, ExcelParserService],
  exports: [ScheduleService, RoomAvailabilityService],
})
export class ScheduleModule {}
