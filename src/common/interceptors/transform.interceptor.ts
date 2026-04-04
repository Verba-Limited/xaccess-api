import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';

/**
 * Wraps successful controller responses in { success, message, data }.
 * Skip if body is already shaped as ApiResponse.
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse> {
    return next.handle().pipe(
      map((data) => {
        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          'message' in data &&
          'data' in data
        ) {
          return data as ApiResponse;
        }
        return {
          success: true,
          message: 'OK',
          data: data ?? null,
        } as ApiResponse;
      }),
    );
  }
}
