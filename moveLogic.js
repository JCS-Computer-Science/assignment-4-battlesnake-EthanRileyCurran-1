export default function move(gameState){
    let moveSafety = {
        up: true,
        down: true,
        left: true,
        right: true
    };
    
    // We've included code to prevent your Battlesnake from moving backwards
    const myHead = gameState.you.body[0];
    const myNeck = gameState.you.body[1];
    
    if (myNeck.x < myHead.x) {        // Neck is left of head, don't move left
        moveSafety.left = false;
        
    } else if (myNeck.x > myHead.x) { // Neck is right of head, don't move right
        moveSafety.right = false;
        
    } else if (myNeck.y < myHead.y) { // Neck is below head, don't move down
        moveSafety.down = false;
        
    } else if (myNeck.y > myHead.y) { // Neck is above head, don't move up
        moveSafety.up = false;
    }
    
    // TODO: Step 1 - Prevent your Battlesnake from moving out of bounds
    // gameState.board contains an object representing the game board including its width and height
    // https://docs.battlesnake.com/api/objects/board
    const boardWidth = gameState.board.width;
    const boardHeight = gameState.board.height;

    if (myHead.x === 0) {
        moveSafety.left = false;
    }
    if (myHead.x === boardWidth - 1) {
        moveSafety.right = false;
    }
    if (myHead.y === 0) {
        moveSafety.down = false;
    }
    if (myHead.y === boardHeight - 1) {
        moveSafety.up = false;
    }
    
    // TODO: Step 2 - Prevent your Battlesnake from colliding with itself
    // gameState.you contains an object representing your snake, including its coordinates
    // https://docs.battlesnake.com/api/objects/battlesnake
    const myBody = gameState.you.body.slice(1);
    const nextPositions = {
        up: { x: myHead.x, y: myHead.y + 1 },
        down: { x: myHead.x, y: myHead.y - 1 },
        left: { x: myHead.x - 1, y: myHead.y },
        right: { x: myHead.x + 1, y: myHead.y }
    };

    Object.keys(nextPositions).forEach(direction => {
        const nextPos = nextPositions[direction];
        const hitsSelf = myBody.some(
            segment => segment.x === nextPos.x && segment.y === nextPos.y
        );

        if (hitsSelf) {
            moveSafety[direction] = false;
        }
    });
    
    
    // TODO: Step 3 - Prevent your Battlesnake from colliding with other Battlesnakes
    // gameState.board.snakes contains an array of enemy snake objects, which includes their coordinates
    // https://docs.battlesnake.com/api/objects/battlesnake
    gameState.board.snakes.forEach(snake => {
        if (snake.id === gameState.you.id) {
            return;
        }

        snake.body.forEach(segment => {
            Object.keys(nextPositions).forEach(direction => {
                const nextPos = nextPositions[direction];

                if (segment.x === nextPos.x && segment.y === nextPos.y) {
                    moveSafety[direction] = false;
                }
            });
        });
    });
    
    // Are there any safe moves left?
    
    //Object.keys(moveSafety) returns ["up", "down", "left", "right"]
    //.filter() filters the array based on the function provided as an argument (using arrow function syntax here)
    //In this case we want to filter out any of these directions for which moveSafety[direction] == false
    const safeMoves = Object.keys(moveSafety).filter(direction => moveSafety[direction]);
    if (safeMoves.length == 0) {
        console.log(`MOVE ${gameState.turn}: No safe moves detected! Moving down`);
        return { move: "down" };
    }
    
    // TODO: Step 4 - Move towards food instead of random, to regain health and survive longer
    // gameState.board.food contains an array of food coordinates https://docs.battlesnake.com/api/objects/board
    const food = gameState.board.food;
    const allSnakeSegments = gameState.board.snakes.flatMap(snake => snake.body);

    const moveChoices = safeMoves.map(direction => {
        const nextPos = nextPositions[direction];
        const adjacentPositions = [
            { x: nextPos.x, y: nextPos.y + 1 },
            { x: nextPos.x, y: nextPos.y - 1 },
            { x: nextPos.x - 1, y: nextPos.y },
            { x: nextPos.x + 1, y: nextPos.y }
        ];

        const escapeRoutes = adjacentPositions.filter(position => {
            const inBounds = position.x >= 0 && position.x < boardWidth && position.y >= 0 && position.y < boardHeight;
            const hitsSnake = allSnakeSegments.some(segment => segment.x === position.x && segment.y === position.y);
            return inBounds && !hitsSnake;
        }).length;

        const foodDistance = food.length === 0 ? Infinity : Math.min(
            ...food.map(foodPos => Math.abs(foodPos.x - nextPos.x) + Math.abs(foodPos.y - nextPos.y))
        );

        return { direction, escapeRoutes, foodDistance };
    });

    let bestMoves = moveChoices;
    const mostEscapeRoutes = Math.max(...moveChoices.map(choice => choice.escapeRoutes));
    bestMoves = bestMoves.filter(choice => choice.escapeRoutes === mostEscapeRoutes);

    if (food.length > 0) {
        const closestFoodDistance = Math.min(...bestMoves.map(choice => choice.foodDistance));
        bestMoves = bestMoves.filter(choice => choice.foodDistance === closestFoodDistance);
    }

    const nextMove = bestMoves[Math.floor(Math.random() * bestMoves.length)].direction;

    console.log(`MOVE ${gameState.turn}: ${nextMove}`)
    return { move: nextMove };
}