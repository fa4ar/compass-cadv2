import { Request, Response } from 'express';
import { charactersService } from '../../services/characters/characters.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export class CharactersController {
    create = async (req: AuthRequest, res: Response) => {
        try{
            const { firstName, lastName, middleName, nickname, birthDate, gender, height, weight, description, photoUrl, status, isAlive, deathReason, deathDate } = req.body;
            const userId = req.user?.userId;
            const uploadedFile = (req as AuthRequest & { file?: { filename?: string } }).file;

            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            if (!firstName || !lastName || !birthDate || !gender) {
                return res.status(400).json({ error: 'Missing required fields (firstName, lastName, birthDate, gender)' });
            }

            let normalizedIsAlive =
                typeof isAlive === 'boolean'
                    ? isAlive
                    : typeof isAlive === 'string'
                        ? isAlive.toLowerCase() === 'true'
                        : true;

            let normalizedStatus = status ? status.toLowerCase() : 'active';
            const normalizedGender = gender.toLowerCase();
            if (normalizedStatus === 'deceased') {
                normalizedStatus = 'deceased';
                if (normalizedIsAlive !== false) {
                    normalizedIsAlive = false;
                }
            }
            if (normalizedIsAlive === false) normalizedStatus = 'deceased';

            const normalizedDeathReason = normalizedIsAlive ? null : (deathReason || null);
            const normalizedDeathDate = normalizedIsAlive ? null : (deathDate ? new Date(deathDate) : null);
            const normalizedPhotoUrl = uploadedFile?.filename
                ? `/uploads/characters/${uploadedFile.filename}`
                : photoUrl;

            const result = await charactersService.createcharacter({
                userId,
                firstName,
                lastName,
                middleName,
                nickname,
                birthDate: new Date(birthDate),
                gender: normalizedGender as 'male' | 'female' | 'other',
                height: height ? parseInt(height.toString()) : null,
                weight: weight ? parseInt(weight.toString()) : null,
                description,
                photoUrl: normalizedPhotoUrl,
                status: normalizedStatus,
                isAlive: normalizedIsAlive,
                deathReason: normalizedDeathReason,
                deathDate: normalizedDeathDate
            });
            res.status(201).json(result);
        }
        catch (error: any) {
            console.error("CharactersController create error:", error);
            res.status(400).json({ error: error.message || "Failed to create character" });
        }
    };

    getAll = async (req: AuthRequest, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const characters = await charactersService.getUserCharacters(userId);
            res.json(characters);
        } catch (error: any) {
            console.error("CharactersController getAll error:", error);
            res.status(500).json({ error: error.message || "Failed to fetch characters" });
        }
    };

    update = async (req: AuthRequest, res: Response) => {
        try {
            const userId = req.user?.userId;
            const characterId = Number(req.params.id);
            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            if (!characterId || Number.isNaN(characterId)) {
                return res.status(400).json({ error: 'Invalid character id' });
            }

            const {
                firstName,
                lastName,
                middleName,
                nickname,
                birthDate,
                gender,
                height,
                weight,
                description,
                photoUrl,
                status,
                isAlive,
                deathReason,
                deathDate,
                ssn,
            } = req.body;

            const normalizeString = (value: any) => (typeof value === 'string' ? value.trim() : value);
            const emptyToNull = (value: any) => (value === '' ? null : value);

            const normalizedGender = gender ? normalizeString(gender).toLowerCase() : undefined;
            let normalizedStatus = status ? normalizeString(status).toLowerCase() : undefined;

            let normalizedIsAlive = typeof isAlive === 'boolean' ? isAlive : undefined;
            if (normalizedStatus === 'deceased') {
                normalizedIsAlive = false;
            }
            if (normalizedIsAlive === false) {
                normalizedStatus = 'deceased';
            }

            const parsedHeight = height === '' || height === null || height === undefined ? null : Number(height);
            const parsedWeight = weight === '' || weight === null || weight === undefined ? null : Number(weight);

            if (parsedHeight !== null && Number.isNaN(parsedHeight)) {
                return res.status(400).json({ error: 'Invalid height' });
            }
            if (parsedWeight !== null && Number.isNaN(parsedWeight)) {
                return res.status(400).json({ error: 'Invalid weight' });
            }

            const normalizedBirthDate = birthDate ? new Date(birthDate) : undefined;
            const normalizedDeathDate =
                normalizedIsAlive === true
                    ? null
                    : deathDate
                        ? new Date(deathDate)
                        : normalizedIsAlive === false
                            ? null
                            : undefined;

            const normalizedDeathReason =
                normalizedIsAlive === true ? null : emptyToNull(normalizeString(deathReason));

            const result = await charactersService.updateCharacter({
                userId,
                characterId,
                firstName: normalizeString(firstName),
                lastName: normalizeString(lastName),
                middleName: emptyToNull(normalizeString(middleName)),
                nickname: emptyToNull(normalizeString(nickname)),
                birthDate: normalizedBirthDate,
                gender: normalizedGender as 'male' | 'female' | 'other' | undefined,
                height: parsedHeight,
                weight: parsedWeight,
                description: emptyToNull(normalizeString(description)),
                photoUrl: emptyToNull(normalizeString(photoUrl)),
                status: normalizedStatus as 'active' | 'suspended' | 'incarcerated' | 'deceased' | 'vacation' | undefined,
                isAlive: normalizedIsAlive,
                deathReason: normalizedDeathReason,
                deathDate: normalizedDeathDate,
                ssn: emptyToNull(normalizeString(ssn)),
            });

            res.json(result);
        } catch (error: any) {
            console.error("CharactersController update error:", error);
            res.status(400).json({ error: error.message || "Failed to update character" });
        }
    };
}
