import { db } from './src/lib/db';
import { createHash } from 'crypto';

function hashPin(pin: string): string {
  return createHash('sha256').update(pin).digest('hex');
}

async function seed() {
  console.log('Seeding database...');

  const user1 = await db.user.upsert({
    where: { email: 'thabo@example.com' },
    update: {},
    create: {
      fullName: 'Thabo Mokoena',
      email: 'thabo@example.com',
      phone: '+27821234567',
      pin: hashPin('1234'),
    },
  });

  const user2 = await db.user.upsert({
    where: { email: 'lerato@example.com' },
    update: {},
    create: {
      fullName: 'Lerato Nkosi',
      email: 'lerato@example.com',
      phone: '+27829876543',
      pin: hashPin('5678'),
    },
  });

  const card1 = await db.card.upsert({
    where: { cardNumber: '1234567890123456' },
    update: {},
    create: {
      cardNumber: '1234567890123456',
      userId: user1.id,
      balance: 250.00,
      status: 'active',
      type: 'premium',
    },
  });

  const card2 = await db.card.upsert({
    where: { cardNumber: '9876543210987654' },
    update: {},
    create: {
      cardNumber: '9876543210987654',
      userId: user2.id,
      balance: 85.50,
      status: 'active',
      type: 'standard',
    },
  });

  // Create sample tickets for user 1
  const now = Date.now();
  for (const t of [
    { type: 'single', tripsRemaining: 0, price: 12.00, status: 'used', daysAgo: 3 },
    { type: 'multi_ride', tripsRemaining: 7, price: 100.00, status: 'active', daysAgo: 1 },
    { type: 'single', tripsRemaining: 1, price: 12.00, status: 'active', daysAgo: 0 },
  ]) {
    await db.ticket.create({
      data: {
        type: t.type,
        tripsRemaining: t.tripsRemaining,
        price: t.price,
        status: t.status,
        cardId: card1.id,
        createdAt: new Date(now - t.daysAgo * 24 * 60 * 60 * 1000),
      },
    });
  }

  // Create sample trips for user 1
  for (const t of [
    { route: 'Route 101 - Sandton to CBD', from: 'Sandton City', to: 'Park Station', fare: 12.00, hoursAgo: 5 },
    { route: 'Route 202 - Midrand Express', from: 'Midrand', to: 'Marlboro', fare: 15.00, hoursAgo: 24 },
    { route: 'Route 101 - Sandton to CBD', from: 'Park Station', to: 'Sandton City', fare: 12.00, hoursAgo: 32 },
    { route: 'Route 303 - Soweto Link', from: 'Bara', to: 'Vilakazi', fare: 10.00, hoursAgo: 72 },
    { route: 'Route 101 - Sandton to CBD', from: 'Sandton City', to: 'Rosebank', fare: 12.00, hoursAgo: 120 },
  ]) {
    await db.trip.create({
      data: {
        cardId: card1.id,
        route: t.route,
        fromStop: t.from,
        toStop: t.to,
        fare: t.fare,
        timestamp: new Date(now - t.hoursAgo * 60 * 60 * 1000),
      },
    });
  }

  // Create sample transactions for user 1
  for (const t of [
    { type: 'top_up', amount: 200.00, desc: 'Wallet top-up via EFT', daysAgo: 7 },
    { type: 'purchase', amount: 12.00, desc: 'Single Ride Ticket', daysAgo: 3 },
    { type: 'purchase', amount: 100.00, desc: 'Multi-Ride Bundle (10 trips)', daysAgo: 1 },
    { type: 'top_up', amount: 50.00, desc: 'Wallet top-up via card', daysAgo: 2 },
    { type: 'purchase', amount: 12.00, desc: 'Single Ride Ticket', daysAgo: 0 },
  ]) {
    await db.transaction.create({
      data: {
        userId: user1.id,
        type: t.type,
        amount: t.amount,
        description: t.desc,
        createdAt: new Date(now - t.daysAgo * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log('Database seeded successfully!');
  console.log('Demo accounts:');
  console.log('  Card: 1234567890123456 | PIN: 1234 (Thabo Mokoena, Premium)');
  console.log('  Card: 9876543210987654 | PIN: 5678 (Lerato Nkosi, Standard)');

  await db.$disconnect();
}

seed().catch(console.error);
