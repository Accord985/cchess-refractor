// read from some database to import fen

type Resolver = (value: MoveStatus) => void;
type Rejecter = (reason: any) => void;

// rank=row, file=column.
// row goes from 9 to 0 (top->bottom),
// file goes from A to I (left->right)
// type Coord = {
//   rank: number,
//   file: number
// };
class HTMLBoard {
  _gameElement: HTMLElement;
  _mainTeam: number;  // the team number who takes the main perspective (pieces at the bottom)
  _rule: Rules;
  _names: PieceName;
  _dragging?: HTMLDivElement;  // the element currently dragged
  _startX?: number; _startY?: number;
  _pendingResolver?: Resolver;
  _pendingRejecter?: Rejecter;

  // when you use a setter, simply assign values instead of using it as a function:
  // CORRECT: board.pendingResolver = resolver;
  // WRONG:   board.pendingResolver(resolver);
  // public setter is not good but the board is designed to be a private field of Match so I think
  //     it's okay
  public set pendingResolver(resolver: Resolver) {
    this._pendingResolver = resolver;
  }

  public set pendingRejecter(rejecter: Rejecter) {
    this._pendingRejecter = rejecter;
  }

  constructor(fen: string, mainTeam: number = 1) {
    this._mainTeam = mainTeam;
    this._rule = new Rules(fen);
    this._names = {
      'r': '車車',  // 俥 for red sometimes
      'n': '馬馬',  // 傌 for red sometimes
      'c': '炮炮',  // 砲 for black sometimes
      'g': '仕士',
      'e': '相象',
      'p': '兵卒',
      'k': '帥將'
    };  // fen: 'red black'
    this._pendingResolver = undefined;
    this._pendingRejecter = undefined;
    this._dragging = undefined;
    this._gameElement = this._buildGameElement(fen);
  }

  public get gameElement() {  // same effect as a function getGameElement()
    return this._gameElement;
  }

  // <section id="board">
  //   <section></section>x90, with <div class="team-1">兵</div> if a piece is inside
  // </section>
  private _buildGameElement(fen: string): HTMLElement {
    let result: HTMLElement = gen('section');
    result.id = 'board';
    result.translate = false;
    if (this._mainTeam !== 1) {
      result.classList.add("blackView");
    }
    result.appendChild(this._genSquares());
    result.appendChild(this._genPieces(fen));
    let captured = gen("section");  captured.id = "captured";
    result.appendChild(captured);
    result.appendChild(this._genEffects());
    return result;
  }

  private _genSquares() {
    let squares = gen("section");
    squares.id = "squares";
    for (let row = 9; row >= 0; row--) {
      for (let col = 0; col < 9; col++) {
        let square = gen("div");
        square.dataset.index = String.fromCharCode(65 + col) + row;  // ASCII: 65-A, 66-B, ...
        square.addEventListener('click', (evt: Event) => {
          this._onSquareClick(evt.target as HTMLDivElement);
        });
        square.addEventListener("dragover", (evt: Event) => {
          evt.preventDefault();
        });
        square.addEventListener("dragenter", (evt: Event) => {
          let sq = evt.target as HTMLDivElement;
          sq.classList.add("dragin");
        });
        square.addEventListener("dragleave", (evt: Event) => {
          let sq = evt.target as HTMLDivElement;
          sq.classList.remove("dragin");
        });
        square.addEventListener("drop", (evt: Event) => {
          let sq = evt.target as HTMLElement;
          qs(".dragin")?.classList.remove("dragin");

          let move = this._dragging!.dataset.col! + this._dragging!.dataset.row! + sq.dataset.index!;
          let label: "targetable" | "nontargetable" = sq.classList.contains("targetable") ? "targetable" : "nontargetable";
          this._dragging = undefined;
          this._displayAttemptedMove(move, label);
        });
        squares.appendChild(square);
      }
    }
    return squares;
  }

  /**
   * Breaks fen down and generates pieces
   * sample fen: "rnegkgenr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNEGKGENR r 0 1"
   * @param fen
   * @returns
   */
  private _genPieces(fen: string) {
    let pieces = gen("section");
    pieces.id = "pieces";
    let layout = fen.split(" ")[0];  // should be passed by Match

    let ranks = layout.split("/");
    for (let i = 0; i < ranks.length; i++) {
      let rank = ranks[i];
      let col = 0;
      for (let j = 0; j < rank.length; j++) {
        let curr = rank.charAt(j);
        if (!isNaN(parseInt(curr))) {  // curr is number: add col by that number
          col += parseInt(curr);
        } else {  // char: add the piece and col++
          let rowIndex = "" + (9 - i);
          let colIndex = String.fromCharCode(65 + col);
          let piece = this._genPieceAt(curr, rowIndex, colIndex);
          pieces.appendChild(piece);
          col++;
        }
      }
    }
    return pieces;
  }

