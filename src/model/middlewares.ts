import { Request, Response } from 'express';

import container from './DiContainer';
import { hasProperties } from './helpers';

// Injects _user and _indentifier into request.params
export const userMiddleware = async (req: Request, res: Response, next: Function) => {
  if (req.body) {
    const body = req.body;
    const identifier = req.params.identifier || body.identifier || body.uuid || body.username || body.email || body.id || req.query.identifier;

    if (!identifier) {
      return res
        .status(400)
        .send({ status: "failed", reason: "Missing identifier" })
    }

    req.params._identifier = identifier;
    req.params._user = await container.um.getUser(identifier);

    if (!req.params._user) {
      return res
        .status(404)
        .send({ status: "failed", reason: "User not found" })
    }

    next();
  }
};

export function requiredBody(...args: any[]) {

  return async (req: Request, res: Response, next: Function) => {
    if (!hasProperties(req.body, args)) {
      return res
        .status(400)
        .send({ status: "failed", reason: "Missing arguments", required: args });
    }

    next();
  };
}