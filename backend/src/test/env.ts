// Dedicated database for the test suite — never the dev DB — so tests can
// truncate freely between runs without touching real dev data.
export const TEST_DATABASE_URL = 'postgres://academy:academy@localhost:55432/quixhub_test';
export const TEST_ADMIN_DATABASE_URL = 'postgres://academy:academy@localhost:55432/academy';
