import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { TypeOrmConfigService } from './config/typeorm.config';
import { ScheduleModule } from './modules/schedule/schedule.module';

@Module({
  imports: [
    // Load environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'development' ? '.env.local' : '.env',
    }),

    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useClass: TypeOrmConfigService,
    }),

    // Cache (Redis - using memory store for development)
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: (configService: ConfigService) => {
        // Use memory store if Redis is not available
        const redisHost = configService.get('REDIS_HOST', 'localhost');
        const redisPort = configService.get('REDIS_PORT', 6379);
        const redisTtl = configService.get('REDIS_TTL', 300) * 1000;
        
        // For development, use memory cache instead
        return {
          store: 'memory',
          ttl: redisTtl,
        };
      },
      inject: [ConfigService],
    }),

    // Modules
    ScheduleModule,
  ],
})
export class AppModule {}
