import * as fs from "fs";
import * as url from "url";
import path from "path";
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

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
