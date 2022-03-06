import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { TokenService } from '../../domain/user/services/tokenService';

export class AuthMiddleware {
  public constructor(private readonly tokenService: TokenService) {}

  public async verifyToken(request: Request, response: Response, next: NextFunction) {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      response.status(StatusCodes.UNAUTHORIZED).send({ error: 'Authorization header not provided' });
      return;
    }

    const token = this.parseToken(authHeader as string);

    if (!token) {
      response.status(StatusCodes.UNAUTHORIZED).send({ error: 'Bearer authorization is not set' });
      return;
    }

    try {
      await this.tokenService.verifyToken(token as string);
    } catch (error) {
      response.status(StatusCodes.UNAUTHORIZED).send({ error: 'Invalid access token' });
      return;
    }

    next();
  }

  private parseToken(authHeaderContent: string): string | null {
    const [authType, token] = authHeaderContent.split(' ');

    if (authType !== 'Bearer') {
      return null;
    }

    return token;
  }
}
