/* Backup logic shared by the app shell and its tests. Pure functions; no DOM. */
var BackupCore=(function(){
  'use strict';
  var APP='qingying-rizhi', VERSION=1;
  var KEY_SOBER='sober-log-v1', KEY_LEAN='lean-log-v1';
  var DATE_RE=/^\d{4}-\d{2}-\d{2}$/, ID_RE=/^[A-Za-z0-9_-]{1,40}$/;
  var BAD={'__proto__':1,'constructor':1,'prototype':1};
  var MAX_CHARS=5000000;

  function isObj(x){return x!==null&&typeof x==='object'&&!Array.isArray(x)}
  function stamp(d){return (d&&(typeof d.updatedAt==='string'?d.updatedAt:typeof d.at==='string'?d.at:''))||''}
  function emptyData(){return {sober:{},lean:{daily:{},body:{},ledger:{},prefs:{}}}}
  function readJSON(getItem,key){
    try{var v=JSON.parse(getItem(key)||'{}');return isObj(v)?v:{}}catch(e){return {}}
  }
  function fromStorage(getItem){
    var s=readJSON(getItem,KEY_SOBER), l=readJSON(getItem,KEY_LEAN);
    return {sober:s,lean:{
      daily:isObj(l.daily)?l.daily:{},body:isObj(l.body)?l.body:{},
      ledger:isObj(l.ledger)?l.ledger:{},prefs:isObj(l.prefs)?l.prefs:{}}};
  }
  function toStorage(setItem,d){
    setItem(KEY_SOBER,JSON.stringify(d.sober));
    setItem(KEY_LEAN,JSON.stringify(d.lean));
  }
  function build(d,now){
    var o={app:APP,version:VERSION,exportedAt:now||new Date().toISOString(),data:{}};
    o.data[KEY_SOBER]=d.sober; o.data[KEY_LEAN]=d.lean;
    return o;
  }
  function parse(text){
    if(typeof text!=='string'||!text.trim()) return {ok:false,error:'內容是空的。'};
    if(text.length>MAX_CHARS) return {ok:false,error:'內容太大，不像是這個 App 的備份。'};
    var p;
    try{p=JSON.parse(text)}catch(e){return {ok:false,error:'讀不懂這份內容，請確認是完整的備份檔或備份文字。'}}
    if(!isObj(p)||p.app!==APP||p.version!==VERSION||!isObj(p.data)) return {ok:false,error:'這不是「輕盈日常」的備份。'};
    var d=emptyData(), s=p.data[KEY_SOBER], l=p.data[KEY_LEAN];
    if(isObj(s)) d.sober=s;
    if(isObj(l)) ['daily','body','ledger','prefs'].forEach(function(k){if(isObj(l[k])) d.lean[k]=l[k]});
    return {ok:true,data:d,exportedAt:typeof p.exportedAt==='string'?p.exportedAt:''};
  }
  function mergeMap(local,inc,re,st){
    var out={};
    Object.keys(local).forEach(function(k){if(!BAD[k]) out[k]=local[k]});
    Object.keys(inc).forEach(function(k){
      var v=inc[k];
      if(BAD[k]||!re.test(k)||!isObj(v)){st.skipped++;return}
      if(!Object.prototype.hasOwnProperty.call(out,k)){out[k]=v;st.added++}
      else if(stamp(v)>stamp(out[k])){out[k]=v;st.updated++}
      else st.kept++;
    });
    return out;
  }
  /* Merge never deletes: a record is added if new, replaced only if the incoming copy is newer. */
  function merge(local,inc){
    var st={added:0,updated:0,kept:0,skipped:0}, out=emptyData();
    out.sober=mergeMap(local.sober,inc.sober,DATE_RE,st);
    out.lean.daily=mergeMap(local.lean.daily,inc.lean.daily,DATE_RE,st);
    out.lean.body=mergeMap(local.lean.body,inc.lean.body,DATE_RE,st);
    out.lean.ledger=mergeMap(local.lean.ledger,inc.lean.ledger,ID_RE,st);
    out.lean.prefs={};
    Object.keys(local.lean.prefs).forEach(function(k){if(!BAD[k]) out.lean.prefs[k]=local.lean.prefs[k]});
    if(!isObj(out.lean.prefs.main)&&isObj(inc.lean.prefs.main)){out.lean.prefs.main=inc.lean.prefs.main;st.added++}
    return {data:out,stats:st};
  }
  function summary(d){
    var n=function(o){return Object.keys(o).length};
    return {sober:n(d.sober),daily:n(d.lean.daily),body:n(d.lean.body),ledger:n(d.lean.ledger)};
  }
  return {APP:APP,VERSION:VERSION,KEY_SOBER:KEY_SOBER,KEY_LEAN:KEY_LEAN,fromStorage:fromStorage,toStorage:toStorage,
    build:build,parse:parse,merge:merge,summary:summary,emptyData:emptyData};
})();
if(typeof module!=='undefined'&&module.exports) module.exports=BackupCore;
