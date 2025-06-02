const { Location, Equipment } = require('./server/models');

async function checkLocations() {
  try {
    console.log('Checking locations in the database...');
    const locations = await Location.findAll();
    console.log(`Found ${locations.length} locations:`);

    for (const location of locations) {
      console.log(`- ID: ${location.id}, Name: ${location.name}, City: ${location.city}`);
    }

    console.log('\nChecking equipment with location_id...');
    const equipmentWithLocation = await Equipment.findAll({
      include: [
        {
          model: Location,
          as: 'locationDetails'
        }
      ]
    });

    console.log(`Found ${equipmentWithLocation.length} equipment items with location_id:`);
    for (const equipment of equipmentWithLocation) {
      console.log(`- ID: ${equipment.id}, Type: ${equipment.type}, Location ID: ${equipment.location_id}`);
      console.log(`  Location field: ${equipment.location}`);
      console.log(`  Location details: ${equipment.locationDetails ? equipment.locationDetails.name : 'Not found'}`);
    }

  } catch (error) {
    console.error('Error checking locations:', error);
  }
}

checkLocations();
