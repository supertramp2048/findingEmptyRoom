import { Column, Entity, ManyToOne, JoinColumn , PrimaryGeneratedColumn } from 'typeorm';
import { Room } from './room.entity';

/**
 * Schedule Entity
 * Lịch học chi tiết: môn học, lớp, thứ, tiết, phòng
 */
@Entity('schedules')
export class Schedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  room_id: string;

  /**
   * Thứ trong tuần
   * 2 = Monday, 3 = Tuesday, ..., 7 = Saturday
   * (1 = Sunday, nhưng thường không dùng)
   */
  @Column({ type: 'int' })
  thu: number;

  /**
   * Tiết bắt đầu (1, 2, 3, ...)
   */
  @Column({ type: 'int' })
  tiet_bat_dau: number;

  /**
   * Tiết kết thúc (inclusive)
   */
  @Column({ type: 'int' })
  tiet_ket_thuc: number;

  /**
   * Mã học phần
   * VD: CS101, MATH202
   */
  @Column({ length: 50, nullable: true })
  ma_hp: string;

  /**
   * Lớp học phần
   * VD: CQ17-01, DQ18-03
   */
  @Column({ length: 50, nullable: true })
  lop: string;

  /**
   * Tên môn học
   */
  @Column({ length: 255, nullable: true })
  mon_hoc: string;

  /**
   * Giảng viên
   */
  @Column({ length: 255, nullable: true })
  giang_vien: string;

  /**
   * Ngày bắt đầu (nếu schedule có hiệu lực từ ngày nào)
   */
  @Column({ type: 'date', nullable: true })
  ngay_bat_dau: Date;

  /**
   * Ngày kết thúc
   */
  @Column({ type: 'date', nullable: true })
  ngay_ket_thuc: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;

  // Relationships
  @ManyToOne(() => Room, (room) => room.schedules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @Column({ default: false })
  deleted: boolean;
}
