module.exports = {
  port: process.env.PORT || 3001,
  secret: process.env.SECRET_KEY || 'MYSECRET',
  server_url: process.env.SERVER_URL || 'http://localhost:3000'
};
