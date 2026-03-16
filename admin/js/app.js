
// ═══════════════════════════ DATA ═══════════════════════════
const SEATS=80, FINE=5;
const today=new Date();

const DB={
  students:[
    {id:'2024-11098',name:'Juan dela Cruz',course:'BSCS',year:'2nd Year',email:'jdelacruz@neu.edu.ph',rfid:'A3:4F:2B:1C',status:'active',linkedAt:'2024-08-01'},
    {id:'2024-11204',name:'Ana Lim',course:'BSIT',year:'1st Year',email:'alim@neu.edu.ph',rfid:'B2:3A:1D:5E',status:'active',linkedAt:'2024-08-01'},
    {id:'2023-09876',name:'Carlo Mendoza',course:'BSCE',year:'3rd Year',email:'cmendoza@neu.edu.ph',rfid:'C1:5B:3E:2F',status:'active',linkedAt:'2023-08-10'},
    {id:'2024-10552',name:'Sofia Reyes',course:'BSN',year:'2nd Year',email:'sreyes@neu.edu.ph',rfid:'D4:2C:6A:3B',status:'active',linkedAt:'2024-08-05'},
    {id:'2023-08831',name:'Miguel Santos',course:'BSBA',year:'3rd Year',email:'msantos@neu.edu.ph',rfid:'E5:1D:4C:7A',status:'active',linkedAt:'2023-09-01'},
    {id:'2022-07621',name:'Maria Garcia',course:'BSEd',year:'4th Year',email:'mgarcia@neu.edu.ph',rfid:'F6:3E:5D:8B',status:'active',linkedAt:'2022-08-15'},
    {id:'2024-11330',name:'Pedro Reyes',course:'BSME',year:'1st Year',email:'preyes@neu.edu.ph',rfid:'',status:'active',linkedAt:''},
    {id:'2023-10210',name:'Liza Torres',course:'AB Comm',year:'2nd Year',email:'ltorres@neu.edu.ph',rfid:'G7:4F:6E:9C',status:'active',linkedAt:'2023-08-20'},
    {id:'2022-06500',name:'Ramon Cruz',course:'BSCS',year:'4th Year',email:'rcruz@neu.edu.ph',rfid:'H8:5G:7F:0D',status:'inactive',linkedAt:'2022-08-01'},
  ],
  books:[
    {id:'BK-001',title:'Introduction to Calculus',author:'James Stewart',isbn:'978-0538497817',category:'Mathematics',total:5,available:3,desc:'Classic calculus textbook'},
    {id:'BK-002',title:'World History Vol. 2',author:'William McNeill',isbn:'978-0195117400',category:'History',total:3,available:1,desc:'Comprehensive world history'},
    {id:'BK-003',title:'Data Structures & Algorithms',author:'Thomas Cormen',isbn:'978-0262033848',category:'Computer Science',total:4,available:2,desc:'Fundamental CS algorithms'},
    {id:'BK-004',title:'Philippine Literature',author:'Gemino Abad',isbn:'978-9712714802',category:'Philippine Studies',total:6,available:4,desc:'Literary anthology'},
    {id:'BK-005',title:'General Chemistry',author:'Linus Pauling',isbn:'978-0486656229',category:'Science',total:3,available:3,desc:'General chemistry'},
    {id:'BK-006',title:'Engineering Mechanics',author:'R.C. Hibbeler',isbn:'978-0133918922',category:'Engineering',total:4,available:1,desc:'Statics and dynamics'},
    {id:'BK-007',title:'Noli Me Tangere',author:'Jose Rizal',isbn:'978-9712714901',category:'Philippine Studies',total:8,available:6,desc:'Jose Rizal classic novel'},
    {id:'BK-008',title:'Operating Systems',author:'Andrew Tanenbaum',isbn:'978-0133591620',category:'Computer Science',total:3,available:2,desc:'Modern OS concepts'},
  ],
  logs:[],
  borrowings:[],
  nextBk:9, nextTx:1001, rfidCnt:0,
};

// ── Seed attendance ──
const PRPS=['Study','Research','Thesis','Reading','Borrowing'];
const MTHS=['RFID','QR','RFID','RFID','QR','RFID','RFID','QR','RFID'];
const base=new Date(today); base.setHours(7,0,0,0);
for(let i=0;i<8;i++){
  const tin=new Date(base.getTime()+(i*28+Math.floor(Math.random()*12))*60000);
  const tout=i<6?new Date(tin.getTime()+(35+i*12)*60000):null;
  const s=DB.students[i%DB.students.length];
  DB.logs.push({lid:Date.now()+i,sid:s.id,name:s.name,timeIn:tin,timeOut:tout,method:MTHS[i],purpose:PRPS[i%PRPS.length]});
}

// ── Seed borrowings ──
const mkd=(off)=>{const d=new Date(today);d.setDate(d.getDate()+off);return d;};
[
  {sid:'2022-07621',sn:'Maria Garcia',bid:'BK-001',bt:'Introduction to Calculus',doff:7,st:'borrowed'},
  {sid:'2023-08831',sn:'Miguel Santos',bid:'BK-002',bt:'World History Vol. 2',doff:-3,st:'overdue'},
  {sid:'2023-09876',sn:'Carlo Mendoza',bid:'BK-003',bt:'Data Structures & Algorithms',doff:14,st:'borrowed'},
  {sid:'2024-10552',sn:'Sofia Reyes',bid:'BK-004',bt:'Philippine Literature',doff:5,st:'borrowed'},
  {sid:'2024-11098',sn:'Juan dela Cruz',bid:'BK-006',bt:'Engineering Mechanics',doff:-1,st:'overdue'},
].forEach((b,i)=>{
  DB.borrowings.push({id:'TX-'+DB.nextTx++,sid:b.sid,sname:b.sn,bid:b.bid,btitle:b.bt,borrowDate:mkd(-5-i),dueDate:mkd(b.doff),returnDate:null,status:b.st,notes:''});
  const bk=DB.books.find(x=>x.id===b.bid);if(bk&&bk.available>0)bk.available--;
});

// ═══════════════════════════ HELPERS ═══════════════════════════
const pad=n=>String(n).padStart(2,'0');
function ft(d){if(!d)return'—';const h=d.getHours(),m=d.getMinutes(),s=d.getSeconds();return`${h%12||12}:${pad(m)}:${pad(s)} ${h>=12?'PM':'AM'}`;}
function fd(d){if(!d)return'—';return d.toLocaleDateString('en-PH',{month:'short',day:'2-digit',year:'numeric'});}
function fdi(d){return d.toISOString().slice(0,10);}
function diffMin(a,b){return Math.max(0,Math.floor((b-a)/60000));}
function ddays(a,b){return Math.floor((b-a)/86400000);}
function fine(b){if(b.status==='returned'||!b.dueDate)return 0;const ref=b.returnDate||new Date();return Math.max(0,ddays(b.dueDate,ref))*FINE;}
function g(id){return document.getElementById(id);}
function st(id,v){const e=g(id);if(e)e.textContent=v;}
function inside(){return DB.logs.filter(l=>!l.timeOut);}
function tLogs(){return DB.logs.filter(l=>l.timeIn.toDateString()===today.toDateString());}
function overdues(){return DB.borrowings.filter(b=>b.status==='overdue');}

// ═══════════════════════════ NAV ═══════════════════════════
const PTITLES={dashboard:'Dashboard Overview',attendance:'Live Attendance Monitoring',books:'Book Management',students:'Student Management',borrowing:'Borrowing & Returns',analytics:'Analytics & Insights',reports:'Reports & Export',rfid:'RFID / QR Configuration',settings:'System Settings',accounts:'Account Management'};

function nav(page,el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));
  g('page-'+page).classList.add('active');
  if(el)el.classList.add('active');
  st('ptitle',PTITLES[page]||page);
  renderPage(page);
}
function renderPage(p){
  if(p==='dashboard'){renderDash();}
  if(p==='attendance'){renderInsideNow();renderAttHist();}
  if(p==='books'){renderBooks();bkStats();}
  if(p==='students'){renderStudents();stStats();}
  if(p==='borrowing'){renderBorrowings();brStats();}
  if(p==='analytics'){renderAnalytics();}
  if(p==='rfid'){renderRFID();}
  if(p==='reports'){initRptDates();}
  if(p==='accounts'){renderAccountPage();}
}

// ═══════════════════════════ REALTIME ENGINE ═══════════════════════════
let tickQ=[];
function pushTick(msg){tickQ.unshift(msg);if(tickQ.length>18)tickQ.pop();const el=g('ticker');if(el)el.textContent=tickQ.join('   ·   ');}

function rtTick(){
  if(Math.random()<0.45)simCheckin();
  if(Math.random()<0.07)simBorrowEvent();
  DB.borrowings.forEach(b=>{if(b.status==='borrowed'&&new Date(b.dueDate)<new Date())b.status='overdue';});
  updateAll();
}

