import { Router, RequestHandler } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

const router = Router();

router.get('/', authMiddleware as RequestHandler, async (req, res) => {
    try {
        const { includeInactive } = req.query;
        const where: any = {};
        
        if (!includeInactive) {
            where.isActive = true;
        }

        const departments = await (prisma as any).department.findMany({
            where,
            include: {
                ranks: { orderBy: { level: 'asc' } },
                _count: { select: { members: true, vehicles: true } }
            },
            orderBy: { name: 'asc' }
        });

        res.json(departments);
    } catch (error) {
        console.error('Get departments error:', error);
        res.status(500).json({ error: 'Failed to fetch departments' });
    }
});

router.post('/', authMiddleware as RequestHandler, async (req, res) => {
    try {
        const { name, code, type, description, motto, headquarters, jurisdiction, city } = req.body;

        const existing = await (prisma as any).department.findFirst({
            where: { OR: [{ name }, { code }] }
        });

        if (existing) {
            return res.status(400).json({ error: 'Department with this name or code already exists' });
        }

        const department = await (prisma as any).department.create({
            data: {
                name,
                code,
                type,
                description,
                motto,
                headquarters,
                jurisdiction,
                city
            },
            include: { ranks: true }
        });

        res.status(201).json(department);
    } catch (error) {
        console.error('Create department error:', error);
        res.status(500).json({ error: 'Failed to create department' });
    }
});

router.get('/:id', authMiddleware as RequestHandler, async (req, res) => {
    try {
        const { id } = req.params;
        
        const department = await (prisma as any).department.findUnique({
            where: { id: parseInt(id) },
            include: {
                ranks: { orderBy: { level: 'asc' } },
                members: {
                    where: { isActive: true },
                    include: {
                        character: true,
                        rank: true
                    }
                },
                vehicles: true,
                children: true
            }
        });

        if (!department) {
            return res.status(404).json({ error: 'Department not found' });
        }

        res.json(department);
    } catch (error) {
        console.error('Get department error:', error);
        res.status(500).json({ error: 'Failed to fetch department' });
    }
});

router.put('/:id', authMiddleware as RequestHandler, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code, type, description, motto, headquarters, jurisdiction, city, isActive } = req.body;

        const department = await (prisma as any).department.update({
            where: { id: parseInt(id) },
            data: {
                ...(name && { name }),
                ...(code && { code }),
                ...(type && { type }),
                ...(description && { description }),
                ...(motto && { motto }),
                ...(headquarters && { headquarters }),
                ...(jurisdiction && { jurisdiction }),
                ...(city && { city }),
                ...(isActive !== undefined && { isActive })
            },
            include: { ranks: true }
        });

        res.json(department);
    } catch (error) {
        console.error('Update department error:', error);
        res.status(500).json({ error: 'Failed to update department' });
    }
});

router.delete('/:id', authMiddleware as RequestHandler, async (req, res) => {
    try {
        const { id } = req.params;

        await (prisma as any).department.update({
            where: { id: parseInt(id) },
            data: { isActive: false }
        });

        res.json({ message: 'Department deactivated' });
    } catch (error) {
        console.error('Delete department error:', error);
        res.status(500).json({ error: 'Failed to delete department' });
    }
});

router.post('/:id/ranks', authMiddleware as RequestHandler, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, shortName, level, salary, badgePrefix, permissions, isSupervisor, isChief, isCommand, description } = req.body;

        const rank = await (prisma as any).departmentRank.create({
            data: {
                departmentId: parseInt(id),
                name,
                shortName,
                level,
                salary,
                badgePrefix,
                permissions: permissions || {},
                isSupervisor,
                isChief,
                isCommand,
                description
            }
        });

        res.status(201).json(rank);
    } catch (error) {
        console.error('Create rank error:', error);
        res.status(500).json({ error: 'Failed to create rank' });
    }
});

