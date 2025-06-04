const { sequelize, testConnection } = require('../config/database');
const bcrypt = require('bcryptjs');

// Create admin user script
async function createAdminUser() {
  console.log('👤 Creating admin user...');
  
  try {
    // Test connection first
    console.log('🔗 Testing database connection...');
    await testConnection();
    
    // Import User model
    const { User } = require('../models');
    
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ where: { username: 'admin' } });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      console.log('   Username: admin');
      console.log('   Role:', existingAdmin.role);
      console.log('   Created:', existingAdmin.createdAt);
      return;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Create admin user
    const adminUser = await User.create({
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
      email: 'admin@theater.local'
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   Role: admin');
    console.log('   ID:', adminUser.id);
    console.log('');
    console.log('🔐 You can now login with:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('');
    console.log('⚠️  IMPORTANT: Change the password after first login!');
    
  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createAdminUser()
    .then(() => {
      console.log('🎉 Admin user creation completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Admin user creation failed:', error);
      process.exit(1);
    });
}

module.exports = { createAdminUser };
