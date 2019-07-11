var TOTAL_QUESTIONS = PHASE1_QUESTIONS.length,
    TOTAL_EXPL = examples.length,
    RESOLUTION_DEPTH = 50000,
    N_SIZE = 3,
    EMPTY = '&nbsp;',
    TIMER_SLICE = 200,
    PL_FILE_NAME = 'strategy',
    TURN = 'X',
    TOTAL_GROUP = 2,
    QUESTION_TIME = 60 * 60 * 24,
    EXPL_TIME = 120;

var t,
    phase = 0,
    th = 1.2,
    S = 0,
    sec = 0,
    boxes = [],
    totalTime = QUESTION_TIME,
    currentQuestion = 0,
    prevBoard = [0, 0, 0, 0, 0, 0, 0, 0, 0],
    test_boards = PHASE1_QUESTIONS,
    difficulty = [],
    moveChosen = false,
    currentExpl = 0,
    timeTakenExpl = [],
    answers = [],
    scores = [],
    timeTaken = [],
    ended = false,
    record = '';

var texts = String(window.location).split('=');

var participantID = (new Date).getTime();
// var participantID = isNaN(texts[texts.length - 1]) ? 1 : Number(texts[texts.length - 1]);

function flushLocalCache() {
    prevBoard = [0,0,0,0,0,0,0,0,0],
    difficulty = [],
    answers = [],
    scores = [],
    timeTaken = [],
    timeTakenExpl = [],
    ended = false,
    moveChosen = false,
    currentExpl = 0,
    currentQuestion = 0;

    document.getElementById('phase').textContent = '';
    document.getElementById('timer').textContent = '';
    document.getElementById('instruction1').textContent = '';
    document.getElementById('instruction2').textContent = '';
    document.getElementById('instruction3').textContent = '';
}

function applyStrategy(board) {

    var session = pl.create(RESOLUTION_DEPTH);

    session.consult(PL_FILE_NAME + (participantID % TOTAL_GROUP) + '.pl');
    var depth = Math.floor((board.filter(c => c == 0).length - 1) / 2);

    var queryWin;
    session.query('win_' + depth + '(' + composeStrategyState(board) + ', B).');
    session.answer(x => queryWin = x);

    var nextBoard = parsePrologVar(queryWin.lookup('B'));

    return nextBoard;
}

function learnerPlayGame(board) {

    var game = [board];
    var nextBoard = board;

    while(true) {

        if (nextBoard.filter(x=>x==0).length % 2 == 1) {
            nextBoard = applyStrategy(nextBoard);
            game.push(nextBoard);
        }

        if (win(nextBoard, 1)) {
            break;
        }

        if (nextBoard.filter(mark => mark == 0).length == 0) {
            break;
        }

        if (nextBoard.filter(x=>x==0).length % 2 == 0) {
            nextBoard = computeNextMove(nextBoard, 2);
            game.push(nextBoard);
        }

        if (win(nextBoard, 2)){
            break;
        }

    }

    return game;
}

function startCount() {
    var elapse = Math.max(totalTime - sec, 0);
    if (totalTime - sec < 0) {
        stopCount();
    } else if (!ended && sec <= totalTime){
//        document.getElementById("timer").textContent = 'Remaining time: ' + Math.floor(elapse / 60) + ':' + wrapTime(elapse % 60);
        if(phase == 2 && sec == totalTime - 10) {
            if (currentExpl == TOTAL_EXPL) {
                document.getElementById("timer").textContent = 'Will move onto the next part in 10 secs';
            } else {
                document.getElementById("timer").textContent = 'Will move onto the next example in 10 secs';
            }
        }
        sec += 0.2;
        t = setTimeout(startCount, TIMER_SLICE);
    }
}

