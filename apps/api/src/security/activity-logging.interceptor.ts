import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivityLoggingInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const method = request.method;
    const url = request.url;
    const ipAddress = request.ip || request.headers['x-forwarded-for'];

    return next.handle().pipe(
      tap(() => {
        if (user?.id && method !== 'GET') {
          this.prisma.activityLog
            .create({
              data: {
                userId: user.id,
                action: `${method} ${url}`,
                entity: url.split('/')[1],
                ipAddress: typeof ipAddress === 'string' ? ipAddress : undefined,
                metadata: { method, path: url },
              },
            })
            .catch(() => {});
        }
      }),
    );
  }
}