function simCheckin(){
  const actStu=DB.students.filter(s=>s.status==='active');
  const s=actStu[Math.floor(Math.random()*actStu.length)];
  const already=DB.logs.find(l=>l.sid===s.id&&!l.timeOut&&l.timeIn.toDateString()===today.toDateString());
  if(already){
    already.timeOut=new Date();
    pushTick(`🔴 ${s.name} checked OUT · ${ft(already.timeOut)}`);
  } else {
    const method=Math.random()>0.35?'RFID':'QR';
    DB.logs.push({lid:Date.now(),sid:s.id,name:s.name,timeIn:new Date(),timeOut:null,method,purpose:PRPS[Math.floor(Math.random()*PRPS.length)]});
    if(method==='RFID'){
      DB.rfidCnt++;st('rfid-cnt',DB.rfidCnt);
      const el=g('rfid-last');if(el)el.textContent=`${s.rfid||'??:??:??:??'} — ${s.name} · ${ft(new Date())}`;
    }
    pushTick(`🟢 ${s.name} checked IN via ${method} · ${ft(new Date())}`);
  }
}

function simBorrowEvent(){
  const active=DB.borrowings.filter(b=>b.status!=='returned');
  if(active.length&&Math.random()<0.5){
    const b=active[Math.floor(Math.random()*active.length)];
    b.status='returned';b.returnDate=new Date();
    const bk=DB.books.find(x=>x.id===b.bid);if(bk)bk.available=Math.min(bk.total,bk.available+1);
    pushTick(`📗 "${b.btitle}" returned by ${b.sname}`);
  }
}

function updateAll(){
  const ins=inside(), tl=tLogs(), ov=overdues();
  const bToday=DB.borrowings.filter(b=>b.borrowDate.toDateString()===today.toDateString());

  // Dashboard stats
  st('sv',tl.length); st('si',ins.length); st('sb3',bToday.length); st('so',ov.length);
  st('sv2',`↑ ${Math.max(5,Math.floor(tl.length/2+3))}%`);
  st('sb4',`↑ ${bToday.length}`);
  st('so2',ov.length>0?`${ov.length} overdue`:'All clear');

  // Ring
  const pct=Math.round((ins.length/SEATS)*100);
  st('rpct',pct+'%'); st('locc',ins.length); st('lavl',SEATS-ins.length);
  const ring=g('ring');
  if(ring)ring.setAttribute('stroke-dashoffset',(251.3-(251.3*pct/100)).toFixed(1));

  // Nav badges
  st('nb-in',ins.length); st('nb-ov',ov.length);

  // Attendance page
  st('ai',ins.length); st('at',tl.length); st('aseat',SEATS-ins.length);
  st('ain-l',ins.length+' students');

  // Stats
  bkStats(); stStats(); brStats();

  // Active page updates
  const ap=document.querySelector('.page.active');
  if(ap){
    const pid=ap.id.replace('page-','');
    if(pid==='attendance'){renderInsideNow();renderAttHist();}
    if(pid==='dashboard'){renderDashCI();renderDashBor();}
    if(pid==='borrowing')renderBorrowings();
  }
}

// ═══════════════════════════ DASHBOARD ═══════════════════════════
function renderDash(){buildBarChart();buildPurBars();renderDashCI();renderDashBor();renderEvents();}

function renderDashCI(){
  const tb=g('d-ci');if(!tb)return;
  const logs=[...tLogs()].reverse().slice(0,6);
  tb.innerHTML=logs.map(l=>`<tr>
    <td><strong>${l.name}</strong><br><span style="font-size:10px;color:#9a8f7e">${l.sid}</span></td>
    <td>${ft(l.timeIn)}</td>
    <td><span class="mp ${l.method.toLowerCase()}">${l.method}</span></td>
    <td>${l.purpose}</td></tr>`).join('');
}

function renderDashBor(){
  const el=g('d-bor');if(!el)return;
  const cols=['linear-gradient(135deg,#1a2f5e,#2755b8)','linear-gradient(135deg,#1a6b3a,#27ae60)','linear-gradient(135deg,#8e1515,#c0392b)','linear-gradient(135deg,#7a6030,#b8902a)'];
  const emj=['📘','📗','📕','📙'];
  el.innerHTML=DB.borrowings.slice(0,5).map((b,i)=>`
    <div class="bi">
      <div class="bt" style="background:${cols[i%4]}">${emj[i%4]}</div>
      <div class="bin"><p>${b.btitle}</p><span>${b.sname} · Due ${fd(b.dueDate)}</span></div>
      <div class="bs2 ${b.status==='overdue'?'ov':'ok'}">${b.status==='overdue'?'Overdue':'Active'}</div>
    </div>`).join('');
}

let chartBuilt=false;
function buildBarChart(){
  const el=g('barchart');if(!el||chartBuilt)return;chartBuilt=true;
  const hrs=['7AM','8AM','9AM','10AM','11AM','12PM','1PM','2PM','3PM','4PM','5PM'];
  const vals=[8,22,45,63,58,72,80,65,48,35,18];
  const mx=Math.max(...vals);
  hrs.forEach((h,i)=>{
    const pct=(vals[i]/mx)*100;
    const c=document.createElement('div');c.className='bcc';
    c.innerHTML=`<div class="bcb ${vals[i]===mx?'pk':''}" style="height:${pct}%;min-height:3px" title="${vals[i]} visitors at ${h}"></div><div class="bcl">${h}</div>`;
    el.appendChild(c);
  });
}

let purBuilt=false;
function buildPurBars(){
  const el=g('d-pur');if(!el||purBuilt)return;purBuilt=true;
  [['Study',68,'linear-gradient(90deg,var(--blue-deep),var(--blue-glow))'],
   ['Research',20,'linear-gradient(90deg,#1a8a4a,var(--green))'],
   ['Thesis',12,'linear-gradient(90deg,#c0392b,var(--red))']].forEach(([l,p,gr])=>{
    el.innerHTML+=`<div class="pbi"><span class="pbl">${l}</span><div class="pbw"><div class="pbf" style="width:${p}%;background:${gr}"></div></div><span class="pbp">${p}%</span></div>`;
  });
}

// ═══════════════════════════ ATTENDANCE ═══════════════════════════
function renderInsideNow(){
  const el=g('inside-list');if(!el)return;
  const ins=inside();
  if(!ins.length){el.innerHTML='<p style="text-align:center;color:#9a8f7e;font-size:13px;padding:18px">No students inside right now.</p>';return;}
  el.innerHTML=ins.map(l=>{
    const dur=diffMin(l.timeIn,new Date());
    const ini=l.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    return`<div class="ica"><div class="ica-av">${ini}</div><div class="ica-i"><p>${l.name}</p><span>${l.sid} · ${l.method} · ${l.purpose}</span></div><div class="ica-t"><p>${ft(l.timeIn)}</p><span>In</span></div><div class="ica-d">${dur}m</div></div>`;
  }).join('');
}

function renderAttHist(){
  const tb=g('att-tb');if(!tb)return;
  const q=(g('aq')||{}).value||'';
  const mf=(g('amf')||{}).value||'';
  const pf=(g('apf')||{}).value||'';
  let logs=[...tLogs()].reverse();
  if(q)logs=logs.filter(l=>l.name.toLowerCase().includes(q.toLowerCase())||l.sid.includes(q));
  if(mf)logs=logs.filter(l=>l.method===mf);
  if(pf)logs=logs.filter(l=>l.purpose===pf);
  tb.innerHTML=logs.map(l=>{
    const dur=l.timeOut?diffMin(l.timeIn,l.timeOut)+'m':'Active';
    return`<tr><td><strong>${l.name}</strong><br><span style="font-size:10px;color:#9a8f7e">${l.sid}</span></td>
    <td>${ft(l.timeIn)}</td>
    <td>${l.timeOut?ft(l.timeOut):'<span style="color:var(--green);font-weight:600">Inside</span>'}</td>
    <td>${dur}</td><td><span class="mp ${l.method.toLowerCase()}">${l.method}</span></td><td>${l.purpose}</td></tr>`;
  }).join('');
}

