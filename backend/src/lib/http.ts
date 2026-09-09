import type { NextFunction, Request, Response } from 'express'

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export function routeParam(req: Request, name: string) {
  const value = req.params[name]
  return Array.isArray(value) ? value[0] : value
}

export function notFound(res: Response, message = 'Not found') {
  return res.status(404).json({ error: message })
}

export function badRequest(res: Response, message: string) {
  return res.status(400).json({ error: message })
}

export function unauthorized(res: Response, message = 'Invalid username or password') {
  return res.status(401).json({ error: message })
}
