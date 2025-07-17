// deno-lint-ignore-file no-explicit-any
//
// prepare some enum in global scope (because enum in ts is just a object type and not a real enum)
//
//
enum TokenType {
  // Single-character tokens.
  LEFT_PAREN, // (
  RIGHT_PAREN, // )
  LEFT_BRACE, // {
  RIGHT_BRACE, // }
  COMMA,
  DOT,
  MINUS,
  PLUS,
  SEMICOLON,
  SLASH,
  STAR,

  // One or two character tokens.
  BANG,
  BANG_EQUAL, // !=
  EQUAL,
  EQUAL_EQUAL, // ==
  GREATER,
  GREATER_EQUAL,
  LESS,
  LESS_EQUAL,

  // Literals.
  IDENTIFIER,
  STRING,
  NUMBER,

  // Keywords.
  AND,
  CLASS,
  ELSE,
  FALSE,
  FUN,
  FOR,
  IF,
  NIL,
  OR,
  PRINT,
  RETURN,
  SUPER,
  THIS,
  TRUE,
  VAR,
  WHILE,

  EOF,
}

const KEYWORDS: Record<string, TokenType> = {
  and: TokenType.AND,
  class: TokenType.CLASS,
  else: TokenType.ELSE,
  false: TokenType.FALSE,
  fun: TokenType.FUN,
  for: TokenType.FOR,
  if: TokenType.IF,
  nil: TokenType.NIL,
  or: TokenType.OR,
  print: TokenType.PRINT,
  return: TokenType.RETURN,
  super: TokenType.SUPER,
  this: TokenType.THIS,
  true: TokenType.TRUE,
  var: TokenType.VAR,
  while: TokenType.WHILE,
};

/**
 * define the input of script content, in here, we use a example of a simple script
 */
// const content = `
// // this is a comment
// (( )){} // grouping stuff
// !*+-/=<> <= == // operators
// `
const content = `
"hello world"
1
1.2
3
`;

// run(content);

/**
 * the run function is the entry point of the script, it will be called by the main function
 */
function run(source: string) {
  const tokens = scanCode(source);
  // console.log(tokens.map((t) => t.toString()).join("\n"));
  const expr = parse(tokens);
  // const visitor = new Visitor();
  // console.log(visitor.print(expr));
  const interpreter = new Interpreter();
  console.log(interpreter.interpret(expr));
}

// function astTest(expr: Expr) {
//   const visitor = new Visitor();
//   console.log(visitor.print(expr));
// }

// -----------------------------------------------------------------------------
//
//                              the scanner part
//
// -----------------------------------------------------------------------------

interface Token {
  type: TokenType;
  lexeme: string;
  literal: unknown;
  line: number;
  toString(): string;
}

function TokenBuilder(
  type: TokenType,
  lexeme: string,
  literal: unknown,
  line: number,
): Token {
  return {
    type: type,
    lexeme: lexeme,
    literal: literal,
    line: line,
    toString() {
      return `type: ${TokenType[type]} lexeme: ${lexeme} literal: ${literal}`;
    },
  };
}

/**
 * Scanner, scan the code and return a token list
 */
