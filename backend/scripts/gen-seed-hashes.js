const bcrypt = require('bcryptjs');

const seeds = [
  { email: 'admin@profesora.app',  role: 'admin',   pwd: 'admin123' },
  { email: 'maria@profesora.app',  role: 'teacher', pwd: 'teacher123' },
  { email: 'pedro@profesora.app',  role: 'student', pwd: 'student123' },
];

for (const s of seeds) {
  const hash = bcrypt.hashSync(s.pwd, 10);
  // Verificamos inmediatamente que el hash es válido
  const ok = bcrypt.compareSync(s.pwd, hash);
  console.log(`-- ${s.email} (${s.pwd})`);
  console.log(`   ${hash}  [verify=${ok}]`);
}
