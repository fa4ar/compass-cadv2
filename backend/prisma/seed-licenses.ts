import { PrismaClient, LicenseType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const licenses: { name: string; slug: string; type: LicenseType; description: string; price: number; }[] = [
        { name: "Водительское удостоверение", slug: 'drivers-license', type: 'driver', description: 'Разрешение на управление транспортными средствами на дорогах общего пользования.', price: 150 },
        { name: 'Коммерческая лицензия (CDL)', slug: 'cdl', type: 'driver', description: 'Требуется для управления тяжелыми, крупногабаритными или опасными грузами.', price: 500 },
        { name: 'Разрешение на ношение оружия', slug: 'weapon-carry', type: 'weapon', description: 'Авторизация на скрытое ношение огнестрельного оружия.', price: 1000 },
        { name: 'Лицензия на охоту', slug: 'hunting-license', type: 'hunting', description: 'Юридическое разрешение на охоту на определенных диких животных.', price: 200 },
        { name: 'Лицензия на рыбалку', slug: 'fishing-license', type: 'fishing', description: 'Разрешение на рыбную ловлю в государственных водах.', price: 50 },
        { name: 'Лицензия пилота', slug: 'pilot-license', type: 'pilot', description: 'Авторизация на управление частными или коммерческими самолетами.', price: 5000 },
        { name: 'Медицинская карта (Марихуана)', slug: 'medical-marijuana', type: 'medical', description: 'Законный доступ к медицинской марихуане по состоянию здоровья.', price: 300 },
        { name: 'Бизнес-лицензия', slug: 'business-license', type: 'business', description: 'Разрешение на ведение легальной предпринимательской деятельности.', price: 2000 },
        { name: 'Удостоверение охранника', slug: 'security-permit', type: 'security', description: 'Требуется для работы в частных охранных структурах.', price: 400 },
        { name: 'Лицензия на катер/лодку', slug: 'boating-license', type: 'boat', description: 'Разрешение на управление моторными водными судами.', price: 250 },
    ];

    for (const license of licenses) {
        await prisma.license.upsert({
            where: { slug: license.slug },
            update: license,
            create: license,
        });
    }

    console.log('Licenses seeded successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
