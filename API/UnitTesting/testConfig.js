// Configuration for test environment
module.exports = {
  apiBaseUrl: process.env.TEST_API_URL || `http://${process.env.DATABASE_HOST || 'localhost'}:${process.env.PORT || 5000}`,
};
