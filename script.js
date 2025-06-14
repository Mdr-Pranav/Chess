const PIECE_IMAGES = {
    'wK': 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
    'wQ': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
    'wR': 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
    'wB': 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
    'wN': 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
    'wP': 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
    'bK': 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg',
    'bQ': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
    'bR': 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
    'bB': 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
    'bN': 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
    'bP': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
};

const PIECE_UNICODE_TO_CODE = {
    '♔': 'wK', '♕': 'wQ', '♖': 'wR', '♗': 'wB', '♘': 'wN', '♙': 'wP',
    '♚': 'bK', '♛': 'bQ', '♜': 'bR', '♝': 'bB', '♞': 'bN', '♟': 'bP',
};

class ChessGame {
    constructor() {
        this.board = document.getElementById('chessboard');
        this.gameStatus = document.getElementById('gameStatus');
        this.flipBoardBtn = document.getElementById('flipBoard');
        this.newGameBtn = document.getElementById('newGame');
        this.gameOverModal = document.getElementById('gameOverModal');
        this.gameResult = document.getElementById('gameResult');
        this.playAgainBtn = document.getElementById('playAgain');
        this.whiteCaptured = document.getElementById('whiteCaptured');
        this.blackCaptured = document.getElementById('blackCaptured');
        this.movesList = document.getElementById('movesList');

        this.selectedPiece = null;
        this.currentPlayer = 'white';
        this.isFlipped = false;
        this.autoFlip = false;
        this.capturedPieces = {
            white: [],
            black: []
        };
        this.hasMoved = {
            wK: false, wR0: false, wR7: false,
            bK: false, bR0: false, bR7: false
        };
        this.boardArray = [];
        this.moveHistory = [];
        this.draggedPiece = null;
        this.dragOriginSquare = null;
        this.dragOffset = { x: 0, y: 0 };
        this.stateHistory = [];
        this.isDragging = false;
        this.mouseStartPos = { x: 0, y: 0 };

        this.initializeBoard();
        this.setupEventListeners();
    }