function stopCountPhase1() {

    if (t != null) {
        clearTimeout(t);
        sec = 0;
    }

    currentQuestion += 1;
    
    
   if (currentQuestion > TOTAL_QUESTIONS) {
        
	    removeChild('nextQuestionButton', 'nextQuestion');
        document.getElementById('phase').textContent = 'Well done for completing Part 1!';
        document.getElementById('timer').textContent = '';

		document.getElementById('instruction1').textContent =
                	'In Part 2, examples are given by the Great Wizard'
                	+ ' and you need choose between two potential moves for what '
               		 + 'you think to be the best move to WIN the Great Wizard.';
		document.getElementById('instruction1').textContent = '';
        document.getElementById('instruction2').textContent =
          	          'The Great Wizard tells you which one is the right move and which is not.';
        document.getElementById('Great_Wizard_intro').style.display = 'block';

        if (participantID % TOTAL_GROUP == 0) {
            document.getElementById('instruction3').textContent =
                	    'Then, you are given 2 minutes to think about your choice.'
       	} else {
            document.getElementById('instruction3').textContent =
               		 'Then, you are given 2 minutes to study the explanation from MIGO.'
            document.getElementById('MIGO_intro').style.display = 'block';
        }

        document.getElementById('numQuestion').textContent = '';
        removeChild('gameBoard', 'game');

      	createButton('nextPhaseButton', 'nextPhase', 'Continue', phase2);

   } else {
        console.log('new question');
        nextQuestion();
        startCount();
   }

}

function stopCountPhase2() {

    if (currentExpl != 0) {
        if (!moveChosen) {
            answers[currentExpl - 1].push(wrongMoves[currentExpl - 1]);
            timeTaken.push(totalTime);
            wrongMoveChosen();
            startCount();
            return;
        } else if (moveChosen && sec > EXPL_TIME){
            timeTakenExpl.push(totalTime);
        } else {
            timeTakenExpl.push(Math.round(Math.max(0, sec - 1) * 100) / 100);
        }
    }

    if (t != null) {
        clearTimeout(t);
        sec = 0;
    }

    currentExpl += 1;

    if (currentExpl > TOTAL_EXPL) {

        clearBoards();
        removeChild('nextExampleButton', 'nextExample');
        document.getElementById('explanation').style.display = 'none';
        document.getElementById('timer').textContent = '';
        document.getElementById('phase').textContent = 'Well done for completing Part 2!';
        document.getElementById('instruction1').textContent = 'In Part 3, you will answer ' + TOTAL_QUESTIONS + ' questions. '
                                                    + 'For each question, you are given a board and you will play X.'
        document.getElementById('instruction2').textContent = 'And you should choose what you think to be the best move to WIN.'
                                                    + ' You have ONE CHANCE for each question.';
        document.getElementById('instruction3').textContent = '';
        createButton('nextPhaseButton', 'nextPhase', 'Continue', phase3);

    } else {
        document.getElementById('timer').textContent = '';
        nextExample();
        startCount();
    }

}

function stopCountPhase3() {

    if (t != null) {
        clearTimeout(t);
        sec = 0;
    }

    currentQuestion += 1;

    if (currentQuestion > TOTAL_QUESTIONS) {
        removeChild('nextQuestionButton', 'nextQuestion');
        removeChild('nextExampleButton', 'nextExample');
        removeChild('gameBoard', 'game');
        removeChild('nextPhaseButton', 'nextPhase');
        document.getElementById('phase').textContent =
                'Well done for completing Part 3!'
        document.getElementById('timer').textContent = '';
        document.getElementById('instruction1').textContent = 'Please now complete the following short survey';
        document.getElementById('instruction2').textContent = '';
        document.getElementById('instruction3').textContent = '';
        document.getElementById('numQuestion').textContent = '';

	 record += '\n\nPart 3: \n'
        + answers.map(g => '[[' + g.join('],[') + ']]\n')
        + 'difficulty: [' + difficulty + ']\n'
        + 'scores: [' + scores + ']\n'
        + 'time: [' + timeTaken + ']\n';
        createButton('nextPhaseButton', 'nextPhase', 'Continue', phase4);

    } else {
        nextQuestion();
        startCount();
    }

}


function boardClicked() {

    if (this.style.backgroundColor !== WHITE) {
        return;
    } else if (!ended) {

        this.style.backgroundColor = P1_COLOR;
        ended = true;

        var currentBoard = convertBoxesTOBoard(boxes);
        console.log(currentBoard);
        answers[currentQuestion - 1].push(currentBoard);

        scores.push(getMiniMaxScore(prevBoard, currentBoard, 1));
        timeTaken.push(Math.round(Math.max(0, sec - 1) * 100) / 100);
        console.log(timeTaken);
        console.log(scores);

        createButton('nextQuestionButton', 'gameBoard', 'Next Question', stopCount);
        var button = document.getElementById('nextQuestionButton');
        button.style.position = 'absolute';
        button.style.height = '10%';
        button.style.width = '10%';
        button.style.bottom = '0%';
        button.style.left = '45%';
    }
}

