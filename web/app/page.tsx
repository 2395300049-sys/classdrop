import Dashboard from './ui/dashboard';
import {getAccountUser} from '../lib/accounts';
export const dynamic='force-dynamic';
export default async function Page(){const user=await getAccountUser();return <Dashboard user={user?{name:user.displayName}:null}/>;}
