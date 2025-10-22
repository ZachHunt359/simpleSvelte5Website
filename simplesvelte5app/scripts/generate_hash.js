import bcrypt from 'bcryptjs';

const newPassword = 'V4ld3r4kd359'; // Replace with your desired password
const saltRounds = 10;

bcrypt.hash(newPassword, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    process.exit(1);
  } else {
    console.log('Generated hash:', hash);
    process.exit(0);
  }
});