  private _genPieceAt(char: string, row: string, col: string) {
    let team = (char.toLowerCase() !== char) ? 1 : 2;  // A-Z 65-90; a-z 97-122
    let fentype = char.toLowerCase() as 'r' | 'n' | 'c' | 'g' | 'e' | 'p' | 'k';
    let name = this._names[fentype][team - 1];

    let piece = gen('div');
    piece.textContent = name;
    piece.dataset.row = row;
    piece.dataset.col = col;
    piece.classList.add(`team-${team}`);
    // TODO: when adding configurations of match, allow switching this off
    // piece.style = `background-position: ${(50 + 350 * Math.random()).toFixed(0)}px\
    //     ${(50 + 400 * Math.random()).toFixed(0)}px;`;
    piece.addEventListener('click', (evt: Event) => {
      // evt.target is the target of the event (selected piece)
      this._onPieceClick(evt.target as HTMLDivElement);
    });
    piece.addEventListener('drag', (evt: DragEvent) => {
      let p = evt.target as HTMLDivElement;
      evt.preventDefault();
      // p.style.top = `${evt.clientY - this._startY!}px`;
      // p.style.left = `${evt.clientX - this._startX!}px`;
      // p.style.transition = "none";
    });
    piece.addEventListener('dragstart', (evt: MouseEvent) => {
      qs(".selected")?.classList.remove("selected");
      this.removeTargets();
      this._startX = evt.clientX; this._startY = evt.clientY;
      let piece = evt.target as HTMLDivElement;
      this._dragging = piece;
      piece.classList.add("moving");
      let piecePos = piece.dataset.col! + piece.dataset.row!;
      let legal = this._rule.findLegalMoves(piecePos, true);
      this.addTargets(legal);
    });
    piece.addEventListener('dragend', (evt: Event) => {
      this._dragging?.classList.remove("moving");
      this._dragging?.classList.add("selected");
      // evt.target.style = "";
      this._dragging = undefined;
    })
    piece.addEventListener("dragover", (evt: Event) => {
      evt.preventDefault();
    });
    piece.addEventListener("drop", (evt: Event) => {
      let pc = evt.target as HTMLElement;
      qs(".dragin")?.classList.remove("dragin");

      let move = this._dragging!.dataset.col! + this._dragging!.dataset.row! + pc.dataset.col! + pc.dataset.row!;
      let label: "targetable" | "nontargetable" = pc.classList.contains("targetable") ? "targetable" : "nontargetable";
      this._dragging = undefined;
      this._displayAttemptedMove(move, label);
    });
    if (fentype === 'k') {
      piece.classList.add("king");
    }
    return piece;
  }

  // <section id="effects">
  //   <section id="capture" class="inactive">  * add active class for 1 sec to show animation
  //     <img src="utils/点.svg" alt="">
  //     <img src="utils/吃.svg" alt="">
  //   </section>
  //   <section id="check" class="inactive">
  //     <img src="utils/圆.svg" alt="">
  //     <img src="utils/将.svg" alt="">
  //     <img src="utils/军.svg" alt="">
  //   </section>
  //   <section id="mate" class="inactive">
  //     <img src="utils/泼墨.svg" alt="">
  //     <img src="utils/绝.svg" alt="">
  //     <img src="utils/杀.svg" alt="">
  //   </section>
  // </section>
  private _genEffects() {
    let effects = gen("section");  effects.id = "effects";
    let capture = gen("section"); capture.id = "capture";
    capture.classList.add("inactive");
    let capBack = gen("img") as HTMLImageElement;  capBack.src = 'utils/圆.svg';
    let capChar = gen("img") as HTMLImageElement;  capChar.src = 'utils/吃.svg';
    capture.appendChild(capBack);  capture.appendChild(capChar);
    effects.appendChild(capture);
    let check = gen("section"); check.id = "check";
    check.classList.add("inactive");
    let chkBack = gen("img") as HTMLImageElement; chkBack.src = "utils/点.svg";
    let chkLeft = gen("img") as HTMLImageElement; chkLeft.src = "utils/将.svg";
    let chkRight = gen("img") as HTMLImageElement; chkRight.src = "utils/军.svg";
    check.appendChild(chkBack);  check.appendChild(chkLeft); check.appendChild(chkRight);
    effects.appendChild(check);
    let mate = gen("section"); mate.id = "mate";
    mate.classList.add("inactive");
    let mteBack = gen("img") as HTMLImageElement; mteBack.src = "utils/泼墨.svg";
    let mteLeft = gen("img") as HTMLImageElement; mteLeft.src = "utils/绝.svg";
    let mteRight = gen("img") as HTMLImageElement; mteRight.src = "utils/杀.svg";
    mate.appendChild(mteBack);  mate.appendChild(mteLeft); mate.appendChild(mteRight);
    effects.appendChild(mate);
    return effects;
  }

  public displayCheck(): void {
    id("check").classList.remove("inactive");
    setTimeout(() => {
      id("check").classList.add("inactive");
    }, 1000);
  }

