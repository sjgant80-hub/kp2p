/**
 * KonoASM - Unified Namespace Assembly Language
 * ISA-95 inspired instruction set for the KonoForge platform
 *
 * Registers:
 *   R0-R7   - General purpose
 *   NS      - Namespace pointer (current path)
 *   SP      - Stack pointer
 *   PC      - Program counter
 *   FL      - Flags (Z:zero, N:negative, C:carry, O:overflow)
 *
 * Addressing modes:
 *   #imm    - Immediate value
 *   Rn      - Register
 *   [Rn]    - Memory at register address
 *   @path   - Namespace tag
 *   $label  - Code label
 */

// Opcodes
export const OPCODES = {
  // Data movement
  MOV: 0x01,   // MOV dest, src - Move data
  LOAD: 0x02,  // LOAD Rn, @path - Load from namespace
  STORE: 0x03, // STORE @path, Rn - Store to namespace
  PUSH: 0x04,  // PUSH Rn - Push to stack
  POP: 0x05,   // POP Rn - Pop from stack

  // Arithmetic
  ADD: 0x10,   // ADD Rn, Rm
  SUB: 0x11,   // SUB Rn, Rm
  MUL: 0x12,   // MUL Rn, Rm
  DIV: 0x13,   // DIV Rn, Rm
  MOD: 0x14,   // MOD Rn, Rm
  INC: 0x15,   // INC Rn
  DEC: 0x16,   // DEC Rn

  // Logic
  AND: 0x20,   // AND Rn, Rm
  OR: 0x21,    // OR Rn, Rm
  XOR: 0x22,   // XOR Rn, Rm
  NOT: 0x23,   // NOT Rn
  SHL: 0x24,   // SHL Rn, #imm
  SHR: 0x25,   // SHR Rn, #imm

  // Comparison
  CMP: 0x30,   // CMP Rn, Rm - Sets flags
  TEST: 0x31,  // TEST Rn, Rm - AND without storing

  // Control flow
  JMP: 0x40,   // JMP $label
  JZ: 0x41,    // JZ $label - Jump if zero
  JNZ: 0x42,   // JNZ $label - Jump if not zero
  JG: 0x43,    // JG $label - Jump if greater
  JL: 0x44,    // JL $label - Jump if less
  CALL: 0x45,  // CALL $label
  RET: 0x46,   // RET

  // Namespace operations
  NSGET: 0x50, // NSGET Rn - Get current namespace
  NSSET: 0x51, // NSSET @path - Set namespace context
  NSQUERY: 0x52, // NSQUERY Rn, @pattern - Query tags
  NSCREATE: 0x53, // NSCREATE @path, Rn - Create tag
  NSDELETE: 0x54, // NSDELETE @path - Delete tag

  // I/O
  IN: 0x60,    // IN Rn, #port
  OUT: 0x61,   // OUT #port, Rn
  PRINT: 0x62, // PRINT Rn - Debug output
  READ: 0x63,  // READ Rn - Read input

  // System
  NOP: 0x00,   // No operation
  HALT: 0xFF,  // Stop execution
  SYSCALL: 0xFE, // System call
  DEBUG: 0xFD  // Debug breakpoint
};

// Reverse lookup
export const MNEMONICS = Object.fromEntries(
  Object.entries(OPCODES).map(([k, v]) => [v, k])
);

/**
 * KonoASM Virtual Machine
 */
export class KonoVM {
  constructor(namespace) {
    this.ns = namespace;

    // Registers
    this.R = new Int32Array(8);  // R0-R7
    this.NS = '';               // Namespace pointer
    this.SP = 0xFFFF;           // Stack pointer
    this.PC = 0;                // Program counter
    this.FL = 0;                // Flags

    // Memory
    this.memory = new Uint8Array(65536);
    this.stack = [];

    // Program
    this.program = [];
    this.labels = {};

    // State
    this.running = false;
    this.output = [];
  }

  /**
   * Assemble source code
   */
  assemble(source) {
    const lines = source.split('\n');
    this.program = [];
    this.labels = {};

    let pc = 0;

    // First pass: collect labels
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(';')) continue;