// ═══════════════════════════ BOOKS ═══════════════════════════
function bkStats(){
  const tot=DB.books.reduce((a,b)=>a+b.total,0);
  const avl=DB.books.reduce((a,b)=>a+b.available,0);
  st('bkt',DB.books.length);st('bkc',tot);st('bka',avl);st('bkl',tot-avl);
}
function renderBooks(){
  const tb=g('bk-tb2');if(!tb)return;
  const q=(g('bkq')||{}).value||'';
  const cf=(g('bkcf')||{}).value||'';
  const sf=(g('bksf')||{}).value||'';
  let books=DB.books;
  if(q)books=books.filter(b=>b.title.toLowerCase().includes(q.toLowerCase())||b.author.toLowerCase().includes(q.toLowerCase())||b.isbn.includes(q));
  if(cf)books=books.filter(b=>b.category===cf);
  if(sf==='av')books=books.filter(b=>b.available>1);
  if(sf==='lo')books=books.filter(b=>b.available===1);
  if(sf==='ou')books=books.filter(b=>b.available===0);
  tb.innerHTML=books.map(b=>{
    const s=b.available===0?'out':b.available===1?'low':'available';
    const sl=b.available===0?'Out of Stock':b.available===1?'Low Stock':'Available';
    return`<tr><td style="font-family:monospace;font-size:11px">${b.id}</td>
    <td><strong>${b.title}</strong><br><span style="font-size:10px;color:#9a8f7e">${b.isbn}</span></td>
    <td>${b.author}</td><td>${b.category}</td>
    <td><strong>${b.available}</strong>/${b.total}</td>
    <td><span class="sb ${s}">${sl}</span></td>
    <td><button class="btn btn-o btn-xs" onclick="editBk('${b.id}')">✏ Edit</button> <button class="btn btn-r btn-xs" onclick="delBk('${b.id}')">🗑</button></td></tr>`;
  }).join('');
}
function saveBook(){
  const eid=g('bk-eid').value,ti=g('bk-ti').value.trim(),au=g('bk-au').value.trim();
  if(!ti||!au){toast('Title and Author required','e');return;}
  const bd={title:ti,author:au,isbn:g('bk-is').value,category:g('bk-ca').value,total:+g('bk-tc').value,available:+g('bk-ac').value,desc:g('bk-de').value};
  if(eid){const b=DB.books.find(b=>b.id===eid);if(b)Object.assign(b,bd);toast('Book updated!','s');}
  else{DB.books.push({id:'BK-'+String(DB.nextBk++).padStart(3,'0'),...bd});toast('Book added!','s');}
  clearBkForm();renderBooks();bkStats();
}
function editBk(id){
  const b=DB.books.find(b=>b.id===id);if(!b)return;
  g('bk-eid').value=b.id;g('bk-ti').value=b.title;g('bk-au').value=b.author;
  g('bk-is').value=b.isbn;g('bk-ca').value=b.category;
  g('bk-tc').value=b.total;g('bk-ac').value=b.available;g('bk-de').value=b.desc||'';
  st('bkft','Edit Book');
}
function delBk(id){
  if(!confirm('Delete this book?'))return;
  DB.books=DB.books.filter(b=>b.id!==id);
  toast('Book deleted','s');renderBooks();bkStats();
}
function clearBkForm(){
  ['bk-eid','bk-ti','bk-au','bk-is','bk-de'].forEach(i=>g(i).value='');
  g('bk-tc').value=1;g('bk-ac').value=1;st('bkft','Add New Book');
}

// ═══════════════════════════ STUDENTS ═══════════════════════════
function stStats(){
  const act=DB.students.filter(s=>s.status==='active').length;
  st('stt',DB.students.length);st('sta',act);
  st('stl',DB.students.filter(s=>s.rfid).length);st('sti',DB.students.length-act);
}
function renderStudents(){
  const tb=g('st-tb2');if(!tb)return;
  const q=(g('stq')||{}).value||'';
  const cf=(g('stcf')||{}).value||'';
  const sf=(g('stsf')||{}).value||'';
  let stus=DB.students;
  if(q)stus=stus.filter(s=>s.name.toLowerCase().includes(q.toLowerCase())||s.id.includes(q)||s.course.toLowerCase().includes(q.toLowerCase()));
  if(cf)stus=stus.filter(s=>s.course===cf);
  if(sf)stus=stus.filter(s=>s.status===sf);
  tb.innerHTML=stus.map(s=>`<tr>
    <td style="font-family:monospace;font-size:11px">${s.id}</td>
    <td><strong>${s.name}</strong><br><span style="font-size:10px;color:#9a8f7e">${s.email}</span></td>
    <td>${s.course}</td><td>${s.year}</td>
    <td style="font-family:monospace;font-size:11px">${s.rfid||'<span style="color:var(--red)">Not linked</span>'}</td>
    <td><span class="sb ${s.status}">${s.status}</span></td>
    <td>
      <button class="btn btn-o btn-xs" onclick="editSt('${s.id}')">✏</button>
      <button class="btn ${s.status==='active'?'btn-r':'btn-g'} btn-xs" onclick="togSt('${s.id}')">${s.status==='active'?'🚫':'✅'}</button>
    </td></tr>`).join('');
}
function saveStudent(){
  const eid=g('st-eid').value,id=g('st-id').value.trim(),nm=g('st-nm').value.trim();
  if(!id||!nm){toast('Student ID and Name required','e');return;}
  const sd={name:nm,email:g('st-em').value,course:g('st-co').value,year:g('st-yr').value,rfid:g('st-rf').value};
  if(eid){const s=DB.students.find(s=>s.id===eid);if(s)Object.assign(s,sd);toast('Student updated!','s');}
  else{
    if(DB.students.find(s=>s.id===id)){toast('ID already exists','e');return;}
    DB.students.push({id,...sd,status:'active',linkedAt:sd.rfid?fdi(new Date()):''});
    toast('Student registered!','s');
  }
  clearStForm();renderStudents();stStats();
}
function editSt(id){
  const s=DB.students.find(s=>s.id===id);if(!s)return;
  g('st-eid').value=s.id;g('st-id').value=s.id;g('st-nm').value=s.name;
  g('st-em').value=s.email;g('st-co').value=s.course;g('st-yr').value=s.year;g('st-rf').value=s.rfid;
  st('stft','Edit Student');
}
function togSt(id){
  const s=DB.students.find(s=>s.id===id);
  if(s){s.status=s.status==='active'?'inactive':'active';toast(`Student ${s.status}!`,'s');renderStudents();stStats();}
}
function clearStForm(){
  ['st-eid','st-id','st-nm','st-em','st-rf'].forEach(i=>g(i).value='');st('stft','Register Student');
}

// ═══════════════════════════ BORROWING ═══════════════════════════
function brStats(){
  const act=DB.borrowings.filter(b=>b.status==='borrowed').length;
  const ov=overdues().length;
  const ret=DB.borrowings.filter(b=>b.returnDate&&b.returnDate.toDateString()===today.toDateString()).length;
  st('bra',act);st('bro',ov);st('brt',ret);st('brtt',DB.borrowings.length);
}
function renderBorrowings(){
  const tb=g('br-tb');if(!tb)return;
  const q=(g('brq')||{}).value||'';
  const sf=(g('brsf')||{}).value||'';
  let list=[...DB.borrowings].reverse();
  if(q)list=list.filter(b=>b.sname.toLowerCase().includes(q.toLowerCase())||b.btitle.toLowerCase().includes(q.toLowerCase()));
  if(sf)list=list.filter(b=>b.status===sf);
  tb.innerHTML=list.map(b=>{
    const f=fine(b);
    return`<tr>
    <td style="font-family:monospace;font-size:11px">${b.id}</td>
    <td><strong>${b.sname}</strong></td><td>${b.btitle}</td>
    <td>${fd(b.borrowDate)}</td><td>${fd(b.dueDate)}</td>
    <td>${b.returnDate?fd(b.returnDate):'—'}</td>
    <td><span class="sb ${b.status}">${b.status}</span></td>
    <td>${f>0?`<span style="color:var(--red);font-weight:600">₱${f}</span>`:'—'}</td>
    <td>${b.status!=='returned'?`<button class="btn btn-r btn-xs" onclick="qReturn('${b.id}')">Return</button>`:'<span style="font-size:11px;color:#9a8f7e">Done</span>'}</td></tr>`;
  }).join('');
  brStats();
}
function qReturn(id){
  const b=DB.borrowings.find(b=>b.id===id);if(!b)return;
  b.status='returned';b.returnDate=new Date();
  const bk=DB.books.find(x=>x.id===b.bid);if(bk)bk.available=Math.min(bk.total,bk.available+1);
  toast(`"${b.btitle}" returned!`,'s');pushTick(`📗 "${b.btitle}" returned by ${b.sname}`);
  renderBorrowings();updateAll();
}
function openBorrowMod(){
  const ss=g('mb-st'),bs=g('mb-bk');
  ss.innerHTML='<option value="">-- Select Student --</option>'+DB.students.filter(s=>s.status==='active').map(s=>`<option value="${s.id}">${s.name} (${s.id})</option>`).join('');
  bs.innerHTML='<option value="">-- Select Book --</option>'+DB.books.filter(b=>b.available>0).map(b=>`<option value="${b.id}">${b.title} (${b.available} avail)</option>`).join('');
  const dd=new Date(today);dd.setDate(dd.getDate()+7);g('mb-dd').value=fdi(dd);
  openMod('mod-bor');
}
function openReturnMod(){
  g('mr-tx').innerHTML='<option value="">-- Select Transaction --</option>'+DB.borrowings.filter(b=>b.status!=='returned').map(b=>`<option value="${b.id}">${b.id} — ${b.sname} — ${b.btitle}</option>`).join('');
  g('mr-det').style.display='none';
  openMod('mod-ret');
}
function showRetDet(){
  const b=DB.borrowings.find(b=>b.id===g('mr-tx').value);
  const el=g('mr-det');
  if(b){const f=fine(b);el.style.display='block';el.innerHTML=`<strong>${b.btitle}</strong><br>Student: ${b.sname}<br>Due: ${fd(b.dueDate)}<br>Status: <span style="color:${b.status==='overdue'?'var(--red)':'var(--green)'};font-weight:600">${b.status}</span>${f>0?`<br><span style="color:var(--red);font-weight:700">Fine: ₱${f}</span>`:''}`;}
  else el.style.display='none';
}
function procBorrow(){
  const sid=g('mb-st').value,bid=g('mb-bk').value,dd=g('mb-dd').value;
  if(!sid||!bid||!dd){toast('Fill all required fields','e');return;}
  const s=DB.students.find(x=>x.id===sid),bk=DB.books.find(x=>x.id===bid);
  if(!bk.available){toast('No copies available','e');return;}
  bk.available--;
  DB.borrowings.push({id:'TX-'+DB.nextTx++,sid:s.id,sname:s.name,bid:bk.id,btitle:bk.title,borrowDate:new Date(),dueDate:new Date(dd),returnDate:null,status:'borrowed',notes:g('mb-no').value});
  pushTick(`📚 "${bk.title}" borrowed by ${s.name}`);
  toast(`"${bk.title}" borrowed!`,'s');closeMod('mod-bor');updateAll();
}
function procReturn(){
  const id=g('mr-tx').value;if(!id){toast('Select a transaction','e');return;}
  qReturn(id);closeMod('mod-ret');
}

