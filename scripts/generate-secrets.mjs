import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import readline from "node:readline/promises";

const scrypt = promisify(scryptCallback);
const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
const password = await prompt.question("请输入你要设置的工作台固定密码（只在本机显示）：");
prompt.close();

if (password.length < 8) {
  throw new Error("密码至少需要 8 个字符。");
}

const salt = randomBytes(16).toString("base64url");
const derived = await scrypt(password, salt, 64);
console.log("\nAPP_PASSWORD_HASH=scrypt$" + salt + "$" + Buffer.from(derived).toString("base64url"));
console.log("SESSION_SECRET=" + randomBytes(32).toString("base64url"));
