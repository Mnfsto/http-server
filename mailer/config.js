'use strict';
const smtp = {
  host: 'smtp.gmail.com',
  port: 465,
  user: process.env.GOOGLE_USER,
  from: 'no-reply@translation-bureau.org',
  to: 'translation.odesa@gmail.com',
  pass: process.env.GOOGLE_PASS
};

module.exports = smtp;
