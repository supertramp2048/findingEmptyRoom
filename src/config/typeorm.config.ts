import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Building } from '../entities/building.entity';
import { Room } from '../entities/room.entity';
import { Schedule } from '../entities/schedule.entity';

@Injectable()
export class TypeOrmConfigService {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const nodeEnv = this.configService.get('NODE_ENV', 'development');
    return {
      type: 'postgres',
      host: this.configService.get('DB_HOST', 'localhost'),
      port: this.configService.get('DB_PORT', 5432),
      username: this.configService.get('DB_USERNAME', 'postgres'),
      password: this.configService.get('DB_PASSWORD', 'password'),
      database: this.configService.get('DB_NAME', 'empty_room_db'),
      entities: [Building, Room, Schedule],
      synchronize: false,
      logging: nodeEnv === 'development',
      dropSchema: false,
      migrationsRun: false,
      ssl: nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
      extra: {
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        family: 4, // Force IPv4
      },
    };
  }
}
