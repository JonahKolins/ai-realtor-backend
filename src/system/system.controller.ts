import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SystemService, HealthResponse, ConfigResponse } from './system.service';

@ApiTags('System')
@Controller()
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Service health status',
    example: {
      status: 'ok',
      uptimeSec: 12.34,
      timestamp: '2025-08-28T10:00:00.000Z'
    }
  })
  getHealth(): HealthResponse {
    return this.systemService.getHealth();
  }

  @Get('config')
  @ApiOperation({ summary: 'Public configuration for frontend' })
  @ApiResponse({
    status: 200,
    description: 'Public application configuration',
    example: {
      version: '0.1.0',
      env: 'development',
      limits: { maxUploadMb: 25 },
      features: { listings: true }
    }
  })
  getConfig(): ConfigResponse {
    return this.systemService.getConfig();
  }
}
