import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Building } from '../entities/building.entity';
import { Room } from '../entities/room.entity';
import { Schedule } from '../entities/schedule.entity';

@Injectable()
export class TypeOrmConfigService {
  constructor(private configService: ConfigService) { }

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const nodeEnv = this.configService.get('NODE_ENV', 'development');
    const databaseUrl = this.configService.get<string>('DATABASE_URL');

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not defined');
    }

    return {
      type: 'postgres',
      url: databaseUrl, // ✅ DÙNG URL
      entities: [Building, Room, Schedule],
      synchronize: process.env.DB_SYNC === 'true',
      logging: nodeEnv === 'development',
      ssl: {
        rejectUnauthorized: false,
      },
      retryAttempts: 10,
      retryDelay: 3000,
    };
  }
}
