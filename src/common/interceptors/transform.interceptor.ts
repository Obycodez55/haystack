import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ResponseBuilder, SuccessResponse } from '@responses';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // If data already has our response structure, return as-is
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Handle paginated responses
        if (
          data &&
          typeof data === 'object' &&
          'items' in data &&
          'total' in data
        ) {
          const { items, total, page = 1, limit = 20 } = data;
          const pagination = ResponseBuilder.pagination(page, limit, total);
          return ResponseBuilder.success(items, pagination);
        }

        // Standard success response
        return ResponseBuilder.success(data);
      }),
    );
  }
}
