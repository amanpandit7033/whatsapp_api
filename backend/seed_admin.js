const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const username = 'admin';
    const password = 'AdminPassword123!';
    
    // Check if exists
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
        // Update to admin
        await prisma.user.update({
            where: { username },
            data: { isAdmin: true, maxInstances: 100 }
        });
        console.log('Updated existing admin user to have admin privileges.');
    } else {
        const passwordHash = await bcrypt.hash(password, 10);
        await prisma.user.create({
            data: {
                username,
                passwordHash,
                isAdmin: true,
                maxInstances: 100
            }
        });
        console.log(`Created new admin user. Username: ${username}, Password: ${password}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
