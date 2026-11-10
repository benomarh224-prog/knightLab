export function localTrainingDate(date=new Date()){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function trainingDateAfter(date,days){
  const [year,month,day]=date.split('-').map(Number),value=new Date(year,month-1,day,12);
  value.setDate(value.getDate()+days);return localTrainingDate(value);
}
