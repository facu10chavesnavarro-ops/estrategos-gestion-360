import { uuidv7 } from '../../src/common/infrastructure/id/uuid-v7';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('uuidv7', () => {
  it('genera un UUID con el formato correcto (versión 7, variante RFC 9562)', () => {
    const id = uuidv7();
    expect(id).toMatch(UUID_REGEX);
  });

  it('genera IDs distintos en llamadas sucesivas', () => {
    const ids = new Set(Array.from({ length: 50 }, () => uuidv7()));
    expect(ids.size).toBe(50);
  });

  it('ordena temporalmente: IDs generados más tarde son lexicográficamente mayores o iguales', async () => {
    const first = uuidv7();
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = uuidv7();

    expect(second >= first).toBe(true);
  });
});
