//
//
// prepare some enum in global scope (because enum in ts is just a object type and not a real enum)
//
//
enum TokenType {
	// Single-character tokens.
  LEFT_PAREN, RIGHT_PAREN, LEFT_BRACE, RIGHT_BRACE,
  COMMA, DOT, MINUS, PLUS, SEMICOLON, SLASH, STAR,

  // One or two character tokens.
  BANG, BANG_EQUAL,
  EQUAL, EQUAL_EQUAL,
  GREATER, GREATER_EQUAL,
  LESS, LESS_EQUAL,

  // Literals.
  IDENTIFIER, STRING, NUMBER,

  // Keywords.
  AND, CLASS, ELSE, FALSE, FUN, FOR, IF, NIL, OR,
  PRINT, RETURN, SUPER, THIS, TRUE, VAR, WHILE,

  EOF
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
}

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
`

run(content)

/**
* the run function is the entry point of the script, it will be called by the main function
*/
function run(source: string) {
	const tokens = scanCode(source)

	console.log(tokens.map(t => t.toString()).join('\n'))
}

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

function TokenBuilder(type: TokenType, lexeme: string, literal: unknown, line: number): Token {
	return {
		type: type,
		lexeme: lexeme,
		literal: literal,
		line: line,
		toString() {
			return `type: ${TokenType[type]} lexeme: ${lexeme} literal: ${literal}`
		},
	}
}

/**
* Scanner, scan the code and return a token list
*/
function scanCode(source: string): Token[] {
	const tokens: Token[] = []
	let start = 0
	let current = 0
	let line = 1

	const isEnd = () => current >= source.length

	function scanTokens() {
		while (!isEnd()) {
			start = current
			scanToken()
		}
		tokens.push(TokenBuilder(TokenType.EOF, '', null, line))
	}

	function addToken(type: TokenType, literal?: unknown) {
		const lexeme = source.slice(start, current)
		const token = TokenBuilder(type, lexeme, literal ?? null, line)
		tokens.push(token)
	}

	function scanToken() {
		const c = advance()
		switch (c) {
			case '(':
				addToken(TokenType.LEFT_PAREN, null)
				break
			case ')':
				addToken(TokenType.RIGHT_PAREN, null)
				break
			case '{':
				addToken(TokenType.LEFT_BRACE, null)
				break
			case '}':
				addToken(TokenType.RIGHT_BRACE, null)
				break
			case ',':
				addToken(TokenType.COMMA, null)
				break
			case '.':
				addToken(TokenType.DOT, null)
				break
			case '-':
				addToken(TokenType.MINUS, null)
				break
			case '+':
				addToken(TokenType.PLUS, null)
				break
			case ';':
				addToken(TokenType.SEMICOLON, null)
				break
			case '*':
				addToken(TokenType.STAR, null)
				break
			case '!':
				addToken(match('=') ? TokenType.BANG_EQUAL : TokenType.BANG)
				break
			case '=':
				addToken(match('=') ? TokenType.EQUAL_EQUAL : TokenType.EQUAL)
				break
			case '<':
				addToken(match('=') ? TokenType.LESS_EQUAL : TokenType.LESS)
				break
			case '>':
				addToken(match('=') ? TokenType.GREATER_EQUAL : TokenType.GREATER)
				break
			case '/':
				if (match('/')) { 
					while (peek() !== '\n' && !isEnd()) {
						advance()
					}
				} else {
					addToken(TokenType.SLASH)
				}
				break
			case ' ':
			case '\t':
			case '\r':
				// do nothing
				break
			case '\n':
				line++
				break
			case '"':
				string()
				break
			case 'o':
				if (match('r')) {
					addToken(TokenType.OR)
				}
				// TODO: break???
				break
			default:
				if (isDigit(c)) {
					number()
					return
				}

				if (isAlpha(c)) {
					identifier()
				}
				reportError(line, '', "Unexpected character.")
		}
	}

	function advance() {
		const c = source[current]
		current++
		return c
	}

	function match(c: string) : boolean{
		if (isEnd()) {
			return false
		}
		if (source[current] === c) {
			current ++
			return true
		}
		return false
	}

	function peek() {
		if (isEnd()) return '\0'

		return source[current]
	}

	function string() {
		while (peek() !== '"' && !isEnd()) {
			if (peek() === '\n') {
				line++
			}
			advance()
		}

		if (isEnd()) {
			reportError(line, '', "Unterminated string.")
		}

		// to close it
		advance()

		const value = source.slice(start + 1, current - 1)
		addToken(TokenType.STRING, value)
	}

	function isDigit(c: string) {
		return c !== '\n' && !isNaN(Number(c))
	}

	function number() {
		while (isDigit(peek())) {
			advance()
		}

		if (peek() === '.' && isDigit(peekNext())) {
			// Consume the dot
			advance()
			while (isDigit(peek())) advance()
		}

		addToken(TokenType.NUMBER, Number(source.slice(start, current)))
	}

	function peekNext() {
    if (current + 1 >= source.length) return '\0';
    return source.charAt(current + 1);
  }

	function isAlpha(c: string) {
		return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_'
	}

	/**
	* keyword
	*/
	function identifier() {
		while (isAlphaOrDigit(peek())) advance()
		const keyword = KEYWORDS[source.slice(start, current)]

		addToken(keyword ?? TokenType.IDENTIFIER)
	}

	function isAlphaOrDigit(c: string) {
		return isAlpha(c) || isDigit(c)
	}

	scanTokens()

	return tokens
}

function reportError(line: number,where: string, message: string) {
	console.error(`[line ${line}] Error ${where}: ${message}`)
	Deno.exit(65)
}
