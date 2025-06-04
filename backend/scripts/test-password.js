const bcrypt = require('bcryptjs');

async function testPassword() {
  const password = 'admin123';
  const hash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
  
  console.log('🔍 Testing password hash...');
  console.log('Password:', password);
  console.log('Hash:', hash);
  
  const isMatch = await bcrypt.compare(password, hash);
  console.log('Match result:', isMatch);
  
  // Also test creating a new hash
  const newHash = await bcrypt.hash(password, 10);
  console.log('New hash for same password:', newHash);
  
  const newMatch = await bcrypt.compare(password, newHash);
  console.log('New hash match:', newMatch);
}

testPassword().catch(console.error);
