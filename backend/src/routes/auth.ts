import { Router } from 'express'
import { z } from 'zod'

import { User } from '../db/models/index.js'
import { asyncHandler, badRequest, unauthorized } from '../lib/http.js'
import { publicUser } from '../lib/publicUser.js'
import { verifyPassword } from '../lib/password.js'

export const authRouter = Router()

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
})

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) return badRequest(res, 'Username and password are required')

    const username = parsed.data.username.toLowerCase()
    const row = await User.findOne({ where: { username } })
    if (!row) return unauthorized(res)
    if (!row.active) return unauthorized(res, 'This account is inactive')
    const ok = await verifyPassword(parsed.data.password, row.passwordHash)
    if (!ok) return unauthorized(res)
    res.json(publicUser(row))
  }),
)