// ═══════════════════════════ ANALYTICS ═══════════════════════════
function renderAnalytics(){
  const dayNames=['Mon','Tue','Wed','Thu','Fri','Sat'];
  const dayVals=[112,87,145,167,tLogs().length||42,98];
  const mxD=Math.max(...dayVals);
  st('an1',Math.round(dayVals.reduce((a,b)=>a+b)/dayVals.length));
  st('an2',Math.max(...dayVals));
  st('an3','12–1 PM');
  const topBk=DB.books.reduce((a,b)=>(b.total-b.available)>(a.total-a.available)?b:a,DB.books[0]);
  st('an4',topBk?(topBk.title.length>18?topBk.title.slice(0,18)+'…':topBk.title):'—');

  const mkBars=(el,items,maxV,grad)=>{
    if(!g(el))return;
    g(el).innerHTML=items.map(([l,v])=>`<div class="anb"><span class="al">${l}</span><div class="aw"><div class="af" style="width:${maxV>0?(v/maxV*100).toFixed(0):0}%;background:${grad}"></div></div><span class="av2">${v}</span></div>`).join('');
  };

  mkBars('an-days',dayNames.map((d,i)=>[d,dayVals[i]]),mxD,'linear-gradient(90deg,var(--blue-deep),var(--blue-glow))');
  mkBars('an-pur',[['Study',68],['Research',20],['Thesis',7],['Borrowing',3],['Reading',2]],68,'linear-gradient(90deg,#1a8a4a,var(--green))');

  const bkData=DB.books.map(b=>[b.title.length>20?b.title.slice(0,20)+'…':b.title,b.total-b.available]).sort((a,b)=>b[1]-a[1]);
  const mxB=Math.max(...bkData.map(b=>b[1]),1);
  mkBars('an-books',bkData,mxB,'linear-gradient(90deg,#c0392b,var(--red))');

  const stData=DB.students.map(s=>[s.name.split(' ').slice(0,2).join(' '),Math.floor(Math.random()*20)+3]).sort((a,b)=>b[1]-a[1]);
  const mxS=Math.max(...stData.map(s=>s[1]));
  mkBars('an-stus',stData,mxS,'linear-gradient(90deg,#7a6030,#b8902a)');
}

// ═══════════════════════════ REPORTS ═══════════════════════════
function initRptDates(){
  const rf=g('rf'),rt=g('rt');
  if(rf&&!rf.value)rf.value=fdi(today);
  if(rt&&!rt.value)rt.value=fdi(today);
}

const RDEFS={
  daily:{title:'Daily Visit Report',headers:['Name','Student ID','Time In','Time Out','Duration','Method','Purpose'],rows:()=>tLogs().map(l=>[l.name,l.sid,ft(l.timeIn),l.timeOut?ft(l.timeOut):'Inside',l.timeOut?diffMin(l.timeIn,l.timeOut)+'m':'Active',l.method,l.purpose])},
  monthly:{title:'Monthly Attendance',headers:['Student ID','Name','Course','Visits','Avg Duration'],rows:()=>DB.students.map(s=>[s.id,s.name,s.course,Math.floor(Math.random()*20)+1,Math.floor(Math.random()*60)+20+'m'])},
  borrowed:{title:'Borrowed Books Report',headers:['Trans ID','Student','Book','Borrowed','Due Date','Status','Fine'],rows:()=>DB.borrowings.map(b=>[b.id,b.sname,b.btitle,fd(b.borrowDate),fd(b.dueDate),b.status,fine(b)>0?'₱'+fine(b):'—'])},
  overdue:{title:'Overdue Books Report',headers:['Trans ID','Student','Book','Due Date','Days Late','Fine (₱)'],rows:()=>overdues().map(b=>[b.id,b.sname,b.btitle,fd(b.dueDate),ddays(b.dueDate,new Date()),fine(b)])},
  purpose:{title:'Purpose of Visit Statistics',headers:['Purpose','Count','Percentage'],rows:()=>{const p={};tLogs().forEach(l=>p[l.purpose]=(p[l.purpose]||0)+1);const t=Object.values(p).reduce((a,b)=>a+b,0)||1;return Object.entries(p).map(([k,v])=>[k,v,(v/t*100).toFixed(1)+'%']);}},
  inventory:{title:'Book Inventory Report',headers:['Book ID','Title','Author','Category','Total','Available','On Loan','Status'],rows:()=>DB.books.map(b=>[b.id,b.title,b.author,b.category,b.total,b.available,b.total-b.available,b.available>0?'Available':'Out of Stock'])},
  students:{title:'Student Registry',headers:['Student ID','Name','Course','Year','RFID','Status'],rows:()=>DB.students.map(s=>[s.id,s.name,s.course,s.year,s.rfid||'Not linked',s.status])},
};