function nextQuestion() {

    ended = false;
    prevBoard = test_boards[currentQuestion - 1];
    // available moves / num of winning moves
    difficulty.push(computeBoardDifficulty(prevBoard));
    answers.push([]);
    answers[currentQuestion - 1].push(prevBoard);

    var rightIndexAndLabel = changeLabelsOnBoard(prevBoard);
    removeChild('gameBoard', 'game');
    removeChild('nextQuestionButton', 'nextQuestion');
    boxes = [];
    document.getElementById('numQuestion').textContent = 'Question NO.' + currentQuestion;

    var board = document.createElement('div');
    document.getElementById('game').appendChild(board);
    board.setAttribute('id', 'gameBoard');
    board.style.position = 'absolute';
    board.style.left = '20%';
    board.style.height = '60%';
    board.style.width = '60%';

    for (var i = 0; i < N_SIZE; i++) {

        var island = document.createElement('table');
        island.classList.add('table4');
        board.appendChild(island);
        island.style.height = '30%';
        island.style.width = '25%';
        island.style.position = 'absolute';
        if (i === 0) {
            island.style.top = '10%';
            island.style.left = '20%';
        } else if (i == 1) {
            island.style.top = '10%';
            island.style.right = '20%';
        } else {
            island.style.top = '50%';
            island.style.left = '37.5%';
        }

        var row1 = document.createElement('tr');
        var row2 = document.createElement('tr');
        island.appendChild(row1);
        island.appendChild(row2);
        var islandTag = document.createElement('td');
        row1.appendChild(islandTag);
        islandTag.style.height = '40%';
        islandTag.style.width = '40%';
        islandTag.setAttribute('align', 'center');
        islandTag.setAttribute('valign', 'center');
        islandTag.style.backgroundColor = DEFAULT_C;
        islandTag.innerHTML = 'Island ' + (i + 1);

        for (var j = 0; j < N_SIZE; j++) {

            var cell = document.createElement('td');
            if (j === 0) {
                row1.appendChild(cell);
            } else {
                row2.appendChild(cell);
            }
            cell.style.height = '40%';
            cell.style.width = '40%';
            cell.setAttribute('align', 'center');
            cell.setAttribute('valign', 'center');

            cell.addEventListener('click', boardClicked);
            cell.innerHTML = ISLAND_ATTR[i * 3 + j];
            cell.style.backgroundColor = rightIndexAndLabel[i * 3 + j] === 'e' ?
                                         WHITE :
                                         rightIndexAndLabel[i * 3 + j] === 'x' ?
                                         P1_COLOR :
                                         P2_COLOR;

            boxes.push(cell);
        }
    }

}

function endExpr() {

    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(record));
    element.setAttribute('download', participantID + '#' + formattedDate() + '.txt');

    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    window.location.href = 'record.php';
}

function phase1() {

    removeChild('nextPhaseButton', 'nextPhase');

    phase = 1;
    totalTime = QUESTION_TIME;

    document.getElementById('phase').textContent = 'Part ' + phase;
    document.getElementById('instruction1').innerHTML = 'You play <span style="background-color: '
                        + P1_COLOR + '">Green</span>, '
                        + 'and please press a White cell' +
                        ' to acquire resources that you think can lead to WIN';
    document.getElementById('instruction2').innerHTML = 'You have ONE CHANCE for each question.';
    stopCount();
}

function phase2() {

    removeChild('nextPhaseButton', 'nextPhase');

    record += '\n\nPart 1: \n'
        + answers.map(g => '[[' + g.join('],[') + ']]\n')
        + 'difficulty: [' + difficulty + ']\n'
        + 'scores: [' + scores + ']\n'
        + 'time: [' + timeTaken + ']\n';

    console.log(record);

    flushLocalCache();
	
    phase = 2
	
    totalTime = QUESTION_TIME;

    document.getElementById('explanation').style.display = 'block';
    document.getElementById('MIGO_intro').style.display = 'none';
    document.getElementById('Great_Wizard_intro').style.display = 'none';

    document.getElementById('phase').textContent = 'Part ' + phase;
	
    document.getElementById('instruction1').textContent = 'You are playing X and the Great Wizard plays O. '
    document.getElementById('instruction2').textContent = 'Given an initial board, choose between two potential moves for what '
                + 'you think to be the best move to WIN the Great Wizard.'
    document.getElementById('instruction3').textContent =
                    'The Great Wizard then tells you which one is the right move and which is not. ';

    if (participantID % TOTAL_GROUP == 0) {
        document.getElementById('instruction3').textContent +=
                    'You are given time to think about your choice.';
        document.getElementById('feedbackPanel').style.display = 'none';
    } else {
        document.getElementById('instruction3').textContent +=
                    'You are given time to study the comments from MIGO AI.'
    }

    stopCount();
}