    initializeBoard() {
        this.board.innerHTML = '';
        this.boardArray = Array.from({ length: 8 }, () => Array(8).fill(null));
        this.hasMoved = { wK: false, wR0: false, wR7: false, bK: false, bR0: false, bR7: false };
        const initialPosition = {
            0: ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
            1: ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
            6: ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
            7: ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR']
        };
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'white' : 'black'}`;
                square.dataset.row = row;
                square.dataset.col = col;
                if (initialPosition[row]) {
                    const code = initialPosition[row][col];
                    if (code) {
                        const piece = document.createElement('img');
                        piece.className = 'piece';
                        piece.src = PIECE_IMAGES[code];
                        piece.alt = code;
                        piece.dataset.color = code[0] === 'w' ? 'white' : 'black';
                        piece.dataset.code = code;
                        square.appendChild(piece);
                        this.boardArray[row][col] = code;
                    }
                }
                this.board.appendChild(square);
            }
        }
    }

    setupEventListeners() {
        this.board.addEventListener('mousedown', (e) => this.handlePieceMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handlePieceMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handlePieceMouseUp(e));
        this.board.addEventListener('click', (e) => this.handleSquareClick(e));
        this.flipBoardBtn.addEventListener('click', () => this.toggleAutoFlip());
        document.getElementById('undoMove').addEventListener('click', () => this.undoMove());
        this.newGameBtn.addEventListener('click', () => this.startNewGame());
        this.playAgainBtn.addEventListener('click', () => this.startNewGame());
    }

    handlePieceMouseDown(e) {
        const piece = e.target.closest('.piece');
        if (!piece) return;
        const square = piece.parentElement;
        if (piece.dataset.color !== this.currentPlayer) return;

        this.mouseStartPos = { x: e.clientX, y: e.clientY };
        this.isDragging = false;
        
        // Store initial piece position
        this.draggedPiece = piece;
        this.dragOriginSquare = square;
        const rect = piece.getBoundingClientRect();
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        e.preventDefault();
    }

    handlePieceMouseMove(e) {
        if (!this.draggedPiece) return;

        // Check if we've moved enough to consider this a drag
        const dx = e.clientX - this.mouseStartPos.x;
        const dy = e.clientY - this.mouseStartPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (!this.isDragging && distance > 5) {
            this.isDragging = true;
            this.clearSelection();
            this.draggedPiece.classList.add('dragging');
            this.draggedPiece.style.position = 'fixed';
            this.draggedPiece.style.zIndex = 1000;
            this.draggedPiece.style.pointerEvents = 'none';
            if (this.autoFlip && this.currentPlayer === 'black') {
                this.draggedPiece.style.transform = 'rotate(180deg)';
            } else {
                this.draggedPiece.style.transform = 'rotate(0deg)';
            }
        }

        if (this.isDragging) {
            let x = e.clientX, y = e.clientY;
            let offsetX = this.dragOffset.x, offsetY = this.dragOffset.y;
            if (this.autoFlip && this.currentPlayer === 'black') {
                const boardRect = this.board.getBoundingClientRect();
                const relX = e.clientX - boardRect.left;
                const relY = e.clientY - boardRect.top;
                const mirroredX = boardRect.width - relX;
                const mirroredY = boardRect.height - relY;
                offsetX = this.draggedPiece.offsetWidth - this.dragOffset.x;
                offsetY = this.draggedPiece.offsetHeight - this.dragOffset.y;
                x = boardRect.left + mirroredX;
                y = boardRect.top + mirroredY;
            }
            this.draggedPiece.style.left = (x - offsetX) + 'px';
            this.draggedPiece.style.top = (y - offsetY) + 'px';
        }
    }

    handlePieceMouseUp(e) {
        if (!this.draggedPiece) return;

        if (this.isDragging) {
            // Handle drag end
            this.draggedPiece.style.display = 'none';
            const elem = document.elementFromPoint(e.clientX, e.clientY);
            this.draggedPiece.style.display = '';
            const square = elem ? elem.closest('.square') : null;
            let canDrop = false;
            if (square && square.querySelector('.move-dot')) {
                canDrop = true;
            }
            if (canDrop) {
                this.movePiece(this.dragOriginSquare, square);
            } else {
                this.dragOriginSquare.appendChild(this.draggedPiece);
            }
            // Reset styles
            this.draggedPiece.classList.remove('dragging');
            this.draggedPiece.style.position = '';
            this.draggedPiece.style.zIndex = '';
            this.draggedPiece.style.left = '';
            this.draggedPiece.style.top = '';
            this.draggedPiece.style.pointerEvents = '';
            if (this.autoFlip) {
                this.setBoardOrientation(this.currentPlayer);
            } else {
                this.draggedPiece.style.transform = '';
            }
        } else {
            // Handle click
            const square = this.dragOriginSquare;
            const piece = this.draggedPiece;
            this.clearSelection();
            this.selectPiece(square);
        }

        this.draggedPiece = null;
        this.dragOriginSquare = null;
        this.dragOffset = { x: 0, y: 0 };
        this.isDragging = false;
    }

    handleSquareClick(e) {
        // Only handle clicks if we're not dragging
        if (this.isDragging) return;

        const square = e.target.closest('.square');
        if (!square) return;

        const piece = square.querySelector('.piece');
        
        // If clicking on a legal move square
        if (square.querySelector('.move-dot')) {
            if (this.selectedPiece) {
                this.movePiece(this.selectedPiece, square);
                this.clearSelection();
            }
            return;
        }

        // If clicking on a piece of the current player
        if (piece && piece.dataset.color === this.currentPlayer) {
            this.clearSelection();
            this.selectPiece(square);
        } else {
            this.clearSelection();
        }
    }

    selectPiece(square) {
        this.selectedPiece = square;
        square.classList.add('selected');
        const piece = square.querySelector('.piece');
        this.showValidMoves(square, piece.dataset.code, piece.dataset.color);
    }

    clearSelection() {
        if (this.selectedPiece) {
            this.selectedPiece.classList.remove('selected');
            document.querySelectorAll('.move-dot').forEach(dot => dot.remove());
            this.selectedPiece = null;
        }
    }

    showValidMoves(square, code, color) {
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        const moves = this.getValidMoves(row, col, code, color);
        moves.forEach(([r, c]) => {
            // Simulate move on a copy of the board
            const boardCopy = this.boardArray.map(arr => arr.slice());
            boardCopy[r][c] = boardCopy[row][col];
            boardCopy[row][col] = null;
            if (!this.isKingInCheck(this.currentPlayer, boardCopy)) {
                const targetSquare = this.getSquare(r, c);
                if (targetSquare) {
                    const dot = document.createElement('div');
                    dot.className = 'move-dot';
                    targetSquare.style.position = 'relative';
                    targetSquare.appendChild(dot);
                }
            }
        });
    }

    getValidMoves(row, col, piece, color, board = this.boardArray) {
        const moves = [];
        const direction = color === 'white' ? -1 : 1;
        const isOpponent = (r, c) => {
            if (r < 0 || r > 7 || c < 0 || c > 7) return false;
            const code = board[r][c];
            return code && code[0] !== color[0];
        };
        const isEmpty = (r, c) => {
            if (r < 0 || r > 7 || c < 0 || c > 7) return false;
            return !board[r][c];
        };
        switch (piece) {
            case 'wP':
                if (isEmpty(row-1, col)) moves.push([row-1, col]);
                if (row === 6 && isEmpty(row-1, col) && isEmpty(row-2, col)) moves.push([row-2, col]);
                [-1, 1].forEach(dc => {
                    if (isOpponent(row-1, col+dc)) moves.push([row-1, col+dc]);
                });
                break;
            case 'bP':
                if (isEmpty(row+1, col)) moves.push([row+1, col]);
                if (row === 1 && isEmpty(row+1, col) && isEmpty(row+2, col)) moves.push([row+2, col]);
                [-1, 1].forEach(dc => {
                    if (isOpponent(row+1, col+dc)) moves.push([row+1, col+dc]);
                });
                break;
            case 'wN': case 'bN':
                [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc]) => {
                    const r = row+dr, c = col+dc;
                    if (r>=0&&r<8&&c>=0&&c<8 && (!board[r][c] || isOpponent(r,c)))
                        moves.push([r,c]);
                });
                break;
            case 'wB': case 'bB':
                [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc]) => {
                    for(let i=1;i<8;i++){
                        const r=row+dr*i, c=col+dc*i;
                        if(r<0||r>7||c<0||c>7) break;
                        if(isEmpty(r,c)) moves.push([r,c]);
                        else { if(isOpponent(r,c)) moves.push([r,c]); break; }
                    }
                });
                break;
            case 'wR': case 'bR':
                [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc]) => {
                    for(let i=1;i<8;i++){
                        const r=row+dr*i, c=col+dc*i;
                        if(r<0||r>7||c<0||c>7) break;
                        if(isEmpty(r,c)) moves.push([r,c]);
                        else { if(isOpponent(r,c)) moves.push([r,c]); break; }
                    }
                });
                break;
            case 'wQ': case 'bQ':
                [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc]) => {
                    for(let i=1;i<8;i++){
                        const r=row+dr*i, c=col+dc*i;
                        if(r<0||r>7||c<0||c>7) break;
                        if(isEmpty(r,c)) moves.push([r,c]);
                        else { if(isOpponent(r,c)) moves.push([r,c]); break; }
                    }
                });
                break;
            case 'wK':
                [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc]) => {
                    const r=row+dr, c=col+dc;
                    if(r>=0&&r<8&&c>=0&&c<8 && (!board[r][c] || isOpponent(r,c)))
                        moves.push([r,c]);
                });
                // Castling
                if (!this.hasMoved.wK && row === 7 && col === 4) {
                    // Kingside
                    if (!this.hasMoved.wR7 && !board[7][5] && !board[7][6] &&
                        !this.isKingInCheck('white', board) &&
                        !this.isKingInCheck('white', this.simulateMove(board, 7, 4, 7, 5)) &&
                        !this.isKingInCheck('white', this.simulateMove(board, 7, 4, 7, 6))) {
                        moves.push([7, 6]);
                    }
                    // Queenside
                    if (!this.hasMoved.wR0 && !board[7][1] && !board[7][2] && !board[7][3] &&
                        !this.isKingInCheck('white', board) &&
                        !this.isKingInCheck('white', this.simulateMove(board, 7, 4, 7, 3)) &&
                        !this.isKingInCheck('white', this.simulateMove(board, 7, 4, 7, 2))) {
                        moves.push([7, 2]);
                    }
                }
                break;
            case 'bK':
                [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc]) => {
                    const r=row+dr, c=col+dc;
                    if(r>=0&&r<8&&c>=0&&c<8 && (!board[r][c] || isOpponent(r,c)))
                        moves.push([r,c]);
                });
                // Castling
                if (!this.hasMoved.bK && row === 0 && col === 4) {
                    // Kingside
                    if (!this.hasMoved.bR7 && !board[0][5] && !board[0][6] &&
                        !this.isKingInCheck('black', board) &&
                        !this.isKingInCheck('black', this.simulateMove(board, 0, 4, 0, 5)) &&
                        !this.isKingInCheck('black', this.simulateMove(board, 0, 4, 0, 6))) {
                        moves.push([0, 6]);
                    }
                    // Queenside
                    if (!this.hasMoved.bR0 && !board[0][1] && !board[0][2] && !board[0][3] &&
                        !this.isKingInCheck('black', board) &&
                        !this.isKingInCheck('black', this.simulateMove(board, 0, 4, 0, 3)) &&
                        !this.isKingInCheck('black', this.simulateMove(board, 0, 4, 0, 2))) {
                        moves.push([0, 2]);
                    }
                }
                break;
        }
        return moves.filter(([r, c]) => r >= 0 && r < 8 && c >= 0 && c < 8);
    }

    simulateMove(board, fromRow, fromCol, toRow, toCol) {
        const copy = board.map(arr => arr.slice());
        copy[toRow][toCol] = copy[fromRow][fromCol];
        copy[fromRow][fromCol] = null;
        return copy;
    }

    movePiece(fromSquare, toSquare) {
        this.saveState();
        const fromRow = parseInt(fromSquare.dataset.row);
        const fromCol = parseInt(fromSquare.dataset.col);
        const toRow = parseInt(toSquare.dataset.row);
        const toCol = parseInt(toSquare.dataset.col);
        const piece = fromSquare.querySelector('.piece');
        const capturedPiece = toSquare.querySelector('.piece');
        // Castling move
        if (piece.dataset.code === 'wK' && fromRow === 7 && fromCol === 4) {
            if (toRow === 7 && toCol === 6) { // Kingside
                // Move rook
                const rookSquare = this.getSquare(7, 7);
                const rook = rookSquare.querySelector('.piece');
                const newRookSquare = this.getSquare(7, 5);
                newRookSquare.appendChild(rook);
                this.boardArray[7][5] = this.boardArray[7][7];
                this.boardArray[7][7] = null;
                this.hasMoved.wR7 = true;
            } else if (toRow === 7 && toCol === 2) { // Queenside
                const rookSquare = this.getSquare(7, 0);
                const rook = rookSquare.querySelector('.piece');
                const newRookSquare = this.getSquare(7, 3);
                newRookSquare.appendChild(rook);
                this.boardArray[7][3] = this.boardArray[7][0];
                this.boardArray[7][0] = null;
                this.hasMoved.wR0 = true;
            }
            this.hasMoved.wK = true;
        }
        if (piece.dataset.code === 'bK' && fromRow === 0 && fromCol === 4) {
            if (toRow === 0 && toCol === 6) { // Kingside
                const rookSquare = this.getSquare(0, 7);
                const rook = rookSquare.querySelector('.piece');
                const newRookSquare = this.getSquare(0, 5);
                newRookSquare.appendChild(rook);
                this.boardArray[0][5] = this.boardArray[0][7];
                this.boardArray[0][7] = null;
                this.hasMoved.bR7 = true;
            } else if (toRow === 0 && toCol === 2) { // Queenside
                const rookSquare = this.getSquare(0, 0);
                const rook = rookSquare.querySelector('.piece');
                const newRookSquare = this.getSquare(0, 3);
                newRookSquare.appendChild(rook);
                this.boardArray[0][3] = this.boardArray[0][0];
                this.boardArray[0][0] = null;
                this.hasMoved.bR0 = true;
            }
            this.hasMoved.bK = true;
        }
        // Track rook moves
        if (piece.dataset.code === 'wR' && fromRow === 7 && fromCol === 0) this.hasMoved.wR0 = true;
        if (piece.dataset.code === 'wR' && fromRow === 7 && fromCol === 7) this.hasMoved.wR7 = true;
        if (piece.dataset.code === 'bR' && fromRow === 0 && fromCol === 0) this.hasMoved.bR0 = true;
        if (piece.dataset.code === 'bR' && fromRow === 0 && fromCol === 7) this.hasMoved.bR7 = true;
        if (piece.dataset.code === 'wK') this.hasMoved.wK = true;
        if (piece.dataset.code === 'bK') this.hasMoved.bK = true;
        if (capturedPiece) {
            this.handleCapture(capturedPiece);
            capturedPiece.remove();
        }
        toSquare.appendChild(piece);
        piece.classList.add('moving');
        setTimeout(() => piece.classList.remove('moving'), 300);
        // Update board array
        this.boardArray[toRow][toCol] = this.boardArray[fromRow][fromCol];
        this.boardArray[fromRow][fromCol] = null;
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        this.gameStatus.textContent = `${this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1)}'s turn`;
        if (this.autoFlip) {
            this.setBoardOrientation(this.currentPlayer);
        }
        this.checkGameOver();
        this.clearSelection();
        // Track move in algebraic notation
        this.addMoveToHistory(fromSquare, toSquare, piece, capturedPiece);
    }

    handleCapture(piece) {
        const color = piece.dataset.color;
        const code = piece.dataset.code;
        this.capturedPieces[color].push(code);
        this.updateCapturedPieces();
    }

    updateCapturedPieces() {
        this.whiteCaptured.innerHTML = '';
        this.capturedPieces.white.forEach(code => {
            const img = document.createElement('img');
            img.src = PIECE_IMAGES[code];
            img.className = 'piece';
            img.style.width = '28px';
            img.style.height = '28px';
            this.whiteCaptured.appendChild(img);
        });
        this.blackCaptured.innerHTML = '';
        this.capturedPieces.black.forEach(code => {
            const img = document.createElement('img');
            img.src = PIECE_IMAGES[code];
            img.className = 'piece';
            img.style.width = '28px';
            img.style.height = '28px';
            this.blackCaptured.appendChild(img);
        });
    }

    getSquare(row, col) {
        return document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
    }

    flipBoard() {
        // Manual flip if autoFlip is off
        if (!this.autoFlip) {
            this.isFlipped = !this.isFlipped;
            this.board.style.transform = this.isFlipped ? 'rotate(180deg)' : 'rotate(0deg)';
            document.querySelectorAll('.piece').forEach(piece => {
                piece.style.transform = this.isFlipped ? 'rotate(180deg)' : 'rotate(0deg)';
            });
        }
    }

    toggleAutoFlip() {
        this.autoFlip = !this.autoFlip;
        const btn = this.flipBoardBtn;
        if (this.autoFlip) {
            btn.classList.add('active');
            this.setBoardOrientation(this.currentPlayer);
        } else {
            btn.classList.remove('active');
        }
    }

    setBoardOrientation(player) {
        if (player === 'white') {
            this.board.style.transform = 'rotate(0deg)';
            document.querySelectorAll('.piece').forEach(piece => {
                if (!piece.classList.contains('dragging')) {
                    piece.style.transform = 'rotate(0deg)';
                }
            });
        } else {
            this.board.style.transform = 'rotate(180deg)';
            document.querySelectorAll('.piece').forEach(piece => {
                if (!piece.classList.contains('dragging')) {
                    piece.style.transform = 'rotate(180deg)';
                }
            });
        }
    }

    isKingInCheck(color, board = this.boardArray) {
        let kingRow = -1, kingCol = -1;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const code = board[row][col];
                if (code === (color === 'white' ? 'wK' : 'bK')) {
                    kingRow = row;
                    kingCol = col;
                }
            }
        }
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const code = board[row][col];
                if (code && code[0] !== (color === 'white' ? 'w' : 'b')) {
                    const moves = this.getValidMoves(row, col, code, code[0] === 'w' ? 'white' : 'black', board);
                    if (moves.some(([r, c]) => r === kingRow && c === kingCol)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    checkGameOver() {
        document.querySelectorAll('.square.check').forEach(sq => sq.classList.remove('check'));
        let kingRow = -1, kingCol = -1;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const code = this.boardArray[row][col];
                if (code === (this.currentPlayer === 'white' ? 'wK' : 'bK')) {
                    kingRow = row;
                    kingCol = col;
                }
            }
        }
        if (this.isKingInCheck(this.currentPlayer)) {
            const kingSq = this.getSquare(kingRow, kingCol);
            if (kingSq) kingSq.classList.add('check');
        }
        let hasLegalMove = false;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const code = this.boardArray[row][col];
                if (code && code[0] === (this.currentPlayer === 'white' ? 'w' : 'b')) {
                    const moves = this.getValidMoves(row, col, code, this.currentPlayer, this.boardArray);
                    for (const [r, c] of moves) {
                        // Simulate move on a copy of the board
                        const boardCopy = this.boardArray.map(arr => arr.slice());
                        boardCopy[r][c] = boardCopy[row][col];
                        boardCopy[row][col] = null;
                        if (!this.isKingInCheck(this.currentPlayer, boardCopy)) {
                            hasLegalMove = true;
                        }
                        if (hasLegalMove) break;
                    }
                }
                if (hasLegalMove) break;
            }
            if (hasLegalMove) break;
        }
        if (!hasLegalMove && this.isKingInCheck(this.currentPlayer)) {
            this.endGame(this.currentPlayer === 'white' ? 'Black' : 'White');
        }
    }

    endGame(winner) {
        this.gameResult.textContent = `${winner} wins!`;
        this.gameOverModal.style.display = 'flex';
        this.board.classList.add('checkmate-animation');
    }

    startNewGame() {
        this.selectedPiece = null;
        this.currentPlayer = 'white';
        this.isFlipped = false;
        this.autoFlip = false;
        this.capturedPieces = { white: [], black: [] };
        this.gameStatus.textContent = "White's turn";
        this.gameOverModal.style.display = 'none';
        this.board.classList.remove('checkmate-animation');
        this.updateCapturedPieces();
        this.boardArray = Array.from({ length: 8 }, () => Array(8).fill(null));
        this.initializeBoard();
        this.moveHistory = [];
        this.renderMoveHistory();
        this.stateHistory = [];
    }

    addMoveToHistory(fromSquare, toSquare, piece, capturedPiece) {
        const fromRow = parseInt(fromSquare.dataset.row);
        const fromCol = parseInt(fromSquare.dataset.col);
        const toRow = parseInt(toSquare.dataset.row);
        const toCol = parseInt(toSquare.dataset.col);
        const files = 'abcdefgh';
        const ranks = '87654321';
        let move = '';
        // Piece letter
        const code = piece.dataset.code;
        const pieceLetter = code[1] !== 'P' ? code[1] : '';
        // Capture
        const capture = capturedPiece ? 'x' : '';
        // Destination
        const dest = files[toCol] + ranks[toRow];
        // Pawn file for pawn captures
        let pawnFile = '';
        if (code[1] === 'P' && capture) pawnFile = files[fromCol];
        // Castling
        if (code === 'wK' && fromRow === 7 && fromCol === 4 && toRow === 7 && toCol === 6) move = 'O-O';
        else if (code === 'wK' && fromRow === 7 && fromCol === 4 && toRow === 7 && toCol === 2) move = 'O-O-O';
        else if (code === 'bK' && fromRow === 0 && fromCol === 4 && toRow === 0 && toCol === 6) move = 'O-O';
        else if (code === 'bK' && fromRow === 0 && fromCol === 4 && toRow === 0 && toCol === 2) move = 'O-O-O';
        else move = pieceLetter + (pawnFile || '') + capture + dest;
        this.moveHistory.push(move);
        this.renderMoveHistory();
    }

    renderMoveHistory() {
        const tbody = this.movesList.querySelector('tbody');
        tbody.innerHTML = '';
        for (let i = 0; i < this.moveHistory.length; i += 2) {
            const tr = document.createElement('tr');
            const tdWhite = document.createElement('td');
            tdWhite.textContent = this.moveHistory[i] || '';
            if (i === this.moveHistory.length - 1) tdWhite.classList.add('current-move');
            tr.appendChild(tdWhite);
            const tdBlack = document.createElement('td');
            tdBlack.textContent = this.moveHistory[i + 1] || '';
            if (i + 1 === this.moveHistory.length - 1) tdBlack.classList.add('current-move');
            tr.appendChild(tdBlack);
            tbody.appendChild(tr);
        }
    }

    saveState() {
        // Deep copy of boardArray, moveHistory, capturedPieces, hasMoved, and currentPlayer
        this.stateHistory.push({
            boardArray: this.boardArray.map(arr => arr.slice()),
            moveHistory: [...this.moveHistory],
            capturedPieces: {
                white: [...this.capturedPieces.white],
                black: [...this.capturedPieces.black]
            },
            hasMoved: { ...this.hasMoved },
            currentPlayer: this.currentPlayer
        });
    }

    undoMove() {
        if (this.stateHistory.length === 0) return;
        const prev = this.stateHistory.pop();
        this.boardArray = prev.boardArray.map(arr => arr.slice());
        this.moveHistory = [...prev.moveHistory];
        this.capturedPieces = {
            white: [...prev.capturedPieces.white],
            black: [...prev.capturedPieces.black]
        };
        this.hasMoved = { ...prev.hasMoved };
        this.currentPlayer = prev.currentPlayer;
        // Re-render board
        this.renderBoardFromArray();
        this.renderMoveHistory();
        this.updateCapturedPieces();
        this.gameStatus.textContent = `${this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1)}'s turn`;
        if (this.autoFlip) {
            this.setBoardOrientation(this.currentPlayer);
        }
        this.clearSelection();
    }

    renderBoardFromArray() {
        // Remove all pieces
        document.querySelectorAll('.piece').forEach(p => p.remove());
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const code = this.boardArray[row][col];
                if (code) {
                    const square = this.getSquare(row, col);
                    const piece = document.createElement('img');
                    piece.className = 'piece';
                    piece.src = PIECE_IMAGES[code];
                    piece.alt = code;
                    piece.dataset.color = code[0] === 'w' ? 'white' : 'black';
                    piece.dataset.code = code;
                    square.appendChild(piece);
                }
            }
        }
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChessGame();
}); 