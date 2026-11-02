import Dashboard from '../../ui/dashboard';
import {requireAccountUser} from '../../../lib/accounts';
export const dynamic='force-dynamic';
export default async function Page({params}:any){const {id}=await params;const user=await requireAccountUser('/manage/'+id);return <Dashboard user={{name:user.displayName}} id={id}/>;}
