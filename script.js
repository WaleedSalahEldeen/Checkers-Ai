let restore = false;
let restpln = -1;
let unsaved = false;

// Small functions
function range(n) {
  let arr = [];
  for (let i = 0; i < n; i++) arr.push(i);
  return arr;
}
function getcol(num) {
  if (num == 0) return -1;
  return (num + 1) % 2;
}
function isup(num) {
  if (num == 0 || num > 4) return -1;
  return num > 2 ? 1 : 0;
}

CanvasRenderingContext2D.prototype.drawArc = function (x, y, r, f) {
  this.beginPath();
  this.arc(x, y, r, 0, 2 * Math.PI);
  this[f ? "fill" : "stroke"]();
};
Array.prototype.chlast = function (el) {
  let last = this.length - 1;
  this[last] = el;
};

function game() {
  let game = document.getElementById("game");
  let ctx = game.getContext("2d");
  let moven = document.getElementById("moven");

  const CELLS = 8;
  const gw = game.width;
  const cell = gw / CELLS;

  const DEF = cell / 20; // Default figure outline width
  const UP = DEF * 2; // Queen outline width

  const SUGGEST = "#6862FF"; // Sugestion color
  const CATCH = "#FF2100"; // "Figure in danger" outline color
  const SELECTED = "#009DFF"; // Selected figure outline color

  let WHITE_C = "#2d292a";
  let BLACK_C = "#f9544c";
  let WHITE_F = ["#f9b60c", "#eee"];
  let BLACK_F = ["#8b4513", "#eee"];

  let matrix = [
    [2, 0, 2, 0, 2, 0, 2, 0],
    [0, 2, 0, 2, 0, 2, 0, 2],
    [2, 0, 2, 0, 2, 0, 2, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1, 0, 1],
  ];

  let pln = 0;
  let chpl = false;
  if (restpln > -1) {
    pln = restpln;
  }

  let ctwh = 0;
  let ctbk = 0;
  let lastxy = [];
  let sel = [];
  let sugg = [];
  let movetype = [];
  let avl_catch_c = [];
  let tomove = [];
  let sugg_ind = -1;
  let chosen = [];
  let multimove = [];

  update();
  /*start */

  function evaluationFunction(matrix, player) {
    let playerCount = 0;
    let opponentCount = 0;

    for (let row = 0; row < CELLS; row++) {
      for (let col = 0; col < CELLS; col++) {
        let piece = matrix[row][col];
        if (getcol(piece) == player) {
          playerCount++;
          if (isup(piece)) playerCount++;
        } else if (getcol(piece) != -1) {
          opponentCount++;
          if (isup(piece)) opponentCount++;
        }
      }
    }

    return playerCount - opponentCount;
  }

  function applyMoveToGame(from, to) {
    const fromRow = from[0];
    const fromCol = from[1];
    const toRow = to[0];
    const toCol = to[1];

    const piece = matrix[fromRow][fromCol];

    if (Math.abs(fromRow - toRow) === 2 && Math.abs(fromCol - toCol) === 2) {
      const catchRow = (fromRow + toRow) / 2;
      const catchCol = (fromCol + toCol) / 2;
      matrix[catchRow][catchCol] = 0;
      if (getcol(piece) === 0) {
        ctbk--;
      } else {
        ctwh--;
      }
    }

    matrix[fromRow][fromCol] = 0;
    matrix[toRow][toCol] = piece;

    if (
      (getcol(piece) == 0 && toRow == CELLS - 1) ||
      (getcol(piece) == 1 && toRow == 0)
    ) {
      //matrix[toRow][toCol] = setasup(matrix[toRow][toCol]);
    }
  }

  function isGameOver(matrix) {
    return ctbk === 0 || ctwh === 0;
  }

  function minimax(
    matrix,
    depth,
    alpha,
    beta,
    maximizingPlayer,
    currentPlayer
  ) {
    if (depth === 0 || isGameOver(matrix)) {
      return [evaluationFunction(matrix, currentPlayer), null];
    }

    let bestMove = null;
    let value;

    if (maximizingPlayer) {
      value = -Infinity;
      const moves = getAllMoves(matrix, currentPlayer);

      for (let move of moves) {
        const newMatrix = applyMove(matrix, move);
        const [minimaxValue, _] = minimax(
          newMatrix,
          depth - 1,
          alpha,
          beta,
          false,
          currentPlayer
        );

        if (minimaxValue > value) {
          value = minimaxValue;
          bestMove = move;
        }

        alpha = Math.max(alpha, value);
        if (alpha >= beta) break;
      }
    } else {
      value = Infinity;
      const moves = getAllMoves(matrix, 1 - currentPlayer);

      for (let move of moves) {
        const newMatrix = applyMove(matrix, move);
        const [minimaxValue, _] = minimax(
          newMatrix,
          depth - 1,
          alpha,
          beta,
          true,
          currentPlayer
        );

        if (minimaxValue < value) {
          value = minimaxValue;
          bestMove = move;
        }

        beta = Math.min(beta, value);
        if (beta <= alpha) break;
      }
    }

    return [value, bestMove];
  }

  function getAllMoves(matrix, player) {
    let moves = [];

    for (let row = 0; row < CELLS; row++) {
      for (let col = 0; col < CELLS; col++) {
        if (getcol(matrix[row][col]) === player) {
          const moveSuggestions = suggest(col, row);
          for (let move of moveSuggestions.sugg) {
            if (move[0] !== -1) moves.push({ from: [row, col], to: move });
          }
        }
      }
    }

    return moves;
  }

  function applyMove(matrix, move) {
    const newMatrix = JSON.parse(JSON.stringify(matrix));
    const fromRow = move.from[0];
    const fromCol = move.from[1];
    const toRow = move.to[0];
    const toCol = move.to[1];
    const piece = newMatrix[fromRow][fromCol];

    newMatrix[fromRow][fromCol] = 0;
    newMatrix[toRow][toCol] = piece;

    const catchRow = (fromRow + toRow) / 2;
    const catchCol = (fromCol + toCol) / 2;

    if (Math.abs(fromRow - toRow) === 2 && Math.abs(fromCol - toCol) === 2) {
      newMatrix[catchRow][catchCol] = 0;
    }

    if ((pln == 0 && toRow == CELLS - 1) || (pln == 1 && toRow == 0)) {
      console.log(matrix[toRow][toCol]);
    }

    return newMatrix;
  }
  function pcMove() {
    const currentPlayer = pln;
    const searchDepth = 8; // Adjust this value to make the AI stronger or weaker
    const [_, bestMove] = minimax(
      matrix,
      searchDepth,
      -Infinity,
      Infinity,
      true,
      currentPlayer
    );

    if (bestMove !== null) {
      applyMoveToGame(bestMove.from, bestMove.to);
    }
  }
  /*end */
  // fire when click a Checker
  game.onpointerup = (evt) => {
    let [y, x] = lastxy;
    if (sugg_ind > -1) move();
    else {
      sel = [y, x];
      ({ sugg, avl_catch_c, movetype } = suggest(x, y));
      if (sugg[0] === undefined) sel = [];
    }
    update();
    win();
  };

  // fire when just hover or move the mouse
  game.onpointermove = (evt) => {
    let [x, y] = getmat(evt);
    if (lastxy[1] != x || lastxy[0] != y) lastxy = [y, x];
    else return;
    sugg_ind = tosugg(x, y);
    if (sugg_ind > -1) {
      game.style.cursor = "cell";
      chosen = Object.assign(sugg[sugg_ind]);
      return;
    }
    game.style.cursor = "crosshair";
  };

  // most important function here
  function update() {
    ctx.clearRect(0, 0, gw, gw);
    if (chpl) {
      game.style.transform = ["rotate(180deg)", "rotate(0deg)"][pln];
      matrix.forEach((_e, ind) => matrix[ind].reverse());
      matrix.reverse();
      pln = [1, 0][pln];
      chpl = false;
      //
      pcMove();
      //
      if (pln === 1) {
        game.style.transform = ["rotate(180deg)", "rotate(0deg)"][pln];
        matrix.forEach((_e, ind) => matrix[ind].reverse());
        matrix.reverse();
        pln = [1, 0][pln];
      }
    }
    moven.innerHTML = `${["Yellow", "Brown"][pln]} Turn!`;

    let _cs = false;
    ctwh = 0;
    ctbk = 0;
    for (let i of range(CELLS)) {
      for (let j of range(CELLS)) {
        let _preset = [j * cell + cell / 2, i * cell + cell / 2];
        ctx.fillStyle = _cs ? BLACK_C : WHITE_C; // Chess-order
        ctx.fillRect(j * cell, i * cell, cell, cell); // Draw a cell

        let _cont = true;
        let tosw = matrix[i][j];
        getcol(tosw) == 0 ? ctwh++ : getcol(tosw) == 1 && ctbk++; // c ? a1 : a2
        switch (tosw) {
          case 1:
          case 3:
            [ctx.fillStyle, ctx.strokeStyle] = WHITE_F;
            break;
          case 2:
          case 4:
            [ctx.fillStyle, ctx.strokeStyle] = BLACK_F;
            break;
          default:
            _cont = false;
            break;
        }
        if (_cont)
          switch (tosw) {
            case 1:
            case 2:
              ctx.lineWidth = DEF;
              break;
            case 3:
            case 4:
              ctx.lineWidth = UP;
              break;
          }
        if (tosugg(j, i, true) > -1) ctx.strokeStyle = CATCH;
        if (j == sel[1] && i == sel[0]) ctx.strokeStyle = SELECTED;
        if (_cont)
          [true, false].forEach((el) => ctx.drawArc(..._preset, cell / 3, el));

        ctx.fillStyle = SUGGEST;
        if (tosugg(j, i) > -1) ctx.drawArc(..._preset, cell / 5, true);

        j < CELLS - 1 && (_cs = !_cs); // c ? a1 : a2
      }
    }
  }

  // higlight the next move
  function suggest(x, y, n = -1, mvch = false) {
    let _mm = multimove[1] !== undefined && !mvch;
    let arr1 = [];
    let arr2 = [];
    let arr3 = [];
    function ret() {
      return {
        sugg: arr1,
        avl_catch_c: arr2,
        movetype: arr3,
      };
    }
    if (_mm) if (x != multimove[1] || y != multimove[0]) return ret();
    let num = n == -1 ? matrix[y][x] : n;
    if (num == 0) return ret();
    curr = getcol(num);
    if (curr != pln) return ret();

    for (let i of range(2)) {
      let currbc = i == 1 && isup(num) == 0;
      for (let j of range(2)) {
        let [dx, dy] = [j, i].map((el) => [-1, 1][el]);

        let nx = x + dx;
        let ny = y + dy;
        let nx2 = x + dx * 2;
        let ny2 = y + dy * 2;
        let nset = [ny, nx];

        arr1.push([-1, -1]);
        arr2.push([-1, -1]);
        arr3.push(-1);

        if (nx >= CELLS || nx < 0 || ny >= CELLS || ny < 0) continue;

        let chcurr = getcol(matrix[ny][nx]);

        let _c = chcurr != -1;
        try {
          if (_c) {
            if (chcurr == curr) continue;
            else if (getcol(matrix[ny2][nx2]) == -1) {
              arr1.chlast([ny2, nx2]);
              arr2.chlast(nset);
              arr3.chlast(2);
              continue;
            } else continue;
          }
        } catch (e) {
          continue;
        }
        if (!currbc && !_mm) {
          arr1.chlast(nset);
          arr3.chlast(1);
        }
      }
    }
    if (arr1.length > 0) tomove = [y, x];
    else tomove = [];
    return ret();
  }
  function move() {
    if (tomove[1] === undefined) return;
    let allowmm = false;
    let [y, x] = tomove;
    let [y2, x2] = chosen;
    let [cy, cx] = [-1, -1];
    let _mt = -1;
    let cn = tosugg(x2, y2);
    let _copy = matrix[y][x];
    let nxm = suggest(x2, y2, _copy, true);

    if (cn > -1) {
      _mt = movetype[cn];
      if (_mt == 2) if (nxm.movetype.includes(2)) allowmm = true;
      [cy, cx] = avl_catch_c[cn];
    }

    matrix[y][x] = 0;
    let _nw = y2 == 0 ? getcol(_copy) + 3 : _copy;
    matrix[y2][x2] = _nw;
    if (cx > -1) matrix[cy][cx] = 0;

    if (allowmm) multimove = Object.assign([], chosen);
    else {
      chpl = true;
      multimove = [];
    }
    clear();
    unsaved = true;
  }

  // helper function to the suggest function
  function tosugg(x, y, cat = false) {
    let res = -1;
    let keep = true;
    (cat ? avl_catch_c : sugg).forEach((el, ind) => {
      if (keep && el[0] == y && el[1] == x) {
        res = ind;
        keep = false;
      }
    });
    return res;
  }

  function getmat(evt) {
    let x = Math.floor(evt.offsetX / cell);
    let y = Math.floor(evt.offsetY / cell);
    x >= CELLS && (x = CELLS - 1);
    y >= CELLS && (y = CELLS - 1);
    x < 0 && (x = 0);
    y < 0 && (y = 0);

    return [x, y];
  }
  function clear() {
    for (let _sh of range(sugg.length)) sugg.pop();
    for (let _sh of range(movetype.length)) movetype.pop();
    for (let _sh of range(avl_catch_c.length)) avl_catch_c.pop();
    lastxy = [];
    sel = [];
    sugg_ind = -1;
    for (let _sh of range(tomove.length)) tomove.pop();
    for (let _sh of range(chosen.length)) chosen.pop(); // and here
  }

  function win() {
    let pl = ctbk == 0 ? 0 : ctwh == 0 ? 1 : -1;
    if (pl == -1) return;
    moven.innerHTML = `<h1>${["YELLOW", "BROWN"][pl]} WINS</h1>`;
  }
}

game();
