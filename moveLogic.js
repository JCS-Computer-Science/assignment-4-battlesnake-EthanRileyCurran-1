export default function move(gameState) {
    let moveSafety = {
        up: true,
        down: true,
        left: true,
        right: true
    };

    const myHead = gameState.you.body[0];
    const myNeck = gameState.you.body[1];

    const boardWidth = gameState.board.width;
    const boardHeight = gameState.board.height;

    const directions = {
        up: { x: 0, y: 1 },
        down: { x: 0, y: -1 },
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 }
    };

    // Tells me where the head would be if I moved a certain direction
    function getnextposition(direction) {
        return {
            x: myHead.x + directions[direction].x,
            y: myHead.y + directions[direction].y
        };
    }

    // Checks if two positions are the exact same square
    function sameposition(pos1, pos2) {
        return pos1.x === pos2.x && pos1.y === pos2.y;
    }

    // Finds grid distance between two squares
    function distance(pos1, pos2) {
        return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
    }

    // Prevents moving back into my own neck
    if (myNeck.x < myHead.x) {
        moveSafety.left = false;
    } else if (myNeck.x > myHead.x) {
        moveSafety.right = false;
    } else if (myNeck.y < myHead.y) {
        moveSafety.down = false;
    } else if (myNeck.y > myHead.y) {
        moveSafety.up = false;
    }

    // Prevent moving out of bounds
    for (let direction of Object.keys(moveSafety)) {
        let nextPos = getnextposition(direction);

        if (
            nextPos.x < 0 ||
            nextPos.x >= boardWidth ||
            nextPos.y < 0 ||
            nextPos.y >= boardHeight
        ) {
            moveSafety[direction] = false;
        }
    }

    // Prevent colliding with yourself and other snakes
    for (let direction of Object.keys(moveSafety)) {
        let nextPos = getnextposition(direction);

        for (let snake of gameState.board.snakes) {
            for (let bodyPart of snake.body) {
                if (sameposition(nextPos, bodyPart)) {
                    moveSafety[direction] = false;
                }
            }
        }
    }

    let safeMoves = Object.keys(moveSafety).filter(direction => moveSafety[direction]);

    // List of safe moves only
 
    // Weighted game logic
    // This gives each safe move a score.
    // The snake will choose the move with the highest score.
    function scoreMove(direction) {
        let nextPos = getnextposition(direction);
        let score = 0;

        let closestFoodDistance = Infinity;

        // Find the closest food to this possible move
        for (let food of gameState.board.food) {
            let foodDistance = distance(nextPos, food);

            if (foodDistance < closestFoodDistance) {
                closestFoodDistance = foodDistance;
            }
        }

        // Reward moving closer to food
        if (closestFoodDistance !== Infinity) {
            score += 100 - closestFoodDistance * 10;
        }

        // If health is low, food matters more
        if (gameState.you.health < 40 && closestFoodDistance !== Infinity) {
            score += 100 - closestFoodDistance * 15;
        }

        // Penalize being on the left or right wall
        if (nextPos.x === 0 || nextPos.x === boardWidth - 1) {
            score -= 25;
        }

        // Penalize being on the top or bottom wall
        if (nextPos.y === 0 || nextPos.y === boardHeight - 1) {
            score -= 25;
        }

        // Find center of board
        let center = {
            x: Math.floor(boardWidth / 2),
            y: Math.floor(boardHeight / 2)
        };

        // Slightly reward being close to the center
        score -= distance(nextPos, center) * 2;

        return score;
    }

    // Choose the highest scored move
    let bestMove = safeMoves[0];
    let bestScore = scoreMove(bestMove);
    let bestMoves = [bestMove];

    for (let move of safeMoves) {
        let moveScore = scoreMove(move);

        if (moveScore > bestScore) {
            bestMove = move;
            bestScore = moveScore;
            bestMoves = [move];
        } else if (moveScore === bestScore && !bestMoves.includes(move)) {
            bestMoves.push(move);
        }
    }

    bestMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];

    // This must be outside the loop
    console.log(`MOVE ${gameState.turn}: Choosing move ${bestMove} with score ${bestScore}`);
    return { move: bestMove };
}
//create the functions and run each function within score function to give each move a score based on the logic you want to implement. Then, choose the move with the highest score to return as your next move.
//run each function within score move but declare the actual functions outside of score move so that they can be reused and make the code cleaner.