  public displayCapture(): void {
    id("capture").classList.remove("inactive");
    setTimeout(() => {
      id("capture").classList.add("inactive");
    }, 1000);
  }

  public displayMate(): void {
    id("mate").classList.remove("inactive");
    setTimeout(() => {
      id("mate").classList.add("inactive");
    }, 1500);
  }

  public displayMove(move: string): void {
    // capture piece
    let pieceAtTarget = qs(`[data-col="${move.charAt(2)}"][data-row="${move.charAt(3)}"]`);
    if (pieceAtTarget) { id("captured").appendChild(pieceAtTarget); }

    // assume a piece at start position
    let piece = qs(`[data-col="${move.charAt(0)}"][data-row="${move.charAt(1)}"]`)!;
    qs(".selected")?.classList.remove("selected");
    piece.classList.add("moving");
    piece.dataset.col = move.charAt(2);
    piece.dataset.row = move.charAt(3);
    setTimeout(() => {
      piece.classList.remove("moving");
    }, 200);

    // replace markers
    qs(".markEnd")?.classList.remove("markEnd");
    qs(".markStart")?.classList.remove("markStart");
    qs(`[data-index="${move.substring(0, 2)}"]`)!.classList.add("markStart");
    qs(`[data-index="${move.substring(2)}"]`)!.classList.add("markEnd");
  }

  public displayMoveFail(move: string): void {
    // moveFail only happens when you have a selected piece
    let piece = qs(`[data-col="${move.charAt(0)}"][data-row="${move.charAt(1)}"]`)!;
    piece.classList.add("fastMove");
    piece.classList.add("moving");
    piece.dataset.col = move.charAt(2);
    piece.dataset.row = move.charAt(3);
    setTimeout(() => {
      piece.dataset.col = move.charAt(0);
      piece.dataset.row = move.charAt(1);
      piece.classList.remove("fastMove");
      piece.classList.remove("moving");
    }, 100);
    piece.classList.add("selected");
  }

  public displaySuicideWarning(positions: string[]): void {
    positions.forEach(pos => {
      let currSq = qs(`[data-index="${pos}"]`)!;
      currSq.classList.add("warning");
      setTimeout(() => {
        currSq.classList.remove("warning");
      }, 1000);
    });
  }

  // A: show all semilegal positions. For suicidal ones show attacking pieces
  //    pattern here should be semilegal ones. when you move you check if that is suicide, and warning is displayed
  // B: show only legal positions. No warning.
  //    pattern here is legal positions. No check when you move
  public addTargets(pattern: string) {
    if (pattern.length !== 90) {
      throw new Error("legalPattern should be 90");
    }
    this._addTargetsForPieces(pattern);
    this._addTargetsForSquares(pattern);
  }

  private _addTargetsForSquares(pattern: string) {
    let currSq = id("squares").firstElementChild;
    let i = 0;
    while (currSq) {
      let isLegal = pattern.charAt(i);
      let label = (isLegal === "1") ? "targetable" : "nontargetable";
      currSq.classList.add(label);
      currSq = currSq.nextElementSibling;
      i++;
    }
  }

  private _addTargetsForPieces(pattern: string) {
    qsa("#pieces > div").forEach((piece: HTMLElement) => {
      // string index to 0-based index
      let row = 9 - parseInt(piece.dataset.row!);
      let col = piece.dataset.col!.charCodeAt(0) - 65;
      let index = row * 9 + col;
      let isLegal = pattern.charAt(index);
      let label = (isLegal === "1") ? "targetable" : "nontargetable";
      piece.classList.add(label);
    });
  }

  public removeTargets() {
    qsa(".targetable").forEach((e: HTMLElement) => {
      e.classList.remove("targetable");
    });
    qsa(".nontargetable").forEach((e: HTMLElement) => {
      e.classList.remove("nontargetable");
    });
  }

  public allowSelect(team: number) {
    this.disallowSelect();
    qsa(`#pieces > div.team-${team}`).forEach((e: HTMLElement) => {
      e.classList.add("selectable");
      e.draggable = true;
    });
  }

  public allowAllSelect() {
    qsa(`#pieces > div`).forEach((e: HTMLElement) => {
      e.classList.add("selectable");
      e.draggable = true;
    });
  }

  public disallowSelect() {
    qsa(".selectable").forEach((e: HTMLElement) => {
      e.classList.remove("selectable");
      e.draggable = false;
    });
  }

  /** cases:
   * nothing is selected:
   *    clicked on selectable team - select, ask for rules, show rules;
   * already some selected piece:
   *    on selected: deselect;
   *    clicked on same team: deselect all and change;
   *    move based on select (selectsquare)
   */
  private _onPieceClick(target: HTMLDivElement) {
    if (!qs(".selected")) {
      if (target.classList.contains("selectable")) {
        this._selectPiece(target);
      }
    } else {
      if (target.classList.contains("selected")) {
        this._deselect();
      } else if (target.classList.contains("selectable")) {
        this._deselect();
        this._selectPiece(target);
      } else {
        let selected = qs(".selected")!;
        let attemptedMove = selected.dataset.col! + selected.dataset.row! + target.dataset.col! + target.dataset.row!;
        let moveType = target.classList.contains("targetable") ? "targetable" : "nontargetable";
        this._displayAttemptedMove(attemptedMove, moveType as "targetable" | "nontargetable");
      }
    }
  }

