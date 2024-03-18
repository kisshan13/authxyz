import nodemailer from "nodemailer";

import SMTPTransport from "nodemailer/lib/smtp-transport";

export default class Mail {
  transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;
  constructor(transport: SMTPTransport.Options) {
    this.transporter = nodemailer.createTransport(transport);
  }

  async sendMail(mailOptions: nodemailer.SendMailOptions) {
    return this.transporter.sendMail(mailOptions);
  }
}
