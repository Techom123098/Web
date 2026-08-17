const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seeding...');

  // Buat akun Admin
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
    },
  });
  console.log(`✅ Admin user created: ${admin.username} | password: admin123`);

  // Buat contoh produk
  await prisma.product.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Asus ROG Zephyrus G14',
      description: 'Laptop gaming performa tinggi dengan prosesor AMD Ryzen 9.',
      advantages: 'Layar 120Hz, baterai tahan lama, desain tipis dan ringan.',
      specs: 'AMD Ryzen 9 | 16GB RAM | 512GB SSD | RTX 3060',
      laptopCategory: 'Gaming',
      price: 25000000,
      type: 'Laptop',
    },
  });
  console.log('✅ Sample product added: Asus ROG Zephyrus G14');

  // Buat contoh karyawan
  await prisma.employee.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Budi Santoso',
      position: 'Teknisi',
      contact: '08123456789',
    },
  });
  console.log('✅ Sample employee added: Budi Santoso');

  console.log('\n🎉 Seeding finished!');
  console.log('-----------------------------------');
  console.log('Login Admin:');
  console.log('  Username : admin');
  console.log('  Password : admin123');
  console.log('-----------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