  private _selectPiece(piece: HTMLElement) {
    piece.classList.add("selected");
    let piecePos = piece.dataset.col! + piece.dataset.row!;
    let legal = this._rule.findLegalMoves(piecePos, true);
    this.addTargets(legal);
  }

  private _deselect() {
    qs(".selected")?.classList.remove("selected");
    this.removeTargets();
  }

  private _displayAttemptedMove(attemptedMove: string, type: "targetable" | "nontargetable") {
    if (type === "nontargetable") {
      this.displayMoveFail(attemptedMove);
    } else {
      let attackers = this._rule.findKingAttackersAfterMove(attemptedMove);
      if (attackers.length !== 0) {
        this.displayMoveFail(attemptedMove);
        this.displaySuicideWarning(attackers);
        return;
      }
      let moveStatus = undefined;
      try {
        // makeMove checks rule again in case someone changes the classname of squares/pieces
        moveStatus = this._rule.makeMove(attemptedMove);
      } catch (error) {
        this.displayMoveFail(attemptedMove);
        console.warn("Feels like cheating...");
        return;
      }
      this.displayMove(attemptedMove);
      if (moveStatus.isMate) {
        this.displayMate();
      } else if (moveStatus.isCheck) {
        this.displayCheck();
      } else if (moveStatus.isCapture) {
        this.displayCapture();
      }
      this.removeTargets();
      if (moveStatus.winner !== undefined) {
        let winner = moveStatus.winner;
        if (winner !== 0) {
          // TODO: allow changing of this
          qs(`.team-${3 - winner}.king`)!.classList.add("failed");
        }
        this.disallowSelect();
      }
      if (typeof this._pendingResolver === "function") {
        let resolver = this._pendingResolver;
        this._pendingResolver = undefined;
        this._pendingRejecter = undefined;
        resolver(moveStatus);
      } else {
        console.error("No move was expected");
      }
    }
  }

  private _onSquareClick(target: HTMLDivElement): void {
    let selected = qs(".selected")!;
    if (!selected) { return; }
    let attemptedMove = selected.dataset.col! + selected.dataset.row! + target.dataset.index;
    let moveType = target.classList.contains("targetable") ? "targetable" : "nontargetable";
    this._displayAttemptedMove(attemptedMove, moveType as "targetable" | "nontargetable");
  }
}

type MoveStatus = {
  isCheck: boolean,
  isMate: boolean,
  isCapture: boolean,
  winner?: number,   // for forced loss/draw/mate
  warning?: string  // if there is a cycle and you must change your move
}

type PieceName = {
  'r': string,
  'n': string,
  'c': string,
  'g': string,
  'e': string,
  'p': string,
  'k': string
}

type BitBoard = string;

class Rules {
  _layout: string[];
  _currTurn: number;
  _nonCapturePlays: number;
  _rounds: number;
  _playedMoves: string[];

  constructor(fen: string) {
    let fenParts = fen.split(" ");
    this._layout = this.fenToLayout(fenParts[0]);
    this._currTurn = fenParts[1] === 'b' ? 2 : 1;
    this._nonCapturePlays = parseInt(fenParts[2]);
    this._rounds = parseInt(fenParts[3]);
    this._playedMoves = [];
  }

  public get currTurn() {
    return this._currTurn;
  }

  // sample fen: "rnegkgenr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNEGKGENR r 0 1"
  // 0=half round after last capture; 1=number of full rounds, start with 1 and increment after black moves
  private fenToLayout(fenLayout: string) {
    let result: string[] = [];
    fenLayout.split("/").forEach((rank: string) => {
      for (let i = 0; i < rank.length; i++) {
        let currChar = rank[i];
        if (isNaN(parseInt(currChar))) {
          result.push(currChar);
        } else {
          for (let j = 0; j < parseInt(currChar); j++) {
            result.push("");
          }
        }
      }
    });
    return result;
  }

  private posToIndex(pos: string): number {
    let col = pos.charCodeAt(0) - 65;  // 0-based
    let row = 9 - parseInt(pos.charAt(1));
    return row * 9 + col;
  }

  public findLegalMoves(pos: string, allowSuicide: boolean = false): BitBoard {
    let index = this.posToIndex(pos);
    let piece = this._layout[index];
    if (piece === "") {
      console.warn("Looked up moves for an empty square");
      return "0".repeat(90);
    }
    let legal = this.findSemilegalMoves(index);
    if (!allowSuicide) {
      let suicidal = this.pickSuicidalMoves(index, legal);
      legal = this.bitwiseAnd(legal, this.bitwiseNot(suicidal));
    }
    return legal;
  }

