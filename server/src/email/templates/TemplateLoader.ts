import * as fs from "fs";
import path from "path";

export class EmailTemplates {
  static get Registration() {
    const templatePath = path.join(__dirname, "./invitation.html");
    const template = fs.readFileSync(templatePath);
    return template.toString();
  }

  static get PasswordReset() {
    const templatePath = path.join(__dirname, "./password-reset.html");
    const template = fs.readFileSync(templatePath);
    return template.toString();
  }

  static get PasswordResetConfirmation() {
    const templatePath = path.join(__dirname, "./password-reset-confirmation.html");
    const template = fs.readFileSync(templatePath);
    return template.toString();
  }
}
