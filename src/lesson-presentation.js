const studies={
  foundations:{title:'The first two moves.',start:1,coach:'Build your pawn chain.',prompt:'Black wants a solid center. Prepare to challenge White’s e4-pawn with …d5.',goals:['Prepare a sound central pawn chain','Challenge White’s center with …d5']},
  advance:{title:'Challenge the center.',start:5,coach:'Find the pawn break.',prompt:'White has more space. Look for a pawn move that attacks d4, the base of the pawn chain.',goals:['Attack the base of a pawn chain','Create counterplay against a space advantage']},
  exchange:{title:'Open the center.',start:5,coach:'Restore your central pawn.',prompt:'White has exchanged on d5. Recapture while opening a diagonal for your c8-bishop.',goals:['Recognize the Exchange pawn structure','Open lines for active piece development']},
  tarrasch:{title:'Put pressure on d4.',start:5,coach:'Challenge the pawn center.',prompt:'White’s knight is on d2. Strike at d4 before White finishes building the center.',goals:['Recognize the Tarrasch setup','Connect central pawns with active pieces']},
  classical:{title:'Develop with a purpose.',start:5,coach:'Bring a piece into the fight.',prompt:'White has developed a knight to c3. Develop your kingside knight with pressure on e4.',goals:['Develop toward useful central targets','Answer extra space with …c5 counterplay']},
  winawer:{title:'Create a useful imbalance.',start:5,coach:'Pin the defender.',prompt:'White’s c3-knight supports the center. Find the bishop move that pins it to the king.',goals:['Recognize the defining Winawer pin','Understand the bishop-pair trade-off']},
  mccutcheon:{title:'Meet the pin with a pin.',start:7,coach:'Create your own threat.',prompt:'White has pinned your f6-knight. This study line answers with a pin on the c3-knight.',goals:['Recognize the McCutcheon position','Look for active responses to a threat']},
  'active-development':{title:'Make development count.',start:11,coach:'Recapture and develop.',prompt:'White has captured your c5-pawn. Find a developing recapture that brings a bishop into play.',goals:['Combine a recapture with development','Time the …f6 break with your pieces']},
};
export function lessonStudy(id){return studies[id]||studies.foundations;}
export function studyIdea(move){
  if(!move)return null;
  if(move.captured)return 'capture';
  return move.piece==='p'?'pawn':'piece';
}
