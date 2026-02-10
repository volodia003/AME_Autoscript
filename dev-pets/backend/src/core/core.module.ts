import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { AuthModule } from '../modules/auth/auth.module'
import { validate } from '../config/env-validation.schema'
import { DrizzleModule } from '@/drizzle/drizzle.module'
@Module({
	imports: [
		ScheduleModule.forRoot(),
		ConfigModule.forRoot({
			validate
		}),
		AuthModule,
	],
})
export class CoreModule { }
