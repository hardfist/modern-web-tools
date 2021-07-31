import { Token, TokenType } from './token';
import { Lox } from './index';
export class Scanner {
  private source: string;
  private tokens: Array<Token> = [];
  start: number = 0;
  current = 0;
  line = 1;
  constructor(source) {
    this.source = source;
  }
  scanTokens(): Token[] {
    while (!this.isAtEnd()) {
      this.scanToken();
    }
    this.tokens.push(new Token(TokenType.EOF, '', null, this.line));
    return this.tokens;
  }
  scanToken() {
    const c = this.advance();

    switch (c) {
      case '(':
        this.addToken(TokenType.LEFT_PAREN);
        break;
      case ')':
        this.addToken(TokenType.RIGHT_PAREN);
        break;
      case '{':
        this.addToken(TokenType.LEFT_BRACE);
        break;
      case '}':
        this.addToken(TokenType.RIGHT_BRACE);
        break;
      case ',':
        this.addToken(TokenType.COMMA);
        break;
      case '.':
        this.addToken(TokenType.DOT);
        break;
      case '-':
        this.addToken(TokenType.MINUS);
        break;
      case '+':
        this.addToken(TokenType.PLUS);
        break;
      case ';':
        this.addToken(TokenType.SEMICOLON);
        break;
      case '*':
        this.addToken(TokenType.STAR);
        break;
      case '!':
        this.addToken(this.match('=') ? TokenType.BANG_EQUAL : TokenType.BANG);
        break;
      case '=':
        this.addToken(this.match('=') ? TokenType.EQUAL_EQUAL : TokenType.EQUAL);
        break;
      case '<':
        this.addToken(this.match('=') ? TokenType.LESS_EQUAL : TokenType.LESS);
        break;
      case '>':
        this.addToken(this.match('=') ? TokenType.GREATER_EQUAL : TokenType.GREATER);
        break;
      case ' ':
      case '\r':
      case '\t':
        // Ignore whitespace.
        break;

      case '\n':
        this.line++;
        break;
      default:
        if (this.isDigit(c)) {
          this.number();
        } else {
          Lox.error(this.line, 'Unexpected character.');
        }
    }
  }
  match(value: string) {
    return this.peek() === value;
  }
  peek() {
    if (this.isAtEnd()) {
      return '\0';
    } else {
      return this.source[this.current];
    }
  }
  peekNext() {
    if (this.isAtEnd()) {
      return '\0';
    } else {
      return this.source[this.current + 1];
    }
  }
  private string() {
    while (this.peek() != '"' && !this.isAtEnd()) {
      if (this.peek() == '\n') this.line++;
      this.advance();
    }

    if (this.isAtEnd()) {
      Lox.error(this.line, 'Unterminated string.');
      return;
    }

    // The closing ".
    this.advance();

    // Trim the surrounding quotes.
    const value = this.source.substring(this.start + 1, this.current - 1);
    this.addToken(TokenType.STRING, value);
  }
  advance() {
    return this.source[this.current++];
  }
  addToken(type: TokenType, literal?: any) {
    const text = this.source.slice(this.start, this.current);
    this.tokens.push(new Token(type, text, literal, this.line));
  }
  isAtEnd(): boolean {
    return this.current >= this.source.length;
  }
  isDigit(c: string) {
    return c >= '0' && c <= '9';
  }
  private number() {
    while (this.isDigit(this.peek())) this.advance();

    // Look for a fractional part.
    if (this.peek() == '.' && this.isDigit(this.peekNext())) {
      // Consume the "."
      this.advance();

      while (this.isDigit(this.peek())) this.advance();
    }

    this.addToken(TokenType.NUMBER, Number.parseFloat(this.source.substring(this.start, this.current)));
  }
}
