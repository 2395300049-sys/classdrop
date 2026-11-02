import {db,bucket,json,handle} from '../../../../lib/data';
import {expireFiles} from '../../../../lib/maintenance';
export const dynamic='force-dynamic';
// No caller-selected identifiers or dates: this endpoint can only expire already-due files.
// The daily cloud job may call it without receiving any user or file information.
export async function POST(){return handle(async()=>json(await expireFiles(db(),bucket())));}
