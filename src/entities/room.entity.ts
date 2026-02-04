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
  name: string;

  // FK: rooms.building_id -> buildings.id
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

  @OneToMany(() => Schedule, (schedule) => schedule.room)
  schedules: Schedule[];

  @Column({ default: false })
  deleted: boolean;
}
