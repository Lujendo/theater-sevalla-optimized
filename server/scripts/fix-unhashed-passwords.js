const bcrypt = require('bcryptjs');
const { User } = require('../models');

async function fixUnhashedPasswords() {
  console.log('🔧 Starting password hash fix...');
  
  try {
    // Get all users
    const users = await User.findAll({
      attributes: ['id', 'username', 'password']
    });

    console.log(`📊 Found ${users.length} users to check`);

    let fixedCount = 0;
    let alreadyHashedCount = 0;

    for (const user of users) {
      console.log(`\n🔍 Checking user ${user.id} (${user.username}):`);
      console.log(`   Password: ${user.password.substring(0, 20)}...`);
      
      // Check if password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
      const isHashed = /^\$2[aby]\$/.test(user.password);
      
      if (isHashed) {
        console.log(`   ✅ Password already hashed`);
        alreadyHashedCount++;
      } else {
        console.log(`   🔧 Password is plain text, hashing...`);
        
        // Hash the plain text password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(user.password, saltRounds);
        
        // Update the user with hashed password
        await User.update(
          { password: hashedPassword },
          { 
            where: { id: user.id },
            // Skip the beforeUpdate hook to avoid double hashing
            hooks: false
          }
        );
        
        console.log(`   ✅ Password hashed and updated`);
        console.log(`   New hash: ${hashedPassword.substring(0, 30)}...`);
        fixedCount++;
        
        // Verify the hash works
        const verification = await bcrypt.compare(user.password, hashedPassword);
        console.log(`   🔍 Verification test: ${verification ? 'PASS' : 'FAIL'}`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Already hashed: ${alreadyHashedCount}`);
    console.log(`   🔧 Fixed (hashed): ${fixedCount}`);
    console.log(`   📝 Total users: ${users.length}`);
    
    if (fixedCount > 0) {
      console.log(`\n🎉 Successfully fixed ${fixedCount} unhashed passwords!`);
    } else {
      console.log(`\n✅ All passwords were already properly hashed.`);
    }

  } catch (error) {
    console.error('❌ Error fixing passwords:', error);
    throw error;
  }
}

// Run the fix if this script is executed directly
if (require.main === module) {
  fixUnhashedPasswords()
    .then(() => {
      console.log('\n🎉 Password fix completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Password fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixUnhashedPasswords };
