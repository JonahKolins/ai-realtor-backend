import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface HealthResponse {
  status: string;
  uptimeSec: number;
  timestamp: string;
}

export interface ConfigResponse {
  version: string;
  env: string;
  limits: {
    maxUploadMb: number;
  };
  features: {
    listings: boolean;
  };
}

@Injectable()
export class SystemService {
  constructor(private readonly configService: ConfigService) {}

  getHealth(): HealthResponse {
    return {
      status: 'ok',
      uptimeSec: Number(process.uptime().toFixed(2)),
      timestamp: new Date().toISOString(),
    };
  }

  getConfig(): ConfigResponse {
    return {
      version: this.configService.get<string>('APP_VERSION', '0.1.0'),
      env: this.configService.get<string>('NODE_ENV', 'development'),
      limits: {
        maxUploadMb: this.configService.get<number>('MAX_UPLOAD_MB', 25),
      },
      features: {
        listings: this.configService.get<string>('FEATURES_LISTINGS', 'true') === 'true',
      },
    };
  }
}
