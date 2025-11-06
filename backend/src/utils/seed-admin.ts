import { PrismaClient, UserRole } from '@prisma/client';
import { AuthService } from '../services/auth.service';

const prisma = new PrismaClient();

async function seedAdminUser() {
  try {
    const authService = new AuthService(prisma);
    
    // Check if admin user already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: UserRole.ADMIN },
    });

    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      return;
    }

    // Create admin user
    const hashedPassword = await authService.hashPassword('admin123');
    
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@inventory.com',
        password: hashedPassword,
        name: 'System Administrator',
        role: UserRole.ADMIN,
        isActive: true,
      },
    });

    console.log('Admin user created successfully:');
    console.log('Email:', adminUser.email);
    console.log('Password: admin123');
    console.log('Role:', adminUser.role);
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedAdminUser();
}

export { seedAdminUser };