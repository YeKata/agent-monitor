import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 설정 (로컬 크롬 확장에서만 접근 허용)
  app.enableCors({
    origin: [
      'chrome-extension://*',
      'http://localhost:*',
      'http://127.0.0.1:*',
    ],
    methods: ['GET', 'POST'],
  });

  const port = process.env.PORT || 2026;
  await app.listen(port);
  console.log(`Agent Monitor Server running on http://localhost:${port}`);
}
bootstrap();
