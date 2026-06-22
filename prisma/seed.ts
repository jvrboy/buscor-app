import { db } from '../src/lib/db';
import { hashPin } from '../src/lib/auth';
import { ROUTE_FARES, TICKET_CONFIG } from '../src/lib/constants';

async function main() {
  console.log('🌱 Starting comprehensive seed...');

  // ─── Clear existing data in correct order ───
  console.log('🗑️  Clearing existing data...');
  await db.notification.deleteMany();
  await db.tapToken.deleteMany();
  await db.trip.deleteMany();
  await db.ticket.deleteMany();
  await db.transaction.deleteMany();
  await db.card.deleteMany();
  await db.user.deleteMany();
  console.log('✅ All existing data cleared.');

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

  // Helper: days ago
  const daysAgo = (days: number, hour = 8, minute = 0) => {
    const d = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  // ─── Route data shortcuts ───
  const route101 = ROUTE_FARES['route-101'];
  const route202 = ROUTE_FARES['route-202'];
  const route303 = ROUTE_FARES['route-303'];
  const route404 = ROUTE_FARES['route-404'];
  const route505 = ROUTE_FARES['route-505'];
  const route606 = ROUTE_FARES['route-606'];
  const route707 = ROUTE_FARES['route-707'];

  // ═══════════════════════════════════════════
  // USER 1: Thabo Molefe (Premium)
  // ═══════════════════════════════════════════
  console.log('👤 Creating user: Thabo Molefe...');
  const thabo = await db.user.create({
    data: {
      fullName: 'Thabo Molefe',
      email: 'thabo@buscor.co.za',
      phone: '+27 82 123 4567',
      pin: hashPin('1234'),
      loginAttempts: 0,
      lastLoginAt: oneHourAgo,
      cards: {
        create: {
          cardNumber: '4521883377449901',
          balance: 250.0,
          status: 'active',
          type: 'premium',
        },
      },
    },
    include: { cards: true },
  });

  const thaboCard = thabo.cards[0];

  // Thabo tickets: 2 active + 1 expired single
  console.log('🎫 Creating tickets for Thabo...');
  const thaboExpiredTicket = await db.ticket.create({
    data: {
      type: 'single',
      tripsRemaining: 0,
      price: TICKET_CONFIG.single.price,
      status: 'expired',
      cardId: thaboCard.id,
      createdAt: daysAgo(12),
    },
  });

  const thaboMultiRide = await db.ticket.create({
    data: {
      type: 'multi_ride',
      tripsRemaining: 7,
      price: TICKET_CONFIG.multi_ride.price,
      status: 'active',
      cardId: thaboCard.id,
      createdAt: daysAgo(4),
    },
  });

  const thaboWeekly = await db.ticket.create({
    data: {
      type: 'weekly',
      tripsRemaining: TICKET_CONFIG.weekly.trips,
      price: TICKET_CONFIG.weekly.price,
      status: 'active',
      expiresAt: fiveDaysFromNow,
      cardId: thaboCard.id,
      createdAt: daysAgo(2),
    },
  });

  // Thabo trips: 5 trips across last 2 weeks
  console.log('🚌 Creating trips for Thabo...');
  await db.trip.createMany({
    data: [
      {
        cardId: thaboCard.id,
        route: route101.name,
        routeId: 'route-101',
        fromStop: route101.from,
        toStop: route101.to,
        fare: route101.fare,
        timestamp: daysAgo(13, 7, 15),
        ticketId: null,
      },
      {
        cardId: thaboCard.id,
        route: route202.name,
        routeId: 'route-202',
        fromStop: route202.from,
        toStop: route202.to,
        fare: route202.fare,
        timestamp: daysAgo(10, 8, 30),
        ticketId: null,
      },
      {
        cardId: thaboCard.id,
        route: route404.name,
        routeId: 'route-404',
        fromStop: route404.from,
        toStop: route404.to,
        fare: route404.fare,
        timestamp: daysAgo(7, 17, 45),
        ticketId: null,
      },
      {
        cardId: thaboCard.id,
        route: route707.name,
        routeId: 'route-707',
        fromStop: route707.from,
        toStop: route707.to,
        fare: route707.fare,
        timestamp: daysAgo(4, 6, 0),
        ticketId: null,
      },
      {
        cardId: thaboCard.id,
        route: route606.name,
        routeId: 'route-606',
        fromStop: route606.from,
        toStop: route606.to,
        fare: route606.fare,
        timestamp: daysAgo(1, 8, 20),
        ticketId: null,
      },
    ],
  });

  // Thabo transactions: 2 top-ups, 1 ticket purchase
  console.log('💰 Creating transactions for Thabo...');
  await db.transaction.createMany({
    data: [
      {
        userId: thabo.id,
        type: 'top_up',
        amount: 200.0,
        description: 'Wallet top-up via EFT',
        createdAt: daysAgo(14, 9, 0),
      },
      {
        userId: thabo.id,
        type: 'purchase',
        amount: TICKET_CONFIG.multi_ride.price,
        description: 'Purchased Multi-Ride Bundle (10 trips)',
        createdAt: daysAgo(4, 10, 30),
      },
      {
        userId: thabo.id,
        type: 'top_up',
        amount: 100.0,
        description: 'Wallet top-up via card payment',
        createdAt: daysAgo(2, 14, 15),
      },
    ],
  });

  // Thabo notification: low_balance
  console.log('🔔 Creating notification for Thabo...');
  await db.notification.create({
    data: {
      userId: thabo.id,
      type: 'low_balance',
      title: 'Low Balance Warning',
      message: 'Your card balance is running low. Top up to avoid interruptions.',
      read: false,
      createdAt: daysAgo(1, 12, 0),
    },
  });

  // ═══════════════════════════════════════════
  // USER 2: Lerato Nkosi (Standard)
  // ═══════════════════════════════════════════
  console.log('👤 Creating user: Lerato Nkosi...');
  const lerato = await db.user.create({
    data: {
      fullName: 'Lerato Nkosi',
      email: 'lerato@buscor.co.za',
      phone: '+27 83 987 6543',
      pin: hashPin('5678'),
      loginAttempts: 0,
      lastLoginAt: oneDayAgo,
      cards: {
        create: {
          cardNumber: '6789123456781234',
          balance: 85.5,
          status: 'active',
          type: 'standard',
        },
      },
    },
    include: { cards: true },
  });

  const leratoCard = lerato.cards[0];

  // Lerato tickets: 1 active single
  console.log('🎫 Creating tickets for Lerato...');
  const leratoSingle = await db.ticket.create({
    data: {
      type: 'single',
      tripsRemaining: 1,
      price: TICKET_CONFIG.single.price,
      status: 'active',
      cardId: leratoCard.id,
      createdAt: daysAgo(1),
    },
  });

  // Lerato trips: 3 trips
  console.log('🚌 Creating trips for Lerato...');
  await db.trip.createMany({
    data: [
      {
        cardId: leratoCard.id,
        route: route303.name,
        routeId: 'route-303',
        fromStop: route303.from,
        toStop: route303.to,
        fare: route303.fare,
        timestamp: daysAgo(9, 6, 45),
        ticketId: null,
      },
      {
        cardId: leratoCard.id,
        route: route505.name,
        routeId: 'route-505',
        fromStop: route505.from,
        toStop: route505.to,
        fare: route505.fare,
        timestamp: daysAgo(5, 7, 30),
        ticketId: null,
      },
      {
        cardId: leratoCard.id,
        route: route101.name,
        routeId: 'route-101',
        fromStop: route101.from,
        toStop: route101.to,
        fare: route101.fare,
        timestamp: daysAgo(2, 18, 10),
        ticketId: null,
      },
    ],
  });

  // Lerato transactions: 2 transactions
  console.log('💰 Creating transactions for Lerato...');
  await db.transaction.createMany({
    data: [
      {
        userId: lerato.id,
        type: 'top_up',
        amount: 50.0,
        description: 'Wallet top-up via EFT',
        createdAt: daysAgo(10, 8, 0),
      },
      {
        userId: lerato.id,
        type: 'purchase',
        amount: TICKET_CONFIG.single.price,
        description: 'Purchased Single Ride ticket',
        createdAt: daysAgo(1, 12, 0),
      },
    ],
  });

  // Lerato notification: welcome
  console.log('🔔 Creating notification for Lerato...');
  await db.notification.create({
    data: {
      userId: lerato.id,
      type: 'topup_success',
      title: 'Welcome to Buscor!',
      message: 'Your account has been created successfully. Top up your card to start riding!',
      read: true,
      createdAt: daysAgo(10, 8, 1),
    },
  });

  // ═══════════════════════════════════════════
  // USER 3: Sipho Dlamini (Student)
  // ═══════════════════════════════════════════
  console.log('👤 Creating user: Sipho Dlamini...');
  const sipho = await db.user.create({
    data: {
      fullName: 'Sipho Dlamini',
      email: 'sipho@buscor.co.za',
      phone: '+27 71 555 1234',
      pin: hashPin('4321'),
      loginAttempts: 0,
      lastLoginAt: threeDaysAgo,
      cards: {
        create: {
          cardNumber: '3456789012345678',
          balance: 42.0,
          status: 'active',
          type: 'student',
        },
      },
    },
    include: { cards: true },
  });

  const siphoCard = sipho.cards[0];

  // Sipho tickets: 1 expired multi_ride, 1 active single
  console.log('🎫 Creating tickets for Sipho...');
  await db.ticket.create({
    data: {
      type: 'multi_ride',
      tripsRemaining: 0,
      price: TICKET_CONFIG.multi_ride.price,
      status: 'expired',
      cardId: siphoCard.id,
      createdAt: daysAgo(13),
    },
  });

  await db.ticket.create({
    data: {
      type: 'single',
      tripsRemaining: 1,
      price: TICKET_CONFIG.single.price,
      status: 'active',
      cardId: siphoCard.id,
      createdAt: daysAgo(1),
    },
  });

  // Sipho trips: 8 trips (frequent rider)
  console.log('🚌 Creating trips for Sipho...');
  await db.trip.createMany({
    data: [
      {
        cardId: siphoCard.id,
        route: route303.name,
        routeId: 'route-303',
        fromStop: route303.from,
        toStop: route303.to,
        fare: route303.fare,
        timestamp: daysAgo(14, 6, 30),
        ticketId: null,
      },
      {
        cardId: siphoCard.id,
        route: route303.name,
        routeId: 'route-303',
        fromStop: route303.from,
        toStop: route303.to,
        fare: route303.fare,
        timestamp: daysAgo(12, 7, 0),
        ticketId: null,
      },
      {
        cardId: siphoCard.id,
        route: route303.name,
        routeId: 'route-303',
        fromStop: route303.from,
        toStop: route303.to,
        fare: route303.fare,
        timestamp: daysAgo(11, 7, 15),
        ticketId: null,
      },
      {
        cardId: siphoCard.id,
        route: route505.name,
        routeId: 'route-505',
        fromStop: route505.from,
        toStop: route505.to,
        fare: route505.fare,
        timestamp: daysAgo(9, 8, 0),
        ticketId: null,
      },
      {
        cardId: siphoCard.id,
        route: route606.name,
        routeId: 'route-606',
        fromStop: route606.from,
        toStop: route606.to,
        fare: route606.fare,
        timestamp: daysAgo(7, 6, 45),
        ticketId: null,
      },
      {
        cardId: siphoCard.id,
        route: route303.name,
        routeId: 'route-303',
        fromStop: route303.from,
        toStop: route303.to,
        fare: route303.fare,
        timestamp: daysAgo(5, 7, 30),
        ticketId: null,
      },
      {
        cardId: siphoCard.id,
        route: route202.name,
        routeId: 'route-202',
        fromStop: route202.from,
        toStop: route202.to,
        fare: route202.fare,
        timestamp: daysAgo(3, 8, 15),
        ticketId: null,
      },
      {
        cardId: siphoCard.id,
        route: route101.name,
        routeId: 'route-101',
        fromStop: route101.from,
        toStop: route101.to,
        fare: route101.fare,
        timestamp: daysAgo(1, 7, 0),
        ticketId: null,
      },
    ],
  });

  // Sipho transactions: 4 transactions
  console.log('💰 Creating transactions for Sipho...');
  await db.transaction.createMany({
    data: [
      {
        userId: sipho.id,
        type: 'top_up',
        amount: 100.0,
        description: 'Wallet top-up via EFT',
        createdAt: daysAgo(14, 9, 0),
      },
      {
        userId: sipho.id,
        type: 'purchase',
        amount: TICKET_CONFIG.multi_ride.price,
        description: 'Purchased Multi-Ride Bundle (10 trips)',
        createdAt: daysAgo(13, 9, 30),
      },
      {
        userId: sipho.id,
        type: 'top_up',
        amount: 50.0,
        description: 'Wallet top-up via card payment',
        createdAt: daysAgo(6, 10, 0),
      },
      {
        userId: sipho.id,
        type: 'purchase',
        amount: TICKET_CONFIG.single.price,
        description: 'Purchased Single Ride ticket',
        createdAt: daysAgo(1, 7, 15),
      },
    ],
  });

  // ─── Summary ───
  const fmtCard = (n: string) => n.replace(/(.{4})/g, '$1 ').trim();
  console.log('\n' + '═'.repeat(60));
  console.log('✅ Seed completed successfully!\n');
  console.log('📋 Demo Accounts:\n');
  console.log('  1. Thabo Molefe (Premium)');
  console.log('     Card: ' + fmtCard(thaboCard.cardNumber));
  console.log('     PIN:  1234');
  console.log('     Balance: R' + thaboCard.balance.toFixed(2) + '\n');
  console.log('  2. Lerato Nkosi (Standard)');
  console.log('     Card: ' + fmtCard(leratoCard.cardNumber));
  console.log('     PIN:  5678');
  console.log('     Balance: R' + leratoCard.balance.toFixed(2) + '\n');
  console.log('  3. Sipho Dlamini (Student)');
  console.log('     Card: ' + fmtCard(siphoCard.cardNumber));
  console.log('     PIN:  4321');
  console.log('     Balance: R' + siphoCard.balance.toFixed(2) + '\n');
  console.log('═'.repeat(60));
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });