'use strict';
const nodemailer = require('nodemailer');
const smtp = require('./config');

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  host: smtp.host,
  port: smtp.port,
  auth: {
    user: smtp.user,
    pass: smtp.pass
  }
}, {
  from: `"Email form " <${smtp.from}>`,
});

const mailer = (message) => {
  // eslint-disable-next-line consistent-return
  transporter.sendMail(message, (err, info) => {
    if (err) return console.log(err);
    console.log('Email sent:', info);
  });
};

module.exports = mailer;
