import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountModule } from './account/account.module';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { SupportModule } from './support/support.module';
import { CatalogModule } from './catalog/catalog.module';
import { CouponsModule } from './coupons/coupons.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { ReportsModule } from './reports/reports.module';
import { ReviewsModule } from './reviews/reviews.module';
import { UploadsModule } from './uploads/uploads.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // DATABASE_URL set → PostgreSQL (production path).
    // Unset → zero-install SQLite dev database in the project folder.
    TypeOrmModule.forRoot(
      process.env.DATABASE_URL
        ? {
            type: 'postgres',
            url: process.env.DATABASE_URL,
            autoLoadEntities: true,
            // Explicit opt-in schema sync until real migrations exist
            // (DB_SYNC=true on Railway). Never rely on NODE_ENV for this.
            synchronize: process.env.DB_SYNC === 'true' || process.env.NODE_ENV !== 'production',
          }
        : {
            type: 'better-sqlite3',
            database: 'homeflow-dev.sqlite',
            autoLoadEntities: true,
            synchronize: true,
          },
    ),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
      signOptions: { expiresIn: '30d' },
    }),
    AuthModule,
    CatalogModule,
    BookingsModule,
    PaymentsModule,
    ReviewsModule,
    NotificationsModule,
    UsersModule,
    UploadsModule,
    ReportsModule,
    AccountModule,
    SupportModule,
    CouponsModule,
  ],
})
export class AppModule {}
