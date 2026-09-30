export function formatDate(value){
 if(!value)return '';
 const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
 return match?`${match[3]}/${match[2]}/${match[1]}`:value;
}
export function parseDate(value){
 const match=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
 if(!match)return '';
 const [,d,m,y]=match,day=Number(d),month=Number(m),year=Number(y);
 if(year<1||month<1||month>12)return '';
 const leap=year%4===0&&(year%100!==0||year%400===0);
 const days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
 return day>=1&&day<=days[month-1]?`${y}-${m}-${d}`:'';
}
export function maskDate(value){return value.replace(/\D/g,'').slice(0,8).replace(/^(\d{2})(\d)/,'$1/$2').replace(/^(\d{2}\/\d{2})(\d)/,'$1/$2')}