function phase3() {

    removeChild('nextPhaseButton', 'nextPhase');

    record += '\n\nPart 2: \n'
        + answers.map(g => '[[' + g.join('],[') + ']]\n')
        + 'scores: [' + scores + ']\n'
        + 'time: [' + timeTaken + ']\n'
        + 'time on expl: [' + timeTakenExpl + ']\n';

    console.log(record);

    flushLocalCache();

    phase = 3,
    totalTime = QUESTION_TIME;

    document.getElementById('phase').textContent = 'Part ' + phase;
    document.getElementById('instruction1').textContent = 'You play <span style="background-color: '
                        + P1_COLOR + '">Green</span>, '
                        + 'and please press a White cell' +
                        ' to acquire resources that you think can lead to WIN';
    document.getElementById('instruction2').textContent = 'You have ONE CHANCE for each question. ';

    test_boards = PHASE3_QUESTIONS;
    stopCount();
}

function phase4() {
    console.log(record);

    flushLocalCache();

    phase = 4;
    var u;
    if (S > th) {
	u = 2;
    } else {u = 4;
    }

    // localStorage.setItem("expResult", record);
    var element = document.getElementById("postrecord");
    element.value = record
    document.getElementById('phase').textContent = 'Part ' + u;
    removeChild('nextPhaseButton', 'nextPhase');
    document.getElementById('genderform').style.display = 'block';
    document.getElementById('participantid').value = participantID
    

	
	//localStorage.setItem("participantID"; participantID);
   // record += '\n\nPart 4: \n'
    //    + answers.map(g => '[[' + g.join('],[') + ']]\n')
     //   + 'scores: [' + scores + ']\n'
      //  + 'time: [' + timeTaken + ']\n'
      //  + 'time on expl: [' + timeTakenExpl + ']\n';

}

function checkform() {
    if (!document.genderform.gender[0].checked && !document.genderform.gender[1].checked && !document.genderform.gender[2].checked) {
	// no radio button is selected
	return false;
    } else {
    return true;
    }
}

function stopCount() {
    if (phase == 1) {
        stopCountPhase1();
    } else if (phase == 2) {
        stopCountPhase2();
    } else if (phase == 3) {
        stopCountPhase3();
    } else if (phase == 4) {
        stopCountPhase4();
    }
}

function nextExample() {

    clearBoards();
    moveChosen = false;
    totalTime = QUESTION_TIME;
    removeChild('nextExampleButton', 'nextExample');
    answers.push([]);
    answers[currentExpl - 1].push(examples[currentExpl - 1]);
    showExample();

}

function showExample() {

    createBoard(examples[currentExpl - 1], 'initialBoard', 'initialState', 'Initial Board', [], WHITE,10);

    var initial = changeLabelsOnBoard(examples[currentExpl - 1]);
    var right = changeLabelsOnBoard(rightMoves[currentExpl - 1]);
    var wrong = changeLabelsOnBoard(wrongMoves[currentExpl - 1]);

    var rightIdx = initial.map((_, i) => initial[i] == right[i] ? -1 : i).filter(x => x != -1)[0];
    var wrongIdx = initial.map((_, i) => initial[i] == wrong[i] ? -1 : i).filter(x => x != -1)[0];

    if (Math.random() > 0.5) {
        createBoard(rightMoves[currentExpl - 1], 'rightMove', 'move1', '', [], WHITE, 10);
        createBoard(wrongMoves[currentExpl - 1], 'wrongMove', 'move2', '', [], WHITE, 10);
        createButton('rightMoveButton', 'rightMoveComment', 'Choose this move', rightMoveChosen);
        createButton('wrongMoveButton', 'wrongMoveComment', 'Choose this move', wrongMoveChosen);
    } else {
        createBoard(wrongMoves[currentExpl - 1], 'wrongMove', 'move1', '', [], GREY, 10);
        createBoard(rightMoves[currentExpl - 1], 'rightMove', 'move2', '', [], GREY, 10);
        createButton('wrongMoveButton', 'wrongMoveComment', 'Choose this move', wrongMoveChosen);
        createButton('rightMoveButton', 'rightMoveComment', 'Choose this move', rightMoveChosen);
    }
    document.getElementById("rightMove"+rightIdx).style.color = YELLOW;
    document.getElementById("wrongMove"+wrongIdx).style.color = YELLOW;
}

