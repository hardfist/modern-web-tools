import fs from 'fs';
import readline from 'readline';
class Lox {
  static main(args: string[]) {
    if (args.length > 3) {
      console.log('Usage: lox [script]');
    } else if (args.length === 3) {
      this.runFile(args[2]);
    } else {
      this.runPrompt();
    }
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
      }
    } finally {
      rl.close();
    }
  }
  static run(contents: string) {
    console.log('content:', contents);
  }
}

Lox.main(process.argv);
