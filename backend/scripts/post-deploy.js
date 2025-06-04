const { createAdminUser } = require('./create-admin');

// Post-deployment script
async function postDeploy() {
  console.log('🚀 Running post-deployment tasks...');
  
  try {
    // Create admin user
    await createAdminUser();
    
    console.log('✅ Post-deployment tasks completed successfully!');
    
  } catch (error) {
    console.error('❌ Post-deployment tasks failed:', error);
    // Don't exit with error - this is optional
  }
}

// Run if called directly
if (require.main === module) {
  postDeploy()
    .then(() => {
      console.log('🎉 Post-deployment completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Post-deployment failed:', error);
      process.exit(0); // Don't fail deployment
    });
}

module.exports = { postDeploy };