function showExpl() {

    timeTaken.push(Math.round(Math.max(0, sec - 1) * 100) / 100);
    console.log(timeTaken);

    removeChild('wrongMoveButton', 'wrongMoveComment');
    removeChild('rightMoveButton', 'rightMoveComment');

    document.getElementById('wrongMoveComment').textContent = 'This is a wrong move';
    document.getElementById('rightMoveComment').textContent = 'This is a right move';

    var initial = changeLabelsOnBoard(examples[currentExpl - 1]);
    var right = changeLabelsOnBoard(rightMoves[currentExpl - 1]);
    var wrong = changeLabelsOnBoard(wrongMoves[currentExpl - 1]);

    var rightIdx = initial.map((_, i) => initial[i] == right[i] ? -1 : i).filter(x => x != -1)[0];
    var wrongIdx = initial.map((_, i) => initial[i] == wrong[i] ? -1 : i).filter(x => x != -1)[0];

    document.getElementById('wrongMove' + wrongIdx).style.color = 'red';
    document.getElementById('rightMove' + rightIdx).style.color = 'green';

    moveChosen = true;
    totalTime = EXPL_TIME;
    sec = 0;

    if (participantID % TOTAL_GROUP != 0) {

        var game = learnerPlayGame(inverseLabelsOnBoard(right));
        if (document.getElementById('rightMove').parentElement.id == 'move1') {
            showPosExamples(game, 'explExample1', rightIdx);
            showNegExamples(inverseLabelsOnBoard(wrong), 'explExample2', wrongIdx);
        } else {
            showPosExamples(game, 'explExample2', rightIdx);
            showNegExamples(inverseLabelsOnBoard(wrong), 'explExample1', wrongIdx);
        }
    }

}

function rightMoveChosen() {

    answers[currentExpl - 1].push(rightMoves[currentExpl - 1]);
    scores.push(10);
    showExpl();
    createButton('nextExampleButton', 'nextExample', 'Next', stopCount);

}

function wrongMoveChosen() {

    answers[currentExpl - 1].push(wrongMoves[currentExpl - 1]);
    scores.push(getMiniMaxScore(answers[currentExpl - 1][0], answers[currentExpl - 1][1], 1));
    showExpl();
    createButton('nextExampleButton', 'nextExample', 'Next', stopCount);

}

function createBoardWithLine(board, boardId, parentId, text, positions, borderWidth) {

  var td = document.createElement('td');
  td.setAttribute('id', boardId);
  td.style.border = borderWidth + "px solid transparent";
  td.align = 'center';

  if (board.length !== 0) {

      var newBoard = changeLabelsOnBoard(board);
      var table = document.createElement('table');
      table.setAttribute('border', 1);
      table.setAttribute('cellspacing', 0);
      table.classList.add('table2');

      for (var i = 0; i < N_SIZE; i++) {

          var row = document.createElement('tr');
          table.appendChild(row);

          for (var j = 0; j < N_SIZE; j++) {

              var cell = document.createElement('td');
              cell.setAttribute('id', boardId + (i * 3 + j));
              cell.setAttribute('width',  30);
              cell.setAttribute('height', 30);
              cell.setAttribute('align',  'center');
              cell.setAttribute('valign',  'center');
              cell.style.backgroundColor = WHITE;

              row.appendChild(cell);
              cell.innerHTML = newBoard[i * 3 + j] == 'e' ? EMPTY : newBoard[i * 3 + j];
          }
      }

      td.appendChild(table);

      var comment = document.createElement('div');
      comment.setAttribute('id', boardId+'Comment');
      comment.innerHTML = text;
      comment.classList.add('col');
      comment.align = 'center';
      comment.style.fontSize = 'small';
      comment.style.whiteSpace = 'pre-wrap';

      td.appendChild(comment);
      document.getElementById(parentId).appendChild(td);
  }

  imgName = 'imgs/' + positions.sort().join('') + '.png';
  table.style.backgroundImage = "url('" + imgName + "')";
  table.style.backgroundSize = '100% 100%';
  table.style.backgroundRepeat = 'no-repeat';
}

