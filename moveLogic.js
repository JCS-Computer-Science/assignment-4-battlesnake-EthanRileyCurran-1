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

function makePosMap(items) {
    const map = {};
    for (let i = 0; i < items.length; i++) {
        map[posKey(items[i])] = true;
    }
    return map;
}

function edgeDistance(pos, boardWidth, boardHeight) {
    return Math.min(
        pos.x,
        pos.y,
        boardWidth - 1 - pos.x,
        boardHeight - 1 - pos.y
    );
}

function distanceToNearestSafeZone(start, hazardMap, boardWidth, boardHeight, maxDepth) {
    if (!hazardMap[posKey(start)]) {
        return 0;
    }

    const queue = [{ pos: start, dist: 0 }];
    const seen = {};
    seen[posKey(start)] = true;

    while (queue.length > 0) {
        const current = queue.shift();

        if (!hazardMap[posKey(current.pos)]) {
            return current.dist;
        }

        if (current.dist >= maxDepth) {
            continue;
        }

        for (let i = 0; i < DIRECTION_NAMES.length; i++) {
            const next = add(current.pos, DIRECTIONS[DIRECTION_NAMES[i]]);
            const key = posKey(next);

            if (!isInBounds(next, boardWidth, boardHeight)) {
                continue;
            }

            if (seen[key]) {
                continue;
            }

            seen[key] = true;
            queue.push({
                pos: next,
                dist: current.dist + 1
            });
        }
    }

    return maxDepth + 1;
}

