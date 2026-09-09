import type { NextFunction, Request, Response } from 'express'

function stamp() {
  return new Date().toISOString().replace('T', ' ').replace('Z', '')
}

export const logger = {
  info(message: string, extra?: unknown) {
    if (extra === undefined) console.log(`${stamp()} [INFO] ${message}`)
    else console.log(`${stamp()} [INFO] ${message}`, extra)
  },
  warn(message: string, extra?: unknown) {
    if (extra === undefined) console.warn(`${stamp()} [WARN] ${message}`)
    else console.warn(`${stamp()} [WARN] ${message}`, extra)
  },
  error(message: string, extra?: unknown) {
    if (extra === undefined) console.error(`${stamp()} [ERROR] ${message}`)
    else console.error(`${stamp()} [ERROR] ${message}`, extra)
  },
}

function requestPath(req: Request) {
  const url = req.originalUrl || req.url || req.path
  return url
}

/** Log every API hit: method, path, status, duration. */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/health') return next()

  const started = Date.now()
  const method = req.method
  const path = requestPath(req)

  logger.info(`→ ${method} ${path}`)

  res.on('finish', () => {
    const ms = Date.now() - started
    const status = res.statusCode
    const line = `← ${method} ${path} ${status} ${ms}ms`
    if (status >= 500) logger.error(line)
    else if (status >= 400) logger.warn(line)
    else logger.info(line)
  })

  next()
}
