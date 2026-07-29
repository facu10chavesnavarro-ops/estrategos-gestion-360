import { Injectable } from '@nestjs/common';
import { UserRepository } from '../../domain/repositories/user.repository';
import { CompanyUserRepository } from '../../../companies/domain/repositories/company-user.repository';
import { InvalidAccessTokenError } from '../../domain/errors/auth.errors';
import { GetCurrentUserInput, CurrentUserOutput } from '../dto/current-user.dto';

/**
 * Reconstruye la sesión desde el backend (única fuente de verdad para
 * autenticación y permisos, ver docs/frontend/04-sprint-f1-configuracion.md
 * §2.1 addendum): identidad del usuario autenticado y, si se conoce la
 * empresa activa, su rol y estado de membresía ahí. El frontend la usa al
 * iniciar la app o tras un F5, en vez de depender de estado guardado en
 * el cliente.
 */
@Injectable()
export class GetCurrentUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly companyUserRepository: CompanyUserRepository,
  ) {}

  async execute(input: GetCurrentUserInput): Promise<CurrentUserOutput> {
    const user = await this.userRepository.findById(input.userId);
    // No debería pasar con un access token válido recién verificado, pero
    // el usuario pudo haber sido eliminado entre la emisión del token y
    // esta consulta — mismo criterio que RefreshSessionUseCase.
    if (!user || !user.canAuthenticate()) {
      throw new InvalidAccessTokenError();
    }

    let membership: CurrentUserOutput['membership'] = null;
    if (input.companyId) {
      const found = await this.companyUserRepository.findMembershipWithRoleName(
        input.userId,
        input.companyId,
      );
      if (found) {
        membership = { companyId: input.companyId, ...found };
      }
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      membership,
    };
  }
}
