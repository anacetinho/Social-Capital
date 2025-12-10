const pool = require('../connection');
const bcrypt = require('bcryptjs'); // Note: using bcryptjs for ARM64 compatibility

// Helper to generate random date within range
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper to pick random item from array
function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Realistic name pools
const firstNames = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Barbara', 'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Christopher', 'Karen', 'Charles', 'Lisa', 'Daniel', 'Nancy',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Kimberly', 'Andrew', 'Emily', 'Paul', 'Donna', 'Joshua', 'Michelle',
  'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa', 'Timothy', 'Deborah',
  'Ronald', 'Stephanie', 'Jason', 'Dorothy', 'Edward', 'Rebecca', 'Jeffrey', 'Sharon',
  'Ryan', 'Laura', 'Jacob', 'Cynthia', 'Gary', 'Kathleen', 'Nicholas', 'Amy',
  'Eric', 'Angela', 'Jonathan', 'Shirley', 'Stephen', 'Anna', 'Larry', 'Brenda',
  'Justin', 'Pamela', 'Scott', 'Emma', 'Brandon', 'Nicole', 'Benjamin', 'Helen',
  'Samuel', 'Samantha', 'Raymond', 'Katherine', 'Gregory', 'Christine', 'Alexander', 'Debra',
  'Patrick', 'Rachel', 'Frank', 'Carolyn', 'Jack', 'Janet', 'Dennis', 'Catherine',
  'Jerry', 'Maria', 'Tyler', 'Heather', 'Aaron', 'Diane', 'Jose', 'Ruth',
  'Adam', 'Julie', 'Nathan', 'Olivia', 'Henry', 'Joyce', 'Douglas', 'Virginia',
  'Zachary', 'Victoria', 'Peter', 'Kelly', 'Kyle', 'Lauren', 'Noah', 'Christina',
  'Ethan', 'Joan', 'Jeremy', 'Evelyn', 'Walter', 'Judith', 'Christian', 'Megan',
  'Keith', 'Andrea', 'Roger', 'Cheryl', 'Terry', 'Hannah', 'Austin', 'Jacqueline',
  'Sean', 'Martha', 'Gerald', 'Madison', 'Carl', 'Teresa', 'Harold', 'Gloria'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
  'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
  'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker',
  'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy',
  'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson', 'Bailey',
  'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson'
];

const companies = [
  'Google', 'Microsoft', 'Amazon', 'Apple', 'Meta', 'Netflix', 'Tesla', 'IBM',
  'Oracle', 'Salesforce', 'Adobe', 'Intel', 'Cisco', 'SAP', 'Dell', 'HP',
  'Accenture', 'Deloitte', 'McKinsey', 'BCG', 'Goldman Sachs', 'JPMorgan', 'Morgan Stanley',
  'Local Startup Inc', 'City Hospital', 'State University', 'Downtown Law Firm',
  'Regional Bank', 'Community Services', 'Tech Consulting LLC'
];

const positions = [
  'Software Engineer', 'Senior Engineer', 'Engineering Manager', 'Product Manager',
  'Designer', 'Data Scientist', 'Sales Manager', 'Marketing Director', 'CEO',
  'CTO', 'VP Engineering', 'Consultant', 'Analyst', 'Accountant', 'Attorney',
  'Doctor', 'Nurse', 'Teacher', 'Professor', 'Researcher', 'Architect'
];

const eventTypes = [
  'Coffee', 'Lunch', 'Dinner', 'Phone Call', 'Video Call', 'Party', 'Wedding',
  'Birthday', 'Conference', 'Workshop', 'Networking Event', 'Sports Game',
  'Concert', 'Movie', 'Hike', 'Beach Day', 'Game Night', 'Book Club'
];

const assetTypes = ['Skill', 'Equipment', 'Property', 'Knowledge', 'Connection'];

