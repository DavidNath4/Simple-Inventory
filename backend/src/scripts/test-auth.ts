import { PrismaClient } from '@prisma/client';
import { AuthService } from '../services/auth.service';
import { UserRepository } from '../repositories/user.repository';

const prisma = new PrismaClient();

async function testAuth() {
  try {
    console.log('🧪 Testing Authentication System...\n');

    const authService = new AuthService(prisma);
    const userRepository = new UserRepository(prisma);

    // Test 1: Create a test user
    console.log('1. Creating test user...');
    const hashedPassword = await authService.hashPassword('testpass123');
    
    const testUser = await userRepository.create({
      email: 'test@example.com',
      password: hashedPassword,
      name: 'Test User',
      role: 'USER',
    });
    console.log('✅ Test user created:', testUser.email);

    // Test 2: Test login
    console.log('\n2. Testing login...');
    const loginResult = await authService.login({
      email: 'test@example.com',
      password: 'testpass123',
    });
    console.log('✅ Login successful:', loginResult.user.email);
    console.log('🔑 Token generated:', loginResult.token.substring(0, 20) + '...');

    // Test 3: Test token verification
    console.log('\n3. Testing token verification...');
    const decoded = authService.verifyToken(loginResult.token);
    console.log('✅ Token verified:', decoded.email);

    // Test 4: Test getUserFromToken
    console.log('\n4. Testing getUserFromToken...');
    const userFromToken = await authService.getUserFromToken(loginResult.token);
    console.log('✅ User from token:', userFromToken.email, userFromToken.role);

    // Cleanup
    console.log('\n5. Cleaning up...');
    await userRepository.delete(testUser.id);
    console.log('✅ Test user deleted');

    console.log('\n🎉 All authentication tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  testAuth();
}

export { testAuth };