import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse } from '../interfaces/api-response.interface';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const message =
        typeof res === 'string'
          ? res
          : (res as { message?: string | string[] }).message;
      const msg = Array.isArray(message) ? message.join(', ') : message || 'Error';
      const body: ApiResponse<null> = {
        success: false,
        message: msg,
        data: null,
      };
      response.status(status).json(body);
      return;
    }

    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      exception instanceof Error ? exception.message : 'Internal server error';
    const body: ApiResponse<null> = {
      success: false,
      message,
      data: null,
    };
    response.status(status).json(body);
  }
}
