import prisma from '../../lib/prisma';

export class SettingsService {
    static async get(key: string): Promise<string | null> {
        const setting = await prisma.setting.findUnique({
            where: { key }
        });
        return setting?.value || null;
    }

    static async set(key: string, value: string): Promise<void> {
        await prisma.setting.upsert({
            where: { key },
            update: { value },
            create: { key, value }
        });
    }

    static async getBetaTestEnabled(): Promise<boolean> {
        const value = await this.get('betaTestMode');
        return value === 'true';
    }

    static async setBetaTestEnabled(enabled: boolean): Promise<void> {
        await this.set('betaTestMode', enabled ? 'true' : 'false');
    }

    static async getBetaTestRoleId(): Promise<string | null> {
        return process.env.BETA_TEST_ROLE_ID || null;
    }
}