  private bitwiseAnd(a: BitBoard, b: BitBoard): BitBoard {
    let result = "";
    for (let i = 0; i < 90; i++) {
      result += (a.charAt(i) === "1" && b.charAt(i) === "1") ? "1" : "0";
    }
    return result;
  }

  /**
   * implementation for NoRules
   */
  // private findSemilegalMoves(index: number): BitBoard {
  //   let piece = this._layout[index];
  //   let team = this.teamof(piece);
  //   return this.bitwiseNot(this.genTeamBitBoard(team));
  // }

  // 00 01 02 03 04 05 06 07 08
  // 09 10 11 12 13 14 15 16 17
  // 18 19 20 21 22 23 24 25 26
  // 27 28 29 30 31 32 33 34 35
  // 36 37 38 39 40 41 42 43 44
  // 45 46 47 48 49 50 51 52 53
  // 54 55 56 57 58 59 60 61 62
  // 63 64 65 66 67 68 69 70 71
  // 72 73 74 75 76 77 78 79 80
  // 81 82 83 84 85 86 87 88 89
  private findSemilegalMoves(index: number): BitBoard {
    let semilegal = "0".repeat(90);
    let piece = this._layout[index];
    if (piece === "") {
      console.warn("Looked up moves for an empty square");
      return semilegal;
    }
    switch (piece.toLowerCase()) {
      case 'r':
        semilegal = this.findSemilegalForRook(index);
        break;
      case 'n':
        semilegal = this.findSemilegalForKnight(index);
        break;
      case 'c':
        semilegal = this.findSemilegalForCannon(index);
        break;
      case 'g':
        semilegal = this.findSemilegalForGuard(index);
        break;
      case 'e':
        semilegal = this.findSemilegalForElephant(index);
        break;
      case 'p':
        semilegal = this.findSemilegalForPawn(index);
        break;
      case 'k':
        semilegal = this.findSemilegalForKing(index);
        break;
      default:
        console.error("Unrecognized piece: " + piece);
        break;
    }
    return semilegal;
  }

  private findSemilegalForRook(index: number): BitBoard {
    let semilegal = "0".repeat(90);
    let team = this.teamof(this._layout[index]);  // team of the piece
    for (let d = 1; d <= 4; d++) {
      if (!this.atBorder(index, d)) {
        let curr = this.stepUpdate(index, d);
        while (!this.atBorder(curr, d) && this._layout[curr] === "") {
          semilegal = this.replace(semilegal, "1", curr);
          curr = this.stepUpdate(curr, d);
        }
        if (this._layout[curr] === "" || this.teamof(this._layout[curr]) !== team) {
          semilegal = this.replace(semilegal, "1", curr);
        }
      }
    }
    return semilegal;
  }

  private findSemilegalForKnight(index: number) {
    let semilegal = "0".repeat(90);
    let team = this.teamof(this._layout[index]);
    for (let d = 1; d <= 4; d++) {
      let curr = this.stepUpdate(index, d);
      if (this._layout[curr] === "") {
        if (!this.atBorder(curr, d) && !this.atBorder(curr, d + 1)) {
          let ccw = this.stepUpdate(curr, d);
          ccw = this.stepUpdate(ccw, d + 1);  // going in counterclockwise direction
          if (this._layout[ccw] === "" || this.teamof(this._layout[ccw]) !== team) {
            semilegal = this.replace(semilegal, "1", ccw);
          }
        }
        if (!this.atBorder(curr, d) && !this.atBorder(curr, d - 1)) {
          let cw = this.stepUpdate(curr, d);
          cw = this.stepUpdate(cw, d - 1);  // going in clockwise direction
          if (this._layout[cw] === "" || this.teamof(this._layout[cw]) !== team) {
            semilegal = this.replace(semilegal, "1", cw);
          }
        }
      }
    }
    return semilegal;
  }

  private findSemilegalForCannon(index: number) {
    let semilegal = "0".repeat(90);
    let team = this.teamof(this._layout[index]);
    for (let d = 1; d <= 4; d++) {
      if (!this.atBorder(index, d)) {
        let curr = this.stepUpdate(index, d);
        while (!this.atBorder(curr, d) && this._layout[curr] === "") {
          semilegal = this.replace(semilegal, "1", curr);
          curr = this.stepUpdate(curr, d);
        }
        if (this._layout[curr] === "") {
          semilegal = this.replace(semilegal, "1", curr);
        } else if (!this.atBorder(curr, d)) {
          // not at border: try continue going until you see another piece, try to eat it
          curr = this.stepUpdate(curr, d);
          while (!this.atBorder(curr, d) && this._layout[curr] === "") {
            curr = this.stepUpdate(curr, d);
          }
          if (this._layout[curr] !== "" && this.teamof(this._layout[curr]) !== team) {
            semilegal = this.replace(semilegal, "1", curr);
          }
        }
      }
    }
    return semilegal;
  }

  private findSemilegalForGuard(index: number) {
    let semilegal = "0".repeat(90);
    let team = this.teamof(this._layout[index]);
    for (let d = 1; d <= 4; d++) {
      if (!this.atBorder(index, d) && !this.atBorder(index, d + 1)) {
        let curr = this.stepUpdate(index, d);
        curr = this.stepUpdate(curr, d + 1);
        let inPalace = (team === 1) ? this.inRedPalace(curr) : this.inBlackPalace(curr);
        if (inPalace && (this._layout[curr] === "" || this.teamof(this._layout[curr]) !== team)) {
          semilegal = this.replace(semilegal, "1", curr);
        }
      }
    }
    return semilegal;
  }

  private findSemilegalForElephant(index: number) {
    let semilegal = "0".repeat(90);
    let team = this.teamof(this._layout[index]);
    for (let d = 1; d <= 4; d++) {
      if (!this.atBorder(index, d) && !this.atBorder(index, d + 1)) {
        let curr = this.stepUpdate(index, d);
        curr = this.stepUpdate(curr, d + 1);
        if (this._layout[curr] === "" &&
            !this.atBorder(curr, d) && !this.atBorder(curr, d + 1)) {
          curr = this.stepUpdate(curr, d);
          curr = this.stepUpdate(curr, d + 1);
          let inTerritory = (team === 1) === this.inRedTerritory(curr);
          if (inTerritory && (this._layout[curr] === "" || this.teamof(this._layout[curr]) !== team)) {
            semilegal = this.replace(semilegal, "1", curr);
          }
        }
      }
    }
    return semilegal;
  }

  private findSemilegalForPawn(index: number) {
    let semilegal = "0".repeat(90);
    let team = this.teamof(this._layout[index]);
    let inTerritory = (team === 1) === this.inRedTerritory(index);
    let forwardDir = (team === 1) ? 1 : 3;
    if (!this.atBorder(index, forwardDir)) {
      let forward = this.stepUpdate(index, forwardDir);
      if (this._layout[forward] === "" || this.teamof(this._layout[forward]) !== team) {
        semilegal = this.replace(semilegal, "1", forward);
      }
    }
    if (!inTerritory) {
      for (let d = 0; d <= 2; d += 2) {
        if (!this.atBorder(index, d)) {
          let curr = this.stepUpdate(index, d);
          if (this._layout[curr] === "" || this.teamof(this._layout[curr]) !== team) {
            semilegal = this.replace(semilegal, "1", curr);
          }
        }
      }
    }
    return semilegal;
  }

  private findSemilegalForKing(index: number) {
    let semilegal = "0".repeat(90);
    let team = this.teamof(this._layout[index]);
    for (let d = 1; d <= 4; d++) {
      if (!this.atBorder(index, d)) {
        let curr = this.stepUpdate(index, d);
        let inPalace = (team === 1) ? this.inRedPalace(curr) : this.inBlackPalace(curr);
        if (inPalace && (this._layout[curr] === "" || this.teamof(this._layout[curr]) !== team)) {
          semilegal = this.replace(semilegal, "1", curr);
        }
      }
    }
    // move forward and stop when you see a piece/at border. If that piece is a opponent's king then put it in
    let forwardDir = (team === 1) ? 1 : 3;
    if (!this.atBorder(index, forwardDir)) {
      let curr = this.stepUpdate(index, forwardDir);
      while (!this.atBorder(curr, forwardDir) && this._layout[curr] === "") {
        curr = this.stepUpdate(curr, forwardDir);
      }
      if (this._layout[curr].toLowerCase() === "k" && this.teamof(this._layout[curr]) !== team) {
        semilegal = this.replace(semilegal, "1", curr);
      }
    }
    return semilegal;
  }

  // assume index is in 0-89 range. same for related private methods below
  private atBorder(index: number, direction: number): boolean {
    let result = false;
    switch (direction % 4) {
      case 0:  // right
        result = index % 9 === 8;
        break;
      case 1:  // top
        result = index < 9;
        break;
      case 2:  // left
        result = index % 9 === 0;
        break;
      case 3:  // bottom
        result = index >= 81;
        break;
      default:
        throw new Error("Unknown direction: " + direction);
    }
    return result;
  }

  private stepUpdate(index: number, direction: number): number {
    let result = 0;
    switch (direction % 4) {
      case 0:  // right
        result = index + 1;
        break;
      case 1:  // top
        result = index - 9;
        break;
      case 2:  // left
        result = index - 1;
        break;
      case 3:  // bottom
        result = index + 9;
        break;
      default:
        throw new Error("Unknown direction: " + direction);
    }
    return result;
  }

  // 66 67 68
  // 75 76 77
  // 84 85 86
  private inRedPalace(index: number): boolean {
    return index % 9 >= 3 && index % 9 <= 5 && index > 62;
  }

