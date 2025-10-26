import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { createHash } from 'crypto';

@Injectable()
export class HashService {
  /**
   * Хеширует пароль с использованием Argon2id
   */
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
      parallelism: 1,
    });
  }

  /**
   * Верифицирует пароль против хеша
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch (error) {
      return false;
    }
  }

  /**
   * Создает хеш IP адреса для безопасного хранения
   */
  hashIp(ip: string, salt: string = 'ip_salt'): string {
    return createHash('sha256')
      .update(ip + salt)
      .digest('hex');
  }

  /**
   * Создает хеш User-Agent для безопасного хранения
   */
  hashUserAgent(userAgent: string, salt: string = 'ua_salt'): string {
    return createHash('sha256')
      .update(userAgent + salt)
      .digest('hex');
  }
}
