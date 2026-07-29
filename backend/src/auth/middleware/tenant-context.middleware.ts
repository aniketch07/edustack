import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user as JwtPayload;

    if (user && user.instituteId) {
      (req as any).tenantId = user.instituteId;
    }

    next();
  }
}
