const { sequelize, testConnection } = require('../config/database');
const bcrypt = require('bcryptjs');

// Check admin user script
async function checkAdminUser() {
  console.log('🔍 Checking admin user...');
  
  try {
    // Test connection first
    console.log('🔗 Testing database connection...');
    await testConnection();
    
    // Import User model
    const { User } = require('../models');
    
    // Find admin user
    const adminUser = await User.findOne({ where: { username: 'admin' } });
    
    if (!adminUser) {
      console.log('❌ Admin user not found!');
      console.log('   Run: npm run create-admin');
      return;
    }
    
    console.log('✅ Admin user found:');
    console.log('   ID:', adminUser.id);
    console.log('   Username:', adminUser.username);
    console.log('   Role:', adminUser.role);
    console.log('   Email:', adminUser.email);
    console.log('   Created:', adminUser.createdAt);
    console.log('   Password hash length:', adminUser.password.length);
    
    // Test password
    const testPassword = 'admin123';
    const isMatch = await bcrypt.compare(testPassword, adminUser.password);
    console.log(`   Password test (${testPassword}):`, isMatch ? '✅ MATCH' : '❌ NO MATCH');
    
    if (!isMatch) {
      console.log('⚠️  Password does not match! Recreating admin user...');
      
      // Update password
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await adminUser.update({ password: hashedPassword });
      
      console.log('✅ Admin password updated successfully!');
    }
    
  } catch (error) {
    console.error('❌ Failed to check admin user:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  checkAdminUser()
    .then(() => {
      console.log('🎉 Admin user check completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Admin user check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkAdminUser };
