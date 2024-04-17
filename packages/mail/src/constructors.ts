export type MailType =
  | "onRegister"
  | "onLogin"
  | "onForgotPassword"
  | "onPasswordChange"
  | "onVerificationSuccess"
  | "onVerificationResend";

export interface MailSendConfig {
  to: string;
  subject: string;
  body: string;
  type: "text" | "html";
}

class MailResponder {
  type: MailType;
  config: MailSendConfig;
  constructor(type: MailType, options: MailSendConfig) {
    this.type = type;
    this.config = options;
  }
}

export default MailResponder;
