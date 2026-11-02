export const retentionDays=30;
export function dayKey(iso:string){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso));}
export function dateTime(iso?:string|null){if(!iso)return '—';return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(iso));}
export function expired(row:{expires_at?:string|null;purged_at?:string|null},now=Date.now()){return !!row.purged_at||!!row.expires_at&&Date.parse(row.expires_at)<=now;}
