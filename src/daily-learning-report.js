const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function dailyLearningReport(report){
  if(!report)return '';
  const opening=report.opening?`<p class="daily-report-counts">Opening review: ${report.openingMatched} of ${report.opening} matched the study moves.</p>`:'';
  const practice=report.independent||report.supported||report.unknown?`<p class="daily-report-counts">${report.independent} solved independently · ${report.supported} with help or retries${report.unknown?` · ${report.unknown} earlier result${report.unknown===1?'':'s'} not measured`:''}</p><p>${escape(report.progress)}</p><p>${escape(report.focus)}</p>${report.band?`<p class="daily-report-next">Next difficulty: ${escape(report.band)}</p>`:''}<p class="daily-report-note">Two independent solves at your current difficulty unlock a harder challenge. Hints, solution review or legal alternatives schedule another try in two days.</p>`:'';
  return `<h3 id="daily-report-title">Your learning today</h3>${opening}${practice}`;
}
