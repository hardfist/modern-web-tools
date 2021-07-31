import fs from 'fs';
import readline from 'readline';
import { Scanner } from './scanner';
export class Lox {
  static hadError = false;
  static main(args: string[]) {
    if (args.length > 3) {
      console.log('Usage: lox [script]');
    } else if (args.length === 3) {
      this.runFile(args[2]);
    } else {
      this.runPrompt();
    }
    if (this.hadError) {
      process.exit(65);
    }
  }
  static error(line: number, message: string) {
    this.report(line, '', message);
  }
  static report(line: number, where: string, message: string) {
    console.error(`[line ${line}] Error ${where} : ${message}`);
    this.hadError = true;
  }
  static runFile(filePath: string) {
    const contents = fs.readFileSync(filePath, 'utf-8');
    this.run(contents);
  }
  static async runPrompt() {
    for await (const answer of this.questions('>:')) {
      this.run(answer);
    }
  }
  static async *questions(query: string) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    try {
      while (true) {
        yield new Promise<string>((resolve) => {
          rl.question(query, resolve);
        });
        this.hadError = false;
      }
    } finally {
      rl.close();
    }
  }
  static run(source: string) {
    const scanner = new Scanner(source);
    const tokens = scanner.scanTokens();
    for (const token of tokens) {
      console.log('token:', token);
    }
  }
}

Lox.main(process.argv);