  // 03 04 05
  // 12 13 14
  // 21 22 23
  private inBlackPalace(index: number): boolean {
    return index % 9 >= 3 && index % 9 <= 5 && index <= 26;
  }

  private inRedTerritory(index: number): boolean {
    return index >= 45;
  }

  private replace(str: string, char:string, i: number) {
    return str.substring(0, i) + char + str.substring(i + 1);
  }

  private pickSuicidalMoves(index: number, semilegal: BitBoard): BitBoard {
    let suicide = "0".repeat(90);
    for (let i = 0; i < semilegal.length; i++) {
      if (semilegal.charAt(i) === "1") {
        // suppose you move from index to i. am i checked? if yes write 1 else 0
        let attackers = this.detectSuicide(index, i);
        if (attackers.length !== 0) {
          suicide = this.replace(suicide, "1", i);
        }
      }
    }
    return suicide;
  }

  private detectSuicide(start: number, end: number) {
    let atEnd = this._layout[end];
    this._layout[end] = this._layout[start];
    this._layout[start] = "";
    let checkers = this.findCheckers(this._currTurn);
    this._layout[start] = this._layout[end];
    this._layout[end] = atEnd;
    return checkers;
  }

  public findKingAttackersAfterMove(move: string): string[] {
    let start = this.posToIndex(move.substring(0, 2));
    let end = this.posToIndex(move.substring(2));

    let checkers = this.detectSuicide(start, end);

    let result: string[] = [];
    checkers.forEach(checkerIndex => {
      result.push(this.indexToPos(checkerIndex));
    });
    return result;
  }

  // ９ 00 01 02 03 04 05 06 07 08
  // ８ 09 10 11 12 13 14 15 16 17
  // ７ 18 19 20 21 22 23 24 25 26
  // ６ 27 28 29 30 31 32 33 34 35
  // ５ 36 37 38 39 40 41 42 43 44
  // ４ 45 46 47 48 49 50 51 52 53
  // ３ 54 55 56 57 58 59 60 61 62
  // ２ 63 64 65 66 67 68 69 70 71
  // １ 72 73 74 75 76 77 78 79 80
  // ０ 81 82 83 84 85 86 87 88 89
  //    Ａ Ｂ Ｃ Ｄ  Ｅ Ｆ Ｇ Ｈ Ｉ
  private indexToPos(index: number): string {
    let row = "" + (9 - Math.floor(index / 9));
    let col = String.fromCharCode(65 + index % 9);
    return col + row;
  }

  private genTeamBitBoard(team: number) {
    let result = "";
    // for each piece
    for (let i = 0; i < 90; i++) {
      let currPiece = this._layout[i];
      result += (currPiece !== "" && (this.teamof(currPiece) === team)) ? "1" : "0";
    }
    return result;
  }

  private bitwiseNot(b: BitBoard) {
    let result = "";
    for (let i = 0; i < b.length; i++) {
      result += b.charAt(i) === "0" ? "1" : "0";
    }
    return result;
  }

  public makeMove(move: string): MoveStatus {
    this.validateMove(move);
    let startIndex = this.posToIndex(move.substring(0, 2));
    let endIndex = this.posToIndex(move.substring(2));
    let moveStatus: MoveStatus = this.createMoveStatus(startIndex, endIndex);
    this._layout[endIndex] = this._layout[startIndex];
    this._layout[startIndex] = "";
    this._currTurn = 3 - this._currTurn;
    this._playedMoves.push(move);
    if (moveStatus.isCapture) {
      this._nonCapturePlays = 0;
    } else {
      this._nonCapturePlays++;
    }
    if (this._currTurn === 2) {
      this._rounds++;
    }
    if (this._nonCapturePlays >= 120) {
      moveStatus.winner = 0;
    }
    return moveStatus;
  }

  // throws an error if the move is not valid
  private validateMove(move: string): void {
    let legal = this.findLegalMoves(move.substring(0, 2), false);
    let endPos = this.posToIndex(move.substring(2));
    if (legal.charAt(endPos) !== "1") {
      throw new Error("What you chose is not a legal option");
    }
  }

  // assumes valid move
  private createMoveStatus(start: number, end: number): MoveStatus {
    // pretend that I made the move then reverse back
    let atEnd = this._layout[end];
    this._layout[end] = this._layout[start];
    this._layout[start] = "";
    let moveStatus: MoveStatus = {
      isCapture: atEnd !== "",
      isCheck: this.detectChecked(3 - this._currTurn),
      isMate: this.detectMated(),
    }
    this._layout[start] = this._layout[end];
    this._layout[end] = atEnd;

    if (moveStatus.isMate) {
      moveStatus.winner = this._currTurn;
    }
    // TODO: rule based draw
    return moveStatus;
  }