function scanCode(source: string): Token[] {
  const tokens: Token[] = [];
  let start = 0;
  let current = 0;
  let line = 1;

  const isEnd = () => current >= source.length;

  function scanTokens() {
    while (!isEnd()) {
      start = current;
      scanToken();
    }
    tokens.push(TokenBuilder(TokenType.EOF, "", null, line));
  }

  function addToken(type: TokenType, literal?: unknown) {
    const lexeme = source.slice(start, current);
    const token = TokenBuilder(type, lexeme, literal ?? null, line);
    tokens.push(token);
  }

  function scanToken() {
    const c = advance();
    switch (c) {
      case "(":
        addToken(TokenType.LEFT_PAREN, null);
        break;
      case ")":
        addToken(TokenType.RIGHT_PAREN, null);
        break;
      case "{":
        addToken(TokenType.LEFT_BRACE, null);
        break;
      case "}":
        addToken(TokenType.RIGHT_BRACE, null);
        break;
      case ",":
        addToken(TokenType.COMMA, null);
        break;
      case ".":
        addToken(TokenType.DOT, null);
        break;
      case "-":
        addToken(TokenType.MINUS, null);
        break;
      case "+":
        addToken(TokenType.PLUS, null);
        break;
      case ";":
        addToken(TokenType.SEMICOLON, null);
        break;
      case "*":
        addToken(TokenType.STAR, null);
        break;
      case "!":
        addToken(match("=") ? TokenType.BANG_EQUAL : TokenType.BANG);
        break;
      case "=":
        addToken(match("=") ? TokenType.EQUAL_EQUAL : TokenType.EQUAL);
        break;
      case "<":
        addToken(match("=") ? TokenType.LESS_EQUAL : TokenType.LESS);
        break;
      case ">":
        addToken(match("=") ? TokenType.GREATER_EQUAL : TokenType.GREATER);
        break;
      case "/":
        if (match("/")) {
          while (peek() !== "\n" && !isEnd()) {
            advance();
          }
        } else {
          addToken(TokenType.SLASH);
        }
        break;
      case " ":
      case "\t":
      case "\r":
        // do nothing
        break;
      case "\n":
        line++;
        break;
      case '"':
        string();
        break;
      case "o":
        if (match("r")) {
          addToken(TokenType.OR);
        }
        // TODO: break???
        break;
      default:
        if (isDigit(c)) {
          number();
          return;
        }

        if (isAlpha(c)) {
          identifier();
        }
        reportError(line, "", "Unexpected character.");
    }
  }

  function advance() {
    const c = source[current];
    current++;
    return c;
  }

  function match(c: string): boolean {
    if (isEnd()) {
      return false;
    }
    if (source[current] === c) {
      current++;
      return true;
    }
    return false;
  }

  function peek() {
    if (isEnd()) return "\0";

    return source[current];
  }

  function string() {
    while (peek() !== '"' && !isEnd()) {
      if (peek() === "\n") {
        line++;
      }
      advance();
    }

    if (isEnd()) {
      reportError(line, "", "Unterminated string.");
    }

    // to close it
    advance();

    const value = source.slice(start + 1, current - 1);
    addToken(TokenType.STRING, value);
  }

  function isDigit(c: string) {
    return c !== "\n" && !isNaN(Number(c));
  }

  function number() {
    while (isDigit(peek())) {
      advance();
    }

    if (peek() === "." && isDigit(peekNext())) {
      // Consume the dot
      advance();
      while (isDigit(peek())) advance();
    }

    addToken(TokenType.NUMBER, Number(source.slice(start, current)));
  }

  function peekNext() {
    if (current + 1 >= source.length) return "\0";
    return source.charAt(current + 1);
  }

  function isAlpha(c: string) {
    return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_";
  }

  /**
   * keyword identifier
   */
  function identifier() {
    while (isAlphaOrDigit(peek())) advance();
    const keyword = KEYWORDS[source.slice(start, current)];

    addToken(keyword ?? TokenType.IDENTIFIER);
  }

  function isAlphaOrDigit(c: string) {
    return isAlpha(c) || isDigit(c);
  }

  scanTokens();

  return tokens;
}

function reportError(line: number, where: string, message: string) {
  console.error(`[line ${line}] Error ${where}: ${message}`);
  Deno.exit(65);
}

// -----------------------------------------------------------------------------
//
//                              the expr part
//
// -----------------------------------------------------------------------------
// context free grammar
//

interface ExprVisitor {
  visitBinary(expr: Binary): any;
  visitUnary(expr: Unary): any;
  visitLiteral(expr: Literal): any;
  visitGrouping(expr: Grouping): any;
}

abstract class Expr {
  abstract accept(visitor: ExprVisitor): any;
}

class Binary extends Expr {
  constructor(public left: Expr, public op: Token, public right: Expr) {
    super();
  }

  accept(visitor: ExprVisitor) {
    return visitor.visitBinary(this);
  }
}

class Unary extends Expr {
  constructor(public op: Token, public right: Expr) {
    super();
  }

  accept(visitor: ExprVisitor) {
    return visitor.visitUnary(this);
  }
}

class Literal extends Expr {
  constructor(public value: unknown) {
    super();
  }

  accept(visitor: ExprVisitor) {
    return visitor.visitLiteral(this);
  }
}

class Grouping extends Expr {
  constructor(public expr: Expr) {
    super();
  }

  accept(visitor: ExprVisitor) {
    return visitor.visitGrouping(this);
  }
}

class Visitor implements ExprVisitor {
  print(expr: Expr) {
    return expr.accept(this);
  }
  parenthesize(name: string, exprs: Expr[]): string {
    return ["(", name, ...exprs.map((expr) => expr.accept(this)), ")"].join(
      " ",
    );
  }
  visitBinary(expr: Binary): string {
    return this.parenthesize(expr.op.lexeme, [expr.left, expr.right]);
  }

  visitUnary(expr: Unary): string {
    return this.parenthesize(expr.op.lexeme, [expr.right]);
  }

  visitLiteral(expr: Literal): string {
    if (expr.value === null) return "nil";

    // deno-lint-ignore no-explicit-any
    return (expr.value as any).toString();
  }

  visitGrouping(expr: Grouping): string {
    return this.parenthesize("group", [expr.expr]);
  }
}

// astTest(
//   new Binary(
//     new Unary(
//       TokenBuilder(
//         TokenType.MINUS,
//         "-",
//         null,
//         1,
//       ),
//       new Literal(123),
//     ),
//     TokenBuilder(TokenType.STAR, "*", null, 1),
//     new Grouping(
//       new Literal(45.67),
//     ),
//   ),
// );
// -----------------------------------------------------------------------------
//
//                              the parser part
//
// -----------------------------------------------------------------------------

