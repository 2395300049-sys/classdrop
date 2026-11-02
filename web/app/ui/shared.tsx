'use client';
import {BookOpen,ArrowUpRight} from 'lucide-react';
export const fmt=(s:string)=>s?new Date(s).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}):'不限时';
export const size=(n:number)=>n>=1048576?(n/1048576).toFixed(1)+' MB':Math.ceil(n/1024)+' KB';
export async function api(path:string,options?:RequestInit){const r=await fetch(path,{cache:'no-store',...options});const d:any=await r.json();if(!r.ok)throw new Error(d.error||'操作失败，请重试');return d;}
export function Brand(){return <a className="brand" href="/"><span className="brand-icon"><BookOpen size={23}/></span><span>一码收<small>CLASSDROP</small></span></a>;}
export function Footer(){return <footer><span>少一点整理，多一点自己的时间。</span><span><a href="/help">使用与保存说明</a> · 一码收 <ArrowUpRight size={13}/></span></footer>;}

export const modeLabel=(mode?:string)=>mode==='print'?'打印店收件':mode==='general'?'通用文件':'作业收集';
export const printSummary=(p:any)=>p?.paper?`${p.paper} · ${p.color==='color'?'彩色':'黑白'} · ${p.sides==='double'?'双面':'单面'} · ${p.copies}份${p.pages?' · 页码 '+p.pages:' · 全部页码'}`:'';