  // for the CURRENT layout, detects if this team is in check.
  // faster (but probably hard to read) position:
  // find king's position
  // go out from king's position, do you see...
  // king/rook?
  // then cannon?
  // knight?
  // pawn?
  private detectChecked(team: number = 3 - this._currTurn): boolean {
    let isCheck = false;
    let kingIndex = this.findKingPos(team);
    let opponents = this.genTeamBitBoard(3 - team);
    for (let i = 0; i < opponents.length; i++) {
      if (opponents.charAt(i) === "1") {
        let reachable = this.findSemilegalMoves(i);
        if (reachable.charAt(kingIndex) === "1") {
          isCheck = true;
          break;
        }
      }
    }
    return isCheck;
  }

  // a copy of the same method above but it returns all index of checkers
  private findCheckers(team: number = 3 - this._currTurn): number[] {
    let attackers: number[] = [];
    let kingIndex = this.findKingPos(team);
    let opponents = this.genTeamBitBoard(3 - team);
    for (let i = 0; i < opponents.length; i++) {
      if (opponents.charAt(i) === "1") {
        let reachable = this.findSemilegalMoves(i);
        if (reachable.charAt(kingIndex) === "1") {
          attackers.push(i);
        }
      }
    }
    return attackers;
  }

  private findKingPos(team: number): number {
    let curr = team === 1 ? 66 : 3;
    let expected = team === 1 ? 'K' : 'k';
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (this._layout[curr] === expected) {
          return curr;
        }
        curr++;
      }
      curr += 6;
    }
    return -1;
  }

  // checks if player not moving is mated.
  // try everything that player can do
  // for every move, imagine the layout after the move. does that put himself in check?
  // if no that it's not mate
  private detectMated(): boolean {
    let opponent = this.genTeamBitBoard(3 - this._currTurn);
    for (let i = 0; i < opponent.length; i++) {
      if (opponent.charAt(i) === "1") {
        let reachable = this.findSemilegalMoves(i);
        for (let j = 0; j < reachable.length; j++) {
          if (reachable[j] === "1") {
            // attempt the move from i to j
            let atEnd = this._layout[j];
            this._layout[j] = this._layout[i];
            this._layout[i] = "";
            let opponentInCheck = this.detectChecked(3 - this._currTurn);
            this._layout[i] = this._layout[j];
            this._layout[j] = atEnd;
            if (!opponentInCheck) {
              return false;
            }
          }
        }
      }
    }
    return true;
  }

  private teamof(char: string): number {  // assume the input is only a-zA-Z
    // red is uppercase, ascii is 65-90; a-z is 97-122
    return (char.charCodeAt(0) < 97) ? 1 : 2;
  }
}

class Match {
  _myTeam: number;
  _currPlayer: number;
  _winner: number;  // -1: not finished, 0: draw, 1/2: team
  _board: HTMLBoard;  // TODO: Board
  _rules: Rules;
  _p1Time: number;
  _p2Time: number;

  constructor(myTeam: 1 | 2, time: number = 600000,
        fen: string = "rnegkgenr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNEGKGENR r 0 1") {
    this._myTeam = myTeam;
    this._currPlayer = fen.split(" ")[1] === 'b' ? 2 : 1;
    this._winner = -1;
    this._board = new HTMLBoard(fen, myTeam);
    this._rules = new Rules(fen);
    this._p1Time = time;
    this._p2Time = time;
  }

  public get board() {
    return this._board.gameElement;
  }

  private requestNextMove(team: number) {
    this._board.allowSelect(team);
    return new Promise<MoveStatus>((resolve, reject) => {
      this._board.pendingResolver = resolve;
      this._board.pendingRejecter = reject;
    });
  }

  public async startGame() {
    while (this._winner === -1) {
      let status = await this.requestNextMove(this._currPlayer);
      if (status.winner !== undefined) {
        this._winner = status.winner;
        this._board.disallowSelect();
      }
      this._currPlayer = 3 - this._currPlayer;
    }
  }
}

/**
 * Returns the element that has the ID attribute with the specified value,
 *  or null if not found.
 * @param {string} idName - element ID
 * @returns {HTMLElement} DOM object associated with id.
 */
function id(idName: string): HTMLElement {
  let result = document.getElementById(idName);
  if (!result) {
    throw new Error('Cannot find element with id ' + idName);
  }
  return result;
}

/**
 * Returns the first element that matches the given CSS selector.
 * @param {string} selector - CSS query selector.
 * @returns {object} The first DOM object matching the query.
 */
function qs(selector: string): HTMLElement | null {
  return document.querySelector(selector);
}

/**
 * Returns the array of elements that match the given CSS selector.
 * @param {string} selector - CSS query selector
 * @returns {object[]} array of DOM objects matching the query.
 */
function qsa(selector: string): NodeListOf<HTMLElement> {
  return document.querySelectorAll(selector);
}

/**
 * Returns a new element with the given tag name.
 * @param {string} tagName - HTML tag name for new DOM element.
 * @returns {object} New DOM object for given HTML tag.
 */
function gen(tagName: string): HTMLElement {
  return document.createElement(tagName);
}

let game = new Match(1);
id("game").appendChild(game.board);
game.startGame();