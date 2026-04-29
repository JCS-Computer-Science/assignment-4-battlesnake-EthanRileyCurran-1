export default function move(gameState){
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
    }


    //tells me where the head would be when i move a certain direction
    function getnextposition(direction){
        return {
            x: myHead.x + directions[direction].x,
            y: myHead.y + directions[direction].y
        }
    }

    //tells me if my snake is about to or is occupying the same possition as something else
    function sameposition(pos1, pos2){
        return pos1.x === pos2.x && pos1.y === pos2.y;
    }

    //find the distance between two squares and measures using grid distance instead of diagonal distance
    function distance(pos1, pos2){
        return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
    }




    //prevents moving back into my own neck

    //if my neck is left of my snake, then moving left would be colliding with myself
    if (myNeck.x < myHead.x) {
        moveSafety.left = false;
    }
    //if my neck is right of my snake, then moving right would be colliding with myself
    else if (myNeck.x > myHead.x) {
        moveSafety.right = false;
    }
    //if my neck is below my snake, then moving down would be colliding with myself
    else if (myNeck.y < myHead.y) {
        moveSafety.down = false;
    }
    //if my neck is above my snake, then moving up would be colliding with myself
    else if (myNeck.y > myHead.y) {
        moveSafety.up = false;
    }




//prevent moving out of bounds
//goes through up down left right
for (let direction of Object.keys(moveSafety)) {
    //where i would be after moving this way
    let nextPos = getnextposition(direction);
    //checks if these positions are ouside of the board, if they are then it marks that move as unsafe
    if (
        nextPos.x < 0 ||
        nextPos.x >= boardWidth ||
        nextPos.y < 0 ||
        nextPos.y >= boardHeight
    ) {
        //if it goes outside, mark as unsafe
        moveSafety[direction] = false;
    }
}   




    

    // TODO: Step 2 - Prevent your Battlesnake from colliding with itself
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



// list of safe moves only

let safeMoves = Object.keys(moveSafety).filter(direction => moveSafety[direction]);

if (safeMoves.length === 0) {
    console.log(`MOVE ${gameState.turn}: No safe moves detected! Moving down`);
    return { move: "down" };
}


