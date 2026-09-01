import { ArgumentsHost, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GlobalExceptionFilter } from '../../src/common/filters/http-exception.filter';

function makeHost(): { host: ArgumentsHost; json: jest.Mock; status: jest.Mock } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
    }),
  } as unknown as ArgumentsHost;
  return { host, json, status };
}

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('aplana HttpException a { statusCode, message, timestamp } sin loguear (no es 5xx)', () => {
    const { host, json, status } = makeHost();

    filter.catch(new BadRequestException('email inválido'), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, message: 'email inválido' }),
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('un error no controlado devuelve 500 genérico al cliente sin exponer el mensaje interno', () => {
    const { host, json, status } = makeHost();

    filter.catch(new Error('boom en la capa de infraestructura'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500, message: 'Error interno del servidor' }),
    );
  });

  it('hallazgo Medio #2: redacta un Bearer JWT antes de loguear un 500', () => {
    const { host } = makeHost();
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ.abc123signature';

    filter.catch(new Error(`fallo llamando upstream con Authorization: Bearer ${jwt}`), host);

    expect(errorSpy).toHaveBeenCalled();
    const loggedMessage = errorSpy.mock.calls[0][0] as string;
    expect(loggedMessage).not.toContain(jwt);
    expect(loggedMessage).toContain('[REDACTED]');
  });

  it('hallazgo Medio #2: redacta un campo password= interpolado en el mensaje de error', () => {
    const { host } = makeHost();

    filter.catch(new Error('validación falló: password="SuperSecreta123!"'), host);

    const loggedMessage = errorSpy.mock.calls[0][0] as string;
    expect(loggedMessage).not.toContain('SuperSecreta123!');
    expect(loggedMessage).toContain('[REDACTED]');
  });

  it('mapea P2002 de Prisma a 409 con mensaje genérico', () => {
    const { host, json, status } = makeHost();
    const prismaError = Object.assign(
      Object.create(Prisma.PrismaClientKnownRequestError.prototype),
      { code: 'P2002', message: 'Unique constraint failed' },
    );

    filter.catch(prismaError, host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Ya existe un registro con ese valor único.' }),
    );
  });
});