function parse(tokens: Token[]): Stmt {
  let current = 0;

  function peek() {
    return tokens[current];
  }

  function isAtEnd() {
    return peek().type === TokenType.EOF;
  }

  function check(t: TokenType) {
    if (isAtEnd()) return false;
    return t === tokens[current].type;
  }

  function advance() {
    current++;
  }

  function previous() {
    return tokens[current - 1];
  }

  function match(...tks: TokenType[]) {
    for (const tk of tks) {
      if (check(tk)) {
        advance();
        return true;
      }
    }
  }

  function consume(t: TokenType, msg: string) {
    if (peek().type === t) {
      advance();
      return;
    }

    reportError(peek().line, "", msg);
  }

  function primary(): Expr {
    if (match(TokenType.FALSE)) {
      return new Literal(false);
    } else if (match(TokenType.TRUE)) {
      return new Literal(true);
    } else if (match(TokenType.STRING)) {
      return new Literal(previous().literal);
    } else if (match(TokenType.NUMBER)) {
      return new Literal(previous().literal);
    } else if (match(TokenType.NIL)) {
      return new Literal(null);
    }

    if (match(TokenType.LEFT_PAREN)) {
      const expr = expression();
      consume(TokenType.RIGHT_PAREN, "Expect ')' after expression.");
      check(TokenType.RIGHT_PAREN);
      return new Grouping(expr);
    }

    throw Error("todo");
  }

  function unary(): Expr {
    const expr = primary();
    if (match(TokenType.BANG, TokenType.MINUS)) {
      const op = previous();
      const right = unary();
      return new Unary(op, right);
    }
    return expr;
  }

  function factor(): Expr {
    let expr = unary();
    if (match(TokenType.SLASH)) {
      const op = previous();
      const right = unary();
      expr = new Binary(expr, op, right);
    }
    return expr;
  }

  function term(): Expr {
    let expr = factor();
    while (match(TokenType.MINUS, TokenType.PLUS)) {
      const op = previous();
      const right = factor();
      expr = new Binary(expr, op, right);
    }

    return expr;
  }

  function comparison(): Expr {
    let expr = term();

    while (
      match(
        TokenType.LESS,
        TokenType.GREATER,
        TokenType.LESS_EQUAL,
        TokenType.GREATER_EQUAL,
      )
    ) {
      const op = previous();
      const right = term();
      expr = new Binary(expr, op, right);
    }

    return expr;
  }

  function equality(): Expr {
    let expr = comparison();
    while (match(TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL)) {
      const op = previous();
      const right = comparison();
      expr = new Binary(expr, op, right);
    }

    return expr;
  }

  function expression(): Expr {
    return equality();
  }

  function printStatement(): Stmt {
    const expr = expression();
    consume(TokenType.SEMICOLON, "Expect ';' after value");
    return new PrintStmt(expr);
  }

  function expressionStatement() {
    return new ExprStmt(expression());
  }

  function statement(): Stmt {
    if (match(TokenType.PRINT)) {
      return printStatement();
    }

    return expressionStatement();
  }

  const stmts: Stmt[] = [];

  while (!isAtEnd()) {
    stmts.push(statement());
  }

  return stmts;

  // const expr = expression();
  //
  // return expr;
}

// -----------------------------------------------------------------------------
//
//                              the interpreter part
//
// -----------------------------------------------------------------------------

class Interpreter implements ExprVisitor {
  evaluate(expr: Expr) {
    return expr.accept(this);
  }

  interpret(expr: Expr) {
    return this.evaluate(expr);
  }

  visitBinary(expr: Binary) {
    const left = this.evaluate(expr.left);
    const right = this.evaluate(expr.right);

    switch (expr.op.type) {
      case TokenType.SLASH:
        return left / right;
      case TokenType.STAR:
        return left * right;
      case TokenType.MINUS:
        return left - right;
      case TokenType.PLUS:
        return left + right;
      case TokenType.GREATER:
        return left > right;
      case TokenType.LESS:
        return left < right;
      case TokenType.GREATER_EQUAL:
        return left >= right;
      case TokenType.LESS_EQUAL:
        return left <= right;
      case TokenType.EQUAL_EQUAL:
        return left === right;
      case TokenType.BANG_EQUAL:
        return left !== right;
      default:
        throw Error(`binary parse unresearch, ${expr.op.literal}`);
    }
  }

  visitUnary(expr: Unary) {
    const val = this.evaluate(expr.right);
    switch (expr.op.type) {
      case TokenType.MINUS:
        return -val;
      case TokenType.BANG:
        // FIXME: maybe you need trulty value check!
        return !val;
      default:
        throw Error(`unary parse unresearch, ${expr}`);
    }
  }

  visitLiteral(expr: Literal): unknown {
    return expr.value;
  }

  visitGrouping(expr: Grouping): string {
    return this.evaluate(expr.expr);
  }

  visitExpressionStmt(stmt: ExprStmt) {
    this.evaluate(stmt.expr);
    return null;
  }

  visitPrintStmt(stmt: PrintStmt) {
    const value = this.evaluate(stmt.expr);
    console.log(value);
    return null;
  }
}

abstract class Stmt {
}

class ExprStmt extends Stmt {
  constructor(public expr: Expr) {
    super();
  }
}

class PrintStmt extends Stmt {
  constructor(public expr: Expr) {
    super();
  }
}

run("1 == 2");
run("1 + 1 == 2");
run("1 + 1 + (3+3) /3");
run("1 / 3");
