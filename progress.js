window.addEventListener('scroll', () => {
    const portion = window.scrollY/(document.documentElement.scrollHeight - window.innerHeight);
    document.getElementById('progress').style.width = portion*100 + '%';
});