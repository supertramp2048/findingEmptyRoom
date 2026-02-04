import { IsString, IsNumber, Min, Max } from 'class-validator';

/**
 * DTO cho query tìm phòng trống
 */
export class FindAvailableRoomsDto {
  /**
   * Thứ trong tuần (2-7)
   * 2 = Thứ 2 (Monday), ..., 7 = Thứ 7 (Saturday)
   */
  @IsNumber()
  @Min(2)
  @Max(7)
  thu: number;

  /**
   * Tiết bắt đầu
   */
  @IsNumber()
  @Min(1)
  tiet_bd: number;

  /**
   * Tiết kết thúc
   */
  @IsNumber()
  @Min(1)
  tiet_kt: number;

  /**
   * Code tòa nhà (A1, A2, B1, ...)
   */
  @IsString()
  building: string;

  /**
   * Số tiết trống liên tục tối thiểu
   */
  @IsNumber()
  @Min(1)
  min_continuous: number;
}

/**
 * DTO response cho phòng trống
 */
export class AvailableRoomDto {
  room: string; // Tên phòng (301, 302A, ...)
  continuous_slots: number[]; // Danh sách tiết trống liên tục
}

/**
 * DTO response cho query tìm phòng
 */
export class FindAvailableRoomsResponseDto {
  thu: number;
  ngay: string;
  tiet: string; // "4-6" format
  building: string;
  rooms: AvailableRoomDto[];
}

export interface ParsedScheduleRow {
  thu: number;
  tiet_bat_dau: number;
  tiet_ket_thuc: number;
  room: string;

  ma_hp: string;
  lop: string;

  building: string;

  mon_hoc?: string;
  giang_vien?: string;

  ngay_bat_dau?: Date;
  ngay_ket_thuc?: Date;
}

