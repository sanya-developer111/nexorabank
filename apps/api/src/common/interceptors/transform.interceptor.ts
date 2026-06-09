import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { serializeDecimals } from '../utils/decimal.util';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        if (data === undefined || data === null) {
          return { success: true };
        }
        if (typeof data === 'object' && 'success' in data) {
          return serializeDecimals(data);
        }
        return { success: true, data: serializeDecimals(data) };
      }),
    );
  }
}
