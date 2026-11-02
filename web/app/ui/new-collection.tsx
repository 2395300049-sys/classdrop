'use client';
import {X,ArrowUpRight,ShieldCheck,GraduationCap,FolderOpen,Printer} from 'lucide-react';
export default function NewCollection({mode,setMode,close,create,busy,error}:any){
 const school=mode==='homework';
 return <div className="modal-backdrop" onClick={()=>!busy&&close()}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="create-title" onClick={e=>e.stopPropagation()}>
  <div className="modal-heading"><div><p className="eyebrow">NEW COLLECTION</p><h2 id="create-title">新建文件收集</h2><p>选择使用场景，同一个二维码持续接收文件。</p></div><button aria-label="关闭" className="icon-button" disabled={busy} onClick={close}><X/></button></div>
  <div className="mode-picker" aria-label="收集类型">{[{key:'homework',name:'作业收集',hint:'学号姓名 · 未交名单',Icon:GraduationCap},{key:'general',name:'通用文件',hint:'称呼备注 · 独立编号',Icon:FolderOpen},{key:'print',name:'打印店收件',hint:'打印要求 · 处理进度',Icon:Printer}].map(m=><button type="button" key={m.key} disabled={busy} aria-pressed={mode===m.key} className={mode===m.key?'chosen':''} onClick={()=>setMode(m.key)}><m.Icon size={20}/><b>{m.name}</b><small>{m.hint}</small></button>)}</div>
  <form onSubmit={create} key={mode}>
   <label>{school?'作业名称':mode==='print'?'打印店 / 收件名称':'收集名称'} <em>*</em><input name="title" required maxLength={80} placeholder={school?'例如：高等数学 · 第三章课后作业':mode==='print'?'例如：校园打印店 · 文件接收':'例如：活动照片 / 项目资料 / 报名材料'} autoFocus/></label>
   <div className={school?'form-row':''}><label>{school?'课程 / 班级':'部门 / 地点（选填）'}<input name="course" maxLength={80} placeholder={school?'例如：高等数学 · 计科2401':'例如：学校东门 / 行政办公室'}/></label>{school&&<label>预计提交人数<input type="number" name="expected" min="0" max="2000" defaultValue="100"/></label>}</div>
   <label>截止时间（北京时间）<input type="datetime-local" name="deadline"/><small>{school?'留空则不限时，截止后自动停止接收。':'长期收件请留空，二维码可以一直使用。'}</small></label>
   <label>{school?'作业说明':'收件说明（选填）'}<textarea name="description" maxLength={1500} rows={3} placeholder={school?'填写作业内容、文件格式等要求…':mode==='print'?'例如：营业时间9:00—21:00，文件上传后请到柜台确认价格和取件时间。':'告诉提交者要交什么、如何命名或需要注意的事…'}/></label>
   {school&&<details><summary>添加班级名单 <span>可选 · 自动识别未交同学</span></summary><label><textarea name="roster" rows={4} placeholder={'每行一个同学，学号和姓名用空格或逗号隔开\n20240101 张三\n20240102 李四'}/><small>添加名单后，提交时会校验姓名学号；人数以名单为准。</small></label></details>}
   {!school&&<div className="form-note">无需学号。同名提交也会独立归档，新的批次不会覆盖之前的文件。</div>}
   <div className="form-note">新上传文件保存30天，到期停止下载并清理；原有未设置期限的文件继续保留。</div>
   <div className="form-note"><ShieldCheck size={16}/>提交者只能上传，无法查看其他人的文件。</div>{error&&<div className="error">{error}</div>}
   <div className="modal-actions"><button type="button" className="button secondary" onClick={close} disabled={busy}>取消</button><button className="button" disabled={busy}>{busy?'正在创建…':'创建收集'}<ArrowUpRight size={17}/></button></div>
  </form>
 </section></div>;
}