router.put('/:id/ranks/:rankId', authMiddleware as RequestHandler, async (req, res) => {
    try {
        const { id, rankId } = req.params;
        const { name, shortName, level, salary, badgePrefix, permissions, isSupervisor, isChief, isCommand, description } = req.body;

        const rank = await (prisma as any).departmentRank.update({
            where: { id: parseInt(rankId) },
            data: {
                ...(name && { name }),
                ...(shortName !== undefined && { shortName }),
                ...(level && { level }),
                ...(salary !== undefined && { salary }),
                ...(badgePrefix !== undefined && { badgePrefix }),
                ...(permissions && { permissions }),
                ...(isSupervisor !== undefined && { isSupervisor }),
                ...(isChief !== undefined && { isChief }),
                ...(isCommand !== undefined && { isCommand }),
                ...(description !== undefined && { description })
            }
        });

        res.json(rank);
    } catch (error) {
        console.error('Update rank error:', error);
        res.status(500).json({ error: 'Failed to update rank' });
    }
});

router.delete('/:id/ranks/:rankId', authMiddleware as RequestHandler, async (req, res) => {
    try {
        const { rankId } = req.params;

        await (prisma as any).departmentRank.delete({
            where: { id: parseInt(rankId) }
        });

        res.json({ message: 'Rank deleted' });
    } catch (error) {
        console.error('Delete rank error:', error);
        res.status(500).json({ error: 'Failed to delete rank' });
    }
});

router.post('/:id/members', authMiddleware as RequestHandler, async (req, res) => {
    try {
        const { id } = req.params;
        const { characterId, rankId, badgeNumber, callSign, division, notes } = req.body;

        const existingInAnyDept = await (prisma as any).departmentMember.findFirst({
            where: {
                characterId,
                isActive: true
            }
        });

        if (existingInAnyDept) {
            return res.status(400).json({ error: 'Character is already a member of another department' });
        }

        const existing = await (prisma as any).departmentMember.findFirst({
            where: {
                departmentId: parseInt(id),
                characterId,
                isActive: true
            }
        });

        if (existing) {
            return res.status(400).json({ error: 'Character is already a member of this department' });
        }

        const member = await (prisma as any).departmentMember.create({
            data: {
                departmentId: parseInt(id),
                characterId,
                rankId,
                badgeNumber: badgeNumber || `${Date.now().toString(36).toUpperCase()}`,
                callSign,
                division,
                notes
            },
            include: {
                character: true,
                rank: true,
                department: true
            }
        });

        res.status(201).json(member);
    } catch (error) {
        console.error('Add member error:', error);
        res.status(500).json({ error: 'Failed to add member to department' });
    }
});

router.put('/:id/members/:memberId', authMiddleware as RequestHandler, async (req, res) => {
    try {
        const { memberId } = req.params;
        const { rankId, badgeNumber, callSign, division, isActive, notes, leftAt } = req.body;

        const member = await (prisma as any).departmentMember.update({
            where: { id: parseInt(memberId) },
            data: {
                ...(rankId && { rankId }),
                ...(badgeNumber && { badgeNumber }),
                ...(callSign !== undefined && { callSign }),
                ...(division !== undefined && { division }),
                ...(isActive !== undefined && { isActive }),
                ...(notes !== undefined && { notes }),
                ...(leftAt && { leftAt })
            },
            include: {
                character: true,
                rank: true,
                department: true
            }
        });

        res.json(member);
    } catch (error) {
        console.error('Update member error:', error);
        res.status(500).json({ error: 'Failed to update member' });
    }
});

router.delete('/:id/members/:memberId', authMiddleware as RequestHandler, async (req, res) => {
    try {
        const { memberId } = req.params;

        await (prisma as any).departmentMember.update({
            where: { id: parseInt(memberId) },
            data: {
                isActive: false,
                leftAt: new Date()
            }
        });

        res.json({ message: 'Member removed from department' });
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ error: 'Failed to remove member' });
    }
});

export default router;