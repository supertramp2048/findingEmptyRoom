import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Room } from './room.entity';

/**
 * Building Entity
 * Đại diện cho tòa nhà (A1, A2, B1, ...)
 */
@Entity('buildings')
export class Building {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  code: string; // A1, A2, B1, B2, ...

  @Column({ nullable: true })
  name: string; // Tòa A, Tòa B, ...

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

  // Relationship
  @OneToMany(() => Room, (room) => room.building)
  rooms: Room[];

  @Column({ default: false })
  deleted: boolean;
}
