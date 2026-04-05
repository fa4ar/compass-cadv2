import { PrismaClient, RoleType } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const prisma = new PrismaClient();

async function main() {
  const roles = [
    { name: 'Citizen', slug: 'citizen', description: 'Regular citizen', priority: 1, type: RoleType.player, isDefault: true, permissions: {} },
    { name: 'Police Officer', slug: 'police', description: 'Police department personnel', priority: 10, type: RoleType.player, permissions: {} },
    { name: 'Police Sergeant', slug: 'police_sergeant', description: 'Police sergeant rank', priority: 11, type: RoleType.player, permissions: {} },
    { name: 'Police Lieutenant', slug: 'police_lieutenant', description: 'Police lieutenant rank', priority: 12, type: RoleType.player, permissions: {} },
    { name: 'Police Captain', slug: 'police_captain', description: 'Police captain rank', priority: 13, type: RoleType.player, permissions: {} },
    { name: 'Police Chief', slug: 'police_chief', description: 'Police chief', priority: 14, type: RoleType.player, permissions: {} },
    { name: 'Dispatcher', slug: 'dispatcher', description: 'Dispatch personnel', priority: 20, type: RoleType.player, permissions: {} },
    { name: 'EMS', slug: 'ems', description: 'Emergency Medical Services', priority: 30, type: RoleType.player, permissions: {} },
    { name: 'EMS Lieutenant', slug: 'ems_lieutenant', description: 'EMS lieutenant', priority: 31, type: RoleType.player, permissions: {} },
    { name: 'EMS Chief', slug: 'ems_chief', description: 'EMS chief', priority: 32, type: RoleType.player, permissions: {} },
    { name: 'Fire Department', slug: 'fire', description: 'Fire department personnel', priority: 40, type: RoleType.player, permissions: {} },
    { name: 'Fire Lieutenant', slug: 'fire_lieutenant', description: 'Fire lieutenant', priority: 41, type: RoleType.player, permissions: {} },
    { name: 'Fire Chief', slug: 'fire_chief', description: 'Fire chief', priority: 42, type: RoleType.player, permissions: {} },
    { name: 'Admin', slug: 'admin', description: 'System administrator', priority: 100, type: RoleType.admin, permissions: {} },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { slug: role.slug },
      update: {},
      create: role,
    });
    console.log(`Created role: ${role.name}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });