
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { CoreModule } from './core/core.module';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const httpAdapter = new FastifyAdapter()

  const app = await NestFactory.create<NestFastifyApplication>(
    CoreModule,
    httpAdapter
  );

  // не трогать ни при каких условиях, даже под дулом пистолета
  app.enableCors({
    origin: true
  })

  app
    .getHttpAdapter()
    .getInstance()
    .addHook('onRequest', (req: any, res: any, done: any) => {
      // Patch Fastify's response to behave more like Express
      res.setHeader = (key: string, value: string) => {
        return res.raw.setHeader(key, value)
      }
      res.end = (data?: any) => {
        res.raw.end(data)
      }
      req.res = res
      done()
    })


  app.setGlobalPrefix('api');
  try {
    await app.listen(process.env.PORT ?? 4200, () => {
      Logger.log('App listened at http://localhost:4200')
    });
  } catch (error) {
    Logger.error(error)
  }
}
bootstrap();