function createBoard(board, boardId, parentId, text, positions, color, borderWidth) {

  var td = document.createElement('td');
  td.setAttribute('id', boardId);
  td.style.border = borderWidth + "px solid transparent";
  td.align = 'center';

  if (board.length !== 0) {

      var newBoard = changeLabelsOnBoard(board);
      var table = document.createElement('table');
      table.setAttribute('border', 1);
      table.setAttribute('cellspacing', 0);
      table.classList.add('table2');

      for (var i = 0; i < N_SIZE; i++) {

          var row = document.createElement('tr');
          table.appendChild(row);

          for (var j = 0; j < N_SIZE; j++) {

              var cell = document.createElement('td');
              cell.setAttribute('id', boardId + (i * 3 + j));
              cell.setAttribute('height', 30);
              cell.setAttribute('width',  30);
              cell.setAttribute('align',  'center');
              cell.setAttribute('valign',  'center');
              cell.style.backgroundColor = WHITE;

              row.appendChild(cell);
              cell.innerHTML = newBoard[i * 3 + j] == 'e' ? EMPTY : newBoard[i * 3 + j];
          }
      }

      td.appendChild(table);

      var comment = document.createElement('div');
      comment.setAttribute('id', boardId+'Comment');
      comment.innerHTML = text;
      comment.classList.add('col');
      comment.align = 'center';
      comment.style.fontSize = 'small';
      comment.style.whiteSpace = 'pre-wrap';

      td.appendChild(comment);
      document.getElementById(parentId).appendChild(td);
  }

  for (var i = 0; i < positions.length; i++) {
      document.getElementById(boardId+positions[i]).style.backgroundColor = color;
  }
}

function clearBoards() {
    removeChild('initialBoard', 'initialState');
    removeChild('rightMove', 'move1');
    removeChild('wrongMove', 'move1');
    removeChild('rightMove', 'move2');
    removeChild('wrongMove', 'move2');
    removeChild('posboard0', 'explExample1');
    removeChild('posboard1', 'explExample1');
    removeChild('posboard2', 'explExample1');
    removeChild('posboard3', 'explExample1');
    removeChild('negboard0', 'explExample1');
    removeChild('negboard1', 'explExample1');
    removeChild('negboard2', 'explExample1');
    removeChild('posboard0', 'explExample2');
    removeChild('posboard1', 'explExample2');
    removeChild('posboard2', 'explExample2');
    removeChild('posboard3', 'explExample2');
    removeChild('negboard0', 'explExample2');
    removeChild('negboard1', 'explExample2');
    removeChild('negboard2', 'explExample2');
}

function showPosExamples(game, parentId, pos){
    if (game[0].filter(x=>x==0).length == 6) {
        // Depth 3
	    //
        var strongPos = findPosStrongOption(game[0], 1).map(changeIndex);

        createBoardWithLine(game[0], 'posboard0', parentId, 'you move and make 1 double-line',
                    strongPos, 17.5);
        createBoard(game[1], 'posboard1', parentId, 'O blocks your double-line',
                    strongPos, GREY, 0);
        createBoardWithLine(game[2], 'posboard2', parentId, 'you make 2 double-line and\n O has no double-line',
                    findPosStrongOption(game[2], 1).map(changeIndex), 0);

	var opponentPos = game[2].map((x,i) => x == 2 ? changeIndex(i) : -1).filter(x => x != -1);
        for (var i = 0; i < opponentPos.length; i++) {
            document.getElementById('posboard2' + opponentPos[i]).style.backgroundColor = GREY;
        }

        document.getElementById('posboard0'+pos).style.color = GREEN;
        document.getElementById('posboard1'+pos).style.color = GREEN;
        document.getElementById('posboard2'+pos).style.color = GREEN;

    }else if (game[0].filter(x=>x==0).length == 4) {
        // Depth 2

	createBoardWithLine(game[0], 'posboard0', parentId, 'you move and make 2 double-lines',
                    findPosStrongOption(game[0], 1).map(changeIndex), 17.5);
        createBoard(game[0], 'posboard1', parentId, 'O has no double-line',
                        game[0].map((x,i) => x == 2 ? changeIndex(i) : -1).filter(x => x != -1),
                        GREY, 10);
        document.getElementById('posboard0'+pos).style.color = GREEN;
        document.getElementById('posboard1'+pos).style.color = GREEN;

    } else if (game[0].filter(x=>x==0).length == 2) {
        // Depth 1
        createBoardWithLine(game[0], 'posboard0', parentId, 'you move and make a triple-line',
                    winLine(game[0],1).map(changeIndex), 17.5);
        document.getElementById('posboard0'+pos).style.color = GREEN;
    }
}

