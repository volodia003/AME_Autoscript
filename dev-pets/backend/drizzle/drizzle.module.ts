import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/mysql2';
export const DRIZZLE = Symbol('drizzle-connection');
import mysql, { PoolOptions } from "mysql2/promise";
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const poolOptions: PoolOptions = {
          host: configService.get<string>('DB_URL'),
          password: configService.get<string>('DB_PASSWORD'),
          user: configService.get<string>('DB_USER'),
          port: configService.get<number>('DB_PORT')
        }
        const poolConnection = mysql.createPool(poolOptions);
        return drizzle({ client: poolConnection });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DrizzleModule { }