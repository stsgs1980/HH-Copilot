(()=>{function F(t,e){if(e=e||"",!t||!(t instanceof Element))return e;if(t.offsetParent===null&&document.body.contains(t)){let a=window.getComputedStyle(t);if(a.display==="none"||a.visibility==="hidden")return e}let i=(t.textContent||"").trim();return i.length>0?i:e}function we(t,e,i){if(i=i||"",!t||!(t instanceof Element))return i;let a=t.getAttribute(e);return a!==null?a:i}function ke(t){let e=[];return!t||typeof t!="object"?{valid:!1,errors:["not an object"]}:((!t.title||typeof t.title!="string"||t.title.trim().length<3)&&e.push("bad title"),(!t.company||typeof t.company!="string")&&e.push("bad company"),(!t.url||typeof t.url!="string"||!t.url.startsWith("https://hh.ru/"))&&e.push("bad url"),(!t.id||typeof t.id!="string")&&e.push("bad id"),{valid:e.length===0,errors:e})}function Ae(t){if(!t||typeof t!="string")return"";let e=t.match(/\/vacancy\/(\d+)/);return e?e[1]:""}function jt(t,e,i){e=e||1e4,i=i||document;let a=n=>{if(!n||!(i===document?document.body:i).contains(n))return!1;let u=window.getComputedStyle(n);return u.display!=="none"&&u.visibility!=="hidden"};return new Promise(n=>{for(let l of t)try{let f=i.querySelector(l);if(a(f)){n(f);return}}catch{}let r=Date.now(),u=new MutationObserver(()=>{if(Date.now()-r>e){u.disconnect(),n(null);return}for(let l of t)try{let f=i.querySelector(l);if(a(f)){u.disconnect(),n(f);return}}catch{}});u.observe(i.body||i,{childList:!0,subtree:!0})})}function Pt(t,e){if(!t||!(t instanceof Element)||t.disabled||!document.body.contains(t))return!1;let i=window.getComputedStyle(t);return i.display==="none"||i.visibility==="hidden"?!1:(t.click(),!0)}function Ot(t,e,i){if(!t||!(t instanceof HTMLElement)||t.disabled||t.readOnly||typeof e!="string"||e.length===0)return!1;let a=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value")?.set||Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;return a?a.call(t,e):t.value=e,t.dispatchEvent(new Event("input",{bubbles:!0})),t.dispatchEvent(new Event("change",{bubbles:!0})),!0}function H(t){return{info:(e,i)=>{},warn:(e,i)=>{},error:(e,i)=>{}}}var Ee={mode:"manual",dailyLimit:200,minMatchScore:60,letterTone:"formal",searchInterval:300,autoScroll:!0,showMatchScore:!0,confirmBeforeApply:!0},te={totalApplied:0,appliedToday:0,interviewInvites:0,responsesReceived:0,skipsToday:0,errorsToday:0,lastActivity:null};async function ie(){try{let t=await chrome.storage.local.get("settings");return Object.assign({},Ee,t.settings||{})}catch{return Object.assign({},Ee)}}async function O(){try{await ae();let t=await chrome.storage.local.get("stats");return Object.assign({},te,t.stats||{})}catch{return Object.assign({},te)}}async function qe(){let t=await O(),e=await ie();return t.appliedToday>=e.dailyLimit?{allowed:!1,remaining:0}:(t.appliedToday++,t.totalApplied++,t.lastActivity=new Date().toISOString(),await chrome.storage.local.set({stats:t}),{allowed:!0,remaining:e.dailyLimit-t.appliedToday})}async function Ce(t){try{return((await chrome.storage.local.get("appliedVacancies")).appliedVacancies||[]).includes(t)}catch{return!1}}async function Se(t){try{let i=(await chrome.storage.local.get("appliedVacancies")).appliedVacancies||[];i.includes(t)||(i.push(t),await chrome.storage.local.set({appliedVacancies:i}))}catch{}}async function ae(){try{let t=await chrome.storage.local.get("dailyResetDate"),e=new Date().toISOString().split("T")[0];if(t.dailyResetDate!==e){let a=(await chrome.storage.local.get("stats")).stats||te;a.appliedToday=0,a.skipsToday=0,a.errorsToday=0,await chrome.storage.local.set({stats:a,dailyResetDate:e})}}catch{}}var V={vacancyCard:['[data-qa="vacancy-serp__vacancy"]','[class*="vacancy-serp-item"]'],vacancyTitleLink:['a[data-qa="serp-item__title"]','a[data-qa="vacancy-serp__vacancy-title"]'],vacancyTitleText:['[data-qa="serp-item__title-text"]'],vacancyCompany:['[data-qa="vacancy-serp__vacancy-employer-text"]','a[data-qa="vacancy-serp__vacancy-employer"]'],vacancySalary:['[data-qa="vacancy-serp__compensation"]'],vacancyLocation:['[data-qa="vacancy-serp__vacancy-address"]'],vacancyExperience:['[data-qa^="vacancy-serp__vacancy-work-experience"]'],vacancyTags:[".bloko-tag__text",'[data-qa*="tag"]'],replyButton:['[data-qa="vacancy-serp__vacancy_response"]','[data-qa="vacancy-response-link-top"]'],nextPage:['[data-qa="pager-next"]'],vacancyTitleOnPage:['[data-qa="vacancy-title"]',"h1.bloko-header-section-1"],vacancyCompanyOnPage:['[data-qa="vacancy-company-name"]','a[data-qa="vacancy-company-name"]'],vacancyDescription:['[data-qa="vacancy-description"]'],vacancyDescriptionContent:['[data-qa="vacancy-description"] .vacancy-description-content'],vacancySkills:['[data-qa="skills-element"]'],vacancySkillsOnPage:['[data-qa="vacancy-serp__vacancy-skills"] .bloko-tag__text','[data-qa="skills-element"]'],responsePopup:['[data-qa="vacancy-response-submit-popup"]'],addCoverLetter:['[data-qa="add-cover-letter"]'],coverLetterInput:['textarea[data-qa="vacancy-response-popup-form-letter-input"]'],submitButton:['[data-qa="vacancy-response-submit-popup"]'],alertMagritte:['[data-qa="magritte-alert"]'],relocationConfirm:['[data-qa="relocation-warning-confirm"]'],testTaskWarning:['[data-qa="test-task-required"]'],alreadyApplied:['[data-qa="already-applied"]'],indirectEmployerAlert:['[data-qa="indirect-employer-alert"]'],resumeTitle:['[data-qa="resume-block-title-position"]','h2[data-qa="resume-block-title-position"]'],resumeSalary:['[data-qa="resume-block-salary"]','[data-qa*="salary"]'],resumeSkillsTable:['[data-qa="skills-table"]','[data-qa*="skill"]'],resumeSkillTag:[".bloko-tag__text",'[data-qa="bloko-tag__text"]'],resumeSkillLevel3:['[data-qa="skill-level-title-3"]'],resumeSkillLevel2:['[data-qa="skill-level-title-2"]'],resumeSkillLevel1:['[data-qa="skill-level-title-1"]'],resumePersonalName:['[data-qa="resume-personal-name"]'],resumeListItem:['[data-qa="resume-list-item"]'],resumeListTitle:['[data-qa="resume-list-item-title"]','a[href*="/resume/"]'],resumeListLink:['a[href*="/resume/"]'],negotiationsChatItem:['[data-qa="negotiations-chat-item"]','[class*="negotiations-chat"]'],negotiationsChatUnread:['[data-qa="negotiations-chat-unread"]','[class*="unread"]'],loginEmailInput:['input[name="username"]','input[type="email"]','input[data-qa="login-input-username"]'],loginPasswordInput:['input[name="password"]','input[type="password"]','input[data-qa="login-input-password"]'],loginCaptchaImage:['img[src*="captcha"]',".g-recaptcha"],logged_in_indicator:['[data-qa="mainmenu_applicant"]','[data-qa="mainmenu_user_name"]','a[data-qa="mainmenu_myResumes"]']};function ze(t){let e=V[t];return e&&Array.isArray(e)?[...e]:[]}function D(t,e){e=e||document;let i=ze(t);for(let a of i)try{let n=e.querySelector(a);if(!n)continue;if(e===document){if(!document.body.contains(n))continue}else if(!e.contains(n))continue;let r=window.getComputedStyle(n);if(r.display!=="none"&&r.visibility!=="hidden")return n}catch{}return null}function Le(t,e){e=e||document;let i=ze(t);for(let a of i)try{let n=e.querySelectorAll(a);if(n&&n.length>0)return Array.from(n)}catch{}return[]}var ne=H("Parser");async function N(){let t=Le("vacancyCard");if(ne.info("Found "+t.length+" vacancy cards"),t.length===0)return[];let e=[],i=[],a=[];try{i=(await chrome.storage.local.get("appliedVacancies")).appliedVacancies||[],a=(await chrome.storage.local.get("blacklistedCompanies")).blacklistedCompanies||[]}catch{}for(let n=0;n<t.length;n++){let r=t[n],u=D("vacancyTitleLink",r),l=F(u);if(!l)continue;let f=we(u,"href",""),m=Ae(f.startsWith("/")?"https://hh.ru"+f:f);if(!m)continue;let h=F(D("vacancyCompany",r)),x=F(D("vacancySalary",r),""),w=F(D("vacancyLocation",r),""),q=F(D("vacancyExperience",r),""),E=r.querySelectorAll('.bloko-tag__text, [data-qa="bloko-tag"]'),$=[];E.forEach(ve=>{let _=(ve.textContent||"").trim();_&&_.length<50&&$.push(_)});let M=D("replyButton",r)!==null,z={id:m,title:l.trim(),company:(h||"").trim(),salary:x||"\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430",location:(w||"").trim(),experience:(q||"").trim(),skills:$,url:f.startsWith("/")?"https://hh.ru"+f:f,hasReply:M,status:"new",parsedAt:new Date().toISOString(),matchScore:null},R=ke(z);if(!R.valid){ne.warn("Card #"+n+" invalid: "+R.errors.join(", "));continue}i.includes(z.id)&&(z.status="applied"),a.includes(z.company)&&(z.status="blacklisted"),e.push(z)}return ne.info("Parsed "+e.length+"/"+t.length+" valid vacancies"),e}var B=H("Resume");function Te(){let t=window.location.pathname;return/\/resume\/[a-f0-9]+/.test(t)?"resume":t.includes("/applicant/resumes")?"resume-list":"other"}async function se(){let t=document.querySelectorAll('[data-qa="profile-experience-viewAll"], button'),e=[];t.forEach(i=>{let a=(i.textContent||"").trim().toLowerCase();if(a.includes("\u043F\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u0432\u0441\u0451")||a.includes("\u043F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0432\u0441\u0435")||a.includes("\u043F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0435\u0449\u0451")||a.includes("\u043F\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u0432\u0441\u0435")||a.includes("\u0440\u0430\u0437\u0432\u0435\u0440\u043D\u0443\u0442\u044C")||a.includes("expand"))try{i.click(),e.push(a)}catch{}}),e.length>0&&(B.info("Expanded hidden sections: "+e.join(", ")),await new Promise(i=>setTimeout(i,1500)))}function G(){let t=document.querySelectorAll("[data-qa]"),e={};t.forEach(h=>{let x=h.getAttribute("data-qa"),w=h.tagName.toLowerCase(),q=(h.textContent||"").trim().substring(0,80),E=x;e[E]||(e[E]=[]),e[E].push({tag:w,text:q||"(empty)",class:(h.className||"").toString().substring(0,60)})});let i={};Object.keys(e).sort().forEach(h=>{let x=h.split("__")[0].split("-")[0].split("_")[0];i[x]||(i[x]=[]),i[x].push(h)}),Object.keys(i).sort().forEach(h=>{}),document.querySelectorAll('[data-qa*="resume"], .resume-block, [class*="resume"]').forEach((h,x)=>{let w=h.getAttribute("data-qa")||"(no data-qa)",q=(h.className||"").toString().substring(0,100),E=(h.textContent||"").trim().substring(0,120)});let n=document.querySelectorAll('.bloko-tag, .bloko-tag__text, [data-qa*="tag"], [data-qa*="skill"]'),r=[];n.forEach(h=>{let x=(h.textContent||"").trim();x&&x.length<100&&!r.includes(x)&&r.push(x)}),Object.keys(V).filter(h=>h.startsWith("resume")).forEach(h=>{let x=V[h],w=!1;for(let q of x)try{let E=document.querySelector(q);if(E&&document.body.contains(E)){w=!0;break}}catch{}}),document.querySelectorAll("h1, h2, h3").forEach(h=>{}),document.querySelectorAll('section, [data-qa*="block"], .bloko-column').forEach((h,x)=>{let w=h.getAttribute("data-qa")||"(none)",q=h.querySelector('h2, h3, [data-qa*="title"]'),E=q?(q.textContent||"").trim().substring(0,80):"(no heading)"});let f=document.querySelector('[data-qa="resume-list-card-experience"]');f&&(f.querySelectorAll("[data-qa]").forEach((x,w)=>{}),Array.from(f.children).forEach((x,w)=>{let q=x.getAttribute("data-qa")||"(no data-qa)",E=x.tagName,$=(x.textContent||"").trim().substring(0,150),P=Array.from(x.querySelectorAll("[data-qa]")).map(M=>M.getAttribute("data-qa"))}));let m=document.querySelector('[data-qa="resume-list-card-education"]');m&&(m.querySelectorAll("[data-qa]").forEach((x,w)=>{}),Array.from(m.children).forEach((x,w)=>{let q=x.getAttribute("data-qa")||"(no data-qa)",E=x.tagName,$=(x.textContent||"").trim().substring(0,150),P=Array.from(x.querySelectorAll("[data-qa]")).map(M=>M.getAttribute("data-qa"))}))}function oe(){let t=performance.now(),e={id:"",url:window.location.href,title:"",salary:"",gender:"",age:"",address:"",specializations:[],skills:[],skillLevels:{},experience:[],education:[],languages:[],additionalInfo:"",parsedAt:new Date().toISOString(),_debug:{found:[],missing:[]}},i=window.location.pathname.match(/\/resume\/([a-f0-9]+)/);e.id=i?i[1]:"";let a=(d,p)=>(p?e._debug.found.push(d+": "+(typeof p=="string"?'"'+p.substring(0,60)+'"':p)):e._debug.missing.push(d),p),n=document.querySelector('[data-qa="resume-block-title-position"]');if(n&&(e.title=a("resumeTitle (data-qa)",F(n))),!e.title){let d=document.querySelector("h1");d&&(e.title=a("resumeTitle (h1)",(d.textContent||"").trim()))}let r=document.querySelector('[data-qa="resume-block-salary"]');r&&(e.salary=a("resumeSalary (data-qa)",F(r)));let u=[],l=document.querySelector('[data-qa="resume-position-card"]');l&&l.querySelectorAll("span, div, p, a").forEach(d=>{let p=(d.textContent||"").trim();p&&p.length>0&&p.length<200&&u.push(p)});let f=n?n.closest("div[data-qa], section")||n.parentElement:null;f&&f.querySelectorAll("span, div, p, a").forEach(d=>{if(d===n||n.contains(d))return;let p=(d.textContent||"").trim();p&&p.length>0&&p.length<200&&!u.includes(p)&&u.push(p)});let m=[/\bмужчина\b/i,/\bженщина\b/i,/\bмужской\b/i,/\bженский\b/i,/\bmale\b/i,/\bfemale\b/i],h=/(?:полных\s*)?(\d{2})\s*(?:лет|год|года)/i,x=/(\d{2})\s*years?\s*old/i;for(let d of u){if(!e.gender)for(let p of m){let L=d.match(p);if(L){e.gender=a("resumeGender",L[0]);break}}if(!e.age){let p=d.match(h)||d.match(x);p&&(e.age=a("resumeAge",p[1]+" \u043B\u0435\u0442"))}if(!e.address&&d.length>3){let p=m.some(k=>k.test(d)),L=h.test(d)||x.test(d);!p&&!L&&!d.includes("\u0440\u0443\u0431")&&!d.includes("USD")&&!d.includes("\u0437/\u043F")&&!d.includes("\u0443\u0440\u043E\u0432\u0435\u043D\u044C")&&!d.includes("\u0434\u043E\u0445\u043E\u0434")&&d!==e.salary&&d!==e.title&&/[А-Яа-яЁё]{2,}/.test(d)&&d.length<80&&(e.address=a("resumeAddress",d))}}let w=document.querySelector('[data-qa="skills-card"]');w?(e._debug.found.push('skillsBlock (data-qa="skills-card")'),w.querySelectorAll('[data-qa^="skill-level-title-"]').forEach(k=>{let A=(k.getAttribute("data-qa")||"").match(/skill-level-title-(\d)/);if(A){let y=A[1],v=(k.textContent||"").trim(),C={3:"\u041F\u0440\u043E\u0434\u0432\u0438\u043D\u0443\u0442\u044B\u0439",2:"\u0421\u0440\u0435\u0434\u043D\u0438\u0439",1:"\u041D\u0430\u0447\u0430\u043B\u044C\u043D\u044B\u0439"};e.skillLevels[y]=C[y]||v,e._debug.found.push("skillLevel"+y+": "+(C[y]||v))}}),w.querySelectorAll('[data-qa^="skill-tag-"]').forEach(k=>{let g=(k.textContent||"").trim();g&&g.length>0&&g.length<100&&!e.skills.includes(g)&&e.skills.push(g)}),w.querySelectorAll(".bloko-tag__text").forEach(k=>{let g=(k.textContent||"").trim();g&&g.length>0&&g.length<100&&!e.skills.includes(g)&&e.skills.push(g)})):e._debug.missing.push('skillsBlock (no data-qa="skills-card")'),e.skills.length>0?e._debug.found.push("skills: "+e.skills.length+" tags"):e._debug.found.some(d=>d.startsWith("skillsBlock"))||e._debug.missing.push("skills (no tags found)");let q=document.querySelector('[data-qa="resume-list-card-experience"]'),E=document.querySelectorAll('[data-qa="profile-experience-company-card"]'),$=[],P=new Set;E.forEach(d=>{P.has(d)||(P.add(d),$.push(d))}),B.info("Experience: total company-cards on page: "+$.length);function M(d){let p={},L=d.querySelector('[data-qa="cell-left-side"]');if(L){let g=L.querySelectorAll('[data-qa="cell-text-content"]');g.length>=1&&(p.company=(g[0].textContent||"").trim()),g.length>=2&&(p.duration=(g[1].textContent||"").trim())}let k=d.querySelector('[data-qa="magritte-stepper-step-content"]');if(k){let g=k.querySelector('[data-qa="cell-left-side"]');if(g){let T=g.querySelectorAll('[data-qa="cell-text-content"]');if(T.length>=1&&(p.position=(T[0].textContent||"").trim()),T.length>=2){let ee=(T[1].textContent||"").trim();ee=ee.replace(/\s*\(\d[^)]+\)$/,"").trim(),p.period=ee}}let y=(k.textContent||"").trim(),v=p.position||"",C=p.period||"";v&&y.startsWith(v)&&(y=y.substring(v.length)),C&&y.startsWith(C)&&(y=y.substring(C.length)),y=y.trim(),y.length>20&&(p.description=y)}return p.company||p.position?p:null}let z=[];$.forEach(d=>{let p=M(d);p&&z.push(p)}),q?e._debug.found.push('experienceBlock (data-qa="resume-list-card-experience")'):e._debug.missing.push("experienceBlock (no container, but "+$.length+" cards found)"),e.experience=z,z.length>0?e._debug.found.push("experience: "+z.length+" entries"):e._debug.missing.push("experience (0 entries extracted)");let R=document.querySelector('[data-qa="resume-list-card-education"]');if(R){e._debug.found.push('educationBlock (data-qa="resume-list-card-education")');let d=[],p=/^(посмотреть всё|редактировать|образование|доп\.? образование|высшее|среднее|среднее специальное|добавить|добавить образование|среднее профессиональное)$/i,L=R.querySelectorAll('[data-qa="cell-left-side"]');if(B.info("Education: found "+L.length+" cell-left-side elements"),L.forEach(k=>{let g={};k.querySelectorAll('[data-qa="cell-text-content"]').forEach(y=>{let v=(y.textContent||"").trim();!v||v.length<2||p.test(v)||(g.name?g.description?!g.year&&/\d{4}/.test(v)&&(g.year=v.match(/\d{4}/)?.[0]||v):g.description=v:g.name=v)}),g.name&&!p.test(g.name)&&g.name.length>3&&d.push(g)}),d.length===0&&(B.info("Education: fallback to direct children of eduCard"),Array.from(R.children).forEach(k=>{let g={},A=k.querySelector("a");if(A){let v=(A.textContent||"").trim();p.test(v)||(g.name=v)}if(!g.name){let v=k.querySelectorAll("span, div, p");for(let C of v){let T=(C.textContent||"").trim();if(T.length>3&&/[А-Яа-яЁё]/.test(T)&&!/^\d/.test(T)&&!/\d{4}/.test(T)&&!p.test(T)){g.name=T;break}}}let y=k.querySelectorAll("span, div");for(let v of y){let C=(v.textContent||"").trim();if(/^\d{4}$/.test(C)||/\d{4}/.test(C)&&C.length<15){g.year=C;break}}g.name&&!p.test(g.name)&&g.name.length>2&&d.push(g)})),d.length===0){B.info("Education: fallback to full text scan");let g=(R.textContent||"").trim().split(/[\n\r]+/).map(A=>A.trim()).filter(A=>A.length>3);for(let A of g)if(/[А-Яа-яЁё]{3,}/.test(A)&&A.length<200){let y=A.match(/(\d{4})/);d.push({name:A.replace(/\d{4}/g,"").trim().substring(0,100),year:y?y[1]:""})}}e.education=d,d.length>0?e._debug.found.push("education: "+d.length+" entries"):e._debug.missing.push("education (0 entries extracted)")}else e._debug.missing.push('educationBlock (no data-qa="resume-list-card-education")');document.querySelectorAll('[data-qa="resume-about-card"] .bloko-tag__text, [data-qa="resume-position-card"] .bloko-tag__text').forEach(d=>{let p=(d.textContent||"").trim();p&&p.length>0&&!e.skills.includes(p)&&e.languages.push(p)}),e.languages.length>0&&e._debug.found.push("languages: "+e.languages.join(", "));let _=document.querySelector('[data-qa="resume-about-card"]');if(_){let d=(_.textContent||"").trim();d.length>10&&(e.additionalInfo=d,e._debug.found.push('additionalBlock (data-qa="resume-about-card")'))}let Qe=(performance.now()-t).toFixed(1);return B.info("Resume parsed in "+Qe+"ms"),B.info("Found: "+e._debug.found.length+" | Missing: "+e._debug.missing.length),B.info("Skills: "+e.skills.length+" | Experience: "+e.experience.length+" | Education: "+e.education.length),e}function re(){let t=[];return document.querySelectorAll('a[href*="/resume/"]').forEach(i=>{let a=i.getAttribute("href")||"",n=a.match(/\/resume\/([a-f0-9]+)/);if(!n)return;let r=n[1];t.find(u=>u.id===r)||t.push({id:r,title:F(i)||"\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044F",url:a.startsWith("http")?a:"https://hh.ru"+a})}),B.info("Resume list: "+t.length+" resumes found"),t}var We={limits:{maxPerDay:200,maxPerHour:30,minIntervalMs:3e4,burstMax:5,burstPauseMs:12e4},lastActionTime:0,burstCount:0,hourlyCount:0,currentHour:new Date().getHours(),adaptiveFactor:1,async check(){let t=await O(),e=await ie(),i=Date.now();if(t.appliedToday>=(e.dailyLimit||this.limits.maxPerDay))return{allowed:!1,reason:"\u0414\u043D\u0435\u0432\u043D\u043E\u0439 \u043B\u0438\u043C\u0438\u0442: "+t.appliedToday+"/"+e.dailyLimit};let a=new Date().getHours();return a!==this.currentHour&&(this.hourlyCount=0,this.currentHour=a),this.hourlyCount>=this.limits.maxPerHour?{allowed:!1,reason:"\u0427\u0430\u0441\u043E\u0432\u043E\u0439 \u043B\u0438\u043C\u0438\u0442",waitMs:36e5}:i-this.lastActionTime<this.limits.minIntervalMs*this.adaptiveFactor?{allowed:!1,reason:"\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u044B\u0441\u0442\u0440\u043E",waitMs:this.limits.minIntervalMs}:this.burstCount>=this.limits.burstMax?{allowed:!1,reason:"Burst pause (5 \u043F\u043E\u0434\u0440\u044F\u0434)",waitMs:this.limits.burstPauseMs}:{allowed:!0}},recordAction(){this.lastActionTime=Date.now(),this.burstCount++,this.hourlyCount++},adaptiveSlowdown(t){let e={429:2,slow:1.5,captcha:1.3}[t]||1;this.adaptiveFactor=Math.min(5,this.adaptiveFactor*e)},resetBurst(){this.burstCount=0}},le=We;function Xe(t,e){t=t||10,e=e||4;let i=Math.max(1e-10,Math.min(1-1e-10,Math.random())),a=Math.sqrt(-2*Math.log(i))*Math.cos(2*Math.PI*Math.random());return Math.max(2,a*e+t)}function Fe(){return new Promise(t=>setTimeout(t,Xe()*1e3))}function ei(){let t=5e3+Math.random()*7e3;return new Promise(e=>setTimeout(e,t))}async function ti(t,e){if(!(!t||typeof e!="string"))for(let i of e)t.value=(t.value||"")+i,t.dispatchEvent(new Event("input",{bubbles:!0})),await new Promise(a=>setTimeout(a,30+Math.random()*90))}var U=H("AutoRespond");async function de(t){U.info("Apply to vacancy: "+t);let e=await le.check();if(!e.allowed)return U.warn(e.reason),{success:!1,reason:e.reason};if(await Ce(t))return{success:!1,reason:"Already applied"};if(!(await qe()).allowed)return{success:!1,reason:"Daily limit"};let a="https://hh.ru/vacancy/"+t;return await chrome.storage.local.set({pendingApply:{vacancyId:t,timestamp:Date.now()}}),window.location.href=a,{success:!1,reason:"Navigating (page reload expected)"}}async function ce(t){return U.info("Continue apply on vacancy page"),await Se(t.vacancyId),{success:!0}}async function He(t,e){e=e||60;let i=t.filter(a=>a.status==="new"&&a.hasReply).filter(a=>a.matchScore===null||a.matchScore>=e).sort((a,n)=>(n.matchScore||0)-(a.matchScore||0));U.info("Auto-apply "+i.length+" vacancies (score >= "+e+")");for(let a of i){if(!(await le.check()).allowed)break;await de(a.id),await Fe()}}var o={isOpen:!1,isLoggedIn:null,status:"idle",activeTab:null,vacancies:[],stats:{},resume:null,resumeList:[],negotiations:[],activeConversation:null,settings:{dailyLimit:200,hourlyLimit:30,minInterval:30,burstDetection:!0,adaptiveSlowdown:!0,captchaAutoPause:!0,captchaPauseTime:5,dailyResetTime:"00:00",autoAuthCheck:!0,notifications:!0,logging:!0,shadowDOM:!0},logs:[],dailyStats:{totalApplied:0,invitations:0,errors429:0},blacklist:[],massApply:{running:!1,minMatch:70,maxApply:20,progress:0}},s={fabEl:null,sidebarEl:null,backdropEl:null,shadowRoot:null};function $e(){return`:host { all: initial; }
*, *::before, *::after { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; box-sizing: border-box; line-height: 1.5; }
:focus-visible { outline: 2px solid #059669; outline-offset: 2px; border-radius: 4px; }
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 3px; }

/* Panel shell */
.fab-panel { width: 720px; height: 100vh; position: fixed; right: 0; top: 0; z-index: 1000;
  background: rgba(255,255,255,0.95); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border-left: 1px solid rgba(0,0,0,0.08); display: flex; flex-direction: column;
  letter-spacing: -0.01em;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.03), 0 8px 40px rgba(0,0,0,0.08), 0 2px 12px rgba(0,0,0,0.04);
  transition: transform 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.25s ease; }
.fab-panel.hidden { transform: translateX(100%); opacity: 0; pointer-events: none; }

/* Tab sections */
.tab-section { display: none; flex: 1; overflow-y: auto; padding: 16px; opacity: 0; transition: opacity 0.2s ease; }
.tab-section::-webkit-scrollbar { width: 3px; }
.tab-section::-webkit-scrollbar-track { background: transparent; }
.tab-section::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
.tab-section::-webkit-scrollbar-thumb:hover { background: #059669; }
.tab-section.active { display: block; opacity: 1; }

/* Tab buttons */
.tab-btn { position: relative; padding: 10px 6px; font-size: 12px; font-weight: 500; color: #52525B;
  background: none; border: none; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column;
  align-items: center; gap: 4px; flex: 1; border-radius: 8px; }
.tab-btn:hover { color: #18181b; background: rgba(0,0,0,0.04); }
.tab-btn.active { color: #059669; font-weight: 600; background: rgba(5,150,105,0.06);
  text-shadow: 0 0 8px rgba(5,150,105,0.12); }
.tab-btn.active::after { content:''; position:absolute; bottom:0; left:50%; transform:translateX(-50%);
  width:20px; height:3px; background:#059669; border-radius:99px;
  transition: width 0.25s cubic-bezier(0.16,1,0.3,1), height 0.2s ease; }

/* Cards */
.card { background: #ffffff; border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; padding: 14px;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.8); }
.card:hover { transform: translateY(-0.5px); box-shadow: 0 2px 12px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8); }

/* Animations */
@keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
.fade-in { animation: fadeIn 0.25s ease; }
@keyframes pulseDot { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
.pulse-dot { animation: pulseDot 2s infinite; }
@keyframes slideRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
.slide-right { animation: slideRight 0.35s cubic-bezier(0.16,1,0.3,1); }
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
.shimmer { background: linear-gradient(90deg, transparent 0%, rgba(5,150,105,0.08) 50%, transparent 100%);
  background-size: 200% 100%; animation: shimmer 2s infinite; }
@keyframes blink { 0%,50% { opacity:1; } 51%,100% { opacity:0; } }
.typing-cursor::after { content:'|'; animation: blink 1s infinite; color: #059669; font-weight: 300; font-size: 14px; }

/* KPI ring */
@keyframes ringFill { from { stroke-dashoffset: 339.292; } }
.kpi-ring-bg { fill: none; stroke: #f4f4f5; stroke-width: 8; }
.kpi-ring-fill { fill: none; stroke: url(#kpiGrad); stroke-width: 8; stroke-linecap: round;
  stroke-dasharray: 339.292; stroke-dashoffset: 123.89; animation: ringFill 1.2s ease-out;
  transform: rotate(-90deg); transform-origin: center; }
@keyframes countdown { from { width: 100%; } to { width: 0%; } }
.countdown-bar { animation: countdown 48s linear infinite; }
@keyframes slideUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
.kpi-stat { animation: slideUp 0.4s ease backwards; }
.kpi-stat:nth-child(1) { animation-delay: 0.1s; }
.kpi-stat:nth-child(2) { animation-delay: 0.2s; }
.kpi-stat:nth-child(3) { animation-delay: 0.3s; }

/* Progress bar */
.progress-bar { height: 6px; background: #f4f4f5; border-radius: 3px; overflow: hidden; }
.progress-bar .fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
@keyframes progressShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.progress-bar .fill.fill-green { background-image: linear-gradient(90deg, #059669 0%, #34D399 40%, #059669 60%, #10B981 100%);
  background-size: 200% 100%; animation: progressShimmer 2.5s linear infinite; }

/* Toggle switch */
.toggle { position: relative; width: 40px; height: 22px; cursor: pointer; }
.toggle input { display: none; }
.toggle .slider { position: absolute; inset: 0; background: #d4d4d8; border-radius: 11px; transition: background 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s; }
.toggle .slider::before { content:''; position:absolute; left:2px; top:2px; width:18px; height:18px;
  background:#fff; border-radius:50%; transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
.toggle input:checked + .slider { background: #059669; box-shadow: 0 0 8px rgba(5,150,105,0.3); }
.toggle input:checked + .slider::before { transform: translateX(18px); box-shadow: 0 1px 4px rgba(0,0,0,0.2); }

/* Badges */
.badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 99px;
  font-size: 11px; font-weight: 600; letter-spacing: 0.01em; font-variant-numeric: tabular-nums; }
.badge-green { background: #D1FAE5; color: #065F46; border: 1px solid rgba(5,150,105,0.15); }
.badge-amber { background: #FEF3C7; color: #92400E; border: 1px solid rgba(217,119,6,0.15); }
.badge-red { background: #FEE2E2; color: #B91C1C; border: 1px solid rgba(220,38,38,0.15); }
.badge-blue { background: #DBEAFE; color: #1E40AF; border: 1px solid rgba(37,99,235,0.15); }
.badge-zinc { background: #F4F4F5; color: #52525B; }

/* Buttons */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 16px;
  border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; border: none;
  transition: all 0.2s cubic-bezier(0.16,1,0.3,1); letter-spacing: -0.01em; }
.btn-primary { background: #059669; color: #fff;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 1px 3px rgba(0,0,0,0.1); }
.btn-primary:hover { background: #047857; transform: translateY(-1px);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 12px rgba(5,150,105,0.25); }
.btn-primary:active { transform: translateY(0);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 1px 2px rgba(0,0,0,0.1); }
.btn-outline { background: transparent; border: 1px solid #d4d4d8; color: #3f3f46;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.5); }
.btn-outline:hover { background: rgba(5,150,105,0.06); border-color: rgba(5,150,105,0.25); color: #059669; }
.btn-danger { background: #DC2626; color: #fff;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 1px 3px rgba(0,0,0,0.1); }
.btn-danger:hover { background: #B91C1C; transform: translateY(-1px);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 12px rgba(220,38,38,0.25); }
.btn-danger:active { transform: translateY(0);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 1px 2px rgba(0,0,0,0.1); }
.btn-sm { padding: 5px 12px; font-size: 12px; }

/* Vacancy items */
.vacancy-item { display: flex; gap: 12px; padding: 12px; border-radius: 10px; border: 1px solid rgba(0,0,0,0.05);
  cursor: pointer; transition: all 0.25s cubic-bezier(0.16,1,0.3,1); border-left: 2px solid transparent; }
.vacancy-item:hover { background: #f9fafb; border-color: rgba(5,150,105,0.15); border-left-color: #059669;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05); }

/* Log entry */
.log-entry { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.04); }
.log-dot { width: 6px; height: 6px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }

/* Timeline */
.timeline-toggle { cursor: pointer; user-select: none; }
.timeline-toggle:hover { background: #FAFAFA; }
.timeline-body { max-height: 0; overflow: hidden; transition: max-height 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.3s; opacity: 0; }
.timeline-body.open { max-height: 2000px; opacity: 1; }
.timeline-chevron { transition: transform 0.3s; }
.timeline-chevron.open { transform: rotate(180deg); }
.tl-item { position: relative; padding-left: 24px; padding-bottom: 4px; }
.tl-item:last-child { padding-bottom: 0; }
.tl-item::before { content: ''; position: absolute; left: 5px; top: 8px; bottom: 0; width: 1.5px; background: #e4e4e7; }
.tl-item:last-child::before { display: none; }
.tl-dot { position: absolute; left: 1px; top: 5px; width: 10px; height: 10px; border-radius: 50%;
  border: 2px solid #fff; box-shadow: 0 0 0 1px rgba(0,0,0,0.08); z-index: 1;
  transition: transform 0.2s, box-shadow 0.2s; }
.tl-item:first-child .tl-dot { box-shadow: 0 0 0 3px rgba(5,150,105,0.15), 0 0 0 1px rgba(0,0,0,0.08); }

/* Sub-accordion */
.sub-toggle { cursor: pointer; user-select: none; display: flex; align-items: center; justify-content: space-between; padding: 5px 8px; margin: 0 -8px; border-radius: 6px; transition: background 0.15s; }
.sub-toggle:hover { background: rgba(0,0,0,0.03); }
.sub-body { max-height: 0; overflow: hidden; transition: max-height 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.25s, padding 0.35s; opacity: 0; padding-top: 0; }
.sub-body.open { max-height: 500px; opacity: 1; padding-top: 6px; }
.sub-chevron { transition: transform 0.25s; flex-shrink: 0; }
.sub-chevron.open { transform: rotate(180deg); }

/* AI reply cards */
.ai-reply-card { padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(5,150,105,0.15);
  border-left: 3px solid rgba(5,150,105,0.25); background: #ffffff; cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16,1,0.3,1); margin-bottom: 6px; }
.ai-reply-card:hover { background: #ECFDF5; border-color: rgba(5,150,105,0.3); border-left-color: #059669;
  transform: translateY(-1px); box-shadow: 0 2px 12px rgba(5,150,105,0.1); }
.ai-reply-card:last-child { margin-bottom: 0; }
.ai-source { display: inline-flex; align-items: center; gap: 3px; padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: 600; }
.ai-src-resume { background: #D1FAE5; color: #065F46; }
.ai-src-vacancy { background: #DBEAFE; color: #1E40AF; }
.ai-src-context { background: #FEF3C7; color: #78350F; }

/* Skill tags */
.skill-tag { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 6px;
  font-size: 12px; font-weight: 500; transition: all 0.15s ease; }
.skill-tag:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.skill-match { background: #D1FAE5; color: #065F46; }
.skill-miss { background: #FEE2E2; color: #B91C1C; }
.skill-extra { background: #DBEAFE; color: #1E40AF; }

/* Conversation items */
.conv-item { transition: all 0.2s ease; border-radius: 8px; }
.conv-item:hover { background: #FAFAFA; }
.conv-item.active { box-shadow: inset 3px 0 0 #059669; }

/* Blacklist items */
.bl-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; background: #FEF2F2; border-radius: 8px; border-left: 3px solid #FECACA; }
.bl-item .btn-bl-del { padding: 4px 10px; background: #FEE2E2; color: #DC2626; border: none; border-radius: 6px; font-size: 11px; cursor: pointer; transition: all 0.15s ease; }
.bl-item .btn-bl-del:hover { background: #DC2626; color: #fff; }

/* Inputs / selects / textareas */
.fab-panel input, .fab-panel select, .fab-panel textarea { background: #FAFAFA;
  transition: border-color 0.2s, box-shadow 0.2s, background-color 0.15s; }
.fab-panel input::placeholder, .fab-panel textarea::placeholder { color: #a1a1aa; }
.fab-panel input:focus, .fab-panel select:focus, .fab-panel textarea:focus {
  border-color: #059669; box-shadow: 0 0 0 3px rgba(5,150,105,0.1); background: #ffffff; outline: none; }

/* Range input */
.fab-panel input[type="range"] { -webkit-appearance: none; appearance: none;
  height: 4px; background: #e4e4e7; border-radius: 2px; outline: none; border: none; padding: 0; }
.fab-panel input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none;
  width: 16px; height: 16px; border-radius: 50%; background: #ffffff; border: 2px solid #059669;
  box-shadow: 0 1px 4px rgba(0,0,0,0.12); cursor: pointer; transition: box-shadow 0.15s; }
.fab-panel input[type="range"]::-webkit-slider-thumb:hover {
  box-shadow: 0 1px 6px rgba(5,150,105,0.3), 0 1px 3px rgba(0,0,0,0.12); }
.fab-panel input[type="range"]::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%;
  background: #ffffff; border: 2px solid #059669; box-shadow: 0 1px 4px rgba(0,0,0,0.12); cursor: pointer; }
.fab-panel input[type="range"]::-moz-range-track { height: 4px; background: #e4e4e7; border-radius: 2px; border: none; }

/* FAB pulse */
@keyframes fabPulse { 0%, 100% { box-shadow: 0 4px 20px rgba(5,150,105,0.4); }
  50% { box-shadow: 0 4px 20px rgba(5,150,105,0.4), 0 0 0 8px rgba(5,150,105,0.12); } }

/* Toast */
.toast { position: fixed; bottom: 24px; right: 24px; z-index: 10000;
  padding: 10px 20px; border-radius: 12px; font-size: 13px; font-weight: 500;
  background: #18181b; color: #fff; box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.1);
  animation: toastIn 0.3s ease, toastOut 0.3s ease 2.7s forwards; }
@keyframes toastIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
@keyframes toastOut { from { opacity:1; } to { opacity:0; transform:translateY(-8px); } }

/* Layout: header, tabbar, content, footer */
.har-header { padding: 14px 16px; border-bottom: 1px solid rgba(0,0,0,0.06); display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.har-close-btn:hover { background: #f4f4f5; color: #18181b; }
.har-tabbar { display: flex; border-bottom: 1px solid rgba(0,0,0,0.06); flex-shrink: 0; padding: 0 4px; }
.har-content { flex: 1; overflow-y: auto; }
.har-footer { padding: 10px 16px; border-top: 1px solid rgba(0,0,0,0.06); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; background: linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0.9)); }
.har-spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #059669; border-radius: 50%; animation: har-spin 0.8s linear infinite; }
@keyframes har-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }

/* Score ring (vacancy match) */
.score-ring { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; position: relative; flex-shrink: 0;
  background: conic-gradient(#059669 0deg, #059669 calc(var(--score) * 3.6deg), #e4e4e7 calc(var(--score) * 3.6deg)); }
.score-ring span { width: 30px; height: 30px; border-radius: 50%; background: #fff; display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; color: #059669; }
.score-ring.high span { color: #059669; }
.score-ring.medium span { color: #D97706; }
.score-ring.low span { color: #DC2626; }
`}function c(t){if(!t)return"";let e=document.createElement("div");return e.textContent=t,e.innerHTML}function ci(t){return t>=70?"high":t>=40?"medium":"low"}var b={briefcase:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>',file:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',folder:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>',chat:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',gear:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',chart:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',send:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>',close:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>',check:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',refresh:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 105.64-11.36L1 10"/></svg>',rocket:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>',search:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',sun:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2"><path d="M12 2v4m0 12v4m-8-10H2m20 0h-2"/><circle cx="12" cy="12" r="4"/></svg>',mail:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>',envelope:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>',ai:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0"/></svg>',clock:'<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',code:'<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',money:'<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>',bubble:'<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',chevronDown:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#71717a" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>'};function pe(){return`
    <div class="har-header">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#059669,#10B981);border-radius:10px;display:flex;align-items:center;justify-content:center;">
          ${b.briefcase.replace("currentColor","#fff").replace('width="16" height="16"','width="16" height="16"')}
        </div>
        <div>
          <div style="font-size:14px;font-weight:700;">HH Copilot</div>
          <div style="font-size:11px;color:#71717a;display:flex;align-items:center;gap:4px;">
            <span class="pulse-dot" style="width:6px;height:6px;background:#10B981;border-radius:50;display:inline-block;"></span>
            \u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044E...
          </div>
        </div>
      </div>
      <button class="har-close-btn" data-action="close-panel" aria-label="\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u043F\u0430\u043D\u0435\u043B\u044C"
        style="width:28px;height:28px;border-radius:8px;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#71717a;">
        ${b.close}
      </button>
    </div>
    <div class="har-content">
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 32px;text-align:center;">
        <div class="har-spinner"></div>
        <h3 style="font-size:16px;font-weight:700;margin:16px 0 8px;">\u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044E...</h3>
        <p style="font-size:13px;color:#71717a;line-height:1.5;">\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u044F\u0435\u043C \u0441\u0442\u0430\u0442\u0443\u0441 \u043D\u0430 hh.ru</p>
      </div>
    </div>
    <div class="har-footer">
      <span style="font-size:11px;color:#71717a;">HH Copilot v1.7.0</span>
      <div style="display:flex;align-items:center;gap:4px;">
        <span style="width:6px;height:6px;background:#10B981;border-radius:50%;"></span>
        <span style="font-size:11px;color:#71717a;">chrome.storage</span>
      </div>
    </div>`}function Be(){return`
    ${Ke()}
    ${Je()}
    ${Ze()}
    ${dt()}
    ${ct()}
    ${pt()}
    ${ut()}
    ${bt()}
    <div class="har-footer">
      <span style="font-size:11px;color:#71717a;">HH Copilot v1.7.0</span>
      <div style="display:flex;align-items:center;gap:4px;">
        <span style="width:6px;height:6px;background:#10B981;border-radius:50%;"></span>
        <span style="font-size:11px;color:#71717a;">chrome.storage</span>
      </div>
    </div>`}function Ke(){return`
    <div class="har-header">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#059669,#10B981);border-radius:10px;display:flex;align-items:center;justify-content:center;">
          ${b.briefcase.replace("currentColor","#fff").replace('width="16" height="16"','width="16" height="16"')}
        </div>
        <div style="flex:1;">
          <div style="font-size:14px;font-weight:700;">HH Copilot</div>
          <div id="header-auth-status" style="font-size:11px;color:#71717a;display:flex;align-items:center;gap:4px;">
            <span class="pulse-dot" style="width:6px;height:6px;background:#10B981;border-radius:50%;display:inline-block;"></span>
            \u0410\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u043D
          </div>
        </div>
      </div>
      <div id="authIndicator" class="badge badge-green" style="cursor:pointer;" title="\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u0434\u043B\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0438">
        <span style="width:5px;height:5px;background:#059669;border-radius:50%;display:inline-block;margin-right:4px;"></span>
        \u041E\u043D\u043B\u0430\u0439\u043D
      </div>
      <button class="har-close-btn" data-action="close-panel" aria-label="\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u043F\u0430\u043D\u0435\u043B\u044C"
        style="width:28px;height:28px;border-radius:8px;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#71717a;">
        ${b.close}
      </button>
    </div>`}function Je(){return`<div class="har-tabbar">${[{id:"overview",label:"\u041E\u0431\u0437\u043E\u0440",icon:b.briefcase},{id:"resume",label:"\u0420\u0435\u0437\u044E\u043C\u0435",icon:b.file},{id:"vacancies",label:"\u0412\u0430\u043A\u0430\u043D\u0441\u0438\u0438",icon:b.folder},{id:"negotiations",label:"\u041F\u0435\u0440\u0435\u0433\u043E\u0432\u043E\u0440\u044B",icon:b.chat},{id:"settings",label:"\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438",icon:b.gear},{id:"stats",label:"\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430",icon:b.chart}].map(e=>`<button class="tab-btn ${e.id==="overview"?"active":""}" data-tab="${e.id}">${e.icon}<span>${e.label}</span></button>`).join("")}</div>`}function Ze(){return`<div class="tab-section active" id="tab-overview">
    ${et()}
    ${tt()}
    ${ot()}
    ${rt()}
    ${lt()}
  </div>`}function et(){return`<div class="card fade-in" style="margin-bottom:12px;border-left:3px solid #059669;">
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <div>
        <div style="font-size:12px;font-weight:600;">\u0410\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F HH.ru</div>
        <div style="font-size:11px;color:#71717a;margin-top:2px;">\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0447\u0435\u0440\u0435\u0437 <code style="font-size:11px;background:#f4f4f5;padding:1px 4px;border-radius:3px;">[data-qa="mainmenu_applicant"]</code></div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="badge badge-green" id="authBadge"><span class="pulse-dot" style="width:5px;height:5px;background:#059669;border-radius:50%;display:inline-block;margin-right:3px;"></span> \u0410\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u043D</span>
        <button class="btn btn-outline btn-sm" data-action="check-auth">\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C</button>
      </div>
    </div>
  </div>`}function tt(){return`<div class="card fade-in" style="margin-bottom:12px;padding:18px;background:linear-gradient(135deg,rgba(5,150,105,0.03) 0%,rgba(16,185,129,0.05) 50%,rgba(37,99,235,0.03) 100%);border:1px solid rgba(5,150,105,0.1);">
    <div style="display:flex;gap:18px;align-items:stretch;">
      ${it()}
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:10px;">
        ${at()}
        ${nt()}
        ${st()}
      </div>
    </div>
  </div>`}function it(){return`<div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;">
    <svg width="108" height="108" viewBox="0 0 120 120">
      <defs><linearGradient id="kpiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#059669"/><stop offset="100%" stop-color="#34D399"/>
      </linearGradient></defs>
      <circle class="kpi-ring-bg" cx="60" cy="60" r="54"/>
      <circle class="kpi-ring-fill" cx="60" cy="60" r="54"/>
    </svg>
    <div style="position:absolute;top:50%;left:42px;transform:translateY(-50%);text-align:center;">
      <div id="kpi-daily-count" style="font-size:26px;font-weight:800;color:#18181b;line-height:1;">0</div>
      <div style="font-size:11px;color:#71717a;font-weight:500;">\u0438\u0437 200</div>
    </div>
    <div style="font-size:11px;font-weight:600;color:#059669;margin-top:6px;letter-spacing:0.3px;">\u0414\u041D\u0415\u0412\u041D\u041E\u0419 \u041B\u0418\u041C\u0418\u0422</div>
  </div>`}function at(){return`<div class="kpi-stat" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,0.7);border-radius:10px;border:1px solid rgba(0,0,0,0.04);">
    <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#FEF3C7,#FDE68A);display:flex;align-items:center;justify-content:center;flex-shrink:0;">${b.sun}</div>
    <div style="flex:1;min-width:0;">
      <div style="display:flex;align-items:baseline;gap:4px;">
        <span id="kpi-hourly-count" style="font-size:18px;font-weight:700;color:#18181b;">0</span>
        <span style="font-size:12px;color:#71717a;">/30 \u0447\u0430\u0441</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-top:3px;">
        <div style="flex:1;height:4px;background:#f4f4f5;border-radius:2px;overflow:hidden;">
          <div id="kpi-hourly-bar" class="progress-bar" style="height:100%;"><div class="fill" style="width:0%;background:linear-gradient(90deg,#D97706,#F59E0B);"></div></div>
        </div>
        <span id="kpi-countdown" style="font-size:11px;color:#B45309;font-weight:600;white-space:nowrap;">--</span>
      </div>
    </div>
  </div>`}function nt(){return`<div class="kpi-stat" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,0.7);border-radius:10px;border:1px solid rgba(0,0,0,0.04);">
    <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#D1FAE5,#A7F3D0);display:flex;align-items:center;justify-content:center;flex-shrink:0;">${b.mail}</div>
    <div style="flex:1;min-width:0;">
      <div style="display:flex;align-items:baseline;gap:4px;">
        <span id="kpi-applied-count" style="font-size:18px;font-weight:700;color:#059669;">0</span>
        <span style="font-size:11px;color:#71717a;">\u043E\u0442\u043A\u043B\u0438\u043A\u043E\u0432</span>
      </div>
      <div style="font-size:11px;color:#71717a;margin-top:2px;">
        <span id="kpi-applied-delta" style="color:#059669;font-weight:600;">+0</span> \u0437\u0430 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0439 \u0447\u0430\u0441
      </div>
    </div>
  </div>`}function st(){return`<div class="kpi-stat" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,0.7);border-radius:10px;border:1px solid rgba(0,0,0,0.04);">
    <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#DBEAFE,#BFDBFE);display:flex;align-items:center;justify-content:center;flex-shrink:0;">${b.envelope}</div>
    <div style="flex:1;min-width:0;">
      <div style="display:flex;align-items:baseline;gap:4px;">
        <span id="kpi-invitations-count" style="font-size:18px;font-weight:700;color:#2563EB;">0</span>
        <span style="font-size:11px;color:#71717a;">\u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0439</span>
      </div>
      <div style="font-size:11px;color:#71717a;margin-top:2px;">
        <span id="kpi-inv-delta" style="color:#2563EB;font-weight:600;">+0</span> \u043D\u043E\u0432\u044B\u0445 \u0437\u0430 \u0441\u0435\u0433\u043E\u0434\u043D\u044F
      </div>
    </div>
  </div>`}function ot(){return`<div class="card fade-in" style="margin-bottom:12px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <span style="font-size:12px;font-weight:600;">\u0421\u043A\u043E\u0440\u0438\u043D\u0433 \u0438 \u043B\u0438\u043C\u0438\u0442\u044B</span>
      <span class="badge badge-green" id="rl-status-badge">\u041D\u043E\u0440\u043C\u0430</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      <div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;">
        <div style="font-size:11px;color:#71717a;">\u041C\u0438\u043D. \u0438\u043D\u0442\u0435\u0440\u0432\u0430\u043B</div>
        <div style="font-size:14px;font-weight:600;">30 \u0441\u0435\u043A</div>
      </div>
      <div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;">
        <div style="font-size:11px;color:#71717a;">Burst detection</div>
        <div style="font-size:14px;font-weight:600;color:#059669;">\u0412\u044B\u043A\u043B</div>
      </div>
      <div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;">
        <div style="font-size:11px;color:#71717a;">429 \u043E\u0448\u0438\u0431\u043E\u043A</div>
        <div id="rl-429-count" style="font-size:14px;font-weight:600;">0</div>
      </div>
      <div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;">
        <div style="font-size:11px;color:#71717a;">CAPTCHA</div>
        <div id="rl-captcha-status" style="font-size:14px;font-weight:600;color:#059669;">\u041D\u0435 \u043E\u0431\u043D\u0430\u0440\u0443\u0436\u0435\u043D\u0430</div>
      </div>
    </div>
  </div>`}function rt(){return`<div class="card fade-in" style="margin-bottom:12px;">
    <div style="font-size:12px;font-weight:600;margin-bottom:10px;">\u0411\u044B\u0441\u0442\u0440\u044B\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn btn-primary" data-action="apply-all">${b.rocket} \u041C\u0430\u0441\u0441\u043E\u0432\u044B\u0439 \u043E\u0442\u043A\u043B\u0438\u043A</button>
      <button class="btn btn-outline" data-tab-switch="vacancies">${b.check} \u041F\u0430\u0440\u0441\u0438\u043D\u0433 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0439</button>
      <button class="btn btn-outline" data-tab-switch="resume">${b.file} \u041F\u0430\u0440\u0441\u0438\u043D\u0433 \u0440\u0435\u0437\u044E\u043C\u0435</button>
      <button class="btn btn-outline" data-action="reset-daily">${b.refresh} \u0421\u0431\u0440\u043E\u0441 \u0434\u043D\u0435\u0432\u043D\u044B\u0445</button>
    </div>
  </div>`}function lt(){return`<div class="card fade-in">
    <div class="timeline-toggle" style="display:flex;align-items:center;justify-content:space-between;padding:2px 0;" data-timeline="activity">
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="font-size:12px;font-weight:600;">\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u044F\u044F \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u044C</div>
        <div style="display:flex;gap:-4px;">
          <div style="width:14px;height:14px;border-radius:50%;background:#059669;border:2px solid #fff;margin-left:-3px;position:relative;z-index:3;"></div>
          <div style="width:14px;height:14px;border-radius:50%;background:#2563EB;border:2px solid #fff;margin-left:-3px;position:relative;z-index:2;"></div>
          <div style="width:14px;height:14px;border-radius:50%;background:#D97706;border:2px solid #fff;margin-left:-3px;position:relative;z-index:1;"></div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <span id="tl-event-count" style="font-size:11px;color:#71717a;">0 \u0441\u043E\u0431\u044B\u0442\u0438\u0439</span>
        ${b.chevronDown}
      </div>
    </div>
    <div class="timeline-body" id="tl-activity-body" style="margin-top:4px;">
      <div id="tl-activity-list">
        <div style="padding:12px;text-align:center;font-size:11px;color:#71717a;">\u041D\u0435\u0442 \u0441\u043E\u0431\u044B\u0442\u0438\u0439</div>
      </div>
    </div>
  </div>`}function dt(){return`<div class="tab-section" id="tab-resume">
    <div class="card fade-in" style="margin-bottom:12px;">
      <div class="timeline-toggle" style="display:flex;align-items:center;justify-content:space-between;" data-timeline="resume-parsing">
        <div style="display:flex;align-items:center;gap:10px;">
          <div id="res-avatar" style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#059669,#10B981);display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:700;flex-shrink:0;">?</div>
          <div>
            <div id="res-title" style="font-size:13px;font-weight:600;">\u0420\u0435\u0437\u044E\u043C\u0435 \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043E</div>
            <div id="res-subtitle" style="font-size:11px;color:#71717a;margin-top:1px;">\u041D\u0430\u0436\u043C\u0438\u0442\u0435 "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C" \u0434\u043B\u044F \u043F\u0430\u0440\u0441\u0438\u043D\u0433\u0430</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <span id="res-parsed-badge" class="badge badge-zinc" style="font-size:11px;">\u043D\u0435 \u0441\u043F\u0430\u0440\u0441\u0435\u043D\u043E</span>
          ${b.chevronDown}
        </div>
      </div>
      <div class="timeline-body" id="res-parsing-body" style="margin-top:12px;padding-top:4px;">
        <div id="res-parsed-data">
          <div style="padding:12px;text-align:center;font-size:11px;color:#71717a;">\u0414\u0430\u043D\u043D\u044B\u0435 \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435 \u043F\u0430\u0440\u0441\u0438\u043D\u0433\u0430</div>
        </div>
        <div style="padding-top:12px;padding-left:24px;">
          <button class="btn btn-primary btn-sm" data-action="load-resume" style="width:100%;">
            ${b.refresh} \u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0441 \u0442\u0435\u043A\u0443\u0449\u0435\u0439 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B
          </button>
        </div>
      </div>
    </div>
    <div id="res-skills-section" class="card fade-in" style="margin-bottom:12px;display:none;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <span style="font-size:12px;font-weight:600;">\u041D\u0430\u0432\u044B\u043A\u0438 \u0438\u0437 \u0440\u0435\u0437\u044E\u043C\u0435</span>
        <span class="badge badge-zinc" id="res-skills-count">0 \u043D\u0430\u0432\u044B\u043A\u043E\u0432</span>
      </div>
      <div id="res-skills-list" style="display:flex;flex-wrap:wrap;gap:4px;"></div>
    </div>
    <div id="res-gap-section" class="card fade-in" style="display:none;">
      <div style="font-size:12px;font-weight:600;margin-bottom:10px;">\u0410\u043D\u0430\u043B\u0438\u0437 \u043D\u0430\u0432\u044B\u043A\u043E\u0432</div>
      <div id="res-gap-content" style="font-size:11px;color:#71717a;">\u0410\u043D\u0430\u043B\u0438\u0437 \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u043F\u043E\u0441\u043B\u0435 \u043F\u0430\u0440\u0441\u0438\u043D\u0433\u0430 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0439</div>
    </div>
  </div>`}function ct(){return`<div class="tab-section" id="tab-vacancies">
    <div class="card fade-in" style="margin-bottom:12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div>
          <div style="font-size:13px;font-weight:600;">\u041F\u0430\u0440\u0441\u0438\u043D\u0433 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0439</div>
          <div style="font-size:11px;color:#71717a;margin-top:2px;">\u0418\u0437\u0432\u043B\u0435\u0447\u0435\u043D\u0438\u0435 \u0441\u043E \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B \u043F\u043E\u0438\u0441\u043A\u0430 hh.ru</div>
        </div>
        <button class="btn btn-primary btn-sm" data-action="refresh">${b.check} \u0421\u043F\u0430\u0440\u0441\u0438\u0442\u044C</button>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <div style="flex:1;background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#71717a;">\u041D\u0430\u0439\u0434\u0435\u043D\u043E</div>
          <div id="vac-total" style="font-size:16px;font-weight:700;">0</div>
        </div>
        <div style="flex:1;background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#71717a;">Match > 70%</div>
          <div id="vac-high-match" style="font-size:16px;font-weight:700;color:#059669;">0</div>
        </div>
        <div style="flex:1;background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#71717a;">\u0427\u0451\u0440\u043D\u044B\u0439 \u0441\u043F\u0438\u0441\u043E\u043A</div>
          <div id="vac-blacklisted" style="font-size:16px;font-weight:700;color:#DC2626;">0</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <input type="text" id="vac-search" placeholder="\u041F\u043E\u0438\u0441\u043A \u043F\u043E \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044E..." style="flex:1;padding:8px 12px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;">
        <select id="vac-status-filter" style="padding:8px 12px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;background:#FAFAFA;">
          <option value="all">\u0412\u0441\u0435</option>
          <option value="new">New</option>
          <option value="applied">\u041E\u0442\u043A\u043B\u0438\u043A\u043D\u0443\u0442\u043E</option>
          <option value="blacklisted">Blacklist</option>
        </select>
      </div>
      <div style="margin-top:10px;display:flex;align-items:center;gap:8px;">
        <span style="font-size:11px;color:#71717a;white-space:nowrap;">Min score:</span>
        <input type="range" id="vac-score-range" min="0" max="100" value="0" style="flex:1;">
        <span id="vac-score-label" style="font-size:11px;font-weight:600;color:#71717a;min-width:32px;text-align:right;">0%</span>
      </div>
    </div>
    <div class="card fade-in" style="margin-bottom:12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div style="font-size:12px;font-weight:600;">\u041C\u0430\u0441\u0441\u043E\u0432\u044B\u0439 \u043E\u0442\u043A\u043B\u0438\u043A</div>
        <span id="mass-status" class="badge badge-zinc">\u041E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D</span>
      </div>
      <div id="mass-progress" style="display:none;margin-bottom:10px;">
        <div class="progress-bar"><div id="mass-fill" class="fill fill-green" style="width:0%;"></div></div>
        <div style="display:flex;justify-content:space-between;margin-top:4px;">
          <span id="mass-count" style="font-size:11px;color:#71717a;">0 / 20</span>
          <span id="mass-eta" style="font-size:11px;color:#71717a;">ETA: --</span>
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <button id="mass-start-btn" class="btn btn-primary btn-sm" data-action="apply-all" style="flex:1;">\u041E\u0442\u043A\u043B\u0438\u043A\u043D\u0443\u0442\u044C\u0441\u044F \u043D\u0430 \u0432\u0441\u0435</button>
        <button id="mass-stop-btn" class="btn btn-danger btn-sm" data-action="pause" style="flex:1;opacity:0.5;" disabled>\u041F\u0430\u0443\u0437\u0430</button>
      </div>
    </div>
    <div class="card fade-in">
      <div style="font-size:12px;font-weight:600;margin-bottom:10px;">\u0412\u0430\u043A\u0430\u043D\u0441\u0438\u0438 \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435</div>
      <div id="har-vlist"><div style="padding:24px;text-align:center;color:#71717a;font-size:12px;line-height:1.6;">\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430...</div></div>
    </div>
  </div>`}function pt(){return`<div class="tab-section" id="tab-negotiations">
    <div class="card fade-in" style="margin-bottom:12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div>
          <div style="font-size:13px;font-weight:600;">\u041F\u0435\u0440\u0435\u0433\u043E\u0432\u043E\u0440\u044B</div>
          <div style="font-size:11px;color:#71717a;margin-top:2px;">\u041E\u0442\u0441\u043B\u0435\u0436\u0438\u0432\u0430\u043D\u0438\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439 \u0441 \u0440\u0430\u0431\u043E\u0442\u043E\u0434\u0430\u0442\u0435\u043B\u044F\u043C\u0438</div>
        </div>
        <span id="neg-count-badge" class="badge badge-blue">0 \u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0445</span>
      </div>
      <div id="neg-list" style="display:flex;flex-direction:column;gap:2px;">
        <div style="padding:24px;text-align:center;font-size:11px;color:#71717a;">\u041F\u0435\u0440\u0435\u0433\u043E\u0432\u043E\u0440\u044B \u043F\u043E\u043A\u0430 \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u044B</div>
      </div>
    </div>
    <div id="neg-chat-area" class="card fade-in" style="margin-bottom:12px;display:none;">
      <div style="display:flex;flex-direction:column;max-height:340px;">
        <div id="neg-chat-header" style="display:flex;align-items:center;gap:8px;padding-bottom:10px;border-bottom:1px solid rgba(0,0,0,0.06);margin-bottom:10px;flex-shrink:0;"></div>
        <div id="neg-chat-messages" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding-bottom:10px;"></div>
        <div style="display:flex;gap:8px;flex-shrink:0;padding-top:10px;border-top:1px solid rgba(0,0,0,0.06);">
          <input type="text" id="neg-chat-input" placeholder="\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435..." style="flex:1;padding:8px 12px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;">
          <button class="btn btn-primary" style="padding:8px 12px;">${b.send}</button>
        </div>
      </div>
    </div>
    <div class="card fade-in">
      <div class="timeline-toggle" style="display:flex;align-items:center;justify-content:space-between;padding:2px 0;" data-timeline="cover-letter">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="font-size:12px;font-weight:600;">\u0428\u0430\u0431\u043B\u043E\u043D\u044B \u0438 \u0432\u0432\u043E\u0434</div>
          <div style="display:flex;gap:4px;">
            <span style="font-size:11px;color:#71717a;background:#f4f4f5;padding:1px 6px;border-radius:4px;">\u0441\u043E\u043F\u0440\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0435</span>
            <span style="font-size:11px;color:#71717a;background:#f4f4f5;padding:1px 6px;border-radius:4px;">\u044D\u043C\u0443\u043B\u044F\u0446\u0438\u044F \u043D\u0430\u0431\u043E\u0440\u0430</span>
          </div>
        </div>
        ${b.chevronDown}
      </div>
      <div class="timeline-body" id="cl-body" style="margin-top:10px;">
        <div style="display:flex;flex-direction:column;gap:10px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <label class="toggle"><input type="checkbox" checked><span class="slider"></span></label>
            <div style="flex:1;min-width:0;">
              <div style="font-size:11px;font-weight:500;">\u042D\u043C\u0443\u043B\u044F\u0446\u0438\u044F \u043D\u0430\u0431\u043E\u0440\u0430</div>
              <div style="font-size:11px;color:#71717a;">\u041F\u043E\u0441\u0438\u043C\u0432\u043E\u043B\u044C\u043D\u044B\u0439 \u0432\u0432\u043E\u0434 (\u0430\u043D\u0442\u0438\u0431\u043E\u0442)</div>
            </div>
            <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
              <input type="number" value="80" style="width:52px;padding:4px 6px;border:1px solid #e4e4e7;border-radius:6px;font-size:11px;text-align:center;">
              <span style="font-size:11px;color:#71717a;">\u043C\u0441</span>
            </div>
          </div>
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
              <label style="font-size:11px;font-weight:500;">\u0428\u0430\u0431\u043B\u043E\u043D \u0441\u043E\u043F\u0440\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0433\u043E</label>
              <span style="font-size:11px;color:#71717a;">{position} {experience} {skills}</span>
            </div>
            <textarea id="cover-letter-text" style="width:100%;height:64px;padding:8px 10px;border:1px solid #e4e4e7;border-radius:8px;font-size:11px;resize:none;line-height:1.5;">\u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435! \u041C\u0435\u043D\u044F \u0437\u0430\u0438\u043D\u0442\u0435\u0440\u0435\u0441\u043E\u0432\u0430\u043B\u0430 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u044F {position}. \u0423 \u043C\u0435\u043D\u044F {experience} \u043E\u043F\u044B\u0442\u0430 \u0432 {skills}. \u0413\u043E\u0442\u043E\u0432 \u043E\u0431\u0441\u0443\u0434\u0438\u0442\u044C \u0434\u0435\u0442\u0430\u043B\u0438 \u043D\u0430 \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E.</textarea>
          </div>
        </div>
      </div>
    </div>
  </div>`}function ut(){return`<div class="tab-section" id="tab-settings">
    ${gt()}
    ${ft()}
    ${ht()}
    ${xt()}
    ${mt()}
  </div>`}function gt(){return`<div class="card fade-in" style="margin-bottom:12px;">
    <div style="font-size:13px;font-weight:600;margin-bottom:12px;">\u041B\u0438\u043C\u0438\u0442\u044B \u0438 \u0440\u0435\u0439\u0442-\u043B\u0438\u043C\u0438\u0442\u0438\u043D\u0433</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${Y("\u0414\u043D\u0435\u0432\u043D\u043E\u0439 \u043B\u0438\u043C\u0438\u0442","\u041C\u0430\u043A\u0441. \u043E\u0442\u043A\u043B\u0438\u043A\u043E\u0432 \u0432 \u0434\u0435\u043D\u044C","number","s-daily-limit",200,"/ \u0434\u0435\u043D\u044C")}
      ${Y("\u0427\u0430\u0441\u043E\u0432\u043E\u0439 \u043B\u0438\u043C\u0438\u0442","\u041C\u0430\u043A\u0441. \u043E\u0442\u043A\u043B\u0438\u043A\u043E\u0432 \u0432 \u0447\u0430\u0441","number","s-hourly-limit",30,"/ \u0447\u0430\u0441")}
      ${Y("\u041C\u0438\u043D. \u0438\u043D\u0442\u0435\u0440\u0432\u0430\u043B","\u041C\u0435\u0436\u0434\u0443 \u043E\u0442\u043A\u043B\u0438\u043A\u0430\u043C\u0438","number","s-min-interval",30,"\u0441\u0435\u043A")}
      ${I("Burst detection","\u041E\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 \u043F\u0440\u0438 \u0432\u0441\u043F\u043B\u0435\u0441\u043A\u0435 429","s-burst",!0)}
      ${I("Adaptive slowdown","\u0423\u0432\u0435\u043B\u0438\u0447\u0435\u043D\u0438\u0435 \u0438\u043D\u0442\u0435\u0440\u0432\u0430\u043B\u0430 \u043F\u0440\u0438 429/CAPTCHA","s-adaptive",!0)}
    </div>
  </div>`}function ft(){return`<div class="card fade-in" style="margin-bottom:12px;">
    <div style="font-size:13px;font-weight:600;margin-bottom:10px;">CAPTCHA \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0430</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${I("\u0410\u0432\u0442\u043E-\u043F\u0430\u0443\u0437\u0430 \u043F\u0440\u0438 CAPTCHA","\u041E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u043E\u0442\u043A\u043B\u0438\u043A\u0438 \u0438 \u0443\u0432\u0435\u0434\u043E\u043C\u0438\u0442\u044C","s-captcha",!0)}
      ${Y("\u0412\u0440\u0435\u043C\u044F \u043F\u0430\u0443\u0437\u044B","\u041F\u0435\u0440\u0435\u0434 \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0435\u043D\u0438\u0435\u043C","number","s-captcha-time",5,"\u043C\u0438\u043D")}
    </div>
  </div>`}function ht(){return`<div class="card fade-in" style="margin-bottom:12px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <div>
        <div style="font-size:13px;font-weight:600;">\u0427\u0451\u0440\u043D\u044B\u0439 \u0441\u043F\u0438\u0441\u043E\u043A</div>
        <div style="font-size:11px;color:#71717a;margin-top:2px;">\u0420\u0430\u0431\u043E\u0442\u043E\u0434\u0430\u0442\u0435\u043B\u0438, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u0431\u0443\u0434\u0443\u0442 \u043F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u044B</div>
      </div>
      <span id="bl-count-badge" class="badge badge-zinc">0 \u043A\u043E\u043C\u043F\u0430\u043D\u0438\u0439</span>
    </div>
    <div id="bl-list" style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px;"></div>
    <div style="display:flex;gap:8px;">
      <input type="text" id="bl-input" placeholder="\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043A\u043E\u043C\u043F\u0430\u043D\u0438\u0438..." style="flex:1;padding:7px 10px;border:1px solid #e4e4e7;border-radius:8px;font-size:11px;">
      <button class="btn btn-outline btn-sm" data-action="bl-add">+ \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C</button>
    </div>
  </div>`}function xt(){return`<div class="card fade-in" style="margin-bottom:12px;">
    <div style="font-size:13px;font-weight:600;margin-bottom:10px;">\u0415\u0436\u0435\u0434\u043D\u0435\u0432\u043D\u044B\u0439 \u0441\u0431\u0440\u043E\u0441</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:12px;font-weight:500;">\u0410\u0432\u0442\u043E-\u0441\u0431\u0440\u043E\u0441 \u0441\u0447\u0451\u0442\u0447\u0438\u043A\u043E\u0432</div>
          <div style="font-size:11px;color:#71717a;">\u0412\u0440\u0435\u043C\u044F \u0441\u0431\u0440\u043E\u0441\u0430 (chrome.alarms)</div>
        </div>
        <input type="time" id="s-reset-time" value="00:00" style="padding:4px 8px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;">
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:12px;font-weight:500;">\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u0441\u0431\u0440\u043E\u0441</div>
          <div style="font-size:11px;color:#71717a;">\u0427\u0435\u0440\u0435\u0437 chrome.alarms API</div>
        </div>
        <span id="s-reset-countdown" style="font-size:11px;font-weight:600;color:#71717a;">--</span>
      </div>
      <button class="btn btn-outline" style="align-self:flex-start;" data-action="reset-daily">${b.refresh} \u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u0441\u0435\u0439\u0447\u0430\u0441</button>
    </div>
  </div>`}function mt(){return`<div class="card fade-in">
    <div style="font-size:13px;font-weight:600;margin-bottom:10px;">\u041E\u0431\u0449\u0438\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${I("\u0410\u0432\u0442\u043E-\u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0438","","s-auth-check",!0)}
      ${I("\u0423\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F","","s-notifications",!0)}
      ${I("\u041B\u043E\u0433\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439","","s-logging",!0)}
      ${I("Shadow DOM \u0438\u0437\u043E\u043B\u044F\u0446\u0438\u044F","","s-shadow-dom",!0)}
    </div>
  </div>`}function Y(t,e,i,a,n,r){return`<div style="display:flex;align-items:center;justify-content:space-between;">
    <div>
      <div style="font-size:12px;font-weight:500;">${t}</div>
      ${e?`<div style="font-size:11px;color:#71717a;">${e}</div>`:""}
    </div>
    <div style="display:flex;align-items:center;gap:6px;">
      <input type="${i}" id="${a}" value="${n}" style="width:64px;padding:6px 8px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;text-align:center;">
      <span style="font-size:11px;color:#71717a;">${r}</span>
    </div>
  </div>`}function I(t,e,i,a){return`<div style="display:flex;align-items:center;justify-content:space-between;">
    <div>
      <div style="font-size:12px;font-weight:500;">${t}</div>
      ${e?`<div style="font-size:11px;color:#71717a;">${e}</div>`:""}
    </div>
    <label class="toggle"><input type="checkbox" id="${i}" ${a?"checked":""}><span class="slider"></span></label>
  </div>`}function bt(){return`<div class="tab-section" id="tab-stats">
    <div style="display:flex;gap:6px;margin-bottom:12px;">
      <button class="btn btn-sm btn-primary stats-period-btn active" data-period="today">\u0421\u0435\u0433\u043E\u0434\u043D\u044F</button>
      <button class="btn btn-sm btn-outline stats-period-btn" data-period="week">\u041D\u0435\u0434\u0435\u043B\u044F</button>
      <button class="btn btn-sm btn-outline stats-period-btn" data-period="month">\u041C\u0435\u0441\u044F\u0446</button>
      <button class="btn btn-sm btn-outline stats-period-btn" data-period="all">\u0412\u0441\u0451 \u0432\u0440\u0435\u043C\u044F</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">
      <div class="card fade-in" style="text-align:center;padding:12px 8px;">
        <div style="font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">\u0412\u0441\u0435\u0433\u043E \u043E\u0442\u043A\u043B\u0438\u043A\u043E\u0432</div>
        <div id="stat-total" style="font-size:22px;font-weight:700;">0</div>
      </div>
      <div class="card fade-in" style="text-align:center;padding:12px 8px;">
        <div style="font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">\u041F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0439</div>
        <div id="stat-invitations" style="font-size:22px;font-weight:700;color:#2563EB;">0</div>
      </div>
      <div class="card fade-in" style="text-align:center;padding:12px 8px;">
        <div style="font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">\u041A\u043E\u043D\u0432\u0435\u0440\u0441\u0438\u044F</div>
        <div id="stat-conversion" style="font-size:22px;font-weight:700;color:#059669;">0%</div>
      </div>
    </div>
    <div class="card fade-in" style="margin-bottom:12px;">
      <div style="font-size:12px;font-weight:600;margin-bottom:12px;">\u0414\u0438\u043D\u0430\u043C\u0438\u043A\u0430 \u0437\u0430 \u043D\u0435\u0434\u0435\u043B\u044E</div>
      <div id="stat-chart" style="display:flex;align-items:flex-end;gap:6px;height:100px;"></div>
    </div>
    <div class="card fade-in" style="margin-bottom:12px;">
      <div style="font-size:12px;font-weight:600;margin-bottom:10px;">\u0412\u043E\u0440\u043E\u043D\u043A\u0430 \u043A\u043E\u043D\u0432\u0435\u0440\u0441\u0438\u0438</div>
      <div id="stat-funnel" style="display:flex;flex-direction:column;gap:6px;"></div>
    </div>
    <div class="card fade-in" style="margin-bottom:12px;">
      <div style="font-size:12px;font-weight:600;margin-bottom:10px;">\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430 \u043B\u0438\u043C\u0438\u0442\u043E\u0432</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#71717a;">429 \u043E\u0448\u0438\u0431\u043E\u043A (\u0432\u0441\u0435\u0433\u043E)</div>
          <div id="stat-429" style="font-size:16px;font-weight:700;">0</div>
        </div>
        <div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#71717a;">CAPTCHA (\u0432\u0441\u0435\u0433\u043E)</div>
          <div id="stat-captcha" style="font-size:16px;font-weight:700;">0</div>
        </div>
        <div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#71717a;">Adaptive slowdowns</div>
          <div id="stat-slowdowns" style="font-size:16px;font-weight:700;">0</div>
        </div>
        <div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#71717a;">\u0421\u0440. \u0438\u043D\u0442\u0435\u0440\u0432\u0430\u043B</div>
          <div id="stat-avg-interval" style="font-size:16px;font-weight:700;">--</div>
        </div>
      </div>
    </div>
    <div class="card fade-in">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <span style="font-size:12px;font-weight:600;">\u041B\u043E\u0433 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439</span>
        <button class="btn btn-outline btn-sm" data-action="clear-log">\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C</button>
      </div>
      <div id="activity-log">
        <div style="padding:12px;text-align:center;font-size:11px;color:#71717a;">\u041D\u0435\u0442 \u0437\u0430\u043F\u0438\u0441\u0435\u0439</div>
      </div>
    </div>
  </div>`}function Q(){let t=['[data-qa="mainmenu_applicant"]','[data-qa="mainmenu_user_name"]','a[data-qa="mainmenu_myResumes"]','[data-qa="mainmenu"] sup',".supernova-nav__item--applicant",'a[href*="/applicant/"]','a[href*="/account"]',".bloko-header-hamburger",'[data-qa="mainmenu"] a[href*="resumes"]',".mainmenu__item--applicant",'[data-qa="mainmenu"]',".HH-React-Header-Nav",'nav[class*="nav"] a[href*="resumes"]'];for(let i of t)try{let a=document.querySelector(i);if(!a)continue;if(document.body.contains(a)){let n=window.getComputedStyle(a);if(n.display!=="none"&&n.visibility!=="hidden")return!0}}catch{}let e=document.cookie||"";return!!(e.includes("hhruuid")||e.includes("_HH-RU")||e.includes("hhtoken"))}function ui(){let t=['[data-qa="mainmenu_user_name"]',".supernova-nav__item--applicant",'a[href*="/applicant/"]'];for(let e of t)try{let i=document.querySelector(e);if(i){let a=(i.textContent||"").trim();if(a&&a.length>0&&a.length<100)return a}}catch{}return"\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C"}var W={loading:'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="animation:har-spin 1s linear infinite"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>',locked:'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>',briefcase:'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>',close:'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'};function ue(t){s.fabEl||(s.fabEl=document.createElement("div"),s.fabEl.id="hh-ar-fab",s.fabEl.setAttribute("role","button"),s.fabEl.setAttribute("aria-label","\u041E\u0442\u043A\u0440\u044B\u0442\u044C HH Copilot"),s.fabEl.style.cssText="position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;cursor:pointer;z-index:999999;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#059669,#10B981);box-shadow:0 4px 20px rgba(5,150,105,0.4);transition:right 0.3s cubic-bezier(0.4,0,0.2,1),transform 0.2s,opacity 0.3s;animation:fabPulse 2.5s ease-in-out infinite;",s.fabEl.innerHTML=W.briefcase,s.fabEl.addEventListener("mouseenter",()=>{s.fabEl.style.transform="scale(1.1)"}),s.fabEl.addEventListener("mouseleave",()=>{s.fabEl.style.transform="scale(1)"}),s.fabEl.addEventListener("click",t),document.body.appendChild(s.fabEl))}function ge(){s.fabEl&&(o.isLoggedIn===null?(s.fabEl.style.background="#94a3b8",s.fabEl.style.animation="none",s.fabEl.innerHTML=W.loading):o.isLoggedIn?o.isOpen?(s.fabEl.style.background="#059669",s.fabEl.style.opacity="0",s.fabEl.style.transform="scale(0) rotate(180deg)",s.fabEl.style.pointerEvents="none"):(s.fabEl.style.background="linear-gradient(135deg,#059669,#10B981)",s.fabEl.style.boxShadow="0 4px 20px rgba(5,150,105,0.4)",s.fabEl.style.opacity="1",s.fabEl.style.transform="scale(1)",s.fabEl.style.pointerEvents="auto",s.fabEl.style.animation="fabPulse 2.5s ease-in-out infinite",s.fabEl.innerHTML=W.briefcase):(s.fabEl.style.background="#ef4444",s.fabEl.style.boxShadow="0 4px 20px rgba(239,68,68,0.4)",s.fabEl.style.animation="none",s.fabEl.innerHTML=W.locked))}function fe(){let t=s.shadowRoot?.getElementById("har-vlist");if(t){if(!o.vacancies.length){t.innerHTML='<div style="padding:24px;text-align:center;color:#71717a;font-size:12px;line-height:1.6;">\u041D\u0435\u0442 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0439.<br>\u041F\u0435\u0440\u0435\u0439\u0434\u0438\u0442\u0435 \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 \u043F\u043E\u0438\u0441\u043A\u0430.</div>';return}t.innerHTML=o.vacancies.slice(0,50).map(e=>{let i=e.matchScore!=null?e.matchScore:0,a=i>0?`<div class="score-ring" style="--score:${i};"><span>${i}%</span></div>`:"",n=e.hasReply&&e.status==="new"?`<button class="btn btn-primary btn-sm" data-action="apply" data-id="${c(e.id)}">\u041E\u0442\u043A\u043B\u0438\u043A\u043D\u0443\u0442\u044C\u0441\u044F</button>`:"",r=e.status==="applied"?'<span class="badge badge-green">\u041E\u0442\u043A\u043B\u0438\u043A\u043D\u0443\u0442\u0430</span>':e.status==="blacklisted"?'<span class="badge badge-red">BL</span>':"",u=i>=70&&e.status==="new"?" shimmer":"",l=e.status==="blacklisted"?"opacity:0.4;":e.status==="applied"?"opacity:0.5;":"";return`<div class="vacancy-item${u}" data-title="${c(e.title)}" data-status="${c(e.status||"new")}" data-score="${i}" style="${l}">
      <div style="flex-shrink:0;">${a}</div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;">
          <a href="${c(e.url)}" target="_blank" style="font-weight:600;color:#059669;text-decoration:none;font-size:13px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">${c(e.title)}</a>
          ${r}
        </div>
        <div style="display:flex;gap:10px;font-size:12px;color:#64748b;margin-bottom:6px;">
          <span>${c(e.company)}</span>
          ${e.salary&&e.salary!=="\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430"?`<span style="color:#18181b;font-weight:500;">${c(e.salary)}</span>`:""}
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:11px;color:#71717a;">${c(e.location)}</span>
          ${n}
        </div>
      </div>
    </div>`}).join("")}}function he(){let t=o.stats,e=l=>s.shadowRoot?.getElementById(l),i=t.appliedToday||0,a=t.dailyLimit||200,n=(l,f)=>{let m=e(l);m&&(m.textContent=f)};n("sv-applied",i),n("sv-remain",a-i),n("sv-errors",t.errorsToday||0);let r=e("pf");r&&(r.style.width=Math.min(100,i/a*100)+"%");let u=e("pt");u&&(u.textContent=i+" / "+a)}function yt(){let t=s.shadowRoot?.getElementById("har-resume-content");if(!t)return;let e=o.resumeList;if(!e||e.length===0){t.innerHTML='<div class="har-empty">\u0421\u043F\u0438\u0441\u043E\u043A \u0440\u0435\u0437\u044E\u043C\u0435 \u043F\u0443\u0441\u0442.<br>\u041D\u0430\u0436\u043C\u0438\u0442\u0435 "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C" \u0434\u043B\u044F \u043F\u0430\u0440\u0441\u0438\u043D\u0433\u0430.</div>';return}t.innerHTML='<div class="har-resume-list-header">\u041D\u0430\u0439\u0434\u0435\u043D\u043E \u0440\u0435\u0437\u044E\u043C\u0435: '+e.length+"</div>"+e.map(i=>{let a=o.resume&&o.resume.id===i.id;return'<div class="har-resume-list-item '+(a?"har-resume-list-active":"")+'"><a href="'+c(i.url)+'" target="_blank" class="har-resume-list-link">'+c(i.title)+"</a>"+(a?'<span class="har-resume-loaded-badge">loaded</span>':"")+"</div>"}).join("")+'<div class="har-resume-list-hint">Click to open resume in new tab, then press "Load" on that page.</div>',t.querySelectorAll(".har-resume-list-link").forEach(i=>{i.addEventListener("click",a=>{a.preventDefault(),window.open(i.getAttribute("href"),"_blank")})})}function Me(){let t=s.shadowRoot?.getElementById("har-resume-content");if(!t)return;let e=o.resume;if(!e||!e.id){if(o.resumeList&&o.resumeList.length>0){yt();return}let l=Te(),f='Go to your resume page on hh.ru<br>and click "Load from current page".';l==="resume-list"&&(f='Click "Load" to see your resumes listed on this page.'),t.innerHTML='<div class="har-empty">Resume not loaded yet.<br>'+f+"</div>";return}let i=e.skills.length>0?'<div class="har-tag-list">'+e.skills.map(l=>'<span class="har-tag">'+c(l)+"</span>").join("")+"</div>":'<div class="har-empty" style="padding:8px">\u041D\u0430\u0432\u044B\u043A\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B</div>',a=e.experience.length>0?e.experience.map(l=>'<div class="har-exp-item"><div class="har-exp-pos">'+c(l.position||"?")+'</div><div class="har-exp-meta">'+c(l.company||"")+(l.period?" &middot; "+c(l.period):"")+"</div>"+(l.description?'<div class="har-exp-desc">'+c(l.description)+"</div>":"")+"</div>").join(""):'<div class="har-empty" style="padding:8px">\u041E\u043F\u044B\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D</div>',n=e.education.length>0?e.education.map(l=>'<div class="har-edu-item"><span>'+c(l.name)+"</span>"+(l.year?' <span class="har-edu-year">'+c(l.year)+"</span>":"")+"</div>").join(""):"",r=e.languages.length>0?'<div class="har-tag-list">'+e.languages.map(l=>'<span class="har-tag har-tag-lang">'+c(l)+"</span>").join("")+"</div>":"",u='<div class="har-debug"><details><summary>Debug ('+e._debug.found.length+" found, "+e._debug.missing.length+' missing)</summary><div class="har-debug-body">'+e._debug.found.map(l=>'<div style="color:#22c55e">\u2713 '+c(l)+"</div>").join("")+e._debug.missing.map(l=>'<div style="color:#ef4444">\u2717 '+c(l)+"</div>").join("")+"</div></details></div>";t.innerHTML=`
    <div class="har-resume-card">
      <div class="har-resume-header">
        <div class="har-resume-title">${c(e.title||"\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044F")}</div>
        ${e.salary?'<div class="har-resume-salary">'+c(e.salary)+"</div>":""}
        <div class="har-resume-meta">${c(e.gender)} ${c(e.age)}${e.address?" &middot; "+c(e.address):""}</div>
      </div>
      ${e.specializations.length>0?'<div class="har-resume-section"><div class="har-section-subtitle">\u0421\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u0438</div><div class="har-tag-list">'+e.specializations.map(l=>'<span class="har-tag">'+c(l)+"</span>").join("")+"</div></div>":""}
      <div class="har-resume-section">
        <div class="har-section-subtitle">\u041D\u0430\u0432\u044B\u043A\u0438 (${e.skills.length})</div>
        ${i}
      </div>
      <div class="har-resume-section">
        <div class="har-section-subtitle">\u041E\u043F\u044B\u0442 \u0440\u0430\u0431\u043E\u0442\u044B (${e.experience.length})</div>
        ${a}
      </div>
      ${n?'<div class="har-resume-section"><div class="har-section-subtitle">\u041E\u0431\u0440\u0430\u0437\u043E\u0432\u0430\u043D\u0438\u0435</div>'+n+"</div>":""}
      ${r?'<div class="har-resume-section"><div class="har-section-subtitle">\u042F\u0437\u044B\u043A\u0438</div>'+r+"</div>":""}
      ${e.additionalInfo?'<div class="har-resume-section"><div class="har-section-subtitle">\u0414\u043E\u043F. \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F</div><div style="font-size:12px;color:#475569;padding:4px 0">'+c(e.additionalInfo)+"</div></div>":""}
      ${u}
      <div style="font-size:10px;color:#94a3b8;padding:8px 0">Parsed: ${e.parsedAt}</div>
      <a href="${c(e.url)}" target="_blank" class="har-btn har-btn-secondary" style="display:block;text-align:center;text-decoration:none;margin-top:8px">Open on hh.ru</a>
    </div>`}function xe(){let t=o.stats,e=t.appliedToday||0,i=o.settings.dailyLimit||200,a=t.hourlyApplied||0,n=o.settings.hourlyLimit||30,r=f=>s.shadowRoot?.getElementById(f);if(!r)return;let u=(f,m)=>{let h=r(f);h&&(h.textContent=m)};u("kpi-daily-count",e),u("kpi-hourly-count",a),u("kpi-applied-count",e),u("kpi-invitations-count",o.dailyStats.invitations||0),u("rl-429-count",o.dailyStats.errors429||0);let l=r("kpi-hourly-bar")?.querySelector(".fill");l&&(l.style.width=Math.min(100,a/n*100)+"%")}function Ci(t,e,i){let a=el("tl-activity-list");if(!a)return;let n={apply:"#059669",invitation:"#2563EB",captcha:"#D97706",error:"#DC2626",info:"#71717a",resume:"#7C3AED",parsing:"#059669",reset:"#71717a"},r={apply:"\u041E\u0422\u041A\u041B\u0418\u041A",invitation:"\u041F\u0420\u0418\u0413\u041B\u0410\u0428\u0415\u041D\u0418\u0415",captcha:"CAPTCHA",error:"\u041E\u0428\u0418\u0411\u041A\u0410",info:"\u0418\u041D\u0424\u041E",resume:"\u0420\u0415\u0417\u042E\u041C\u0415",parsing:"\u041F\u0410\u0420\u0421\u0418\u041D\u0413",reset:"\u0421\u0411\u0420\u041E\u0421"},u=n[t]||"#71717a",l=r[t]||"\u0421\u041E\u0411\u042B\u0422\u0418\u0415",f=new Date().toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit",second:"2-digit"}),m=document.createElement("div");m.className="tl-item",m.innerHTML=`<div class="tl-dot" style="background:${u};"></div>
    <div style="display:flex;align-items:baseline;justify-content:space-between;">
      <span style="font-size:11px;"><b style="color:${u};">[${l}]</b> ${c(e)}</span>
      <span style="font-size:11px;color:#71717a;flex-shrink:0;margin-left:8px;">${f}</span>
    </div>
    ${i?`<div style="font-size:11px;color:#71717a;margin-top:1px;">${c(i)}</div>`:""}`,a.querySelector('div[style*="text-align:center"]')&&(a.innerHTML=""),a.prepend(m);let x=a.querySelectorAll(".tl-item").length,w=s.shadowRoot?.getElementById("tl-event-count");w&&(w.textContent=x+" "+vt(x,["\u0441\u043E\u0431\u044B\u0442\u0438\u0435","\u0441\u043E\u0431\u044B\u0442\u0438\u044F","\u0441\u043E\u0431\u044B\u0442\u0438\u0439"]))}function vt(t,e){let i=Math.abs(t)%100,a=i%10;return i>10&&i<20?e[2]:a>1&&a<5?e[1]:a===1?e[0]:e[2]}var wt=["\u041F\u043D","\u0412\u0442","\u0421\u0440","\u0427\u0442","\u041F\u0442","\u0421\u0431","\u0412\u0441"];function me(){kt(),At(),Et()}function kt(){let t=o.stats,e=r=>s.shadowRoot?.getElementById(r),i=(r,u)=>{let l=e(r);l&&(l.textContent=u)},a=t.totalApplied||0,n=o.dailyStats.invitations||0;i("stat-total",a),i("stat-invitations",n),i("stat-conversion",a>0?(n/a*100).toFixed(1)+"%":"0%"),i("stat-429",o.dailyStats.errors429||0)}function At(){let t=s.shadowRoot?.getElementById("stat-chart");if(!t)return;let e=o.weeklyData||[30,45,25,55,60,20,10],i=Math.max(...e,1);t.innerHTML=e.map((a,n)=>{let r=a/i*100;return`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
      <div style="width:100%;border-radius:4px;background:${n>=5?"linear-gradient(180deg,#047857,#059669)":"linear-gradient(180deg,#059669,#10B981)"};height:${Math.max(r,4)}%;transition:height 0.5s ease;"></div>
      <span style="font-size:11px;color:#71717a;">${wt[n]}</span>
    </div>`}).join("")}function Et(){let t=s.shadowRoot?.getElementById("stat-funnel");if(!t)return;let e=[{label:"\u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u043D\u043E",value:342,color:"#3f3f46"},{label:"Match > 60%",value:222,color:"#D97706"},{label:"\u041E\u0442\u043A\u043B\u0438\u043A\u0438",value:147,color:"#059669"},{label:"\u041F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u044F",value:23,color:"#2563EB"},{label:"\u0421\u043E\u0431\u0435\u0441\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u044F",value:8,color:"#7C3AED"}],i=e[0].value;t.innerHTML=e.map(a=>{let n=a.value/i*100;return`<div style="display:flex;align-items:center;gap:10px;">
      <span style="font-size:11px;color:#71717a;width:90px;flex-shrink:0;">${a.label}</span>
      <div class="progress-bar" style="flex:1;"><div class="fill" style="width:${Math.max(n,2)}%;background:${a.color};"></div></div>
      <span style="font-size:11px;font-weight:600;width:40px;text-align:right;">${a.value}</span>
    </div>`}).join("")}function Re(t,e){let i=s.shadowRoot?.getElementById("activity-log");if(!i)return;let a={success:"#059669",info:"#2563EB",warn:"#D97706",error:"#DC2626"},n={success:"\u041E\u041A",info:"\u0418\u041D\u0424\u041E",warn:"\u0412\u0410\u0420\u041D",error:"\u041E\u0428\u0418\u0411\u041A\u0410"},r=a[t]||"#71717a",u=n[t]||t.toUpperCase(),l=new Date().toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit",second:"2-digit"});i.querySelector('div[style*="text-align:center"]')&&(i.innerHTML="");let m=document.createElement("div");m.className="log-entry",m.setAttribute("data-level",t),m.innerHTML=`<div class="log-dot" style="background:${r};"></div>
    <div style="flex:1;">
      <div style="font-size:11px;"><b style="color:${r};">[${u}]</b> ${c(e)}</div>
      <div style="font-size:11px;color:#71717a;">${l}</div>
    </div>`,i.prepend(m)}function Ti(){}function De(){let t=s.shadowRoot?.getElementById("activity-log");t&&(t.innerHTML='<div style="padding:12px;text-align:center;font-size:11px;color:#71717a;">\u041D\u0435\u0442 \u0437\u0430\u043F\u0438\u0441\u0435\u0439</div>')}var be=["#D1FAE5,#065F46","#DBEAFE,#1E40AF","#FFFBEB,#B45309","#F3E8FF,#7C3AED","#FCE7F3,#DB2777"];function X(){let t=s.shadowRoot?.getElementById("neg-list"),e=s.shadowRoot?.getElementById("neg-count-badge");if(!t)return;let i=o.negotiations||[];if(e&&(e.textContent=i.length+" "+(i.length===1?"\u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0439":"\u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0445")),i.length===0){t.innerHTML='<div style="padding:24px;text-align:center;font-size:11px;color:#71717a;">\u041F\u0435\u0440\u0435\u0433\u043E\u0432\u043E\u0440\u044B \u043F\u043E\u043A\u0430 \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u044B</div>';return}t.innerHTML=i.map((a,n)=>{let[r,u]=be[n%be.length].split(","),l=a.name.split(" ").slice(0,2).map(m=>m[0]).join("").toUpperCase().slice(0,2),f=o.activeConversation===a.id;return`<div class="conv-item ${f?"active":""}" data-conv-id="${c(a.id)}" tabindex="0" role="button"
      style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:8px;cursor:pointer;${f?"background:#ECFDF5;":""}">
      <div style="width:36px;height:36px;border-radius:50%;background:${r};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:${u};flex-shrink:0;">${c(l)}</div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:12px;font-weight:600;">${c(a.name)}</span>
          <span style="font-size:11px;color:#71717a;">${c(a.time||"")}</span>
        </div>
        <div style="font-size:11px;color:#71717a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c(a.preview||"")}</div>
      </div>
      ${a.unread?'<div style="width:8px;height:8px;border-radius:50%;background:#059669;flex-shrink:0;"></div>':""}
    </div>`}).join("")}function Ie(){let t=s.shadowRoot?.getElementById("neg-chat-area"),e=s.shadowRoot?.getElementById("neg-chat-header"),i=s.shadowRoot?.getElementById("neg-chat-messages");if(!t||!e||!i)return;let a=o.negotiations.find(l=>l.id===o.activeConversation);if(!a){t.style.display="none";return}t.style.display="";let[n,r]=be[0].split(","),u=a.name.split(" ").slice(0,2).map(l=>l[0]).join("").toUpperCase().slice(0,2);e.innerHTML=`
    <div style="width:28px;height:28px;border-radius:50%;background:${n};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:${r};">${c(u)}</div>
    <div>
      <div style="font-size:12px;font-weight:600;">${c(a.name)}</div>
      <div style="font-size:11px;color:#059669;">\u041E\u043D\u043B\u0430\u0439\u043D</div>
    </div>`,i.innerHTML=(a.messages||[]).map(l=>l.from==="user"?`<div style="align-self:flex-end;max-width:85%;">
        <div style="background:#059669;color:#fff;border-radius:12px;border-top-right-radius:4px;padding:8px 12px;">
          <div style="font-size:11px;line-height:1.5;">${c(l.text)}</div>
        </div>
      </div>`:`<div style="align-self:flex-start;max-width:85%;">
      <div style="background:#fff;border:1px solid #e4e4e7;border-radius:12px;border-top-left-radius:4px;padding:8px 12px;">
        <div style="font-size:11px;font-weight:600;color:#059669;margin-bottom:3px;">${c(a.name)}</div>
        <div style="font-size:11px;line-height:1.5;">${c(l.text)}</div>
      </div>
    </div>`).join("")}function K(){let t=s.shadowRoot?.getElementById("bl-list"),e=s.shadowRoot?.getElementById("bl-count-badge");if(!t)return;let i=o.blacklist||[];if(e&&(e.textContent=i.length+" "+qt(i.length,["\u043A\u043E\u043C\u043F\u0430\u043D\u0438\u044F","\u043A\u043E\u043C\u043F\u0430\u043D\u0438\u0438","\u043A\u043E\u043C\u043F\u0430\u043D\u0438\u0439"])),i.length===0){t.innerHTML='<div style="padding:8px;text-align:center;font-size:11px;color:#71717a;">\u0427\u0451\u0440\u043D\u044B\u0439 \u0441\u043F\u0438\u0441\u043E\u043A \u043F\u0443\u0441\u0442</div>';return}t.innerHTML=i.map(a=>`<div class="bl-item" data-bl-name="${c(a)}">
      <span style="font-size:12px;">${c(a)}</span>
      <button class="btn-bl-del" data-bl-remove="${c(a)}">\u0423\u0434\u0430\u043B\u0438\u0442\u044C</button>
    </div>`).join("")}function _e(){let t=a=>s.shadowRoot?.getElementById(a);if(!t)return;let e=(a,n)=>{let r=t(a);r&&(r.value=n)},i=(a,n)=>{let r=t(a);r&&(r.checked=n)};e("s-daily-limit",o.settings.dailyLimit),e("s-hourly-limit",o.settings.hourlyLimit),e("s-min-interval",o.settings.minInterval),e("s-captcha-time",o.settings.captchaPauseTime),e("s-reset-time",o.settings.dailyResetTime),i("s-burst",o.settings.burstDetection),i("s-adaptive",o.settings.adaptiveSlowdown),i("s-captcha",o.settings.captchaAutoPause),i("s-auth-check",o.settings.autoAuthCheck),i("s-notifications",o.settings.notifications),i("s-logging",o.settings.logging),i("s-shadow-dom",o.settings.shadowDOM)}function qt(t,e){let i=Math.abs(t)%100,a=i%10;return i>10&&i<20?e[2]:a>1&&a<5?e[1]:a===1?e[0]:e[2]}var je=H("Panel");function j(){let t=o.isLoggedIn,e=Q();t!==e&&(o.isLoggedIn=e,je.info("Auth: "+(e?"LOGGED IN":"NOT LOGGED IN")),Ct(),ge())}function Pe(){if(s.sidebarEl)return;s.backdropEl=document.createElement("div"),s.backdropEl.id="hh-ar-backdrop",s.backdropEl.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,0.15);z-index:999998;opacity:0;pointer-events:none;transition:opacity 0.3s;",s.backdropEl.addEventListener("click",()=>{o.isOpen&&J()}),s.sidebarEl=document.createElement("div"),s.sidebarEl.id="hh-ar-sidebar",s.sidebarEl.style.cssText="position:fixed;top:0;right:0;width:720px;height:100vh;z-index:999999;transform:translateX(100%);transition:transform 0.35s cubic-bezier(0.16,1,0.3,1);",s.shadowRoot=s.sidebarEl.attachShadow({mode:"closed"});let t=document.createElement("style");t.textContent=$e(),s.shadowRoot.appendChild(t);let e=document.createElement("div");e.className="fab-panel",e.innerHTML=pe(),s.shadowRoot.appendChild(e),bindSidebarEvents(e),document.body.appendChild(s.backdropEl),document.body.appendChild(s.sidebarEl)}function J(){s.sidebarEl||Pe(),s.fabEl||ue(J),o.isOpen=!o.isOpen,s.sidebarEl.style.transform=o.isOpen?"translateX(0)":"translateX(100%)",s.backdropEl&&(s.backdropEl.style.opacity=o.isOpen?"1":"0",s.backdropEl.style.pointerEvents=o.isOpen?"auto":"none"),ge(),je.info("Sidebar "+(o.isOpen?"opened":"closed"))}function Ct(){let t=s.shadowRoot?.querySelector(".har-content");if(!t)return;if(o.isLoggedIn===null){t.innerHTML=pe().replace(/<div class="har-content">[\s\S]*?<\/div>/,"");return}if(!o.isLoggedIn){t.innerHTML=`<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 32px;text-align:center;">
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
      <h3 style="font-size:16px;font-weight:700;margin:16px 0 8px;">\u0412\u043E\u0439\u0434\u0438\u0442\u0435 \u0432 hh.ru</h3>
      <p style="font-size:13px;color:#71717a;line-height:1.5;margin-bottom:24px;">\u0420\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u0435 \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442 \u0441 \u0432\u0430\u0448\u0435\u0439 \u0443\u0447\u0451\u0442\u043D\u043E\u0439 \u0437\u0430\u043F\u0438\u0441\u044C\u044E.<br>\u0410\u0432\u0442\u043E\u0440\u0438\u0437\u0443\u0439\u0442\u0435\u0441\u044C \u0434\u043B\u044F \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0437\u0430\u0446\u0438\u0438.</p>
      <a href="https://hh.ru/account/login" target="_blank" class="btn btn-primary" style="text-decoration:none;">\u0412\u043E\u0439\u0442\u0438 \u043D\u0430 hh.ru</a>
      <button class="btn btn-outline" id="har-retry-auth" style="margin-top:8px;">\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0441\u043D\u043E\u0432\u0430</button>
    </div>`;return}let e=s.shadowRoot?.querySelector(".fab-panel");e&&(e.innerHTML=Be(),Tt(e),St())}function St(){xe(),fe(),he(),me(),K(),_e(),X()}function Oe(t){o.activeTab=t;let e=s.shadowRoot;e&&(e.querySelectorAll(".tab-btn").forEach(i=>{i.classList.toggle("active",i.dataset.tab===t)}),e.querySelectorAll(".tab-section").forEach(i=>{i.classList.toggle("active",i.id==="tab-"+t)}),t==="resume"&&Me(),t==="stats"&&me(),t==="negotiations"&&X())}function zt(t){let e=t.nextElementSibling,i=t.querySelector(".timeline-chevron");if(!e)return;let a=e.classList.toggle("open");i&&i.classList.toggle("open",a)}function Lt(t,e){let i=s.shadowRoot,a=i?.getElementById(t),n=i?.getElementById(e);a&&a.classList.toggle("open"),n&&n.classList.toggle("open")}function Tt(t){Ft(t),Ht(t),$t(t),Bt(t)}function Ft(t){t.querySelectorAll(".tab-btn").forEach(e=>{e.addEventListener("click",()=>Oe(e.dataset.tab))})}function Ht(t){t.addEventListener("click",e=>{let i=e.target;if(i.closest('[data-action="close-panel"]')){J();return}let a=i.closest('[data-action="apply"]');if(a){e.preventDefault(),window.dispatchEvent(new CustomEvent("hh-ar-apply",{detail:{vacancyId:a.dataset.id}}));return}if(i.closest('[data-action="apply-all"]')){window.dispatchEvent(new CustomEvent("hh-ar-apply-all"));return}if(i.closest('[data-action="pause"]')){window.dispatchEvent(new CustomEvent("hh-ar-toggle-status"));return}if(i.closest('[data-action="refresh"]')){window.dispatchEvent(new CustomEvent("hh-ar-refresh"));return}if(i.closest('[data-action="check-auth"]')){j();return}if(i.closest("#har-retry-auth")){j();return}if(i.closest('[data-action="load-resume"]')){window.dispatchEvent(new CustomEvent("hh-ar-load-resume"));return}let n=i.closest("[data-tab-switch]");if(n){Oe(n.dataset.tabSwitch);return}if(i.closest('[data-action="reset-daily"]')){window.dispatchEvent(new CustomEvent("hh-ar-reset-daily"));return}if(i.closest('[data-action="diagnose-dom"]')){G();return}if(i.closest('[data-action="bl-add"]')){Mt();return}let r=i.closest("[data-bl-remove]");if(r){Rt(r.dataset.blRemove);return}if(i.closest('[data-action="clear-log"]')){De();return}let u=i.closest("[data-conv-id]");if(u){Dt(u.dataset.convId);return}})}function $t(t){t.addEventListener("click",e=>{let i=e.target.closest("[data-timeline]");if(i){zt(i);return}let a=e.target.closest("[data-sub-toggle]");if(a){Lt(a.dataset.subId,a.dataset.chevId);return}}),t.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){let i=e.target.closest("[data-timeline]")||e.target.closest("[data-sub-toggle]");i&&(e.preventDefault(),i.click())}})}function Bt(t){let e=t.querySelector("#vac-score-range"),i=t.querySelector("#vac-score-label");e&&i&&e.addEventListener("input",()=>{i.textContent=e.value+"%",ye()});let a=t.querySelector("#vac-search");a&&a.addEventListener("input",()=>ye());let n=t.querySelector("#vac-status-filter");n&&n.addEventListener("change",()=>ye())}function Mt(){let t=s.shadowRoot?.getElementById("bl-input");if(!t||!t.value.trim())return;let e=t.value.trim();o.blacklist.includes(e)||(o.blacklist.push(e),t.value="",K(),Re("info","\u0414\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0430 \u043A\u043E\u043C\u043F\u0430\u043D\u0438\u044F \u0432 \u0427\u0421: "+e))}function Rt(t){o.blacklist=o.blacklist.filter(e=>e!==t),K()}function Dt(t){o.activeConversation=t,X(),Ie()}function ye(){let t=(s.shadowRoot?.getElementById("vac-search")?.value||"").toLowerCase(),e=s.shadowRoot?.getElementById("vac-status-filter")?.value||"all",i=parseInt(s.shadowRoot?.getElementById("vac-score-range")?.value||"0",10),a=s.shadowRoot?.querySelectorAll("#har-vlist .vacancy-item"),n=0;a.forEach(r=>{let u=(r.dataset.title||"").toLowerCase(),l=r.dataset.status||"new",f=parseInt(r.dataset.score||"0",10),m=!t||u.includes(t),h=e==="all"||l===e,x=f>=i;r.style.display=m&&h&&x?"":"none",m&&h&&x&&n++})}function Z(t){o.vacancies=(t||[]).filter(e=>e&&e.id&&e.title),fe(),It()}function Ve(t){Object.assign(o.stats,t),he(),xe()}function ea(t){o.status=t}function Ne(){ue(J),Pe(),setTimeout(j,1500),setInterval(j,5e3)}function It(){let t=a=>s.shadowRoot?.getElementById(a),e=o.vacancies,i=(a,n)=>{let r=t(a);r&&(r.textContent=n)};i("vac-total",e.length),i("vac-high-match",e.filter(a=>(a.matchScore||0)>=70).length),i("vac-blacklisted",e.filter(a=>a.status==="blacklisted").length)}var S=H("Main"),Ge=!1;window.__hhDiagnose=G;async function Ue(){S.info("Loaded: "+window.location.href),await ae(),Ne();try{let t=await chrome.storage.local.get("myResume");t.myResume&&t.myResume.id&&(o.resume=t.myResume,S.info("Loaded saved resume: "+t.myResume.title))}catch{}Ye(),window.addEventListener("hh-ar-apply",async t=>{o.isLoggedIn&&await de(t.detail.vacancyId)}),window.addEventListener("hh-ar-apply-all",async()=>{o.isLoggedIn&&await He(o.vacancies)}),window.addEventListener("hh-ar-refresh",async()=>{if(!o.isLoggedIn)return;let t=await N();Z(t)}),window.addEventListener("hh-ar-load-resume",async()=>{if(!o.isLoggedIn)return;let t=window.location.pathname;if(/\/resume\/[a-f0-9]+/.test(t)){await se();let e=oe();e.id?(o.resume=e,await chrome.storage.local.set({myResume:e}),S.info("Resume loaded and saved: "+e.title)):S.warn("Could not parse resume from current page (no id)")}else if(t.includes("/applicant/resumes")){let e=re();e.length>0?(o.resumeList=e,S.info("Resume list loaded: "+e.length+" resumes")):S.warn("No resumes found on list page")}else S.warn("Cannot parse resume from this page ("+t+"). Go to /resume/{hash} or /applicant/resumes")})}function Ye(){if(Q()){S.info("User logged in"),Ge||(Ge=!0,j(),_t());return}setTimeout(Ye,2e3)}async function _t(){let t=window.location.pathname;if(S.info("Page: "+t),t.startsWith("/search/vacancy")){let e=await N();Z(e);let i=await O();Ve(i);let a=null;new MutationObserver(()=>{clearTimeout(a),a=setTimeout(async()=>{let n=await N();Z(n)},1500)}).observe(document.body,{childList:!0,subtree:!0}),S.info("SPA observer active")}else if(/^\/resume\/[a-f0-9]+/.test(t)){await se();let e=oe();e.id&&(o.resume=e,await chrome.storage.local.set({myResume:e}),S.info("Auto-parsed resume: "+e.title));let{pendingApply:i}=await chrome.storage.local.get("pendingApply");i?.vacancyId&&(Date.now()-(i.timestamp||0)<12e4?(await chrome.storage.local.remove("pendingApply"),await ce(i)):await chrome.storage.local.remove("pendingApply"))}else if(t.startsWith("/applicant/resumes")){let e=re();o.resumeList=e,S.info("Resume list page: "+e.length+" resumes")}else if(/^\/vacancy\/\d+/.test(t)){let{pendingApply:e}=await chrome.storage.local.get("pendingApply");e?.vacancyId&&(Date.now()-(e.timestamp||0)<12e4?(await chrome.storage.local.remove("pendingApply"),await ce(e)):await chrome.storage.local.remove("pendingApply"))}}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",Ue):Ue();})();
