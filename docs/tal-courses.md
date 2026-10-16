# Tal attacking courses

Three intermediate courses in Learning → Attacking chess, using the shared LessonPlayer:

| Course | Lessons | Focus |
| --- | --- | --- |
| Hunt the Uncastled King | 4 | f7/e6 sacrifices, queen checks, rook coordination |
| Build the Initiative | 4 | central breakthroughs, pawn barriers, diagonals, outposts |
| Break the King’s Defenses | 4 | key defenders, open files, deflection, knight forks |

The 12 positions and selected continuations were transcribed from the supplied scan of *Attack with Mikhail Tal* by Mikhail Tal and Iakov Damsky. Explanations, lesson structure and questions are original Knightlab teaching. The PDF and page scans are not distributed with the site. Each lesson's Learn more → Source & study line gives its game and both printed and PDF page numbers.

Source mapping: Nezhmetdinov–Kamyshov (PDF 7), Kupreichik–Grigorian (8), Geller–Panno chapter analysis (9), Tal–Sveshnikov (8–9), Polugaevsky–C. Hansen (37–38), Tal–Larsen (79), Archakova–Andreyeva (56), Makarychev–Kholmov (94), Ubilava–Timoshchenko (111), Gilfer–Böök (133), Kasparov–Ribli chapter analysis (121), Salov–Sax (134–135).

`tal-positions.json` records the source diagram and any setup plies when the exercise starts after the diagram. All selected moves are validated with chess.js; no claim is made that each reply is forced or that every legal alternative loses. Historical analysis is identified separately from played moves.

Every lesson includes two short concepts, one board exercise and one required knowledge check. The existing hints, undo, review line, focus mode, free exploration, keyboard board navigation and saved progress apply automatically. New progress keys do not change prior course progress. Board orientation follows the solver, including the Black attack in Gilfer–Böök.

Course routes and lesson-view mapping derive from COURSES, so new registered courses inherit direct URLs, the shared player and Learn navigation. Course completion returns to the originating learning category. The home card and `/learn/?category=attacking` open the same catalogue section.

Verification: all 12 source diagrams/setup lines replay legally; annotations cover every move; checks, attacks and key squares are asserted independently; partial progress, hints, completion gating, reload and post-solve exploration are tested for every new lesson. These checks supplement the existing regression suite.
