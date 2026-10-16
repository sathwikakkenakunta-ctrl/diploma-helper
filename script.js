document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');
    const overlay = document.getElementById('selection-overlay');
    const form = document.getElementById('paper-form');
    const mobileMenu = document.getElementById('mobile-menu');
    const originalHome = app.innerHTML;
    const names = {'model-papers':'Model Papers','study-notes':'Study Notes','important-questions':'Important Questions','exam-oriented-segments':'Exam-oriented Segments'};
    document.getElementById('year').textContent = new Date().getFullYear();
    function showSelection(){overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');document.getElementById('year-select').focus()}
    function closeSelection(){overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true')}
    function renderRoute(){
        const route=window.location.hash.slice(1);
        if(route==='previous-year-papers'){app.innerHTML=originalHome;bindCards();showSelection();return}
        if(names[route]){app.innerHTML=`<section class="coming-soon"><div class="soon-icon"><i class="fa-solid fa-hourglass-half"></i></div><div class="eyebrow" style="justify-content:center;margin-top:28px"><span></span> ${names[route]}</div><h1>Coming soon!</h1><p>We’re preparing this resource for your study desk.</p><a class="back-link" href="#resources"><i class="fa-solid fa-arrow-left"></i> Back to resources</a></section>`;window.scrollTo({top:0,behavior:'smooth'});return}
        app.innerHTML=originalHome;bindCards();
    }
    function bindCards(){document.querySelectorAll('[data-resource]').forEach(card=>card.addEventListener('click',event=>{if(card.dataset.resource==='previous-year-papers'){event.preventDefault();showSelection()}}))}
    document.getElementById('close-selection').addEventListener('click',closeSelection);
    overlay.addEventListener('click',event=>{if(event.target===overlay)closeSelection()});
    document.addEventListener('keydown',event=>{if(event.key==='Escape')closeSelection()});
    form.addEventListener('submit',event=>{event.preventDefault();const year=document.getElementById('year-select').value;const branch=document.getElementById('branch-select').value;closeSelection();app.innerHTML=`<section class="coming-soon"><div class="soon-icon"><i class="fa-regular fa-file-lines"></i></div><div class="eyebrow" style="justify-content:center;margin-top:28px"><span></span> Previous year papers</div><h1>Your paper shelf.</h1><p>${year} · ${branch}<br>No papers have been added here yet. This is your collection page for future uploads.</p><a class="back-link" href="#resources"><i class="fa-solid fa-arrow-left"></i> Back to resources</a></section>`;window.scrollTo({top:0,behavior:'smooth'})});
    document.getElementById('menu-toggle').addEventListener('click',()=>mobileMenu.classList.toggle('open'));
    mobileMenu.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>mobileMenu.classList.remove('open')));
    window.addEventListener('hashchange',renderRoute);bindCards();
});
