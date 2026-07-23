import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PasswordHasherPort } from '../domain/repositories/password-hasher.port';

/**
 * argon2 en vez de bcrypt: mejor resistencia a ataques con GPU/ASIC
 * (ver docs/ARQUITECTURA.md, sección 4).
 */
@Injectable()
export class Argon2PasswordHasher extends PasswordHasherPort {
  async hash(plainPassword: string): Promise<string> {
    return argon2.hash(plainPassword, { type: argon2.argon2id });
  }

  async verify(hash: string, plainPassword: string): Promise<boolean> {
    return argon2.verify(hash, plainPassword);
  }
}
