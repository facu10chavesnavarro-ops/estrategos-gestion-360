import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@prisma/client';

/**
 * Auditoría de seguridad (hallazgo Medio #2): antes de loguear un error no
 * controlado (500) se enmascaran patrones que parezcan credenciales o
 * tokens, para que un mensaje/stack que por accidente los interpole (ej. un
 * error de una librería de terceros que ecoa parte del input) no los deje en
 * texto plano en los logs del servidor. Nunca llega al cliente — la
 * respuesta HTTP ya usa un mensaje genérico para 5xx, esto es solo defensa
 * en profundidad sobre lo que se persiste en logs.
 */
function redactSensitive(text: string): string {
  return text
    .replace(/Bearer\s+[\w-]+\.[\w-]+\.[\w-]+/gi, 'Bearer [REDACTED]')
    .replace(/[\w-]+\.[\w-]+\.[\w-]{10,}/g, '[REDACTED_JWT]') // JWT sueltos sin "Bearer"
    .replace(/("?(?:password|contraseña|token|secret|refreshToken|accessToken)"?\s*[:=]\s*)("[^"]*"|'[^']*'|\S+)/gi, '$1[REDACTED]');
}

/**
 * Errores de Prisma que no pasan por un caso de uso (ej. condición de
 * carrera: dos altas simultáneas del mismo CUIT pasan ambas el chequeo de
 * "no existe" en la aplicación, y la segunda choca recién contra la
 * restricción única de la base). Sin este mapeo, cualquiera de estos
 * códigos conocidos devolvía 500 genérico en vez de un 409 entendible.
 */
function mapPrismaError(
  error: Prisma.PrismaClientKnownRequestError,
): { status: number; message: string } | null {
  switch (error.code) {
    case 'P2002':
      return {
        status: HttpStatus.CONFLICT,
        message: 'Ya existe un registro con ese valor único.',
      };
    case 'P2025':
      return {
        status: HttpStatus.NOT_FOUND,
        message: 'El registro indicado no existe.',
      };
    default:
      return null;
  }
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const prismaMapping =
      exception instanceof Prisma.PrismaClientKnownRequestError
        ? mapPrismaError(exception)
        : null;

    const status = prismaMapping
      ? prismaMapping.status
      : exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = prismaMapping
      ? prismaMapping.message
      : exception instanceof HttpException
        ? exception.getResponse()
        : 'Error interno del servidor';

    // Nest ya devuelve { statusCode, message, error } para sus HttpException;
    // se aplana en vez de anidarlo para que el cliente siempre reciba
    // `message` como string (ver apps/web/src/lib/api-client.ts).
    const message =
      typeof exceptionResponse === 'object' && exceptionResponse !== null && 'message' in exceptionResponse
        ? (exceptionResponse as { message: unknown }).message
        : exceptionResponse;

    if (status >= 500) {
      // Solo se loguean con stack trace los errores no controlados —
      // redactados (ver redactSensitive) antes de persistirse en logs.
      const rawMessage = exception instanceof Error ? exception.message : String(exception);
      const rawStack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(redactSensitive(rawMessage), rawStack ? redactSensitive(rawStack) : undefined);
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
