import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 설정 (로컬 크롬 확장에서만 접근 허용)
  app.enableCors({
    origin: (origin, callback) => {
      // chrome-extension, localhost, 127.0.0.1 허용
      if (!origin ||
          origin.startsWith('chrome-extension://') ||
          origin.startsWith('http://localhost') ||
          origin.startsWith('http://127.0.0.1')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
  });

  const port = process.env.PORT || 2026;
  await app.listen(port);
  console.log(`Agent Monitor Server running on http://localhost:${port}`);
}
bootstrap();
