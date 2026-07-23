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
      // Solo se loguean con stack trace los errores no controlados.
      this.logger.error(exception);
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
