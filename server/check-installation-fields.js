// Load environment variables
require('dotenv').config({ path: '../.env.development' });

const { sequelize } = require('./config/database');

async function checkInstallationFields() {
  try {
    console.log('Checking installation fields in equipment table...');

    // Check table structure
    const [results] = await sequelize.query('DESCRIBE equipment');
    
    console.log('\n📋 Equipment table structure:');
    console.log('='.repeat(80));
    
    const installationFields = [
      'installation_type',
      'installation_location', 
      'installation_date',
      'installation_notes',
      'maintenance_schedule',
      'last_maintenance_date',
      'next_maintenance_date'
    ];
    
    let foundFields = [];
    let missingFields = [];
    
    results.forEach(column => {
      if (installationFields.includes(column.Field)) {
        foundFields.push(column.Field);
        console.log(`✅ ${column.Field.padEnd(25)} | ${column.Type.padEnd(30)} | ${column.Null} | ${column.Default || 'NULL'}`);
      }
    });
    
    installationFields.forEach(field => {
      if (!foundFields.includes(field)) {
        missingFields.push(field);
      }
    });
    
    console.log('='.repeat(80));
    console.log(`\n📊 Summary:`);
    console.log(`✅ Found fields: ${foundFields.length}/${installationFields.length}`);
    console.log(`❌ Missing fields: ${missingFields.length}`);
    
    if (foundFields.length > 0) {
      console.log(`\n✅ Found installation fields:`);
      foundFields.forEach(field => console.log(`   - ${field}`));
    }
    
    if (missingFields.length > 0) {
      console.log(`\n❌ Missing installation fields:`);
      missingFields.forEach(field => console.log(`   - ${field}`));
    }
    
    if (foundFields.length === installationFields.length) {
      console.log(`\n🎉 All installation fields are present in the database!`);
      return true;
    } else {
      console.log(`\n⚠️  Some installation fields are missing from the database.`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error checking installation fields:', error);
    return false;
  }
}

// Run the check if this file is executed directly
if (require.main === module) {
  checkInstallationFields()
    .then((success) => {
      if (success) {
        console.log('\n✅ Database check completed successfully');
        process.exit(0);
      } else {
        console.log('\n❌ Database check failed');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('Database check failed:', error);
      process.exit(1);
    });
}

module.exports = checkInstallationFields;
