// Streaming ZIP (stored entries, UTF-8 names, data descriptors). Files never aggregate in memory.
const encoder=new TextEncoder();
const table=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function record(size:number){const bytes=new Uint8Array(size);return {bytes,v:new DataView(bytes.buffer)};}
export async function* zip(entries:AsyncIterable<{name:string;body:ReadableStream<Uint8Array>}>) {
 let offset=0;const central:Uint8Array[]=[];
 for await(const entry of entries){const name=encoder.encode(entry.name);const start=offset;const h=record(30+name.length);h.v.setUint32(0,0x04034b50,true);h.v.setUint16(4,20,true);h.v.setUint16(6,0x808,true);h.v.setUint16(12,0x21,true);h.v.setUint16(26,name.length,true);h.bytes.set(name,30);yield h.bytes;offset+=h.bytes.length;
 let crc=0xffffffff,size=0;const reader=entry.body.getReader();try{while(true){const {done,value}=await reader.read();if(done)break;for(const b of value)crc=table[(crc^b)&255]^(crc>>>8);size+=value.length;offset+=value.length;yield value;}}finally{reader.releaseLock();}crc=(crc^0xffffffff)>>>0;
 if(offset>0xffffffff)throw new Error('ZIP exceeds 4GB');const d=record(16);[0x08074b50,crc,size,size].forEach((n,i)=>d.v.setUint32(i*4,n,true));yield d.bytes;offset+=16;
 const c=record(46+name.length);c.v.setUint32(0,0x02014b50,true);c.v.setUint16(4,20,true);c.v.setUint16(6,20,true);c.v.setUint16(8,0x808,true);c.v.setUint16(14,0x21,true);c.v.setUint32(16,crc,true);c.v.setUint32(20,size,true);c.v.setUint32(24,size,true);c.v.setUint16(28,name.length,true);c.v.setUint32(42,start,true);c.bytes.set(name,46);central.push(c.bytes);
 }
 const centralOffset=offset;for(const c of central){yield c;offset+=c.length;}const end=record(22);end.v.setUint32(0,0x06054b50,true);end.v.setUint16(8,central.length,true);end.v.setUint16(10,central.length,true);end.v.setUint32(12,offset-centralOffset,true);end.v.setUint32(16,centralOffset,true);yield end.bytes;
}
export function zipStream(iterator:AsyncGenerator<Uint8Array>){return new ReadableStream<Uint8Array>({async pull(c){try{const {value,done}=await iterator.next();if(done)c.close();else c.enqueue(value);}catch(e){c.error(e);}},async cancel(){await iterator.return(undefined);}});}
