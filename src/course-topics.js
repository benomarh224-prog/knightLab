const labels={beginners:'Beginners',openings:'Openings',tactics:'Tactics',attacking:'Attacking chess'};
// The selector follows the course registry, including future categories.
export function courseTopics(courses){
  const counts=new Map();
  for(const course of Object.values(courses))if(course.category)counts.set(course.category,(counts.get(course.category)||0)+1);
  const order=Object.keys(labels);
  return [...counts].sort(([a],[b])=>(order.includes(a)?order.indexOf(a):100)-(order.includes(b)?order.indexOf(b):100)||a.localeCompare(b))
    .map(([value,count])=>({value,count,label:labels[value]||value.replace(/[-_]/g,' ').replace(/^./,c=>c.toUpperCase())}));
}