function countNonHazardNeighbors(pos, hazardMap, boardWidth, boardHeight) {
    let count = 0;

    for (let i = 0; i < DIRECTION_NAMES.length; i++) {
        const next = add(pos, DIRECTIONS[DIRECTION_NAMES[i]]);
        if (isInBounds(next, boardWidth, boardHeight) && !hazardMap[posKey(next)]) {
            count++;
        }
    }

    return count;
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

const DEBUG_MODE = true;
const DEBUG_PRETTY = true;

function roundNum(value) {
    if (typeof value !== "number" || !isFinite(value)) {
        return value;
    }
    return Math.round(value * 100) / 100;
}

function printDebugBlock(label, data) {
    if (!DEBUG_MODE) {
        return;
    }

    console.log("=== " + label + " START ===");
    console.log(DEBUG_PRETTY ? JSON.stringify(data, null, 2) : JSON.stringify(data));
    console.log("=== " + label + " END ===");
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

    const hazardMap = makePosMap(hazards);
    const foodMap = makePosMap(food);

    let shrinkEveryNTurns = 25;
    if (
        gameState.game &&
        gameState.game.ruleset &&
        gameState.game.ruleset.settings &&
        gameState.game.ruleset.settings.royale &&
        typeof gameState.game.ruleset.settings.royale.shrinkEveryNTurns === "number"
    ) {
        shrinkEveryNTurns = gameState.game.ruleset.settings.royale.shrinkEveryNTurns;
    }

    const turnsUntilShrink =
        (shrinkEveryNTurns - (gameState.turn % shrinkEveryNTurns)) || shrinkEveryNTurns;

    const isRoyale =
        hazards.length > 0 ||
        (gameState.game && gameState.game.map === "royale");

    const turnStart = Date.now();

    const debugTurn = {
        turn: gameState.turn,
        youId: you.id,
        health: you.health,
        length: getSnakeLength(you),
        head: myHead,
        board: {
            width: boardWidth,
            height: boardHeight,
            foodCount: food.length,
            hazardCount: hazards.length,
            snakeCount: board.snakes.length
        },
        mode: {
            openingMode: false,
            isRoyale: false,
            isEndgame: false,
            aggressiveEndgame: false,
            pressureEndgame: false
        },
        candidates: [],
        chosen: null,
        fallback: false,
        runtimeMs: 0
    };

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

    debugTurn.mode.openingMode = openingMode;
    debugTurn.mode.isRoyale = isRoyale;
    debugTurn.mode.isEndgame = isEndgame;
    debugTurn.mode.aggressiveEndgame = aggressiveEndgame;
    debugTurn.mode.pressureEndgame = pressureEndgame;

    for (let i = 0; i < DIRECTION_NAMES.length; i++) {
        const direction = DIRECTION_NAMES[i];

        const candidate = {
            direction: direction,
            nextPos: null,
            legal: true,
            rejectedBy: [],
            values: {},
            scoreParts: {},
            finalScore: null
        };

        const nextPos = add(myHead, DIRECTIONS[direction]);
        const nextKey = posKey(nextPos);
        candidate.nextPos = nextPos;
        candidate.values.nextKey = nextKey;

        if (reverseBlocked[direction]) {
            candidate.legal = false;
            candidate.rejectedBy.push("reverseBlocked");
            debugTurn.candidates.push(candidate);
            continue;
        }

        if (!isInBounds(nextPos, boardWidth, boardHeight)) {
            candidate.legal = false;
            candidate.rejectedBy.push("outOfBounds");
            debugTurn.candidates.push(candidate);
            continue;
        }

        if (blocked[nextKey]) {
            candidate.legal = false;
            candidate.rejectedBy.push("blocked");
            debugTurn.candidates.push(candidate);
            continue;
        }

        const onHazard = !!hazardMap[nextKey];
        const onHazardFood = onHazard && !!foodMap[nextKey];
        const safeZoneDist = distanceToNearestSafeZone(
            nextPos,
            hazardMap,
            boardWidth,
            boardHeight,
            6
        );
        const safeZoneExits = countNonHazardNeighbors(
            nextPos,
            hazardMap,
            boardWidth,
            boardHeight
        );
        const edgeDist = edgeDistance(nextPos, boardWidth, boardHeight);
        let enemyDistanceBonus = 0;
        let enemyTrapBonus = 0;

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
            candidate.legal = false;
            candidate.rejectedBy.push("losingHeadToHead");
            candidate.values.winningHeadPressure = winningHeadPressure;
            candidate.values.forceWinPressure = forceWinPressure;
            debugTurn.candidates.push(candidate);
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

        candidate.values.space = space;
        candidate.values.exits = exits;
        candidate.values.foodDist = foodDist;
        candidate.values.onHazard = onHazard;
        candidate.values.onHazardFood = onHazardFood;
        candidate.values.safeZoneDist = safeZoneDist;
        candidate.values.safeZoneExits = safeZoneExits;
        candidate.values.edgeDist = edgeDist;
        candidate.values.winningHeadPressure = winningHeadPressure;
        candidate.values.forceWinPressure = forceWinPressure;

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

        const spaceScore = Math.min(space, yourLength + 10) * 2;
        score += spaceScore;
        candidate.scoreParts.spaceScore = roundNum(spaceScore);

        if (space < yourLength) {
            trapPenalty += 200;
        }

        if (exits === 0) {
            trapPenalty += 500;
        } else if (exits === 1) {
            trapPenalty += 120;
        }

        const exitsScore = exits * 6;
        score += exitsScore;
        candidate.scoreParts.exitsScore = roundNum(exitsScore);

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
        candidate.scoreParts.trapPenalty = roundNum(-trapPenalty);

        let foodScore = 0;

        if (foodDist < Infinity) {
            if (you.health < 25) {
                foodScore = 60 - foodDist * 8;
            } else if (you.health < 50) {
                foodScore = 30 - foodDist * 4;
            } else if (openingMode) {
                foodScore = 24 - foodDist * 3;
            } else if (!aggressiveEndgame) {
                foodScore = 10 - foodDist;
            }
        }

        score += foodScore;
        candidate.scoreParts.foodScore = roundNum(foodScore);

        score += preyBonus;
        candidate.scoreParts.preyBonus = roundNum(preyBonus);

        score += enemyDistanceBonus;
        candidate.scoreParts.enemyDistanceBonus = roundNum(enemyDistanceBonus);

        const centerPenalty = -manhattan(nextPos, center) * 0.75;
        score += centerPenalty;
        candidate.scoreParts.centerPenalty = roundNum(centerPenalty);

        let royalePenalty = 0;
        let hazardPressureBonus = 0;
        let hazardFoodScore = 0;

        if (isRoyale) {
            // Hazard food is much better in Royale than a normal hazard step.
            // Official rules: food in hazard gives full food and no entry penalty that turn.
            if (onHazard) {
                if (onHazardFood) {
                    hazardFoodScore = (you.health < 60 ? 24 : 12);
                    score += hazardFoodScore;
                    royalePenalty += safeZoneDist * 4;
                } else {
                    royalePenalty += 12 + hazardDamage;
                    royalePenalty += safeZoneDist * 8;
                }

                if (safeZoneExits === 0) {
                    royalePenalty += 35;
                } else if (safeZoneExits === 1) {
                    royalePenalty += 15;
                }

                if (!onHazardFood && you.health <= hazardDamage + 20) {
                    royalePenalty += 55;
                }
            }

            // Start leaning away from the edge shortly before the next shrink.
            // Newly spawned hazard on the square you just moved into does not hurt immediately,
            // so this is only a mild pre-shrink penalty, not a panic penalty.
            if (!onHazard && turnsUntilShrink <= 2) {
                if (edgeDist === 0) {
                    royalePenalty += 12 * (3 - turnsUntilShrink);
                } else if (edgeDist === 1 && turnsUntilShrink === 1) {
                    royalePenalty += 10;
                }
            }

            // If enemies are already in hazard and we are not, pressure them more.
            for (let j = 0; j < board.snakes.length; j++) {
                const snake = board.snakes[j];
                if (snake.id === you.id) {
                    continue;
                }

                const enemyHead = snake.head || snake.body[0];
                const enemyHeadKey = posKey(enemyHead);
                const enemyHeadOnHazard = !!hazardMap[enemyHeadKey];
                const enemyDist = manhattan(nextPos, enemyHead);

                if (!onHazard && enemyHeadOnHazard) {
                    if (snake.health <= hazardDamage + 15) {
                        hazardPressureBonus += Math.max(0, 40 - enemyDist * 4);
                    } else if (getSnakeLength(snake) < yourLength) {
                        hazardPressureBonus += Math.max(0, 18 - enemyDist * 2);
                    }
                }
            }
        }

        candidate.scoreParts.hazardFoodScore = roundNum(hazardFoodScore);

        score -= royalePenalty;
        candidate.scoreParts.royalePenalty = roundNum(-royalePenalty);
        score += hazardPressureBonus;
        candidate.scoreParts.hazardPressureBonus = roundNum(hazardPressureBonus);

        if (aggressiveEndgame) {
            const enemyHeadForTrap = onlyEnemy.head || onlyEnemy.body[0];
            const wallSides = countWallSides(enemyHeadForTrap, boardWidth, boardHeight);
            let enemySafeMovesAfterThis = 0;
            let enemyHazardMovesAfterThis = 0;

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

                const enemyStepOnHazard = !!hazardMap[stepKey];
                const enemyStepHasFood = !!foodMap[stepKey];

                if (enemyStepOnHazard && !enemyStepHasFood) {
                    enemyHazardMovesAfterThis++;
                    continue;
                }

                enemySafeMovesAfterThis++;
            }

            if (enemySafeMovesAfterThis <= 1) {
                enemyTrapBonus += 80;
            } else if (enemySafeMovesAfterThis === 2) {
                enemyTrapBonus += 35;
            }

            if (enemySafeMovesAfterThis === 0 && enemyHazardMovesAfterThis > 0) {
                enemyTrapBonus += 70;
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
        candidate.scoreParts.enemyTrapBonus = roundNum(enemyTrapBonus);

        let winningHeadScore = 0;
        if (winningHeadPressure > 0 && space > yourLength + 2 && exits >= 2) {
            winningHeadScore = winningHeadPressure * (aggressiveEndgame ? 45 : 25);
        }
        score += winningHeadScore;
        candidate.scoreParts.winningHeadScore = roundNum(winningHeadScore);

        let forceWinScore = 0;
        if (forceWinPressure > 0 && space > yourLength + 1 && exits >= 2) {
            forceWinScore = forceWinPressure * (aggressiveEndgame ? 40 : 20);
        }
        score += forceWinScore;
        candidate.scoreParts.forceWinScore = roundNum(forceWinScore);

        candidate.finalScore = roundNum(score);
        debugTurn.candidates.push(candidate);

        moveChoices.push({
            direction: direction,
            score: score,
            space: space,
            exits: exits,
            foodDist: foodDist,
            trapPenalty: trapPenalty,
            forceWinPressure: forceWinPressure,
            enemyTrapBonus: enemyTrapBonus
        });
    }

    if (moveChoices.length === 0) {
        debugTurn.fallback = true;
        debugTurn.runtimeMs = Date.now() - turnStart;
        printDebugBlock("BATTLESNAKE TURN DEBUG", debugTurn);

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
    const chosenScoreRounded = roundNum(chosen.score);
    const chosenCandidate = debugTurn.candidates.find(function(candidate) {
        return candidate.direction === chosen.direction && candidate.finalScore === chosenScoreRounded;
    });

    debugTurn.chosen = {
        direction: chosen.direction,
        score: chosenScoreRounded,
        topMoves: bestMoves.map(function(move) {
            return {
                direction: move.direction,
                score: roundNum(move.score)
            };
        }),
        details: chosenCandidate || null
    };

    debugTurn.runtimeMs = Date.now() - turnStart;
    printDebugBlock("BATTLESNAKE TURN DEBUG", debugTurn);

    console.log(
        "MOVE " + gameState.turn + ": " + chosen.direction +
        " | score=" + chosen.score +
        " space=" + chosen.space +
        " exits=" + chosen.exits +
        " food=" + chosen.foodDist +
        " trap=" + chosen.trapPenalty +
        " force=" + chosen.forceWinPressure +
        " | enemyTrap=" + chosen.enemyTrapBonus
    );

    return { move: chosen.direction };
}