function showNegExamples(board, parentId, pos){
    if (board.filter(x=>x==0).length == 6) {
        var strong = findPosStrongOption(board, 1).map(changeIndex);
       	 if (strong.length == 0 ) {
	 	createBoard(board, 'negboard0', parentId, EMPTY,
                	    board.map((x,i) => x == 1 ? changeIndex(i) : -1).filter(x => x != -1),
                 	    GREY, 17.5);
		var nextBoard = computeNextMove(board, 2);
		createBoard(nextBoard,'negboard1', parentId, EMPTY, [], WHITE, 10);
		nextBoard = computeNextMove(nextBoard, 1);
		strong = findPosStrongOption(nextBoard, 1).map(changeIndex);
		             var opponentPos = nextBoard.map((x,i) => x == 2 ? changeIndex(i) : -1).filter(x => x != -1);
           	 createBoardWithLine(nextBoard,'negboard2', parentId, EMPTY, strong, 10);

            for (var i = 0; i < opponentPos.length; i++) {
                document.getElementById('negboard2' + opponentPos[i]).style.backgroundColor = GREY;
            }
	             document.getElementById('negboard1' + pos).style.color = RED;
            document.getElementById('negboard2' + pos).style.color = RED;
            document.getElementById('negboard0' + pos).style.color = RED;
		 
	 } else {
	     createBoardWithLine(board, 'negboard0', parentId, EMPTY,
                    strong, 17.5);
            var nextBoard = computeNextMove(board, 2);
	    createBoard(nextBoard,'negboard1', parentId, EMPTY, strong, GREY, 10);
            
	    nextBoard = computeNextMove(nextBoard, 1);
            strong = findPosStrongOption(nextBoard, 1).map(changeIndex);
            var opponentPos = nextBoard.map((x,i) => x == 2 ? changeIndex(i) : -1).filter(x => x != -1);
            createBoardWithLine(nextBoard,'negboard2', parentId, EMPTY, strong, 10);

            for (var i = 0; i < opponentPos.length; i++) {
                document.getElementById('negboard2' + opponentPos[i]).style.backgroundColor = GREY;
            }

            document.getElementById('negboard1' + pos).style.color = RED;
            document.getElementById('negboard2' + pos).style.color = RED;
	    document.getElementById('negboard0' + pos).style.color = RED;
	}
    } else if (board.filter(x=>x==0).length == 4) {
        createBoardWithLine(board, 'negboard0', parentId, EMPTY,
                    findPosStrongOption(board, 1).map(changeIndex), 17.5);
	document.getElementById('negboard0' + pos).style.color = RED;
        var opponentStrong = findPosStrongOption(board, 2).map(changeIndex);
        if(opponentStrong.length == 0) {
		createBoard(board, 'negboard1', parentId, EMPTY , board.map((x,i) => x == 2 ? changeIndex(i) : -1).filter(x => x != -1), GREY, 10); 
       		 document.getElementById('negboard1' + pos).style.color = RED;
		} else {
		//     document.getElementById('posboard1').style.display = 'none';
      //  }
	      createBoardWithLine(board, 'negboard1', parentId, EMPTY,
                    opponentStrong, 17.5);
		document.getElementById('negboard1' + pos).style.color = RED;
		}
		} else if (board.filter(x=>x==0).length == 2) {
        createBoard(board, 'negboard0', parentId, EMPTY,
        board.map((x,i) => x == 1 ? changeIndex(i) : -1).filter(x => x != -1), GREY, 17.5);
        document.getElementById('negboard0' + pos).style.color = RED;
    }
}


document.getElementById('phase').textContent = '';
document.getElementById('instruction1').textContent = 'In Part 1, you will answer ' + TOTAL_QUESTIONS + ' questions. '
                                                    + 'For each question, you are given a board and you will play X.'
document.getElementById('instruction2').textContent = 'And you should choose what you think to be the best move to WIN.'
                                                    + ' You have ONE CHANCE for each question and try your best.';
createButton('nextPhaseButton', 'nextPhase', 'Continue', phase1);