      if (trimmed.endsWith(':')) {
        const label = trimmed.slice(0, -1);
        this.labels[label] = pc;
      } else {
        pc++;
      }
    }

    // Second pass: assemble instructions
    pc = 0;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(';') || trimmed.endsWith(':')) continue;

      const instruction = this.parseInstruction(trimmed);
      this.program.push(instruction);
      pc++;
    }

    return this.program.length;
  }

  /**
   * Parse a single instruction
   */
  parseInstruction(line) {
    // Remove comments
    const code = line.split(';')[0].trim();
    const parts = code.split(/[\s,]+/).filter(Boolean);

    const mnemonic = parts[0].toUpperCase();
    const opcode = OPCODES[mnemonic];

    if (opcode === undefined) {
      throw new Error(`Unknown instruction: ${mnemonic}`);
    }

    return {
      opcode,
      mnemonic,
      operands: parts.slice(1).map(this.parseOperand.bind(this))
    };
  }

  /**
   * Parse an operand
   */
  parseOperand(op) {
    if (op.startsWith('#')) {
      // Immediate
      return { type: 'imm', value: parseInt(op.slice(1), 10) };
    }
    if (op.startsWith('R') && op.length === 2) {
      // Register
      return { type: 'reg', value: parseInt(op[1], 10) };
    }
    if (op.startsWith('[R') && op.endsWith(']')) {
      // Memory indirect
      return { type: 'mem', value: parseInt(op[2], 10) };
    }
    if (op.startsWith('@')) {
      // Namespace path
      return { type: 'ns', value: op.slice(1) };
    }
    if (op.startsWith('$')) {
      // Label
      return { type: 'label', value: op.slice(1) };
    }
    // String literal
    if (op.startsWith('"') && op.endsWith('"')) {
      return { type: 'str', value: op.slice(1, -1) };
    }
    // Default to immediate
    return { type: 'imm', value: parseInt(op, 10) || 0 };
  }

  /**
   * Execute program
   */
  async execute(maxCycles = 10000) {
    this.running = true;
    this.PC = 0;
    this.output = [];
    let cycles = 0;

    while (this.running && this.PC < this.program.length && cycles < maxCycles) {
      const instruction = this.program[this.PC];
      await this.executeInstruction(instruction);
      this.PC++;
      cycles++;
    }

    return {
      cycles,
      output: this.output.join(''),
      registers: Array.from(this.R),
      flags: this.FL
    };
  }

  /**
   * Execute a single instruction
   */
  async executeInstruction(inst) {
    const op = inst.operands;

    switch (inst.opcode) {
      // Data movement
      case OPCODES.MOV:
        this.setOperand(op[0], this.getOperand(op[1]));
        break;

      case OPCODES.LOAD:
        if (this.ns) {
          const tag = this.ns.readTag(op[1].value);
          this.R[op[0].value] = tag?.value || 0;
        }
        break;

      case OPCODES.STORE:
        if (this.ns) {
          await this.ns.writeTag(op[0].value, this.R[op[1].value]);
        }
        break;

      case OPCODES.PUSH:
        this.stack.push(this.getOperand(op[0]));
        break;

      case OPCODES.POP:
        this.setOperand(op[0], this.stack.pop() || 0);
        break;

      // Arithmetic
      case OPCODES.ADD:
        this.R[op[0].value] = this.R[op[0].value] + this.getOperand(op[1]);
        this.updateFlags(this.R[op[0].value]);
        break;

      case OPCODES.SUB:
        this.R[op[0].value] = this.R[op[0].value] - this.getOperand(op[1]);
        this.updateFlags(this.R[op[0].value]);
        break;

      case OPCODES.MUL:
        this.R[op[0].value] = this.R[op[0].value] * this.getOperand(op[1]);
        this.updateFlags(this.R[op[0].value]);
        break;

      case OPCODES.DIV:
        const divisor = this.getOperand(op[1]);
        if (divisor !== 0) {
          this.R[op[0].value] = Math.floor(this.R[op[0].value] / divisor);
        }
        break;

      case OPCODES.INC:
        this.R[op[0].value]++;
        this.updateFlags(this.R[op[0].value]);
        break;

      case OPCODES.DEC:
        this.R[op[0].value]--;
        this.updateFlags(this.R[op[0].value]);
        break;

      // Logic
      case OPCODES.AND:
        this.R[op[0].value] &= this.getOperand(op[1]);
        this.updateFlags(this.R[op[0].value]);
        break;

      case OPCODES.OR:
        this.R[op[0].value] |= this.getOperand(op[1]);
        this.updateFlags(this.R[op[0].value]);
        break;

      case OPCODES.XOR:
        this.R[op[0].value] ^= this.getOperand(op[1]);
        this.updateFlags(this.R[op[0].value]);
        break;

      case OPCODES.NOT:
        this.R[op[0].value] = ~this.R[op[0].value];
        break;

      case OPCODES.SHL:
        this.R[op[0].value] <<= this.getOperand(op[1]);
        break;

      case OPCODES.SHR:
        this.R[op[0].value] >>= this.getOperand(op[1]);
        break;

      // Comparison
      case OPCODES.CMP:
        const result = this.getOperand(op[0]) - this.getOperand(op[1]);
        this.updateFlags(result);
        break;

      // Control flow
      case OPCODES.JMP:
        this.PC = this.labels[op[0].value] - 1;
        break;

      case OPCODES.JZ:
        if (this.FL & 0x01) this.PC = this.labels[op[0].value] - 1;
        break;

      case OPCODES.JNZ:
        if (!(this.FL & 0x01)) this.PC = this.labels[op[0].value] - 1;
        break;

      case OPCODES.JG:
        if (!(this.FL & 0x02) && !(this.FL & 0x01)) {
          this.PC = this.labels[op[0].value] - 1;
        }
        break;

      case OPCODES.JL:
        if (this.FL & 0x02) this.PC = this.labels[op[0].value] - 1;
        break;

      case OPCODES.CALL:
        this.stack.push(this.PC);
        this.PC = this.labels[op[0].value] - 1;
        break;

      case OPCODES.RET:
        this.PC = this.stack.pop() || 0;
        break;

      // Namespace
      case OPCODES.NSSET:
        this.NS = op[0].value;
        break;

      case OPCODES.NSQUERY:
        if (this.ns) {
          const tags = this.ns.queryTags(op[1].value);
          this.R[op[0].value] = tags.length;
        }
        break;

      // I/O
      case OPCODES.PRINT:
        const val = this.getOperand(op[0]);
        this.output.push(typeof val === 'string' ? val : String(val));
        this.output.push('\n');
        break;

      // System
      case OPCODES.NOP:
        break;

      case OPCODES.HALT:
        this.running = false;
        break;

      case OPCODES.DEBUG:
        console.log('DEBUG:', {
          PC: this.PC,
          R: Array.from(this.R),
          FL: this.FL.toString(2).padStart(4, '0'),
          NS: this.NS
        });
        break;
    }
  }

  /**
   * Get operand value
   */
  getOperand(op) {
    switch (op.type) {
      case 'imm': return op.value;
      case 'reg': return this.R[op.value];
      case 'mem': return this.memory[this.R[op.value]];
      case 'str': return op.value;
      default: return 0;
    }
  }

  /**
   * Set operand value
   */
  setOperand(op, value) {
    switch (op.type) {
      case 'reg':
        this.R[op.value] = value;
        break;
      case 'mem':
        this.memory[this.R[op.value]] = value;
        break;
    }
  }

  /**
   * Update flags based on result
   */
  updateFlags(value) {
    this.FL = 0;
    if (value === 0) this.FL |= 0x01; // Zero
    if (value < 0) this.FL |= 0x02;   // Negative
  }

  /**
   * Disassemble program
   */
  disassemble() {
    const lines = [];
    for (let i = 0; i < this.program.length; i++) {
      const inst = this.program[i];
      const ops = inst.operands.map(o => {
        switch (o.type) {
          case 'imm': return `#${o.value}`;
          case 'reg': return `R${o.value}`;
          case 'mem': return `[R${o.value}]`;
          case 'ns': return `@${o.value}`;
          case 'label': return `$${o.value}`;
          case 'str': return `"${o.value}"`;
          default: return String(o.value);
        }
      });
      lines.push(`${i.toString(16).padStart(4, '0')}: ${inst.mnemonic} ${ops.join(', ')}`);
    }
    return lines.join('\n');
  }
}

// Example program
export const EXAMPLE_PROGRAM = `
; KonoASM Example: Hello World + Counter

NSSET @forge/demo       ; Set namespace context

; Print hello
MOV R0, #72             ; 'H'
PRINT R0
MOV R0, #101            ; 'e'
PRINT R0
MOV R0, #108            ; 'l'
PRINT R0
PRINT R0                ; 'l'
MOV R0, #111            ; 'o'
PRINT R0

; Count to 5
MOV R1, #0              ; counter
loop:
  INC R1
  PRINT R1
  CMP R1, #5
  JL $loop

HALT
`;
