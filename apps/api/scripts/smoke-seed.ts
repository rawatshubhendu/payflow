import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../src/models/User.js';
import { Business } from '../src/models/Business.js';
import { Customer } from '../src/models/Customer.js';
import { createSessionToken } from '../src/lib/session.js';

const uri = process.env.MONGODB_URI!;
await mongoose.connect(uri);
await mongoose.connection.dropDatabase();

const user = await User.create({
  email: `smoke-${randomBytes(4).toString('hex')}@example.com`,
  passwordHash: await bcrypt.hash('TestPass123!', 12),
  emailVerifiedAt: new Date(),
});

const business = await Business.create({
  ownerId: user._id,
  name: 'Smoke Studio',
  currency: 'INR',
  invoicePrefix: 'INV-',
});

const customer = await Customer.create({
  businessId: business._id,
  name: 'Ravi Kumar',
  email: 'ravi@example.com',
  company: 'Ravi Designs',
});

const token = createSessionToken(user._id.toString());
console.log(JSON.stringify({ token, businessId: business._id.toString(), customerId: customer._id.toString() }));

await mongoose.disconnect();