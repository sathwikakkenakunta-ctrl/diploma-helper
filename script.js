document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');
    const overlay = document.getElementById('selection-overlay');
    const form = document.getElementById('paper-form');
    const mobileMenu = document.getElementById('mobile-menu');
    const originalHome = app.innerHTML;
    const names = {'model-papers':'Model Papers','study-notes':'Study Notes','important-questions':'Important Questions','exam-oriented-segments':'Exam-oriented Segments','curriculum':'Curriculum'};
    const curriculumCache = {records: null, promise: null};
    const branchNames = {CSE:'Computer Science and Engineering',CE:'Civil Engineering',MN:'Mining Engineering',ME:'Mechanical Engineering',EEE:'Electrical and Electronics Engineering'};
    document.getElementById('year').textContent = new Date().getFullYear();
    function showSelection(){overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');document.getElementById('year-select').focus()}
    function closeSelection(){overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true')}
    function renderRoute(){
        const route=window.location.hash.slice(1);
        if(route==='previous-year-papers'){app.innerHTML=originalHome;bindCards();showSelection();return}
        if(route==='curriculum'){renderCurriculum();return}
        if(names[route]){app.innerHTML=`<section class="coming-soon"><div class="soon-icon"><i class="fa-solid fa-hourglass-half"></i></div><div class="eyebrow" style="justify-content:center;margin-top:28px"><span></span> ${names[route]}</div><h1>Coming soon!</h1><p>We’re preparing this resource for your study desk.</p><a class="back-link" href="#resources"><i class="fa-solid fa-arrow-left"></i> Back to resources</a></section>`;window.scrollTo({top:0,behavior:'smooth'});return}
        app.innerHTML=originalHome;bindCards();
        if(route==='resources') setTimeout(()=>document.getElementById('resources')?.scrollIntoView({behavior:'smooth'}),0);
    }
    function curriculumConfig(){
        const config=window.SUPABASE_CONFIG||{};
        return {url:String(config.url||'').trim(),key:String(config.key||'').trim()};
    }
    function curriculumError(message, retry=true){
        return `<section class="curriculum-page"><div class="curriculum-shell"><a class="back-link" href="#resources"><i class="fa-solid fa-arrow-left"></i> Back to resources</a><div class="state-card error-state"><div class="soon-icon"><i class="fa-solid fa-triangle-exclamation"></i></div><h1>Curriculum unavailable</h1><p>${message}</p>${retry?'<button class="form-button" id="curriculum-retry" type="button">Try again <i class="fa-solid fa-rotate-right"></i></button>':''}</div></div></section>`;
    }
    function escapeHtml(value){return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));}
    function detectSemester(title){
        const text=String(title||'').toLowerCase();
        const match=text.match(/(?:semester|sem)\s*[-._:]?\s*([1-6])\b/)||text.match(/\b([1-6])(?:st|nd|rd|th)\s+semester\b/)||text.match(/\b([ivx]{1,3})\s+semester\b/);
        if(!match)return null;
        if(/^\d$/.test(match[1]))return Number(match[1]);
        return ({i:1,ii:2,iii:3,iv:4,v:5,vi:6}[match[1]]||null);
    }
    function getCurriculumRecords(){
        if(curriculumCache.records)return Promise.resolve(curriculumCache.records);
        if(curriculumCache.promise)return curriculumCache.promise;
        const config=curriculumConfig();
        if(!config.url||!config.key)return Promise.reject(new Error('Supabase is not configured. Add the project URL and publishable key to supabase-config.js.'));
        if(!window.supabase?.createClient)return Promise.reject(new Error('The Supabase client could not be loaded. Check the network connection and reload.'));
        const client=window.supabase.createClient(config.url,config.key);
        const selectRecords=(includeSemester)=>client.from('curriculum').select(includeSemester?'id,regulation,branch,title,file_url,semester,created_at':'id,regulation,branch,title,file_url,created_at').order('created_at',{ascending:false});
        curriculumCache.promise=selectRecords(true).then(async result=>{
            if(result.error?.code==='42703')return selectRecords(false);
            return result;
        }).then(({data,error})=>{
            if(error)throw new Error(error.code==='42501'?'Supabase denied access to curriculum records. Enable the public SELECT policy described in curriculum-migration.sql.':error.message||'The curriculum query failed.');
            curriculumCache.records=(data||[]).map(record=>({...record,semester:Number.isInteger(record.semester)&&record.semester>=1&&record.semester<=6?record.semester:detectSemester(record.title)}));
            return curriculumCache.records;
        }).finally(()=>{curriculumCache.promise=null});
        return curriculumCache.promise;
    }
    function renderCurriculum(){
        app.innerHTML='<section class="curriculum-page"><div class="curriculum-shell"><a class="back-link" href="#resources"><i class="fa-solid fa-arrow-left"></i> Back to resources</a><div class="curriculum-heading"><div class="eyebrow"><span></span> Curriculum library</div><h1>Find your curriculum.</h1><p>Choose a regulation, branch and semester to open the official PDF.</p></div><div id="curriculum-content" class="curriculum-content"><div class="loading-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading curriculum records…</p></div></div></div></section>';
        getCurriculumRecords().then(records=>renderRegulations(records)).catch(error=>{document.getElementById('curriculum-content').innerHTML=`<div class="state-card error-state"><div class="soon-icon"><i class="fa-solid fa-triangle-exclamation"></i></div><h1>Curriculum unavailable</h1><p>${escapeHtml(error.message)}</p><button class="form-button" id="curriculum-retry" type="button">Try again <i class="fa-solid fa-rotate-right"></i></button></div>`;document.getElementById('curriculum-retry').addEventListener('click',()=>{curriculumCache.records=null;renderCurriculum()})});
    }
    function renderRegulations(records){
        const values=[...new Set(records.map(record=>record.regulation).filter(Boolean))].sort();
        const content=document.getElementById('curriculum-content');
        if(!values.length){content.innerHTML='<div class="empty-state"><i class="fa-regular fa-folder-open"></i><h2>No curricula found</h2><p>There are no curriculum records available yet.</p></div>';return}
        content.innerHTML='<div class="selection-step"><span class="step-number">01</span><div><h2>Choose a regulation</h2><p>Available in the curriculum database.</p></div></div><div class="choice-grid">'+values.map(value=>`<button class="choice-card" data-regulation="${escapeHtml(value)}"><strong>${escapeHtml(value)}</strong><span>View branches <i class="fa-solid fa-arrow-right"></i></span></button>`).join('')+'</div>';
        content.querySelectorAll('[data-regulation]').forEach(button=>button.addEventListener('click',()=>renderBranches(records,button.dataset.regulation)));
    }
    function renderBranches(records,regulation){
        const values=[...new Set(records.filter(record=>record.regulation===regulation).map(record=>record.branch).filter(Boolean))].sort();
        const content=document.getElementById('curriculum-content');
        content.innerHTML=`<button class="step-back" id="curriculum-back"><i class="fa-solid fa-arrow-left"></i> Regulations</button><div class="selection-step"><span class="step-number">02</span><div><h2>Choose a branch</h2><p>${escapeHtml(regulation)} curriculum</p></div></div><div class="choice-grid branch-grid">${values.map(value=>`<button class="choice-card" data-branch="${escapeHtml(value)}"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(branchNames[value]||'Engineering branch')} <i class="fa-solid fa-arrow-right"></i></span></button>`).join('')}</div>`;
        document.getElementById('curriculum-back').addEventListener('click',()=>renderRegulations(records));
        content.querySelectorAll('[data-branch]').forEach(button=>button.addEventListener('click',()=>renderSemesters(records,regulation,button.dataset.branch)));
    }
    function renderSemesters(records,regulation,branch){
        const matching=records.filter(record=>record.regulation===regulation&&record.branch===branch);
        const semesters=[...new Set(matching.map(record=>record.semester).filter(value=>value>=1&&value<=6))].sort((a,b)=>a-b);
        const content=document.getElementById('curriculum-content');
        const unknown=matching.filter(record=>!record.semester);
        content.innerHTML=`<button class="step-back" id="curriculum-back"><i class="fa-solid fa-arrow-left"></i> Branches</button><div class="selection-step"><span class="step-number">03</span><div><h2>Choose a semester</h2><p>${escapeHtml(regulation)} · ${escapeHtml(branch)}</p></div></div>${semesters.length?'<div class="choice-grid semester-grid">'+semesters.map(value=>`<button class="choice-card" data-semester="${value}"><strong>Semester ${value}</strong><span>Open documents <i class="fa-solid fa-arrow-right"></i></span></button>`).join('')+'</div>':`<div class="empty-state"><i class="fa-regular fa-compass"></i><h2>Semester data needs attention</h2><p>These records do not contain a reliably detectable semester in their titles. Add the nullable semester column and backfill only verified values using the supplied migration.</p></div>`}${unknown.length&&semesters.length?'<p class="mapping-note"><i class="fa-solid fa-circle-info"></i> Some records could not be assigned to a semester and are hidden from semester results.</p>':''}`;
        document.getElementById('curriculum-back').addEventListener('click',()=>renderBranches(records,regulation));
        content.querySelectorAll('[data-semester]').forEach(button=>button.addEventListener('click',()=>renderDocuments(matching.filter(record=>record.semester===Number(button.dataset.semester)),matching,regulation,branch,button.dataset.semester)));
    }
    function renderDocuments(records,branchRecords,regulation,branch,semester){
        const content=document.getElementById('curriculum-content');
        content.innerHTML=`<button class="step-back" id="curriculum-back"><i class="fa-solid fa-arrow-left"></i> Semesters</button><div class="selection-step"><span class="step-number">04</span><div><h2>Curriculum documents</h2><p>${escapeHtml(regulation)} · ${escapeHtml(branch)} · Semester ${escapeHtml(semester)}</p></div></div><div class="document-grid">${records.map(record=>{const url=String(record.file_url||'').trim();const valid=/^https?:\/\//i.test(url);return `<article class="document-card"><i class="fa-regular fa-file-pdf"></i><div><h3>${escapeHtml(record.title||'Curriculum document')}</h3><p>${escapeHtml(regulation)} · ${escapeHtml(branch)} · Semester ${escapeHtml(semester)}</p></div>${valid?`<a class="document-action" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">View Curriculum <i class="fa-solid fa-arrow-up-right-from-square"></i></a>`:'<span class="invalid-url">PDF link unavailable</span>'}</article>`}).join('')}</div>`;
        document.getElementById('curriculum-back').addEventListener('click',()=>renderSemesters(branchRecords,regulation,branch));
    }
    function bindCards(){document.querySelectorAll('[data-resource]').forEach(card=>card.addEventListener('click',event=>{if(card.dataset.resource==='previous-year-papers'){event.preventDefault();showSelection()}}))}
    document.getElementById('close-selection').addEventListener('click',closeSelection);
    overlay.addEventListener('click',event=>{if(event.target===overlay)closeSelection()});
    document.addEventListener('keydown',event=>{if(event.key==='Escape')closeSelection()});
    document.addEventListener('click',event=>{if(event.target.closest('.back-link')){event.preventDefault();window.location.hash='resources';if(window.location.hash==='#resources')renderRoute()}});
    form.addEventListener('submit',event=>{event.preventDefault();const year=document.getElementById('year-select').value;const branch=document.getElementById('branch-select').value;closeSelection();app.innerHTML=`<section class="coming-soon"><div class="soon-icon"><i class="fa-regular fa-file-lines"></i></div><div class="eyebrow" style="justify-content:center;margin-top:28px"><span></span> Previous year papers</div><h1>Your paper shelf.</h1><p>${year} · ${branch}<br>No papers have been added here yet. This is your collection page for future uploads.</p><a class="back-link" href="#resources"><i class="fa-solid fa-arrow-left"></i> Back to resources</a></section>`;window.scrollTo({top:0,behavior:'smooth'})});
    document.getElementById('menu-toggle').addEventListener('click',()=>mobileMenu.classList.toggle('open'));
    mobileMenu.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>mobileMenu.classList.remove('open')));
    window.addEventListener('hashchange',renderRoute);bindCards();
});
