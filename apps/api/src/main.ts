import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // descarta propiedades no declaradas en el DTO
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Auditoría de seguridad (hallazgo Medio #5): antes caía a '*' (wildcard)
  // si CORS_ORIGIN no estaba seteada — fail-open. Los llamados reales al
  // API (BFF de apps/web) son server-to-server y no pasan por CORS del
  // navegador, así que no depende de este valor; solo protege contra un
  // acceso cross-origin directo desde el navegador (ej. Swagger UI, o un
  // futuro cliente) si la env var se omite por error en producción.
  if (!process.env.CORS_ORIGIN) {
    // eslint-disable-next-line no-console
    console.warn(
      'CORS_ORIGIN no está seteada — CORS queda deshabilitado (fail-closed) en vez de permitir cualquier origen.',
    );
  }
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',') ?? false });
  app.setGlobalPrefix('api/v1');

  // "Documentación de API" — entregable exigido explícitamente por el
  // documento fuente (sección 10.1 y 17). Se sirve en /api/docs, fuera del
  // prefijo /api/v1 para no aparecer como un endpoint versionado más.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Estrategos Gestión 360 — API')
    .setDescription(
      'API del backend de Estrategos Gestión 360. Todos los endpoints ' +
        'salvo /auth/* requieren JWT (Authorization: Bearer) y, si operan ' +
        'sobre una empresa, el encabezado X-Company-Id.',
    )
    .setVersion(process.env.npm_package_version ?? '0.0.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API escuchando en http://localhost:${port}/api/v1`);
  // eslint-disable-next-line no-console
  console.log(`Documentación de la API en http://localhost:${port}/api/docs`);
}
bootstrap();