async function seedDemoData() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🌱 Seeding demo data...\n');

    // Create demo user
    const demoEmail = 'demo@socialcapital.local';
    const demoPassword = 'demo123';
    const passwordHash = await bcrypt.hash(demoPassword, 10);

    console.log('  Creating demo user...');
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, preferences)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash
       RETURNING id`,
      [demoEmail, passwordHash, JSON.stringify({ theme: 'light', notifications: true })]
    );
    const userId = userResult.rows[0].id;
    console.log(`  ✓ User created: ${demoEmail} / ${demoPassword}`);

    // Generate 165 people
    console.log('\n  Generating 165 people...');
    const peopleIds = [];
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    for (let i = 0; i < 165; i++) {
      const firstName = randomPick(firstNames);
      const lastName = randomPick(lastNames);
      const name = `${firstName} ${lastName}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
      const importance = Math.floor(Math.random() * 5) + 1; // 1-5
      const birthday = Math.random() > 0.3 ? randomDate(new Date(1960, 0, 1), new Date(2000, 11, 31)) : null;

      const personResult = await client.query(
        `INSERT INTO people (user_id, name, email, phone, importance, birthday, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          userId,
          name,
          email,
          Math.random() > 0.5 ? `+1-555-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}` : null,
          importance,
          birthday,
          Math.random() > 0.7 ? `Met through ${randomPick(['work', 'college', 'mutual friend', 'conference', 'online'])}` : null
        ]
      );

      peopleIds.push(personResult.rows[0].id);
    }
    console.log(`  ✓ Created ${peopleIds.length} people`);

    // Generate professional history (70% of people have 1-3 jobs)
    console.log('\n  Generating professional history...');
    let profHistoryCount = 0;
    for (const personId of peopleIds) {
      if (Math.random() > 0.3) {
        const numJobs = Math.floor(Math.random() * 3) + 1;
        let currentDate = new Date();
        currentDate.setFullYear(currentDate.getFullYear() - (numJobs * 2 + 2));

        for (let j = 0; j < numJobs; j++) {
          const isCurrentJob = j === numJobs - 1 && Math.random() > 0.3;
          const startDate = new Date(currentDate);
          const endDate = isCurrentJob ? null : new Date(startDate.getTime() + (Math.random() * 730 + 365) * 24 * 60 * 60 * 1000);

          await client.query(
            `INSERT INTO professional_history (person_id, company, position, start_date, end_date)
             VALUES ($1, $2, $3, $4, $5)`,
            [personId, randomPick(companies), randomPick(positions), startDate, endDate]
          );

          profHistoryCount++;
          if (endDate) currentDate = endDate;
        }
      }
    }
    console.log(`  ✓ Created ${profHistoryCount} professional history entries`);

    // Generate relationships (family clusters, friend groups, colleagues)
    console.log('\n  Generating relationships...');
    let relationshipCount = 0;

    // Create 20 family clusters (3-6 people each)
    for (let i = 0; i < 20; i++) {
      const clusterSize = Math.floor(Math.random() * 4) + 3;
      const clusterStart = Math.floor(Math.random() * (peopleIds.length - clusterSize));
      const cluster = peopleIds.slice(clusterStart, clusterStart + clusterSize);

      for (let j = 0; j < cluster.length; j++) {
        for (let k = j + 1; k < cluster.length; k++) {
          await client.query(
            `INSERT INTO relationships (user_id, person_a_id, person_b_id, relationship_type, strength, context)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, cluster[j], cluster[k], 'family', 5, 'Family member']
          );
          relationshipCount++;
        }
      }
    }

    // Create random friendships and colleague relationships
    for (let i = 0; i < 300; i++) {
      const personA = randomPick(peopleIds);
      const personB = randomPick(peopleIds.filter(id => id !== personA));
      const relType = randomPick(['friend', 'colleague', 'acquaintance']);
      const strength = relType === 'friend' ? Math.floor(Math.random() * 2) + 4 : Math.floor(Math.random() * 3) + 2;

      // Avoid duplicates
      const existing = await client.query(
        `SELECT id FROM relationships
         WHERE user_id = $1 AND (
           (person_a_id = $2 AND person_b_id = $3) OR
           (person_a_id = $3 AND person_b_id = $2)
         )`,
        [userId, personA, personB]
      );

      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO relationships (user_id, person_a_id, person_b_id, relationship_type, strength)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, personA, personB, relType, strength]
        );
        relationshipCount++;
      }
    }
    console.log(`  ✓ Created ${relationshipCount} relationships`);

    // Generate events (last 2 years, 400+ events)
    console.log('\n  Generating events...');
    let eventCount = 0;
    const now = new Date();

    for (let i = 0; i < 450; i++) {
      const eventDate = randomDate(twoYearsAgo, now);
      const eventType = randomPick(eventTypes);
      const numParticipants = Math.floor(Math.random() * 8) + 2; // 2-10 participants

      const eventResult = await client.query(
        `INSERT INTO events (user_id, title, description, location, date, event_type)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          userId,
          eventType,
          `${eventType} with friends`,
          randomPick(['Home', 'Office', 'Restaurant', 'Park', 'Coffee Shop', 'Bar', 'Online']),
          eventDate,
          eventType
        ]
      );

      const eventId = eventResult.rows[0].id;

      // Add participants
      const participants = [];
      for (let j = 0; j < numParticipants; j++) {
        const personId = randomPick(peopleIds);
        if (!participants.includes(personId)) {
          participants.push(personId);
          await client.query(
            `INSERT INTO event_participants (event_id, person_id) VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [eventId, personId]
          );
        }
      }

      eventCount++;
    }
    console.log(`  ✓ Created ${eventCount} events`);

    // Generate favors (100 favors with reciprocity patterns)
    console.log('\n  Generating favors...');
    let favorCount = 0;

    for (let i = 0; i < 100; i++) {
      const giver = randomPick(peopleIds);
      const receiver = randomPick(peopleIds.filter(id => id !== giver));
      const favorDate = randomDate(twoYearsAgo, now);
      const status = randomPick(['completed', 'completed', 'completed', 'pending']);
      const descriptions = [
        'Helped with resume review',
        'Made an introduction to hiring manager',
        'Provided career advice',
        'Lent tools for home repair',
        'Helped with moving',
        'Provided technical advice',
        'Made business introduction',
        'Reviewed contract',
        'Gave presentation feedback',
        'Connected to potential client'
      ];

      await client.query(
        `INSERT INTO favors (user_id, giver_id, receiver_id, description, date, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, giver, receiver, randomPick(descriptions), favorDate, status]
      );

      favorCount++;
    }
    console.log(`  ✓ Created ${favorCount} favors`);

    // Generate assets (80 assets of various types)
    console.log('\n  Generating assets...');
    let assetCount = 0;

    const assetExamples = {
      Skill: ['Python Programming', 'Public Speaking', 'Graphic Design', 'Project Management'],
      Equipment: ['Camera Equipment', 'Power Tools', 'Party Supplies', 'Camping Gear'],
      Property: ['Beach House', 'Cabin', 'Parking Space', 'Studio Space'],
      Knowledge: ['Tax Law', 'Real Estate', 'Marketing Strategy', 'Web Development'],
      Connection: ['VC Network', 'Media Contacts', 'Legal Advisors', 'Industry Experts']
    };

    for (let i = 0; i < 80; i++) {
      const owner = randomPick(peopleIds);
      const type = randomPick(assetTypes);
      const name = randomPick(assetExamples[type]);

      await client.query(
        `INSERT INTO assets (user_id, owner_id, asset_type, name, description, availability)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          owner,
          type,
          name,
          `${name} available for network`,
          randomPick(['Available', 'Limited', 'By Request'])
        ]
      );

      assetCount++;
    }
    console.log(`  ✓ Created ${assetCount} assets`);

    await client.query('COMMIT');

    console.log('\n✅ Demo data seeded successfully!\n');
    console.log('  📧 Email: ' + demoEmail);
    console.log('  🔑 Password: ' + demoPassword);
    console.log('  👥 People: ' + peopleIds.length);
    console.log('  💼 Professional History: ' + profHistoryCount);
    console.log('  🤝 Relationships: ' + relationshipCount);
    console.log('  📅 Events: ' + eventCount);
    console.log('  🎁 Favors: ' + favorCount);
    console.log('  🏆 Assets: ' + assetCount);
    console.log('');

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    pool.end();
  }
}

seedDemoData()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  });