let curRpt=null;
function genReport(){const t=(g('rtype')||{}).value||'daily';showReport(t);}
function showReport(type){
  const def=RDEFS[type];if(!def)return;
  curRpt=type;
  const rows=def.rows();
  st('rpt-title',def.title);
  st('rpt-ts',new Date().toLocaleString('en-PH'));
  g('rpt-th').innerHTML=`<tr>${def.headers.map(h=>`<th>${h}</th>`).join('')}</tr>`;
  g('rpt-bd').innerHTML=rows.length?rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${def.headers.length}" style="text-align:center;color:#9a8f7e;padding:16px">No data available</td></tr>`;
  g('rpt-preview').style.display='block';
  g('rpt-preview').scrollIntoView({behavior:'smooth'});
}
function exportRptPDF(){
  if(!curRpt){toast('Generate a report first','e');return;}
  const def=RDEFS[curRpt];
  makePDF(def.title,def.headers,def.rows(),`Generated: ${new Date().toLocaleString('en-PH')}`);
}
function exportCSV(){
  if(!curRpt){toast('Generate a report first','e');return;}
  const def=RDEFS[curRpt];
  const esc=v=>{const s=String(v??'');return s.includes(',')||s.includes('"')||s.includes('\n')?'"'+s.replace(/"/g,'""')+'"':s;};
  const csv=[def.headers.map(esc).join(','),...def.rows().map(r=>r.map(esc).join(','))].join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=def.title.replace(/[^a-z0-9]/gi,'_')+'_'+fdi(today)+'.csv';
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
  toast('CSV downloaded!','s');
}

// ═══════════════════════════ RFID ═══════════════════════════
function renderRFID(){
  const tb=g('rfid-tb');if(!tb)return;
  tb.innerHTML=DB.students.map(s=>`<tr>
    <td style="font-family:monospace;font-size:11px">${s.id}</td>
    <td><strong>${s.name}</strong></td><td>${s.course}</td>
    <td style="font-family:monospace;font-size:11px">${s.rfid||'—'}</td>
    <td><span class="sb ${s.rfid?'linked':'unlinked'}">${s.rfid?'Linked':'Not Linked'}</span></td>
    <td style="font-size:11px;color:#9a8f7e">${s.linkedAt||'—'}</td>
    <td>${s.rfid?`<button class="btn btn-r btn-xs" onclick="unlinkRFID('${s.id}')">Unlink</button>`:'—'}</td></tr>`).join('');
}
function linkRFID(){
  const sq=(g('rfid-stu')||{}).value.trim(),uid=(g('rfid-uid')||{}).value.trim();
  if(!sq||!uid){toast('Fill in both fields','e');return;}
  const s=DB.students.find(s=>s.id===sq||s.name.toLowerCase().includes(sq.toLowerCase()));
  if(!s){toast('Student not found','e');return;}
  s.rfid=uid;s.linkedAt=fdi(new Date());
  toast(`Card linked to ${s.name}!`,'s');renderRFID();stStats();
}
function unlinkRFID(id){
  const s=DB.students.find(s=>s.id===id);
  if(s){s.rfid='';s.linkedAt='';toast(`Card unlinked from ${s.name}`,'s');renderRFID();stStats();}
}
setInterval(()=>{
  if(Math.random()<0.22){
    const linked=DB.students.filter(s=>s.rfid);
    const s=linked[Math.floor(Math.random()*linked.length)];
    if(s){DB.rfidCnt++;st('rfid-cnt',DB.rfidCnt);const el=g('rfid-last');if(el)el.textContent=`${s.rfid} — ${s.name} · ${ft(new Date())}`;}
  }
},5000);

// ═══════════════════════════ PDF ENGINE ═══════════════════════════
function makePDF(title,headers,rows,subtitle){
  try{
    const safe=v=>String(v??'—').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const dateStr=new Date().toLocaleString('en-PH');
    const isLandscape=headers.length>6;

    const hCells=headers.map(h=>`<th>${safe(h)}</th>`).join('');
    const bRows=rows.map((r,i)=>{
      const bg=i%2===0?'#ffffff':'#f5f0dc';
      return`<tr style="background:${bg}">${r.map(c=>`<td>${safe(c)}</td>`).join('')}</tr>`;
    }).join('');

    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${safe(title)}</title>
<style>
@page{margin:12mm 10mm;size:${isLandscape?'A4 landscape':'A4 portrait'}}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;font-size:9pt;color:#2a2018;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.hdr{background:#1a2f5e!important;color:#fff;padding:10px 14px;margin-bottom:0}
.hdr h1{font-size:13pt;font-weight:bold;letter-spacing:.5px}
.hdr p{font-size:8pt;opacity:.85;margin-top:2px}
.hdr h2{font-size:11pt;font-weight:bold;margin-top:5px}
.stripe{height:3px;background:linear-gradient(90deg,#2ecc71,#3a6fd8,#e74c3c);margin-bottom:8px}
.meta{display:flex;justify-content:space-between;font-size:8pt;color:#6a5c40;margin-bottom:6px;padding:0 2px}
.summ{background:#f0ead8!important;border:1px solid #d4c9a8;border-radius:4px;padding:5px 10px;margin-bottom:8px;font-size:8.5pt}
.summ span{font-weight:bold;color:#1a2f5e}
table{width:100%;border-collapse:collapse;font-size:8.5pt}
thead tr{background:#1a2f5e!important;color:#fff}
th{padding:6px 8px;text-align:left;font-size:8pt;font-weight:bold;text-transform:uppercase;letter-spacing:.5px;border:1px solid #0d1f45;color:#fff!important}
td{padding:5px 8px;border:1px solid #ddd4b8;vertical-align:middle}
.footer{text-align:center;font-size:7.5pt;color:#9a8f7e;padding:5px 0;margin-top:10px;border-top:1px solid #ddd4b8}
@media print{
  .no-print{display:none}
  body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
</style></head><body>
<div class="hdr">
  <h1>NEW ERA UNIVERSITY LIBRARY</h1>
  <p>No. 9 Central Avenue, New Era, Quezon City &nbsp;|&nbsp; library@neu.edu.ph &nbsp;|&nbsp; (02) 7273-6345</p>
  <h2>${safe(title)}</h2>
</div>
<div class="stripe"></div>
<div class="meta"><span>${safe(subtitle||'')}</span><span>Generated: ${safe(dateStr)}</span></div>
<div class="summ">Total Records: <span>${rows.length}</span> &nbsp;&nbsp;|&nbsp;&nbsp; Report: <span>${safe(title)}</span> &nbsp;&nbsp;|&nbsp;&nbsp; Date: <span>${new Date().toLocaleDateString('en-PH',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</span></div>
${rows.length?`<table><thead><tr>${hCells}</tr></thead><tbody>${bRows}</tbody></table>`:'<p style="text-align:center;padding:20px;color:#9a8f7e">No records found for this report.</p>'}
<div class="footer">NEU Library Management System &nbsp;·&nbsp; ${safe(title)} &nbsp;·&nbsp; Page <span id="pn"></span></div>
<div class="no-print" style="text-align:center;margin:15px;font-family:Arial;font-size:13px;color:#1a2f5e">
  <p style="margin-bottom:10px">👆 Use your browser's <strong>Print</strong> function and select <strong>"Save as PDF"</strong> as the destination.</p>
  <button onclick="window.print()" style="background:#1a2f5e;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:13px;cursor:pointer;font-family:Arial">🖨 Print / Save as PDF</button>
  &nbsp;
  <button onclick="window.close()" style="background:#e2d9c5;color:#2a2018;border:none;padding:10px 18px;border-radius:8px;font-size:13px;cursor:pointer;font-family:Arial">✕ Close</button>
</div>
</body></html>`;

    const win=window.open('','_blank','width=960,height=720');
    if(!win){
      // Popup blocked — fallback to blob download
      const blob=new Blob([html],{type:'text/html;charset=utf-8'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;a.download=title.replace(/[^a-z0-9]/gi,'_')+'_'+fdi(today)+'.html';
      document.body.appendChild(a);a.click();document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('Saved as HTML — open it and print to PDF (popups blocked)','s');
      return;
    }
    win.document.open();win.document.write(html);win.document.close();
    win.focus();
    // Auto-trigger print after content loads
    win.onload=()=>{setTimeout(()=>{win.print();},500);};
    toast('PDF window opened — click "Print / Save as PDF"','s');
  }catch(e){toast('Export error: '+e.message,'e');console.error(e);}
}

// ═══════════════════════════ xpdf / exportTablePDF ═══════════════════════════
function xpdf(type){
  const maps={
    visitors:{t:'Total Visitors Report',h:['Student ID','Name','Time In','Time Out','Method','Purpose'],r:()=>tLogs().map(l=>[l.sid,l.name,ft(l.timeIn),l.timeOut?ft(l.timeOut):'Inside',l.method,l.purpose])},
    inside:{t:'Students Currently Inside',h:['Student ID','Name','Time In','Duration','Method','Purpose'],r:()=>inside().map(l=>[l.sid,l.name,ft(l.timeIn),diffMin(l.timeIn,new Date())+'m',l.method,l.purpose])},
    borrowed:{t:'Books Borrowed Today',h:['Trans ID','Student','Book','Borrow Date','Due Date','Status'],r:()=>DB.borrowings.filter(b=>b.borrowDate.toDateString()===today.toDateString()).map(b=>[b.id,b.sname,b.btitle,fd(b.borrowDate),fd(b.dueDate),b.status])},
    overdue:{t:'Overdue Books Report',h:['Trans ID','Student','Book','Due Date','Days Late','Fine (₱)'],r:()=>overdues().map(b=>[b.id,b.sname,b.btitle,fd(b.dueDate),ddays(b.dueDate,new Date()),fine(b)])},
    books:{t:'Book Inventory',h:['Book ID','Title','Author','Category','Total','Available','On Loan','Status'],r:()=>DB.books.map(b=>[b.id,b.title,b.author,b.category,b.total,b.available,b.total-b.available,b.available>0?'Available':'Out of Stock'])},
    students:{t:'Student Registry',h:['Student ID','Name','Course','Year','RFID','Status'],r:()=>DB.students.map(s=>[s.id,s.name,s.course,s.year,s.rfid||'Not linked',s.status])},
    'active-loans':{t:'Active Loan Report',h:['Trans ID','Student','Book','Borrow Date','Due Date'],r:()=>DB.borrowings.filter(b=>b.status==='borrowed').map(b=>[b.id,b.sname,b.btitle,fd(b.borrowDate),fd(b.dueDate)])},
    borrowings:{t:'All Borrowing Transactions',h:['Trans ID','Student','Book','Borrow Date','Due Date','Return Date','Status','Fine (₱)'],r:()=>DB.borrowings.map(b=>[b.id,b.sname,b.btitle,fd(b.borrowDate),fd(b.dueDate),b.returnDate?fd(b.returnDate):'—',b.status,fine(b)||'—'])},
    analytics:{t:'Analytics Summary',h:['Metric','Value'],r:()=>[['Total Visitors Today',tLogs().length],['Currently Inside',inside().length],['Active Loans',DB.borrowings.filter(b=>b.status==='borrowed').length],['Overdue Books',overdues().length],['Total Books',DB.books.length],['Total Students',DB.students.length],['RFID Linked',DB.students.filter(s=>s.rfid).length],['Avg Daily Visitors',Math.round([112,87,145,167,tLogs().length||42,98].reduce((a,b)=>a+b)/6)]]},
    'att-full':{t:'Daily Attendance Report',h:['Name','Student ID','Time In','Time Out','Duration','Method','Purpose'],r:()=>tLogs().map(l=>[l.name,l.sid,ft(l.timeIn),l.timeOut?ft(l.timeOut):'Inside',l.timeOut?diffMin(l.timeIn,l.timeOut)+'m':'Active',l.method,l.purpose])},
    rfid:{t:'RFID Card Registry',h:['Student ID','Name','Course','RFID UID','Status','Linked At'],r:()=>DB.students.map(s=>[s.id,s.name,s.course,s.rfid||'Not linked',s.rfid?'Linked':'Unlinked',s.linkedAt||'—'])},
    'an-days':{t:'Weekly Visit Analytics',h:['Day','Visitors'],r:()=>[['Monday',112],['Tuesday',87],['Wednesday',145],['Thursday',167],['Friday',tLogs().length||42],['Saturday',98]]},
    'an-purpose':{t:'Purpose of Visit',h:['Purpose','Count','Percentage'],r:()=>{const p={};tLogs().forEach(l=>p[l.purpose]=(p[l.purpose]||0)+1);const t=Object.values(p).reduce((a,b)=>a+b,0)||1;return Object.entries(p).map(([k,v])=>[k,v,(v/t*100).toFixed(1)+'%']);}},
    'an-books':{t:'Most Borrowed Books',h:['Book','Author','Category','Copies on Loan'],r:()=>DB.books.map(b=>[b.title,b.author,b.category,b.total-b.available]).sort((a,b)=>b[3]-a[3])},
    'an-students':{t:'Most Active Students',h:['Student','Course','Visits This Month'],r:()=>DB.students.map(s=>[s.name,s.course,Math.floor(Math.random()*20)+3]).sort((a,b)=>b[2]-a[2])},
  };
  const def=maps[type];if(!def){toast('Report type not found','e');return;}
  makePDF(def.t,def.h,def.r(),`Date: ${today.toLocaleDateString('en-PH')}`);
}

// ═══════════════════════════ MODALS & TOAST ═══════════════════════════
function openMod(id){g(id).classList.add('open');}
function closeMod(id){g(id).classList.remove('open');}
let toastT;
function toast(msg,type='s'){
  const el=g('toast-el');
  el.textContent=(type==='s'?'✅ ':'❌ ')+msg;
  el.className=`toast ${type} show`;
  clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove('show'),3200);
}

// ═══════════════════════════ CLOCK ═══════════════════════════
function tick(){
  const clkEl=g('clk'), pdEl=g('pdate');
  const n=new Date();
  if(clkEl)clkEl.textContent=`${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
  if(pdEl)pdEl.textContent=n.toLocaleDateString('en-PH',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
}

// ── Pre-declare globals (must be before DOMContentLoaded so functions can reference them) ──
let ACCOUNTS=[
  {id:1,name:'Library Administrator',username:'admin',email:'admin@neu.edu.ph',password:'admin123',role:'Admin',status:'active',lastLogin:null,avatar:'LA',avatarBg:'linear-gradient(135deg,#1a2f5e,#3a6fd8)'},
  {id:2,name:'Head Librarian',username:'librarian',email:'librarian@neu.edu.ph',password:'lib123',role:'Librarian',status:'active',lastLogin:null,avatar:'HL',avatarBg:'linear-gradient(135deg,#1a6b3a,#27ae60)'},
  {id:3,name:'Jane Viewer',username:'viewer',email:'viewer@neu.edu.ph',password:'view123',role:'Viewer',status:'active',lastLogin:null,avatar:'JV',avatarBg:'linear-gradient(135deg,#7a6030,#b8902a)'},
];
let nextAcctId=4, SESSION=null;
let EVENTS=[], evNextId=1, evImgData='';
(function seedEvents(){
  const n=new Date();
  const s1=new Date(n);s1.setDate(s1.getDate()-1);s1.setHours(9,0,0,0);
  const e1=new Date(n);e1.setDate(e1.getDate()+2);e1.setHours(17,0,0,0);
  EVENTS.push({id:evNextId++,name:'Book Character Cosplay Day',desc:'Come dressed as your favorite book character! Best costume wins a prize. Open to all NEU students and staff.',start:s1,end:e1,organizer:'NEU Library Committee',location:'NEU Library Lobby',img:'',created:new Date()});
  const s2=new Date(n);s2.setDate(s2.getDate()+5);s2.setHours(13,0,0,0);
  const e2=new Date(n);e2.setDate(e2.getDate()+5);e2.setHours(17,0,0,0);
  EVENTS.push({id:evNextId++,name:'Reading Marathon 2026',desc:'Read for 2 hours straight and earn a certificate! Prizes for top readers. Bring your own book or borrow from us.',start:s2,end:e2,organizer:'NEU Library',location:'NEU Library Reading Room',img:'',created:new Date()});
})();

// ═══════════════════════════ INIT ═══════════════════════════
function switchTab(tab){document.querySelectorAll('.auth-tab').forEach((t,i)=>t.classList.toggle('active',(tab==='login'&&i===0)||(tab==='register'&&i===1)));document.querySelectorAll('.auth-form').forEach(f=>f.classList.remove('active'));document.getElementById('form-'+tab).classList.add('active');clearAuthErr();}
function togglePw(id,eye){const i=document.getElementById(id);const s=i.type==='password';i.type=s?'text':'password';eye.textContent=s?'🙈':'👁';}
function showAuthErr(msg){const el=document.getElementById('auth-err');document.getElementById('auth-err-msg').textContent=msg;el.classList.add('show');}
function clearAuthErr(){document.getElementById('auth-err').classList.remove('show');}
function selectRole(card){document.querySelectorAll('.role-card').forEach(c=>c.classList.remove('selected'));card.classList.add('selected');}
function doLogin(){
  clearAuthErr();
  const user=(document.getElementById('l-user').value||'').trim();
  const pass=document.getElementById('l-pass').value;
  if(!user||!pass){showAuthErr('Please fill in all fields.');return;}
  const btn=document.getElementById('login-btn');
  btn.innerHTML='<span class="auth-spin"></span> Signing in...';btn.disabled=true;
  setTimeout(()=>{
    const acct=ACCOUNTS.find(a=>(a.username===user||a.email===user)&&a.password===pass&&a.status==='active');
    if(!acct){btn.innerHTML='Sign In →';btn.disabled=false;showAuthErr('Invalid username or password.');document.getElementById('l-pass').value='';return;}
    acct.lastLogin=new Date();SESSION=acct;
    const avEl=document.querySelector('.av');const avInfo=document.querySelector('.av-i');
    if(avEl){avEl.textContent=acct.avatar;avEl.style.background=acct.avatarBg;}
    if(avInfo)avInfo.innerHTML='<p>'+acct.name+'</p><span>'+acct.role+' · '+acct.email+'</span>';
    const wall=document.getElementById('auth-wall');
    wall.style.transition='opacity .5s';wall.style.opacity='0';
    setTimeout(()=>{wall.style.display='none';},500);
    toast('Welcome, '+acct.name.split(' ')[0]+'! 👋','s');
    if(document.getElementById('l-rem').checked){try{sessionStorage.setItem('neu_s',JSON.stringify({u:acct.username}));}catch(e){}}
  },800);
}
function doRegister(){
  clearAuthErr();
  const name=(document.getElementById('r-name').value||'').trim();
  const email=(document.getElementById('r-email').value||'').trim();
  const user=(document.getElementById('r-user').value||'').trim();
  const pass=document.getElementById('r-pass').value;
  const pass2=document.getElementById('r-pass2').value;
  const role=document.querySelector('.role-card.selected')?.dataset?.role||'Librarian';
  if(!name||!email||!user||!pass){showAuthErr('All fields are required.');return;}
  if(pass.length<6){showAuthErr('Password must be at least 6 characters.');return;}
  if(pass!==pass2){showAuthErr('Passwords do not match.');return;}
  if(ACCOUNTS.find(a=>a.username===user)){showAuthErr('Username already taken.');return;}
  if(ACCOUNTS.find(a=>a.email===email)){showAuthErr('Email already registered.');return;}
  const ini=name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const bgs=['linear-gradient(135deg,#1a2f5e,#3a6fd8)','linear-gradient(135deg,#1a6b3a,#27ae60)','linear-gradient(135deg,#8e1515,#c0392b)'];
  ACCOUNTS.push({id:nextAcctId++,name,username:user,email,password:pass,role,status:'active',lastLogin:null,avatar:ini,avatarBg:bgs[Math.floor(Math.random()*3)]});
  toast('Account created! Sign in now.','s');switchTab('login');
  document.getElementById('l-user').value=user;
}
function doLogout(){
  if(!confirm('Sign out of NEU Library System?'))return;
  SESSION=null;try{sessionStorage.removeItem('neu_s');}catch(e){}
  document.getElementById('l-user').value='';document.getElementById('l-pass').value='';
  document.getElementById('login-btn').innerHTML='Sign In →';document.getElementById('login-btn').disabled=false;
  const wall=document.getElementById('auth-wall');
  wall.style.opacity='0';wall.style.display='flex';
  requestAnimationFrame(()=>{wall.style.transition='opacity .4s';wall.style.opacity='1';});
  switchTab('login');
}
(function restoreSession(){
  try{
    const saved=JSON.parse(sessionStorage.getItem('neu_s')||'null');
    if(saved){const acct=ACCOUNTS.find(a=>a.username===saved.u&&a.status==='active');
    if(acct){acct.lastLogin=new Date();SESSION=acct;
      const wall=document.getElementById('auth-wall');if(wall){wall.style.opacity='0';setTimeout(()=>{wall.style.display='none';},300);}
      const avEl=document.querySelector('.av');const avInfo=document.querySelector('.av-i');
      if(avEl){avEl.textContent=acct.avatar;avEl.style.background=acct.avatarBg;}
      if(avInfo)avInfo.innerHTML='<p>'+acct.name+'</p><span>'+acct.role+' · '+acct.email+'</span>';
    }}
  }catch(e){}
})();
function renderAccountPage(){
  if(!SESSION)return;
  const sb=document.getElementById('sess-bar-wrap');
  if(sb)sb.innerHTML='<div class="sess-bar"><span class="sb-ico">'+(SESSION.role==='Admin'?'👑':'📖')+'</span><div class="sb-info"><p>Signed in as '+SESSION.name+'</p><span>'+SESSION.role+' · Session since '+(SESSION.lastLogin?SESSION.lastLogin.toLocaleTimeString('en-PH'):'—')+'</span></div><div class="sb-ml"><button class="btn btn-r btn-sm" onclick="doLogout()">🔓 Sign Out</button></div></div>';
  const pp=document.getElementById('my-profile-content');
  if(pp)pp.innerHTML='<div style="display:flex;align-items:center;gap:12px;padding-bottom:12px;border-bottom:1px solid var(--beige-dark);margin-bottom:12px"><div style="width:46px;height:46px;border-radius:50%;background:'+SESSION.avatarBg+';display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;font-weight:700">'+SESSION.avatar+'</div><div><p style="font-weight:600;color:var(--blue-deep);font-size:14px">'+SESSION.name+'</p><span style="font-size:11px;color:#9a8f7e">'+SESSION.email+'</span></div><span class="sb '+SESSION.role.toLowerCase()+'" style="margin-left:auto">'+SESSION.role+'</span></div><div style="font-size:13px;color:#5a4e3a;display:grid;grid-template-columns:1fr 1fr;gap:8px"><div><strong>Username:</strong> '+SESSION.username+'</div><div><strong>Status:</strong> <span style="color:var(--green);font-weight:600">Active</span></div><div><strong>Last Login:</strong> '+(SESSION.lastLogin?SESSION.lastLogin.toLocaleString('en-PH'):'—')+'</div><div><strong>Account ID:</strong> #'+SESSION.id+'</div></div>';
  const n=document.getElementById('pf-name');const e=document.getElementById('pf-email');
  if(n)n.value=SESSION.name;if(e)e.value=SESSION.email;
  renderAccountsTable();
}
function renderAccountsTable(){
  const tb=document.getElementById('acct-tb');if(!tb)return;
  tb.innerHTML=ACCOUNTS.map(a=>'<tr><td><div style="display:flex;align-items:center;gap:9px"><div style="width:30px;height:30px;border-radius:50%;background:'+a.avatarBg+';display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;flex-shrink:0">'+a.avatar+'</div><strong>'+a.name+'</strong></div></td><td style="font-family:monospace;font-size:12px">'+a.username+'</td><td style="font-size:12px">'+a.email+'</td><td><span class="sb '+a.role.toLowerCase()+'">'+a.role+'</span></td><td><span class="sb '+a.status+'">'+a.status+'</span></td><td style="font-size:11px;color:#9a8f7e">'+(a.lastLogin?a.lastLogin.toLocaleString('en-PH',{month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'Never')+'</td><td>'+(a.id!==SESSION?.id?'<button class="btn '+(a.status==='active'?'btn-r':'btn-g')+' btn-xs" onclick="toggleAcct('+a.id+')">'+(a.status==='active'?'🚫':'✅')+'</button>':'<span style="font-size:11px;color:#9a8f7e">You</span>')+'</td></tr>').join('');
}
function toggleAcct(id){if(SESSION?.role!=='Admin'){toast('Only Admins can change account status','e');return;}const a=ACCOUNTS.find(a=>a.id===id);if(!a)return;a.status=a.status==='active'?'inactive':'active';toast('Account '+a.status+'!','s');renderAccountsTable();}
function addAccount(){
  if(SESSION?.role!=='Admin'){toast('Only Admins can create accounts','e');return;}
  const name=(document.getElementById('na-name').value||'').trim();
  const user=(document.getElementById('na-user').value||'').trim();
  const email=(document.getElementById('na-email').value||'').trim();
  const pass=document.getElementById('na-pass').value;
  const role=document.getElementById('na-role').value;
  if(!name||!user||!email||!pass){toast('All fields required','e');return;}
  if(pass.length<6){toast('Password must be 6+ chars','e');return;}
  if(ACCOUNTS.find(a=>a.username===user)){toast('Username taken','e');return;}
  if(ACCOUNTS.find(a=>a.email===email)){toast('Email already used','e');return;}
  const ini=name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const bgs=['linear-gradient(135deg,#1a2f5e,#3a6fd8)','linear-gradient(135deg,#1a6b3a,#27ae60)','linear-gradient(135deg,#8e1515,#c0392b)','linear-gradient(135deg,#7a6030,#b8902a)'];
  ACCOUNTS.push({id:nextAcctId++,name,username:user,email,password:pass,role,status:'active',lastLogin:null,avatar:ini,avatarBg:bgs[Math.floor(Math.random()*4)]});
  ['na-name','na-user','na-email','na-pass'].forEach(i=>document.getElementById(i).value='');
  toast('Account created!','s');renderAccountsTable();
}
function changePassword(){
  const cur=document.getElementById('cp-cur').value;const nw=document.getElementById('cp-new').value;const con=document.getElementById('cp-con').value;
  if(!cur||!nw||!con){toast('Fill in all password fields','e');return;}
  if(SESSION.password!==cur){toast('Current password is incorrect','e');return;}
  if(nw.length<6){toast('New password must be 6+ chars','e');return;}
  if(nw!==con){toast('Passwords do not match','e');return;}
  SESSION.password=nw;const a=ACCOUNTS.find(a=>a.id===SESSION.id);if(a)a.password=nw;
  ['cp-cur','cp-new','cp-con'].forEach(i=>document.getElementById(i).value='');
  toast('Password changed!','s');
}
function saveProfile(){
  const name=(document.getElementById('pf-name').value||'').trim();const email=(document.getElementById('pf-email').value||'').trim();
  if(!name||!email){toast('Name and email required','e');return;}
  SESSION.name=name;SESSION.email=email;SESSION.avatar=name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const a=ACCOUNTS.find(a=>a.id===SESSION.id);if(a){a.name=name;a.email=email;a.avatar=SESSION.avatar;}
  const avEl=document.querySelector('.av');const avInfo=document.querySelector('.av-i');
  if(avEl)avEl.textContent=SESSION.avatar;
  if(avInfo)avInfo.innerHTML='<p>'+SESSION.name+'</p><span>'+SESSION.role+' · '+SESSION.email+'</span>';
  toast('Profile updated!','s');renderAccountPage();
}
// accounts export handled inside xpdf maps above

// ═══════════════════════════ WELCOME POPUP ═══════════════════════════
(function(){const el=document.getElementById('wlc-date');if(el)el.textContent=new Date().toLocaleDateString('en-PH',{weekday:'long',year:'numeric',month:'long',day:'numeric'});})();

function closeWelcome(){
  const w=document.getElementById('welcome-wall');
  if(w){w.classList.add('hide');setTimeout(()=>{w.style.display='none';stopConfetti();},650);}
}

let confettiAnim=null;
function launchConfetti(){
  const canvas=document.getElementById('confetti-canvas');
  if(!canvas)return;
  canvas.width=window.innerWidth;canvas.height=window.innerHeight;
  const ctx=canvas.getContext('2d');
  const COLORS=['#2ecc71','#3a6fd8','#e74c3c','#f1c40f','#9b59b6','#1a2f5e','#00d4ff','#ff6b9d'];
  const pts=[];
  for(let i=0;i<160;i++){pts.push({x:Math.random()*canvas.width,y:Math.random()*canvas.height-canvas.height,w:Math.random()*10+5,h:Math.random()*5+3,color:COLORS[Math.floor(Math.random()*COLORS.length)],rot:Math.random()*360,rotV:(Math.random()-.5)*6,vx:(Math.random()-.5)*3,vy:Math.random()*4+2,op:1,sh:Math.random()>.5?'r':'c'});}
  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    pts.forEach(p=>{
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot*Math.PI/180);ctx.globalAlpha=p.op;ctx.fillStyle=p.color;
      if(p.sh==='c'){ctx.beginPath();ctx.arc(0,0,p.w/2,0,Math.PI*2);ctx.fill();}
      else{ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);}
      ctx.restore();
      p.x+=p.vx;p.y+=p.vy;p.rot+=p.rotV;
      if(p.y>canvas.height+10){p.y=-10;p.x=Math.random()*canvas.width;}
      if(p.y>canvas.height*.7)p.op=Math.max(0,p.op-.008);
    });
    confettiAnim=requestAnimationFrame(draw);
  }
  draw();setTimeout(stopConfetti,6000);
}
function stopConfetti(){if(confettiAnim){cancelAnimationFrame(confettiAnim);confettiAnim=null;}const c=document.getElementById('confetti-canvas');if(c){c.getContext('2d').clearRect(0,0,c.width,c.height);}}

// Patch doLogin to show welcome after login
const _dlOrig=doLogin;
doLogin=function(){
  _dlOrig.apply(this,arguments);
  const watcher=setInterval(()=>{
    const wall=document.getElementById('auth-wall');
    if(wall&&wall.style.display==='none'){
      clearInterval(watcher);
      setTimeout(()=>{const w=document.getElementById('welcome-wall');if(w){w.style.display='flex';w.classList.remove('hide');}launchConfetti();},250);
    }
  },80);
};
// Session restore welcome
setTimeout(()=>{const wall=document.getElementById('auth-wall');if(wall&&wall.style.display==='none'&&SESSION){const w=document.getElementById('welcome-wall');if(w){w.style.display='flex';w.classList.remove('hide');launchConfetti();}}},700);

// EVENTS declared at top — see pre-declarations above

function evStatus(ev){const n=new Date();if(n>=ev.start&&n<=ev.end)return'ongoing';if(n<ev.start)return'upcoming';return'ended';}
function evCountdown(ev){
  const n=new Date(),s=evStatus(ev);if(s==='ended')return'Event has ended';
  const ref=s==='ongoing'?ev.end:ev.start,diff=ref-n;
  const d=Math.floor(diff/86400000),h=Math.floor((diff%86400000)/3600000),m=Math.floor((diff%3600000)/60000);
  return(s==='ongoing'?'⏱ Ends in: ':'⏳ Starts in: ')+(d>0?d+'d ':'')+h+'h '+m+'m';
}
function fmtDT(d){return d?d.toLocaleString('en-PH',{month:'short',day:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';}

function renderEvents(){
  const el=document.getElementById('ev-grid');if(!el)return;
  if(!EVENTS.length){el.innerHTML='<div class="ev-empty">📭 No events yet. Click <strong>+ New Event</strong> to create one.</div>';return;}
  const EMJ=['🎭','📚','🎨','🏆','🎤','📖'];
  const sorted=[...EVENTS].sort((a,b)=>{const O={ongoing:0,upcoming:1,ended:2};return O[evStatus(a)]-O[evStatus(b)]||(a.start-b.start);});
  el.innerHTML=sorted.map(ev=>{
    const st=evStatus(ev);
    const stLbl=st==='ongoing'?'🟢 Ongoing':st==='upcoming'?'🔵 Upcoming':'⚫ Ended';
    const cover=ev.img?'<img class="ev-cover" src="'+ev.img+'" alt="'+ev.name+'">'
      :'<div class="ev-cover-ph">'+EMJ[ev.id%EMJ.length]+'</div>';
    return'<div class="ev-card">'+cover+'<div class="ev-body">'
      +'<div class="ev-name">'+ev.name+'</div>'
      +'<div class="ev-date">📅 '+fmtDT(ev.start)+' — '+fmtDT(ev.end)+'</div>'
      +(ev.organizer?'<div style="font-size:11px;color:#9a8f7e;margin-bottom:4px">👤 '+ev.organizer+(ev.location?' · 📍 '+ev.location:'')+'</div>':'')
      +'<div class="ev-desc">'+(ev.desc||'')+'</div>'
      +'<div><span class="ev-status '+st+'">'+stLbl+'</span></div>'
      +'<div class="ev-countdown">'+evCountdown(ev)+'</div>'
      +'<div style="margin-top:8px;display:flex;gap:6px">'
      +'<button class="btn btn-o btn-xs" onclick="editEv('+ev.id+')">✏ Edit</button>'
      +'<button class="btn btn-r btn-xs" onclick="delEv('+ev.id+')">🗑</button>'
      +'</div></div></div>';
  }).join('');
}
setInterval(()=>{const ap=document.querySelector('.page.active');if(ap&&ap.id==='page-dashboard')renderEvents();},60000);

function openEvMod(){
  ['ev-eid','ev-nm','ev-ds','ev-st','ev-en'].forEach(i=>{const el=document.getElementById(i);if(el)el.value='';});
  document.getElementById('ev-or').value='NEU Library Committee';
  document.getElementById('ev-lo').value='NEU Library';
  evImgData='';
  document.getElementById('ev-upload-inner').innerHTML='<div class="uico">🖼</div><div class="ulbl">Click to upload event cover / illustration<br><span style="font-size:10px">JPG, PNG, GIF supported</span></div>';
  document.getElementById('ev-mod-title').textContent='📅 Create New Event';
  openMod('mod-ev');
}
function editEv(id){
  const ev=EVENTS.find(e=>e.id===id);if(!ev)return;
  const toL=d=>d?new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16):'';
  document.getElementById('ev-eid').value=id;
  document.getElementById('ev-nm').value=ev.name;
  document.getElementById('ev-ds').value=ev.desc||'';
  document.getElementById('ev-or').value=ev.organizer||'';
  document.getElementById('ev-lo').value=ev.location||'';
  document.getElementById('ev-st').value=toL(ev.start);
  document.getElementById('ev-en').value=toL(ev.end);
  evImgData=ev.img||'';
  document.getElementById('ev-upload-inner').innerHTML=ev.img?'<img src="'+ev.img+'" style="max-height:90px;border-radius:6px;max-width:100%">':'<div class="uico">🖼</div><div class="ulbl">Click to upload event cover</div>';
  document.getElementById('ev-mod-title').textContent='✏ Edit Event';
  openMod('mod-ev');
}
function delEv(id){if(!confirm('Delete this event?'))return;EVENTS=EVENTS.filter(e=>e.id!==id);toast('Event deleted','s');renderEvents();}
function previewEvImg(inp){
  const file=inp.files[0];if(!file)return;
  const r=new FileReader();
  r.onload=e=>{evImgData=e.target.result;document.getElementById('ev-upload-inner').innerHTML='<img src="'+evImgData+'" style="max-height:90px;border-radius:6px;max-width:100%">';};
  r.readAsDataURL(file);
}
function saveEvent(){
  const eid=document.getElementById('ev-eid').value;
  const nm=(document.getElementById('ev-nm').value||'').trim();
  const st=document.getElementById('ev-st').value;
  const en=document.getElementById('ev-en').value;
  if(!nm||!st||!en){toast('Name, start and end date required','e');return;}
  const sD=new Date(st),eD=new Date(en);
  if(eD<=sD){toast('End must be after start','e');return;}
  const ev={name:nm,desc:document.getElementById('ev-ds').value,start:sD,end:eD,organizer:document.getElementById('ev-or').value,location:document.getElementById('ev-lo').value,img:evImgData,created:new Date()};
  if(eid){const idx=EVENTS.findIndex(e=>e.id==eid);if(idx>=0)EVENTS[idx]={...EVENTS[idx],...ev};toast('Event updated!','s');}
  else{EVENTS.push({id:evNextId++,...ev});pushTick('📅 New event: "'+nm+'" added!');toast('Event created!','s');}
  closeMod('mod-ev');renderEvents();
}

// Extend xpdf
const _xpdfEv=xpdf;
xpdf=function(type){
  if(type==='events'){makePDF('Library Events Report',['Event','Start','End','Organizer','Location','Status'],EVENTS.map(ev=>[ev.name,fmtDT(ev.start),fmtDT(ev.end),ev.organizer||'—',ev.location||'—',evStatus(ev).toUpperCase()]),'Generated: '+new Date().toLocaleString('en-PH'));return;}
  _xpdfEv(type);
};

// ── Startup calls — run after DOM is ready ──
document.addEventListener('DOMContentLoaded', function() {
  // Spawn auth particles
  (function spawnP(){const el=document.getElementById('auth-particles');if(!el)return;for(let i=0;i<18;i++){const p=document.createElement('div');p.className='auth-p';const s=Math.random()*6+3;p.style.cssText='width:'+s+'px;height:'+s+'px;left:'+Math.random()*100+'%;background:'+(Math.random()>.5?'rgba(46,204,113,0.4)':'rgba(58,111,216,0.4)')+';animation-duration:'+(Math.random()*15+8)+'s;animation-delay:'+(Math.random()*10)+'s';el.appendChild(p);}})();
  setInterval(tick, 1000); tick();
  tickQ=[
    '🟢 Juan dela Cruz checked IN via RFID · 07:00 AM',
    '📚 "Introduction to Calculus" borrowed by Maria Garcia',
    '🔴 OVERDUE: "World History Vol. 2" — Miguel Santos — 3 days',
    '🟢 Ana Lim checked IN via QR Code · 07:28 AM',
    '📊 Library at 78% capacity — peak hours approaching',
    '🟢 Carlo Mendoza checked IN via RFID · 07:56 AM',
    '📗 "Philippine Literature" returned by Sofia Reyes',
  ];
  const tickerEl = g('ticker');
  if(tickerEl) tickerEl.textContent = tickQ.join('   ·   ');
  buildBarChart(); buildPurBars();
  updateAll(); renderDash();
  setInterval(rtTick, 9000);
});
