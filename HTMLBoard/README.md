Need Statement: People learning chess need a way to practice their skills while enjoying the process.
Gap Analysis
and other homework stuff in BIOEN 400

AI Coach that explains the purpose of moves.
Powerful engines to analyze the best moves. (Very hard to understand)


# Chinese Chess GUI

## Target Usages
play with opponents
play with bot
bot vs bot tests
game analysis
sandbox (for defining the starting position)

## Designed Features
### Boards
One board handles all possible s.
1. changing of styles
  - 3D
  - Basic (implemented with HTML)
2. changing of board
  - whiteoak
  - darkoak
  - simple
2. changing of pieces
  - whiteoak
  - darkoak
  - simple
  - (hopefully) fake 3D
2. changing of fonts
  - weibei魏碑
  - xingkai行楷
  - lishu隶书
  - yankai颜楷
  - western
  - western2
    ![western2](/HTMLBoard/utils/western-design-2.jpg)
3. changing perspectives
  - team 1 view
  - team 2 view
4. display arrows (for illustration)
5. sound display (could be turned off)
  - capture
  - check
  - mate
  - draw



### Rules
1. Standard Moving Rules

  - rook車 moves any number of units in straight lines. Cannot move over other pieces
  - knight馬 moves like an L shape (consists of 1 unit straight and then 1 unit diagonally). Will be blocked if the square after the first 1-unit straight move is occupied by any piece
  - cannon炮 moves any number of units in straight lines. When capturing, it must move over 1 piece from any team.
  - elephant相象 moves 2 units diagonally (consists of 1 unit diagonal move and then another in the same direction). Will be blocked if the square after the first 1 unit diagonal move is occupied by any piece. Cannot cross the river.
  - guard仕士 moves 1 unit diagonally. Cannot move out of the palace.
  - king帥將 moves 1 unit straight. Cannot move out of the palace. However, if the king can see the opponent's king (on the same file without block in between), it may capture the other king.
  - pawn兵卒 moves 1 unit forward before it crosses the river. After it crosses the river, it can also move 1 unit to the left or the right.
