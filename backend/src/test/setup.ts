import { TEST_DATABASE_URL } from './env.js';

// Runs before each test file's own imports resolve, so db/client.ts picks up
// the test database instead of throwing on a missing DATABASE_URL.
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.FEEDBACK_SALT = 'test-salt-not-for-real-use';
process.env.JWT_SECRET = 'test-jwt-secret';
