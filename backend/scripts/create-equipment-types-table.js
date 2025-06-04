const { sequelize } = require('../config/database');
const { EquipmentType } = require('../models');

async function createEquipmentTypesTable() {
  try {
    console.log('🔍 Checking EquipmentType table...');
    
    // Check if table exists
    const tables = await sequelize.getQueryInterface().showAllTables();
    console.log('📊 Available tables:', tables);
    
    const tableExists = tables.includes('EquipmentTypes');
    console.log('🔍 EquipmentType table exists:', tableExists);
    
    if (!tableExists) {
      console.log('🔧 Creating EquipmentType table...');
      await EquipmentType.sync({ force: false });
      console.log('✅ EquipmentType table created');
      
      // Add some default equipment types
      const defaultTypes = [
        'Lighting',
        'Sound',
        'Video',
        'Stage Equipment',
        'Rigging',
        'Control Systems'
      ];
      
      for (const typeName of defaultTypes) {
        await EquipmentType.findOrCreate({
          where: { name: typeName },
          defaults: { name: typeName }
        });
      }
      
      console.log('✅ Default equipment types created');
    } else {
      // Test query
      const count = await EquipmentType.count();
      console.log('✅ EquipmentType table accessible, count:', count);
      
      if (count === 0) {
        console.log('🔧 Adding default equipment types...');
        const defaultTypes = [
          'Lighting',
          'Sound',
          'Video',
          'Stage Equipment',
          'Rigging',
          'Control Systems'
        ];
        
        for (const typeName of defaultTypes) {
          await EquipmentType.create({ name: typeName });
        }
        
        console.log('✅ Default equipment types added');
      }
    }
    
  } catch (error) {
    console.error('❌ Error with EquipmentType table:', error);
  } finally {
    process.exit(0);
  }
}

createEquipmentTypesTable();