2. Cycling Rules
Sometimes the game will end up in endless cycles. However, taking them all as draws is arbitrary as sometimes it is clear which side is under attack. The rules for tackling cycles has not been standardized. If a cycle has repeated itself three times, there are several major systems for deciding which team takes the win.
  - [Chinese Rule](https://www.xqipu.com/node/94985): It is used in the formal competitions in China. The most up-to-date version was produced in 2020. It is very complicated, designed to reduce draws and ensure interesting games. Unfortunately, currently Chinese rule is ambiguous. In contests, the usage of this rule highly depends on the understanding of specific referees.
  - [Asian Rule](https://www.xqbase.com/protocol/rule_asian.htm) (World rule): A simpler, clearer and unambiguous version of Chinese rule, though probably less interesting. Almost all online cchess platforms right now use asian rules.
3. Automatic Draw Determination
When the position is proven to end up in a draw (that is, neither team has any means to win), the rule will immediately end the game with a draw. An obvious example is **when neither team has any pieces that can cross the river**. There are some other cases that is rigorously unwinnable, which are all listed in a [Pikafish website](https://www.pikafish.com/wiki/index.php?title=%E8%87%AA%E5%8A%A8%E5%88%A4%E5%92%8C):
  - 1炮 vs 1士`n`象 (where `n = 0,1,2`, same below unless noted)
  - 1炮`n`相 vs `n`象
  - 1炮 vs 1炮
  *Note: technically speaking these cases could be won by overtime*
These cases could be won, but *only* via mate in 1. So if the engine knows how to avoid that (there is always a safe move that does not lead to mates), these cases could also be automatically determined as draws:
  - 1炮 vs 2士`n`象
  - 1炮`m`相 vs 1士`n`象 (where `m>0`)
  - 1炮`m`象 vs 1炮`n`象 (where `m,n = 0,1,2` and `m,n` are not both `0`)
4. the 60 Moves Rule
This is similar to the 50 Moves Rule in chess. If each player has made 60 consecutive moves without any captures (checks will only be counted 10 times for this purpose), a draw request will be automatically granted.

#### Variants
1. Standard CChess
  Standard Moving Rules, Notify checks, Disallow suicide, Win by mates, Automatic draw determination, Asian rule for cycles
2. Simplified CChess for New Learners
  Standard Moving Rules, Does not notify checks, Allow suicide, Win by capturing the king

**For the following variants, mate determination will be planed to be implemented. Though it might be pretty interesting to think about how to do that. Thus, suicide would be allowed. Only 60 Move Rule will be applied for automatic draw determination. Cycling rules will not be considered. If a cycle triple repeats itself, the game could end up in draw immediately or the game simply doesn't care.**
3. Revealer chess揭棋 (I hope this one has mate detection)
  Start with the original position, except that all the pieces except the king have their positions randomized and flipped upside down. The king must be revealed and sit at the standard starting position. Unrevealed pieces move like whatever piece that should be at that position in standard start game. After it is moved, it reveals itself and then moves like standard cchess pieces. In this mode, elephants and guards can cross the river and move outside of palace. Pawns only move forward if they are behind the river and can also move left/right when they are in front of the river.

4. Double Step双步
  You may move twice in your turn! However, if you choose to move twice, you must not capture. If you do not capture, you must move twice. Win when you capture the opponent's king.

5. Stone Chess石头棋 (inspired by duck chess from chess)
  A stone appears on the board! The stone can move to any vacant squares on the board, but it cannot capture or be captured. After each turn, the player must move the stone to another square.

6. ~~Three Players三人象棋~~
  Deleted b/c too much work and not potentially attractive. The board looks awkward. You need to specifically make a board and redesign the animations for this game. You need to rewrite the rules. Internally it requires a brand new way to represent the board. You need 3 players (maybe you train a model for that?).
  This game allows 3 players. The board is wrapped so that each player faces the other two teams like this: ![3P-board-design](./utils/3p-board-design.png)

  You go along the gridlines. Thing is when you are at the center of the board, there are 2 branches you can go to. The capturer of the king of some team will become a king and can control that team's pieces. (Or, if the king died, all the pieces of that team can no longer be moved. They can still be captured.)
  Notify checks (that is, when an opponent's piece can move to a king's place), allow suicide, win by capturing all opponent's king.

### Match

Shows the `Board` and plays the game with `Rule`. After the game starts, the players take turns to make moves until the winner could be determined at some time.

#### Varients
1. Game with some opponent
  For both sides, shows the name, avatar, remaining time and captured pieces. Could recall move (could turn off/set available times), request draws, resign.
  - Board: could only operate my side; opponent's pieces move automatically
  - Rule: Standard/Simplified/Revealer/Double Step/Stone/~~Three Player~~
2. Record a game (pieces of both teams could be operated by me)
  - record branches









## Features
It features a competition between you and your opponent (could be human or ai). No matter which side you takes, the board will adapt to show your perspective. *Feature Bot-Bot game?*

multiple boards
  s

black perspective
changing styles: light-wood, dark-wood (black team to darkgoldenrod), simple
changing fonts:
previous move marks
available move marks
available/non-available move hovers
failed moves
suicide warning
successful moves
selected pieces
pieces moving to position
dragging pieces around
capture/check/mate effects
failed teams: king gets dark/the whole team gets dark







# HTML Version
styles:
  light-wood:
    background: whiteoak picture
  dark-wood
    background: walnut picture
    team2: darkgoldenrod
  simple:
    background: pure color (blanchedalmond)
fonts:
  xingkai
  lishu
  xinwei
  yankai
  western
layered design
  1. board with background, border, shadow
  2. grid and lighting. would be rotated 180 deg when in black perspective.
  3. squares.
  4. pieces.
  5. effects.
  6. messages.





border background:
square size: 50px; board size: 9sq (width) x 10sq (height)
margin size: 6% each side (30px (left/right) 27px (top/bottom))
background: wood/darkwood/pure color
border radius: 0.1sq
shadow: 7px 7px 5px [burlywood]
border: 3px ridge [burlywood]

1st layer: grid & lighting:
centered in the background;
rotated 180deg when it is black position








### Start of Game
The board and the timers will be prepared (amount of time depending on user's setting). Players then take turns to move their pieces until the game ends. Your timer only goes down when it is your turn, and the opponent's timer does the same. After you made your move, your timer gains extra time (depending on setting). The board records the moves in the game with coordinate notation and displays the record in rank notation.

The board displays a capture, check and mate effect after each move. If a move covers more than one of those effects, the highest priority type will be shown: mate > check > capture. When the board displays a move, the piece first raises up and then flies to the position before being placed down.

### On your turn
When you hover over your pieces, they should be highlighted. Opponent's pieces will not change when hovered. You can select (pick up) a piece of your team by clicking it. Then, its available moves will be shown on the board by green dots, on squares and pieces. Now when you hover over available squares, they should be highlighted light green, while unreachable squares will turn red when hovered. (Note that these two hover effects are absent when no piece is selected.) When you click on another piece of yours, the original piece will be put down and its available positions shown. If you clicked on the piece you just selected, this would put the piece down.

When you click on unavailable positions, the piece goes there and bounces back. The square under your king will flash red if you are attempting a suicide (one of the unavailable positions that allows your king to be captured in your opponent's next move). When you click on available positions (piece or square), you move to the position.

You may also drag to move your pieces. When you start dragging a piece, it will be picked up (into the moving state, which is different from the effect of selected) and follow your cursor. If your piece lands in an available space, the piece will fall into that square. If not, it bounces back to its original square.

You can request draw in your turn. This option is only available after 5 rounds. Clock goes on while you are waiting for a response. If the request is granted, the game ends instantly with a draw. If not, game continues. You cannot make new requests if you have requested 2 more times than your opponent. The number of remaining requests should be shown on the screen. Requests will be auto rejected a request after 10s. If you make a move before the opponent sends a response, the request is considered to be rejected, and the number your available request will be reduced.

### On your opponent's turn

After the opponent has made the move, the board will represent that choice.

### Ending the game
Ways that the game could end are:
- Mate: when the board is considered mated (the other team has no legal moves without suiciding). In that case, the team that delivered the mate wins.
- Resign: You can resign 5 rounds after game start. A confirmation request is sent to your board when this click the resign button. After you confirm the game ends with your opponent winning.
- Timeout loss: When a team loses all their time on the clock, they lose the game immediately.
- Forced draw based on rules: the game ends with draw if there has been 60 consecutive full rounds without any captures, or if no pieces could cross the river.
- Forced draw/loss based on repetition: when a cycle with 3 repetitions (no captures allowed in the cycle) is detected, the game is evaluated to determine if the game should end with a draw or someone losing. *A warning should be sent 1 turn before this kind of evaluation is needed.*
- Accepted draw request: when one team raised a draw request and the other accepted.

## Rules
The detailed rules is described here, as referenced by the (2011 Chinese rule)[https://www.xqbase.com/protocol/rule2011.pdf] and the (Asian rule)[https://www.xqbase.com/protocol/rule_asian.htm].

## Design
- `Board` - displays the board, accepts user's click/drag, knows nothing about rules, includes all possible displays the board can do.
  1. **display input**: click a piece to select, click again to put down.
  `Promise` value
  2. **diaplay output**: move, moverejected, show legal points, display capture/check/mate, display king blunder
- `Rule` - updates itself to keep up with the positions and game-related values.
  contains all info in fen: current layout, allowed pieces,
  Gives all possible moves for a piece
  watching for captures, checks and mates
  forces draw in certain conditions
- `Match` - bundles board, rule, timer
  timers display
  Keeps record of current movers and winners
  sets `timeoutLoss` from the initial `0` to team name (`1` or `2`) when timer is out

Match should send Promise to Board to ask what move it takes (and if it requests)
movePiece: select the piece that moves, then change its position in dom (if this is a recall of capture: generate a piece...)
nothing is selectable when opponent's moving. when game is done nothing is selectable
write the features after i finish
when something is moving, nothing should be selectable
could have used a separate layer for pieces so i don't need to work extra to add moving animation. Add classes to each of them.

you need to add the game element to the page for the methods to work.

difference between match board (only one side piece available) and record (two sides available)
rule types (sandbox, classic): sandbox means you can play whatever pos available except places occupied by allies. classic follows the xiangqi rules.

When you click a piece, it is selected, and then `Rule` inside compute available positions. `Rule` then returns possible positions but also notifies semi-legal positions (legal but leads to king blunder). `Board` then sets its squares and pieces with proper `EventListener`s which makes the move and lets `Match` know its choice. `Match` could verify the move with its own `Rule`, or it could just trust the user's `Board`.

change kingBlunder to suicide, and displayKingBlunder to displaySuicideWarning

Rule: simple layout that no one can win => draw
requestDraw should only be done in your turn's time

Give no fuuk about optimization as I at most would have a few boards running

## More ambitions
### Recall, Draw, Resign
Add request recall, request draw, resign. You click recall/draw/resign button, and then `_attemptedMove` will be set to `10001` (recall), `10002` (draw), `10003` (resign). *This allows unique encoding becuase moves are only 4 digits.* Timer continues when the request is sent. `Match` takes that and shows a request at the opponent's board (via `Board.request()`). If request accepted, `Match` updates the `Board` and `Rule`'s status, if not nothing happens. `Match` then lets board send a message.

You only have 5 recalls and 3 draws (Specific number should be open to change via `Match`'s `constructor`). Every time a request is made, the remaining number should be reduced regardless of its result. If you have used up your requests, the button should be disabled and its `EventListener` removed.

add disappear animation for message and request, especially request so you know what you clicked


## Specifications
The board is initiated with a fen code.
When the user clicks,
When the user drags, turn cursor to hand,
The square of the king flashes red twice when you are blundering it

# Part II - Creating a Bot for CChess
What are current solutions for CChess AI? [Traditional](https://www.pikafish.com/wiki/index.php?title=%E4%BB%80%E4%B9%88%E6%98%AF%E2%80%9C%E8%AF%84%E4%BC%B0%E2%80%9D%EF%BC%9F), [NNUE](https://www.pikafish.com/wiki/index.php?title=%E4%BB%80%E4%B9%88%E6%98%AF%E2%80%9CNNUE%E2%80%9D%EF%BC%9F), [AlphaGo-like](https://www.pikafish.com/wiki/index.php?title=%E8%B1%A1%E6%A3%8B%E6%9C%89%E2%80%9C%E9%98%BF%E5%B0%94%E6%B3%95%E7%8B%97%E2%80%9D%E5%90%97%EF%BC%9F)

[Creating AlphaGo-like engines](https://zhuanlan.zhihu.com/p/24801451)

Can I use CNN to do this?
Can I use Decision Tree Model to do this?

For additional info, look for some papers.

## References
Sounds downloaded from: https://freesound.org/people/Kriaa/sounds/348835/ and https://freesound.org/people/BiancaBothaPure/sounds/437484/



## Relevant Links
- [Chinese Chess Wikipedia](https://www.xqbase.com/)(Chinese)
- [Pikafish](https://www.pikafish.com/)(Chinese), the currently most powerful free cchess engine using NNUE
- [Pikafish CChess Software Wiki](https://www.pikafish.com/wiki/index.php?title=%E6%A3%8B%E8%BD%AF%E7%9F%A5%E8%AF%86)(Chinese)
- [Pikafish rules](https://www.pikafish.com/rule.html)(Chinese), simplified computer-friendly rules derived from asian rules that is used by Pikafish.
- [px0](https://px0.org/), an engine that uses the technique of AlphaGo