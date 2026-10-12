import {isInactive} from './account-removal.js';
const invalid=()=>Object.assign(new Error('Email / USN / Employee ID or password is incorrect.'),{code:'unauthenticated'});
export async function firebasePasswordCall(auth,demo,key,action,body){
  const host=demo?`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com`:'https://identitytoolkit.googleapis.com';
  if(!demo&&!key)throw new Error('Firebase Web API key is required for credential verification.');
  const response=await fetch(`${host}/v1/accounts:${action}?key=${encodeURIComponent(key||'fake-api-key')}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const result=await response.json();return {ok:response.ok,result};
}
export async function loginIdentity(database,identifier){
  const value=String(identifier||'').trim();if(!value||value.length>200)throw invalid();
  const collation={locale:'en',strength:2};let candidates;
  if(value.includes('@'))candidates=await database.collection('users').find({email:value}).collation(collation).limit(3).toArray();
  else{const [students,staff]=await Promise.all([database.collection('students').find({usn:value}).collation(collation).limit(3).toArray(),database.collection('users').find({facultyId:value,role:{$ne:'student'}}).collation(collation).limit(3).toArray()]);const profiles=await Promise.all(students.map(s=>database.collection('users').findOne({_id:s._id,role:'student'})));candidates=[...profiles.filter(Boolean),...staff];}
  const unique=new Map(candidates.map(p=>[p._id,p]));if(unique.size!==1)throw invalid();const profile=[...unique.values()][0];if(isInactive(profile))throw invalid();return profile;
}
export function authenticationRoutes(app,{database,store,auth,demo,key}){
  const attempts=new Map();
  app.post('/api/auth/login',async(req,res)=>{
    const now=Date.now(),address=req.ip,identifier=String(req.body?.identifier||'').trim().toLowerCase();
    const ipOld=attempts.get(`ip:${address}`),ipBudget=ipOld&&ipOld.until>now?ipOld:{count:0,until:now+600000};
    ipBudget.count++;attempts.set(`ip:${address}`,ipBudget);
    const idOld=identifier?attempts.get(`id:${identifier}`):null,idBudget=idOld&&idOld.until>now?idOld:{count:0,until:now+900000};
    if(identifier){idBudget.count++;attempts.set(`id:${identifier}`,idBudget);}
    if(attempts.size>20000)for(const [k,v]of attempts)if(v.until<now)attempts.delete(k);
    if(ipBudget.count>100||(identifier&&idBudget.count>10))return res.status(429).json({error:{code:'too-many-requests',message:'Too many attempts. Wait a bit and try again.'}});
    try{if(typeof req.body.password!=='string'||!req.body.password||req.body.password.length>4096)throw invalid();const p=await loginIdentity(database,req.body.identifier),signed=await firebasePasswordCall(auth,demo,key,'signInWithPassword',{email:p.email,password:req.body.password,returnSecureToken:true});if(!signed.ok||signed.result.localId!==p._id)throw invalid();if(identifier)attempts.delete(`id:${identifier}`);res.json({email:p.email});}catch{res.status(401).json({error:{code:'unauthenticated',message:invalid().message}});}
  });
}
export async function completePasswordChange({store,auth,actor,demo,key,token}){
  if(!actor.mustChangePassword)return {changed:true};
  const lookup=await firebasePasswordCall(auth,demo,key,'lookup',{idToken:token}),user=lookup.result.users?.[0],issued=actor.temporaryPasswordIssuedAt;
  if(!lookup.ok||user?.localId!==actor.uid||!user.passwordUpdatedAt||Number(user.passwordUpdatedAt)<=new Date(issued).getTime())throw Object.assign(new Error('Change your temporary password through Firebase before continuing.'),{code:'permission-denied'});
  await store.doc(`users/${actor.uid}`).set({mustChangePassword:false,passwordChangedAt:new Date()},{merge:true});return {changed:true};
}
