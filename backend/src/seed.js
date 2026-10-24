import bcrypt from 'bcryptjs';
import { db, initDb } from './config/db.js';

initDb();

export function seedDatabase() {
  console.log('Seeding FoodBridge AI database with demo data...');

  // Clear existing demo records
  db.exec(`
    DELETE FROM collection_records;
    DELETE FROM reservations;
    DELETE FROM allocations;
    DELETE FROM notifications;
    DELETE FROM reports;
    DELETE FROM activity_log;
    DELETE FROM donations WHERE is_demo = 1;
    DELETE FROM food_requests WHERE is_demo = 1;
    DELETE FROM users WHERE is_demo = 1;
  `);

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('demo123', salt);
  const now = new Date();
  const nowIso = now.toISOString();

  // 1. Create Demo Users
  const userInsert = db.prepare(`
    INSERT INTO users (name, email, password_hash, phone, district, area, org_type, bio, is_demo, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  // Demo User 1: Donor A (Restaurant in Kakkanad)
  const donorA_res = userInsert.run(
    "Anjali's Kitchen",
    'anjali@foodbridge.demo',
    passwordHash,
    '+91 98470 12345',
    'Ernakulam',
    'Kakkanad',
    'restaurant',
    'Authentic homestyle Kerala meals & vegetarian delicacies.',
    nowIso,
    nowIso
  );
  const donorA_id = Number(donorA_res.lastInsertRowid);

  // Demo User 2: Donor B (Bakery in Kakkanad)
  const donorB_res = userInsert.run(
    'Malabar Bakers & Cafe',
    'malabar@foodbridge.demo',
    passwordHash,
    '+91 98470 23456',
    'Ernakulam',
    'Kakkanad',
    'bakery',
    'Artisan bakeries and fresh hot meals.',
    nowIso,
    nowIso
  );
  const donorB_id = Number(donorB_res.lastInsertRowid);

  // Demo User 3: Donor C (Hostel in Kakkanad)
  const donorC_res = userInsert.run(
    'Green Valley Student Hostel',
    'greenvalley@foodbridge.demo',
    passwordHash,
    '+91 98470 34567',
    'Ernakulam',
    'Kakkanad',
    'hostel',
    'College hostel cafeteria with daily hygienic lunch surplus.',
    nowIso,
    nowIso
  );
  const donorC_id = Number(donorC_res.lastInsertRowid);

  // Demo User 4: Recipient (Community Kitchen in Kakkanad)
  const recipientSneha_res = userInsert.run(
    'Sneha Bhavan Community Kitchen',
    'sneha@foodbridge.demo',
    passwordHash,
    '+91 98470 45678',
    'Ernakulam',
    'Kakkanad',
    'community_kitchen',
    'Providing warm evening meals to daily wage labourers and underprivileged families.',
    nowIso,
    nowIso
  );
  const recipientSneha_id = Number(recipientSneha_res.lastInsertRowid);

  // Demo User 5: Recipient (Individual in Edappally)
  const recipientRahul_res = userInsert.run(
    'Rahul Nair',
    'rahul@foodbridge.demo',
    passwordHash,
    '+91 98470 56789',
    'Ernakulam',
    'Edappally',
    'individual',
    'Individual coordinating meals for elderly neighbours in Edappally.',
    nowIso,
    nowIso
  );
  const recipientRahul_id = Number(recipientRahul_res.lastInsertRowid);

  // Demo User 6: Donor in Thiruvananthapuram (Cross-district test)
  const donorTvpm_res = userInsert.run(
    'Technopark Cafeteria',
    'techno@foodbridge.demo',
    passwordHash,
    '+91 98470 67890',
    'Thiruvananthapuram',
    'Technopark',
    'cafeteria',
    'Tech park food court surplus.',
    nowIso,
    nowIso
  );
  const donorTvpm_id = Number(donorTvpm_res.lastInsertRowid);

  // 2. Insert Donations (Demo flow: Donor A 20, Donor B 15, Donor C 15 in Kakkanad)
  const donationInsert = db.prepare(`
    INSERT INTO donations (
      donor_id, title, description, category, quantity, unit,
      dietary_class, declared_allergens, has_unknown_allergens,
      preparation_time, storage_info, district, area,
      available_from, collection_deadline, image_url, donor_reference,
      available_quantity, reserved_quantity, collected_quantity,
      status, is_demo, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, 0, 0,
      'Available', 1, ?, ?
    )
  `);

  // Donor A: 20 vegetarian portions
  const donA_deadline = new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString();
  const donA = donationInsert.run(
    donorA_id,
    'Vegetable Pulao & Dal Tadka',
    'Freshly cooked aromatic basmati pulao with mild yellow dal. Packed in hygienic food containers.',
    'cooked_meals',
    20,
    'portions',
    'vegetarian',
    JSON.stringify([]),
    0,
    'Freshly prepared at 1:00 PM',
    'hot_held',
    'Ernakulam',
    'Kakkanad',
    nowIso,
    donA_deadline,
    null,
    'AK-2026-001',
    20,
    nowIso,
    nowIso
  );
  const donA_id = Number(donA.lastInsertRowid);

  // Donor B: 15 vegetarian portions
  const donB_deadline = new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString();
  const donB = donationInsert.run(
    donorB_id,
    'Fresh Wheat Chapatis & Mixed Veg Kurma',
    'Soft tawa chapatis with rich vegetable coconut kurma.',
    'cooked_meals',
    15,
    'portions',
    'vegetarian',
    JSON.stringify(['gluten']),
    0,
    'Packed at 2:00 PM',
    'ambient',
    'Ernakulam',
    'Kakkanad',
    nowIso,
    donB_deadline,
    null,
    'MB-2026-042',
    15,
    nowIso,
    nowIso
  );
  const donB_id = Number(donB.lastInsertRowid);

  // Donor C: 15 vegetarian portions
  const donC_deadline = new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString();
  const donC = donationInsert.run(
    donorC_id,
    'Steamed Rice, Sambar & Cabbage Thoran',
    'Nutritious hostel lunch surplus. Clean and safe handling guaranteed.',
    'cooked_meals',
    15,
    'portions',
    'vegetarian',
    JSON.stringify([]),
    0,
    'Prepared at 12:30 PM',
    'hot_held',
    'Ernakulam',
    'Kakkanad',
    nowIso,
    donC_deadline,
    null,
    'GV-2026-108',
    15,
    nowIso,
    nowIso
  );
  const donC_id = Number(donC.lastInsertRowid);

  // Extra Donation: Incompatible unit (kg) in Kakkanad to test unit filtering
  const donKg_deadline = new Date(now.getTime() + 10 * 60 * 60 * 1000).toISOString();
  donationInsert.run(
    donorA_id,
    'Raw Vegetable Surplus (Carrots & Potatoes)',
    'Uncut, clean raw farm produce available for cooking.',
    'raw_produce',
    25,
    'kg',
    'vegan',
    JSON.stringify([]),
    0,
    'Harvested yesterday',
    'ambient',
    'Ernakulam',
    'Kakkanad',
    nowIso,
    donKg_deadline,
    null,
    'AK-RAW-002',
    25,
    nowIso,
    nowIso
  );

  // Extra Donation: In Thiruvananthapuram to test cross-district exclusion
  const donTvpm_deadline = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString();
  donationInsert.run(
    donorTvpm_id,
    'South Indian Thali Meals',
    'Buffet excess meals packed in meal boxes.',
    'cooked_meals',
    30,
    'portions',
    'vegetarian',
    JSON.stringify([]),
    0,
    'Packed at 2:30 PM',
    'hot_held',
    'Thiruvananthapuram',
    'Technopark',
    nowIso,
    donTvpm_deadline,
    null,
    'TP-2026-55',
    30,
    nowIso,
    nowIso
  );

  // 3. Insert Food Requests
  const requestInsert = db.prepare(`
    INSERT INTO food_requests (
      requester_id, title, food_type, quantity, unit,
      dietary_requirements, allergies_to_avoid, district, area,
      needed_by, description, priority,
      reserved_quantity, collected_quantity, outstanding_quantity,
      status, is_demo, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      0, 0, ?,
      'Open', 1, ?, ?
    )
  `);

  // Demo Request: Sneha Bhavan requests 50 vegetarian portions in Kakkanad
  const reqSneha_neededBy = new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString();
  const reqSneha = requestInsert.run(
    recipientSneha_id,
    '50 Vegetarian Evening Meals for Community Distribution',
    'cooked_meals',
    50,
    'portions',
    'vegetarian',
    JSON.stringify([]),
    'Ernakulam',
    'Kakkanad',
    reqSneha_neededBy,
    'Urgent evening food requirement for 50 people at our community shelter.',
    'urgent',
    50,
    nowIso,
    nowIso
  );
  const reqSneha_id = Number(reqSneha.lastInsertRowid);

  // Demo Request 2: Rahul (Individual) requests 8 portions in Edappally (tests fairness boost + travel tag)
  const reqRahul_neededBy = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString();
  requestInsert.run(
    recipientRahul_id,
    '8 Vegetarian Meals for Elderly Neighbours',
    'cooked_meals',
    8,
    'portions',
    'vegetarian',
    JSON.stringify([]),
    'Ernakulam',
    'Edappally',
    reqRahul_neededBy,
    'Meal support for elderly residents living alone in Edappally.',
    'normal',
    8,
    nowIso,
    nowIso
  );

  console.log('Seeding completed successfully!');
  console.log(`Demo Users Created:
  - Donor A: anjali@foodbridge.demo / demo123 (Ernakulam, Kakkanad)
  - Donor B: malabar@foodbridge.demo / demo123 (Ernakulam, Kakkanad)
  - Donor C: greenvalley@foodbridge.demo / demo123 (Ernakulam, Kakkanad)
  - Recipient 1: sneha@foodbridge.demo / demo123 (Ernakulam, Kakkanad, 50 portions need)
  - Recipient 2: rahul@foodbridge.demo / demo123 (Ernakulam, Edappally, individual)
  - Donor Tvpm: techno@foodbridge.demo / demo123 (Thiruvananthapuram)
  `);

  return {
    donorA_id,
    donorB_id,
    donorC_id,
    recipientSneha_id,
    reqSneha_id,
    donA_id,
    donB_id,
    donC_id
  };
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase();
}
