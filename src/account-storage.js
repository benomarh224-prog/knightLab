import {accountKey} from './account-policy.js';
import {mergeAccountValue} from './account-merge.js';
const ACTIVE='roqvyn-account-active-v1';
const validUser=user=>user&&/^[a-f0-9-]{36}$/i.test(user.id||'');
export function createAccountStorage(raw){
  const fallback=new Map(),listeners=new Set();let user=null;
  const get=key=>{if(fallback.has(key))return fallback.get(key);try{return raw?.getItem(key)??null;}catch{return null;}};
  const put=(key,value)=>{try{if(!raw)throw Error('No storage');raw.setItem(key,value);fallback.delete(key);}catch{fallback.set(key,value);}};
  try{const saved=JSON.parse(get(ACTIVE));if(validUser(saved))user=saved;}catch{}
  const physical=key=>user&&accountKey(key)?`roqvyn-account:${user.id}:${key}`:key;
  function keys(scope=user){const prefix=scope?`roqvyn-account:${scope.id}:`:'';let names=[];try{for(let i=0;i<(raw?.length||0);i++)names.push(raw.key(i));}catch{}names.push(...fallback.keys());return [...new Set(names)].flatMap(key=>{const item=prefix&&key?.startsWith(prefix)?key.slice(prefix.length):!prefix?key:null;return accountKey(item)?[item]:[];});}
  const metadataKey=()=>`roqvyn-account-meta:${user?.id||'guest'}`;
  function metadata(){try{const value=JSON.parse(get(metadataKey())||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch{return {};}}
  function mark(key,patch){const meta=metadata();meta[key]={...meta[key],...patch};put(metadataKey(),JSON.stringify(meta));}
  const api={
    get user(){return user;},getItem:key=>get(physical(key)),
    setItem(key,value){value=String(value);const path=physical(key),previous=get(path);if(user&&accountKey(key)&&(/-course-v1$/.test(key)||key.includes(':lesson-player-v1:')||key.includes(':draft:')||key.includes(':square-practice-v1:')||['roqvyn-daily-training-v1','knightlab-review-evidence-v1','roqvyn-opening-review-v1'].includes(key)||key.startsWith('roqvyn-board-lab-v1:')))value=mergeAccountValue(key,value,previous);if(previous===value)return;put(path,value);if(user&&accountKey(key)){mark(key,{pending:true});for(const listener of listeners)listener(key);}},
    removeItem(key){if(user&&accountKey(key))return;try{raw?.removeItem(key);}catch{}fallback.delete(key);},
    keys:()=>keys(),
    guestEntries:()=>Object.fromEntries(keys(null).map(key=>[key,get(key)])),
    entries:()=>Object.fromEntries(keys().map(key=>[key,api.getItem(key)])),
    state:key=>metadata()[key]||{version:0,pending:false},
    pending:()=>keys().filter(key=>metadata()[key]?.pending),
    subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
    activate(value){if(!validUser(value))throw Error('Invalid account');user={id:value.id,name:String(value.name||''),email:String(value.email||'')};put(ACTIVE,JSON.stringify(user));},
    deactivate(){user=null;try{raw?.removeItem(ACTIVE);}catch{}fallback.delete(ACTIVE);},
    remote(key,value,version){if(!user||!accountKey(key))return;put(physical(key),value);mark(key,{version:Number(version),pending:false});},
    acknowledge(key,sent,version){if(api.getItem(key)===sent)mark(key,{version:Number(version),pending:false});else mark(key,{version:Number(version),pending:true});},
  };
  return api;
}
