// Shared by every trade: guide prices from a job's answers, and matching typed words to a job.
// A job's options are [id, label, sub, multiplier, add]. Ranges span 14%.
const round = (n) => (n >= 10000 ? Math.round(n / 250) * 250 : n >= 1000 ? Math.round(n / 50) * 50 : Math.round(n / 5) * 5);
// the top of the range rounds down, so a range never spans more than 15% (QuickSite's rule)
const roundDown = (n) => { const st = n >= 10000 ? 250 : n >= 1000 ? 50 : 5; return Math.floor(n / st) * st; };
window.priceFor = (job, answers) => {
  if (job.survey) return { survey: true };
  let mult = 1, add = 0;
  for (const q of job.q) {
    const o = q.o.find((x) => x[0] === answers[q.id]);
    if (!o) continue;
    if (o[3]) mult *= o[3];
    if (o[4]) add += o[4];
  }
  const low = round(job.base * mult + add);
  return { low, high: roundDown(low * 1.14) };
};
// the lowest the job can come to: the cheapest option of every question
window.fromPrice = (job) => (job.survey ? null : round(job.base * job.q.reduce((m, q) => m * Math.min(...q.o.map((o) => o[3] || 1)), 1)
  + job.q.reduce((a, q) => a + Math.min(...q.o.map((o) => o[4] || 0)), 0)));
window.money = (n) => '£' + Math.round(n).toLocaleString('en-GB');
window.matchJob = (text) => {
  const t = String(text).toLowerCase();
  return window.JOBS.find((j) => j.kw && new RegExp(j.kw).test(t)) || null;
};
