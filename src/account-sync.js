import {accountKey,validAccountValue} from './account-policy.js';
import {mergeAccountValue} from './account-merge.js';
export function createAccountSync({storage,session,fetcher=fetch,onState=()=>{},onRemote=()=>{}}){
  let busy=false,timer=null,stopped=false;
  async function request(path='',options={}){
    const current=await session(),token=current?.session?.token;
    if(!token||current?.user?.id!==storage.user?.id)throw Error('SESSION');
    const owner=storage.user.id,response=await fetcher('/api/account'+path,{...options,cache:'no-store',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,...options.headers}});
    if(stopped||storage.user?.id!==owner)throw Error('SESSION');
    const data=await response.json();if(!response.ok){const error=Error(data.code|| (response.status===401?'SESSION':'NETWORK'));error.status=response.status;throw error;}return data;
  }
  async function run(){
    if(stopped||busy||!storage.user)return false;busy=true;clearTimeout(timer);onState({status:'syncing'});
    let success=false;try{
      const initial=await request();let changed=false;
      for(const info of initial.records){if(!accountKey(info.key))continue;const local=storage.getItem(info.key),meta=storage.state(info.key);if(Number(info.version)<=meta.version)continue;
        const {record}=await request('?key='+encodeURIComponent(info.key));if(!record)continue;
        if(meta.pending&&local!==null){const merged=mergeAccountValue(info.key,local,record.value);storage.remote(info.key,record.value,record.version);storage.setItem(info.key,merged);if(merged!==local)changed=true;}
        else {storage.remote(info.key,record.value,record.version);if(local!==record.value)changed=true;}
      }
      for(const key of storage.pending()){
        if(!accountKey(key))continue;
        for(let attempt=0;attempt<3;attempt++){
          const value=storage.getItem(key);if(!validAccountValue(value))throw Error('SIZE');
          try{const {record}=await request('',{method:'PUT',body:JSON.stringify({key,value,version:storage.state(key).version||0})});storage.acknowledge(key,value,record.version);break;}
          catch(error){if(error.status!==409||attempt===2)throw error;const {record}=await request('?key='+encodeURIComponent(key));if(!record)continue;const local=storage.getItem(key),merged=mergeAccountValue(key,local,record.value);storage.remote(key,record.value,record.version);storage.setItem(key,merged);if(merged!==local)changed=true;}
        }
      }
      success=true;onState({status:storage.pending().length?'pending':'synced',at:Date.now(),pending:storage.pending().length});if(changed)onRemote();
    }catch(error){onState({status:error.message==='SESSION'?'signed-out':error.message==='QUOTA'||error.message==='SIZE'?'limited':'offline'});}
    finally{busy=false;if(!stopped&&storage.pending().length)timer=setTimeout(run,success?1500:30000);}
    return success;
  }
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(run,1500);};
  const unsubscribe=storage.subscribe(schedule);
  return {run,schedule,stop(){stopped=true;clearTimeout(timer);unsubscribe();}};
}
