import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

import { aiConfig } from './configuration/ai.config';
import { appConfig } from './configuration/app.config';
import { authConfig } from './configuration/auth.config';
import { corsConfig } from './configuration/cors.config';
import { databaseConfig } from './configuration/database.config';
import { docsConfig } from './configuration/docs.config';
import { loggerConfig } from '../infra/logger/logger.config';
import { queueConfig } from './configuration/queue.config';
import { storageConfig } from './configuration/storage.config';
import { vectorConfig } from './configuration/vector.config';
import { envValidationSchema } from './env.validation';

const nodeEnv = process.env.NODE_ENV ?? 'development';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      envFilePath: [`.env.${nodeEnv}`, '.env'],
      load: [
        appConfig,
        authConfig,
        corsConfig,
        docsConfig,
        databaseConfig,
        queueConfig,
        storageConfig,
        vectorConfig,
        aiConfig,
        loggerConfig,
      ],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
      },
    }),
  ],
  exports: [NestConfigModule],
})
export class AppConfigModule {}
