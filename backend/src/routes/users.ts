import { UniqueConstraintError } from 'sequelize'
import { Router } from 'express'
import { z } from 'zod'

import { Quarry, User } from '../db/models/index.js'
import { USER_ROLES } from '../db/models/User.js'
import { asyncHandler, badRequest, notFound, routeParam } from '../lib/http.js'
import { hashPassword } from '../lib/password.js'
import { publicUser } from '../lib/publicUser.js'

export const usersRouter = Router()

const quarryIdsSchema = z.array(z.string().min(1)).min(1)

const userCreateSchema = z.object({
  name: z.string().trim().min(1),
  username: z.string().trim().min(1),
  password: z.string().min(4, 'Password must be at least 4 characters'),
  role: z.enum(USER_ROLES),
  quarryIds: quarryIdsSchema.optional(),
  active: z.boolean().optional(),
})

const userPatchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  username: z.string().trim().min(1).optional(),
  password: z.string().min(4, 'Password must be at least 4 characters').optional(),
  role: z.enum(USER_ROLES).optional(),
  quarryIds: quarryIdsSchema.optional(),
  active: z.boolean().optional(),
})

async function normalizeAccess(role: string, quarryIds: string[] | undefined) {
  if (role === 'Owner') return ['*']
  const ids = (quarryIds ?? []).filter(Boolean)
  if (ids.includes('*')) return ['*']
  if (ids.length === 0) throw new Error('Select at least one quarry')
  const quarries = await Quarry.findAll({ attributes: ['id'] })
  const known = new Set(quarries.map((row) => row.id))
  for (const id of ids) {
    if (!known.has(id)) throw new Error(`Unknown quarry: ${id}`)
  }
  return ids
}

async function defaultLastQuarryId(quarryIds: string[]) {
  if (!quarryIds.includes('*')) return quarryIds[0] ?? ''
  const first = await Quarry.findOne({ order: [['name', 'ASC']], attributes: ['id'] })
  return first?.id ?? ''
}

async function ownerCount(excludeId?: string) {
  const rows = await User.findAll({ where: { role: 'Owner', active: true }, attributes: ['id'] })
  return rows.filter((row) => row.id !== excludeId).length
}

usersRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await User.findAll({ order: [['name', 'ASC']] })
    res.json(rows.map(publicUser))
  }),
)

usersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await User.findByPk(routeParam(req, 'id'))
    if (!row) return notFound(res, 'User not found')
    res.json(publicUser(row))
  }),
)

usersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = userCreateSchema.safeParse(req.body)
    if (!parsed.success) return badRequest(res, parsed.error.message)
    let quarryIds: string[]
    try {
      quarryIds = await normalizeAccess(parsed.data.role, parsed.data.quarryIds)
    } catch (err) {
      return badRequest(res, err instanceof Error ? err.message : 'Invalid quarry access')
    }
    const username = parsed.data.username.toLowerCase()
    try {
      const row = await User.create({
        name: parsed.data.name,
        username,
        passwordHash: await hashPassword(parsed.data.password),
        role: parsed.data.role,
        quarryIds,
        lastQuarryId: await defaultLastQuarryId(quarryIds),
        active: parsed.data.active ?? true,
      })
      res.status(201).json(publicUser(row))
    } catch (err) {
      if (err instanceof UniqueConstraintError) {
        return badRequest(res, 'That username is already taken')
      }
      throw err
    }
  }),
)

usersRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await User.findByPk(routeParam(req, 'id'))
    if (!row) return notFound(res, 'User not found')
    const parsed = userPatchSchema.safeParse(req.body)
    if (!parsed.success) return badRequest(res, parsed.error.message)
    if (Object.keys(parsed.data).length === 0) return badRequest(res, 'No fields to update')

    const nextRole = parsed.data.role ?? row.role
    const nextActive = parsed.data.active ?? row.active
    if ((row.role === 'Owner' && row.active) && (nextRole !== 'Owner' || nextActive === false)) {
      if ((await ownerCount(row.id)) < 1) {
        return badRequest(res, 'Keep at least one active Owner')
      }
    }

    let quarryIds = row.quarryIds
    if (parsed.data.role || parsed.data.quarryIds) {
      try {
        quarryIds = await normalizeAccess(nextRole, parsed.data.quarryIds ?? row.quarryIds)
      } catch (err) {
        return badRequest(res, err instanceof Error ? err.message : 'Invalid quarry access')
      }
    }

    const patch: Record<string, unknown> = {}
    if (parsed.data.name) patch.name = parsed.data.name
    if (parsed.data.username) patch.username = parsed.data.username.toLowerCase()
    if (parsed.data.password) patch.passwordHash = await hashPassword(parsed.data.password)
    if (parsed.data.role) patch.role = parsed.data.role
    if (parsed.data.quarryIds || parsed.data.role) {
      patch.quarryIds = quarryIds
      if (!quarryIds.includes(row.lastQuarryId) && !quarryIds.includes('*')) {
        patch.lastQuarryId = await defaultLastQuarryId(quarryIds)
      }
    }
    if (parsed.data.active !== undefined) patch.active = parsed.data.active

    try {
      await row.update(patch)
      res.json(publicUser(row))
    } catch (err) {
      if (err instanceof UniqueConstraintError) {
        return badRequest(res, 'That username is already taken')
      }
      throw err
    }
  }),
)

usersRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await User.findByPk(routeParam(req, 'id'))
    if (!row) return notFound(res, 'User not found')
    if (row.role === 'Owner' && row.active && (await ownerCount(row.id)) < 1) {
      return badRequest(res, 'Keep at least one active Owner')
    }
    await row.destroy()
    res.status(204).send()
  }),
)
