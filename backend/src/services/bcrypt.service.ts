import bcrypt from 'bcryptjs';

export class BcryptService {
    private saltRounds: number;

    constructor() {
        this.saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10');
    }

    async hash(password: string): Promise<string> {
        return bcrypt.hash(password, this.saltRounds);
    }

    async compare(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }
}

export const bcryptService = new BcryptService();