const DIRECTION_NAMES = ["up", "down", "left", "right"];

const DIRECTIONS = {
    up: { x: 0, y: 1 },
    down: { x: 0, y: -1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
};

function posKey(pos) {
    return pos.x + "," + pos.y;
}

function add(pos, delta) {
    return { x: pos.x + delta.x, y: pos.y + delta.y };
}

function manhattan(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function isInBounds(pos, boardWidth, boardHeight) {
    return pos.x >= 0 && pos.x < boardWidth && pos.y >= 0 && pos.y < boardHeight;
}

function countWallSides(pos, boardWidth, boardHeight) {
    let walls = 0;

    if (pos.x === 0) walls++;
    if (pos.x === boardWidth - 1) walls++;
    if (pos.y === 0) walls++;
    if (pos.y === boardHeight - 1) walls++;

    return walls;
}

function snakeCanEatNextTurn(snake, food) {
    const head = snake.body[0];

    for (let i = 0; i < food.length; i++) {
        if (manhattan(head, food[i]) === 1) {
            return true;
        }
    }

    return false;
}

function nearestFoodDistance(pos, food) {
    if (food.length === 0) {
        return Infinity;
    }

    let best = Infinity;
    for (let i = 0; i < food.length; i++) {
        const dist = manhattan(pos, food[i]);
        if (dist < best) {
            best = dist;
        }
    }

    return best;
}

function floodFill(start, blocked, boardWidth, boardHeight) {
    if (!isInBounds(start, boardWidth, boardHeight)) {
        return 0;
    }

    if (blocked[posKey(start)]) {
        return 0;
    }

    const stack = [start];
    const seen = {};
    seen[posKey(start)] = true;
    let count = 0;

    while (stack.length > 0) {
        const current = stack.pop();
        count++;

        for (let i = 0; i < DIRECTION_NAMES.length; i++) {
            const direction = DIRECTION_NAMES[i];
            const next = add(current, DIRECTIONS[direction]);
            const key = posKey(next);

            if (!isInBounds(next, boardWidth, boardHeight)) {
                continue;
            }

            if (blocked[key] || seen[key]) {
                continue;
            }

            seen[key] = true;
            stack.push(next);
        }
    }

    return count;
}

function getSnakeLength(snake) {
    if (typeof snake.length === "number") {
        return snake.length;
    }

    return snake.body.length;
}

export default function move(gameState) {
    const you = gameState.you;
    const board = gameState.board;
    const myHead = you.head || you.body[0];
    const myNeck = you.body[1];

    const boardWidth = board.width;
    const boardHeight = board.height;
    const food = board.food || [];
    const hazards = board.hazards || [];

    let hazardDamage = 0;
    if (
        gameState.game &&
        gameState.game.ruleset &&
        gameState.game.ruleset.settings &&
        typeof gameState.game.ruleset.settings.hazardDamagePerTurn === "number"
    ) {
        hazardDamage = gameState.game.ruleset.settings.hazardDamagePerTurn;
    }

    const blocked = {};
    for (let i = 0; i < board.snakes.length; i++) {
        const snake = board.snakes[i];
        const tailIsBlocked = snakeCanEatNextTurn(snake, food);

        for (let j = 0; j < snake.body.length; j++) {
            const isTail = j === snake.body.length - 1;
            if (isTail && !tailIsBlocked) {
                continue;
            }

            blocked[posKey(snake.body[j])] = true;
        }
    }

    const reverseBlocked = {};
    if (myNeck) {
        if (myNeck.x < myHead.x) {
            reverseBlocked.left = true;
        } else if (myNeck.x > myHead.x) {
            reverseBlocked.right = true;
        } else if (myNeck.y < myHead.y) {
            reverseBlocked.down = true;
        } else if (myNeck.y > myHead.y) {
            reverseBlocked.up = true;
        }
    }

    const center = {
        x: Math.floor(boardWidth / 2),
        y: Math.floor(boardHeight / 2)
    };

    const moveChoices = [];
    const yourLength = getSnakeLength(you);
    const openingMode = gameState.turn < 25 || yourLength < 8;
    const enemySnakes = board.snakes.filter(function(snake) {
        return snake.id !== you.id;
    });
    const isEndgame = enemySnakes.length === 1;
    const onlyEnemy = isEndgame ? enemySnakes[0] : null;
    const enemyLength = onlyEnemy ? getSnakeLength(onlyEnemy) : 0;
    const aggressiveEndgame = isEndgame && yourLength > enemyLength;
    const pressureEndgame = isEndgame && yourLength >= enemyLength;

    for (let i = 0; i < DIRECTION_NAMES.length; i++) {
        const direction = DIRECTION_NAMES[i];

        if (reverseBlocked[direction]) {
            continue;
        }

        const nextPos = add(myHead, DIRECTIONS[direction]);
        const nextKey = posKey(nextPos);
        let enemyDistanceBonus = 0;
        let enemyTrapBonus = 0;

        if (!isInBounds(nextPos, boardWidth, boardHeight)) {
            continue;
        }

        if (blocked[nextKey]) {
            continue;
        }

        let losingHeadToHead = false;
        let winningHeadPressure = 0;
        let forceWinPressure = 0;

        for (let j = 0; j < board.snakes.length; j++) {
            const snake = board.snakes[j];
            if (snake.id === you.id) {
                continue;
            }

            const enemyHead = snake.head || snake.body[0];
            const enemyLength = getSnakeLength(snake);
            const enemyHeadDistance = manhattan(nextPos, enemyHead);

            if (enemyHeadDistance === 1) {
                if (enemyLength >= yourLength) {
                    losingHeadToHead = true;
                    break;
                }

                winningHeadPressure++;

                // If a smaller enemy has few safe options, this move can pressure a winning head-to-head.
                let enemySafeMoves = 0;
                for (let k = 0; k < DIRECTION_NAMES.length; k++) {
                    const enemyStep = add(enemyHead, DIRECTIONS[DIRECTION_NAMES[k]]);
                    const stepKey = posKey(enemyStep);

                    if (!isInBounds(enemyStep, boardWidth, boardHeight)) {
                        continue;
                    }

                    if (blocked[stepKey]) {
                        continue;
                    }

                    if (enemyStep.x === nextPos.x && enemyStep.y === nextPos.y) {
                        continue;
                    }

                    enemySafeMoves++;
                }

                if (enemySafeMoves <= 2) {
                    forceWinPressure++;
                }

                const wallSides = countWallSides(enemyHead, boardWidth, boardHeight);

                if (enemyLength < yourLength) {
                    if (wallSides >= 1 && enemySafeMoves <= 1) {
                        forceWinPressure += 2;
                    } else if (wallSides >= 1 && enemySafeMoves === 2) {
                        forceWinPressure += 1;
                    }

                    if (wallSides === 2 && enemySafeMoves <= 2) {
                        forceWinPressure += 2;
                    }
                }
            } else if (enemyLength < yourLength && enemyHeadDistance === 2) {
                // Smaller enemy is close enough that we may be able to force next turn.
                forceWinPressure += 0.5;
            }
        }

        if (losingHeadToHead) {
            continue;
        }

        const space = floodFill(nextPos, blocked, boardWidth, boardHeight);

        let exits = 0;
        for (let j = 0; j < DIRECTION_NAMES.length; j++) {
            const neighbor = add(nextPos, DIRECTIONS[DIRECTION_NAMES[j]]);
            if (isInBounds(neighbor, boardWidth, boardHeight) && !blocked[posKey(neighbor)]) {
                exits++;
            }
        }

        const foodDist = nearestFoodDistance(nextPos, food);
        let score = 0;
        let trapPenalty = 0;
        let preyBonus = 0;

        for (let j = 0; j < board.snakes.length; j++) {
            const snake = board.snakes[j];
            if (snake.id === you.id) {
                continue;
            }

            const enemyHead = snake.head || snake.body[0];
            const enemyLength = getSnakeLength(snake);
            const dist = manhattan(nextPos, enemyHead);

            if (enemyLength < yourLength && dist <= 4) {
                preyBonus += 12 - dist * 2;
            }
        }

        if (isEndgame) {
            const enemyHeadForDistance = onlyEnemy.head || onlyEnemy.body[0];
            const distToEnemy = manhattan(nextPos, enemyHeadForDistance);

            if (aggressiveEndgame) {
                enemyDistanceBonus += 20 - distToEnemy * 3;
            } else if (pressureEndgame) {
                enemyDistanceBonus += 6 - distToEnemy;
            }
        }

        score += Math.min(space, yourLength + 10) * 2;

        if (space < yourLength) {
            trapPenalty += 200;
        }

        if (exits === 0) {
            trapPenalty += 500;
        } else if (exits === 1) {
            trapPenalty += 120;
        }

        score += exits * 6;

        for (let j = 0; j < board.snakes.length; j++) {
            const snake = board.snakes[j];
            if (snake.id === you.id) {
                continue;
            }

            const enemyHead = snake.head || snake.body[0];
            const enemyLength = getSnakeLength(snake);

            if (enemyLength >= yourLength && manhattan(nextPos, enemyHead) <= 2) {
                if (exits <= 1) {
                    trapPenalty += 120;
                } else if (space < yourLength + 3) {
                    trapPenalty += 60;
                }
            }
        }

        score -= trapPenalty;

        if (foodDist < Infinity) {
            if (you.health < 25) {
                score += 60 - foodDist * 8;
            } else if (you.health < 50) {
                score += 30 - foodDist * 4;
            } else if (openingMode) {
                score += 24 - foodDist * 3;
            } else if (!aggressiveEndgame) {
                score += 10 - foodDist;
            }
        }

        score += preyBonus;

        score += enemyDistanceBonus;

        score -= manhattan(nextPos, center) * 0.75;

        let onHazard = false;
        for (let j = 0; j < hazards.length; j++) {
            if (hazards[j].x === nextPos.x && hazards[j].y === nextPos.y) {
                onHazard = true;
                break;
            }
        }

        if (onHazard) {
            score -= 35 + hazardDamage * 2;
            if (you.health < 30) {
                score -= 50;
            }
        }

        if (aggressiveEndgame) {
            const enemyHeadForTrap = onlyEnemy.head || onlyEnemy.body[0];
            const wallSides = countWallSides(enemyHeadForTrap, boardWidth, boardHeight);
            let enemySafeMovesAfterThis = 0;

            for (let j = 0; j < DIRECTION_NAMES.length; j++) {
                const enemyStep = add(enemyHeadForTrap, DIRECTIONS[DIRECTION_NAMES[j]]);
                const stepKey = posKey(enemyStep);

                if (!isInBounds(enemyStep, boardWidth, boardHeight)) {
                    continue;
                }

                if (blocked[stepKey]) {
                    continue;
                }

                if (enemyStep.x === nextPos.x && enemyStep.y === nextPos.y) {
                    continue;
                }

                enemySafeMovesAfterThis++;
            }

            if (enemySafeMovesAfterThis <= 1) {
                enemyTrapBonus += 80;
            } else if (enemySafeMovesAfterThis === 2) {
                enemyTrapBonus += 35;
            }

            if (wallSides >= 1 && enemySafeMovesAfterThis <= 1) {
                enemyTrapBonus += 120;
            } else if (wallSides >= 1 && enemySafeMovesAfterThis === 2) {
                enemyTrapBonus += 45;
            }

            if (wallSides === 2 && enemySafeMovesAfterThis <= 2) {
                enemyTrapBonus += 80;
            }
        }

        score += enemyTrapBonus;

        if (winningHeadPressure > 0 && space > yourLength + 2 && exits >= 2) {
            score += winningHeadPressure * (aggressiveEndgame ? 45 : 25);
        }

        if (forceWinPressure > 0 && space > yourLength + 1 && exits >= 2) {
            score += forceWinPressure * (aggressiveEndgame ? 40 : 20);
        }

        moveChoices.push({
            direction: direction,
            score: score,
            space: space,
            exits: exits,
            foodDist: foodDist,
            trapPenalty: trapPenalty,
            forceWinPressure: forceWinPressure
        });
    }

    if (moveChoices.length === 0) {
        console.log("MOVE " + gameState.turn + ": No safe moves found, moving down");
        return { move: "down" };
    }

    moveChoices.sort(function(a, b) {
        return b.score - a.score;
    });

    const bestScore = moveChoices[0].score;
    const bestMoves = [];
    for (let i = 0; i < moveChoices.length; i++) {
        if (moveChoices[i].score === bestScore) {
            bestMoves.push(moveChoices[i]);
        }
    }

    const chosen = bestMoves[Math.floor(Math.random() * bestMoves.length)];

    console.log(
        "MOVE " + gameState.turn + ": " + chosen.direction +
        " | score=" + chosen.score +
        " space=" + chosen.space +
        " exits=" + chosen.exits +
        " food=" + chosen.foodDist +
        " trap=" + chosen.trapPenalty +
        " force=" + chosen.forceWinPressure
    );

    return { move: chosen.direction };
}