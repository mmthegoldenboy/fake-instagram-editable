/* =========================================================
   가상 인스타그램 (피드 + 프로필만 작동)
   - 보기 모드:   https://아이디.github.io/저장소/
   - 편집 모드:   https://아이디.github.io/저장소/?edit
   편집한 내용은 이 브라우저에 자동 저장되고,
   [내보내기]로 받은 data.json을 저장소에 올리면 모두에게 반영됩니다.
   ========================================================= */
'use strict';
(() => {
  const KEY = 'virtual-insta:v1';
  const EDIT = window.FORCE_EDIT === true || new URLSearchParams(location.search).has('edit') || location.hash === '#edit';
  let preview = false;
  let state = null;
  let view = { page: 'feed', postId: null };
  const rt = { liked: {}, saved: {}, reposted: {}, expanded: {}, followed: false };

  const app = document.getElementById('app');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clone = o => JSON.parse(JSON.stringify(o));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const isEditing = () => EDIT && !preview;

  const svgUri = s => 'data:image/svg+xml,' + encodeURIComponent(s);
  const DEFAULT_AVATAR = svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#dbdbdb"/><circle cx="50" cy="40" r="18" fill="#fff"/><path d="M15 95c4-20 18-30 35-30s31 10 35 30z" fill="#fff"/></svg>');
  const EMPTY_IMG = svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#e6e6e6"/><path d="M30 64l13-16 10 12 7-8 12 12z" fill="#c4c4c4"/><circle cx="62" cy="38" r="6" fill="#c4c4c4"/></svg>');

  const FALLBACK = {
    settings: { title: 'Instagram', theme: 'light' },
    profile: {
      username: 'my.account', name: 'Name', avatar: '', verified: false, private: false,
      category: '', bio: '', link: '', postsCount: '', followers: '0', following: '0',
      ownView: false, storyRing: true, highlights: []
    },
    posts: []
  };

  /* ---------- 아이콘 ---------- */
  const sv = d => `<svg class="ic" viewBox="0 0 24 24">${d}</svg>`;
  const HEART = 'M12 20.3s-7.6-4.6-9.4-9.3C1.3 7.6 3.6 4.2 7.1 4.2c2 0 3.6 1.1 4.9 2.9 1.3-1.8 2.9-2.9 4.9-2.9 3.5 0 5.8 3.4 4.5 6.8-1.8 4.7-9.4 9.3-9.4 9.3z';
  const I = {
    heart: sv(`<path d="${HEART}"/>`),
    comment: sv('<path d="M19.79 16.5A9 9 0 1 0 16.5 19.79L21 21z"/>'),
    repost: sv('<path d="M17 2.5l3 3-3 3"/><path d="M4 11.5v-1a5 5 0 0 1 5-5h11"/><path d="M7 21.5l-3-3 3-3"/><path d="M20 12.5v1a5 5 0 0 1-5 5H4"/>'),
    send: sv('<path d="M21.5 2.5 2.5 9.3l8.2 3.8 3.9 8.4z"/><path d="M21.5 2.5 10.7 13.1"/>'),
    bookmark: sv('<path d="M19 21l-7-6-7 6V3.8c0-.4.4-.8.8-.8h12.4c.4 0 .8.4.8.8z"/>'),
    home: sv('<path d="M3 10.2 12 3l9 7.2V21h-6.2v-6.4H9.2V21H3z"/>'),
    search: sv('<circle cx="10.5" cy="10.5" r="7"/><path d="M16 16l5 5"/>'),
    plus: sv('<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M12 8v8M8 12h8"/>'),
    reels: sv('<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M3 8.5h18M9 3l3 5.5M14.5 3l3 5.5"/><path d="M10 12v5.5l4.8-2.75z"/>'),
    more: sv('<circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="19" cy="12" r="1.2" fill="currentColor"/>'),
    back: sv('<path d="M15 4 7 12l8 8"/>'),
    menu: sv('<path d="M3.5 6h17M3.5 12h17M3.5 18h17"/>'),
    grid: sv('<rect x="3" y="3" width="18" height="18" rx="1.5"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>'),
    tag: sv('<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="12" cy="10" r="3"/><path d="M6.5 20.5c1-3 3-4.5 5.5-4.5s4.5 1.5 5.5 4.5"/>'),
    lock: sv('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    link: sv('<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>'),
    multi: '<svg class="multi" viewBox="0 0 24 24"><path d="M7 3h11a3 3 0 0 1 3 3v11" fill="none" stroke="#fff" stroke-width="2"/><rect x="3" y="7" width="14" height="14" rx="2.5" fill="#fff"/></svg>',
    heartBig: `<svg viewBox="0 0 24 24"><path fill="#fff" d="${HEART}"/></svg>`
  };
  const BADGE = '<svg class="badge" viewBox="0 0 24 24"><path fill="#0095f6" d="M12 1.5l2.6 2 3.3-.3.9 3.2 2.9 1.6-1.1 3.1 1.1 3.1-2.9 1.6-.9 3.2-3.3-.3-2.6 2-2.6-2-3.3.3-.9-3.2-2.9-1.6 1.1-3.1-1.1-3.1 2.9-1.6.9-3.2 3.3.3z"/><path d="m7.8 12.2 2.8 2.8 5.6-5.6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ---------- 유틸 ---------- */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rich = s => esc(s).replace(/([#@][\w가-힣.]+)/g, '<span class="tag">$1</span>');
  const trim1 = x => String(Math.floor(x * 10) / 10);
  function fmt(v) {
    const s = String(v ?? '').trim();
    if (s === '') return '';
    if (!/^\d+$/.test(s)) return esc(s);
    const n = Number(s);
    if (n >= 1e9) return trim1(n / 1e9) + 'B';
    if (n >= 1e6) return trim1(n / 1e6) + 'M';
    if (n >= 1e4) return trim1(n / 1e3) + 'K';
    return n.toLocaleString('en-US');
  }
  function bump(v, on) {
    if (!on) return v;
    const s = String(v ?? '').trim();
    return (s === '' || /^\d+$/.test(s)) ? String((Number(s) || 0) + 1) : s;
  }
  const shown = v => { const s = String(v ?? '').trim(); return s !== '' && s !== '0'; };
  const find = id => state.posts.find(p => p.id === id);
  const author = p => p.author.useProfile
    ? { username: state.profile.username, avatar: state.profile.avatar, verified: state.profile.verified }
    : p.author;
  const profilePosts = () => state.posts.filter(p => p.author.useProfile);

  function h(tag, attrs = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className = v;
      else if (k === 'value') el.value = v;
      else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(kid));
    }
    return el;
  }
  function toast(msg) {
    const t = h('div', { class: 'toast' }, msg);
    document.body.append(t);
    setTimeout(() => t.remove(), 2200);
  }

  /* ---------- 데이터 ---------- */
  function newPost() {
    return {
      id: uid(), author: { useProfile: true, username: '', avatar: '', verified: false },
      location: '', time: 'Just now', ratio: '4:5', images: [], caption: '',
      likes: '', commentCount: '', reposts: '', shares: '', comments: []
    };
  }
  function normalize(d) {
    d = d && typeof d === 'object' ? d : {};
    const out = {
      settings: { ...FALLBACK.settings, ...(d.settings || {}) },
      profile: { ...FALLBACK.profile, ...(d.profile || {}) },
      posts: Array.isArray(d.posts) ? d.posts : []
    };
    if (!Array.isArray(out.profile.highlights)) out.profile.highlights = [];
    out.posts = out.posts.map(p => {
      const base = newPost();
      return {
        ...base, ...p,
        author: { ...base.author, ...(p.author || {}) },
        images: Array.isArray(p.images) ? p.images : [],
        comments: Array.isArray(p.comments) ? p.comments.map(c => ({ id: uid(), ...c })) : []
      };
    });
    return out;
  }
  async function fetchData() {
    try {
      const r = await fetch('data.json', { cache: 'no-store' });
      if (!r.ok) throw new Error();
      return await r.json();
    } catch { return clone(FALLBACK); }
  }
  async function load() {
    let data = null;
    if (EDIT) { try { const s = localStorage.getItem(KEY); if (s) data = JSON.parse(s); } catch {} }
    if (!data) data = await fetchData();
    state = normalize(data);
    render();
  }
  function persist() {
    if (!EDIT) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch { toast('브라우저 저장 공간이 가득 찼어요. 사진은 링크로 넣거나 [내보내기]로 백업해 주세요.'); }
  }
  function commit() { persist(); render(); }

  /* ---------- 화면 ---------- */
  function render() {
    document.documentElement.dataset.theme = state.settings.theme;
    $('meta[name=theme-color]')?.setAttribute('content', state.settings.theme === 'dark' ? '#000000' : '#ffffff');
    document.title = state.settings.title || 'Instagram';
    let html = '';
    if (view.page === 'profile') html = profilePage();
    else if (view.page === 'detail') html = detailPage();
    else html = feedPage();
    app.innerHTML = html + bottomNav();
    bindCarousels(app);
    renderToolbar();
    if (view.page === 'detail' && view.postId) {
      requestAnimationFrame(() => $(`[data-post="${view.postId}"]`, app)?.scrollIntoView({ block: 'start' }));
    }
  }
  function go(page) { view = { page, postId: null }; render(); window.scrollTo(0, 0); }

  const disclaimer = '<div class="disclaimer">Unofficial mock-up made for fun. Not affiliated with any real service.</div>';

  function feedPage() {
    const posts = state.posts.length ? state.posts.map(postHTML).join('')
      : `<div class="empty">No posts yet.${isEditing() ? '<br>(위의 [＋ 새 게시물]로 올려 보세요)' : ''}</div>`;
    return `<header class="topbar">
        <div class="logo">${esc(state.settings.title)}</div>
        <div class="top-icons"><span class="off">${I.heart}</span><span class="off">${I.send}</span></div>
      </header>
      <main>${posts}</main>${disclaimer}`;
  }

  function postHTML(p) {
    const a = author(p);
    const imgs = p.images.length ? p.images : [EMPTY_IMG];
    const liked = !!rt.liked[p.id], saved = !!rt.saved[p.id], rep = !!rt.reposted[p.id];
    const likes = bump(p.likes, liked), reposts = bump(p.reposts, rep);
    const cc = String(p.commentCount ?? '').trim() !== '' ? p.commentCount : String(p.comments.length);
    const cap = p.caption || '';
    const long = cap.length > 70 || cap.split('\n').length > 2;
    const clamp = long && !rt.expanded[p.id];
    const ratio = { '4:5': '4/5', '1:1': '1/1', '1.91:1': '1.91/1', '3:4': '3/4' }[p.ratio] || '4/5';
    const ring = p.author.useProfile && state.profile.storyRing ? 'ring' : '';
    const n = (v) => shown(v) ? `<span>${fmt(v)}</span>` : '';
    return `<article class="post" data-post="${p.id}">
      <header class="post-head">
        <button class="av-wrap ${ring}" data-act="author" data-id="${p.id}"><img class="av" src="${esc(a.avatar || DEFAULT_AVATAR)}" alt=""></button>
        <div class="who">
          <button class="uname" data-act="author" data-id="${p.id}">${esc(a.username || 'username')}${a.verified ? BADGE : ''}</button>
          ${p.location ? `<div class="loc">${esc(p.location)}</div>` : ''}
        </div>
        ${isEditing() ? `<button class="edit-pill" data-act="edit-post" data-id="${p.id}">✎ 수정</button>` : `<span class="off">${I.more}</span>`}
      </header>
      <div class="media" data-act="media" data-id="${p.id}" style="aspect-ratio:${ratio}">
        <div class="track">${imgs.map(s => `<img src="${esc(s)}" alt="" draggable="false">`).join('')}</div>
        ${imgs.length > 1 ? `<div class="count">1/${imgs.length}</div>
          <button class="nav prev hide" data-act="slide" data-dir="-1">‹</button>
          <button class="nav next" data-act="slide" data-dir="1">›</button>` : ''}
        <div class="heart-pop">${I.heartBig}</div>
      </div>
      ${imgs.length > 1 ? `<div class="dots">${imgs.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>` : ''}
      <div class="actions">
        <button class="act ${liked ? 'liked' : ''}" data-act="like" data-id="${p.id}">${I.heart}${n(likes)}</button>
        <button class="act" data-act="comments" data-id="${p.id}">${I.comment}${n(cc)}</button>
        <button class="act ${rep ? 'reposted' : ''}" data-act="repost" data-id="${p.id}">${I.repost}${n(reposts)}</button>
        <span class="act off">${I.send}${n(p.shares)}</span>
        <button class="act right ${saved ? 'saved' : ''}" data-act="save" data-id="${p.id}">${I.bookmark}</button>
      </div>
      ${cap ? `<div class="caption ${clamp ? 'clamp' : ''}"><b data-act="author" data-id="${p.id}">${esc(a.username)}</b> ${rich(cap)}</div>
        ${clamp ? `<button class="more-btn" data-act="expand" data-id="${p.id}">more</button>` : ''}` : ''}
      ${shown(cc) ? `<button class="vc" data-act="comments" data-id="${p.id}">${String(cc).trim() === '1' ? 'View 1 comment' : `View all ${fmt(cc)} comments`}</button>` : ''}
      ${p.time ? `<div class="ptime">${esc(p.time)}</div>` : ''}
    </article>`;
  }

  function profilePage() {
    const pr = state.profile, posts = profilePosts();
    const followers = bump(pr.followers, rt.followed);
    const count = shown(pr.postsCount) || String(pr.postsCount).trim() === '0' ? pr.postsCount : String(posts.length);
    const btns = pr.ownView
      ? `<span class="btn off">Edit profile</span><span class="btn off">Share profile</span>`
      : `<button class="btn ${rt.followed ? '' : 'primary'}" data-act="follow">${rt.followed ? 'Following' : 'Follow'}</button><span class="btn off">Message</span>`;
    const hl = pr.highlights.length ? `<div class="hl">${pr.highlights.map(x =>
      `<div class="hl-i"><div class="hl-c"><img src="${esc(x.image || EMPTY_IMG)}" alt=""></div><span>${esc(x.title)}</span></div>`).join('')}</div>` : '';
    const grid = posts.length
      ? `<div class="grid">${posts.map(p => `<button class="cell" data-act="open-post" data-id="${p.id}">
          <img src="${esc(p.images[0] || EMPTY_IMG)}" alt="" loading="lazy">${p.images.length > 1 ? I.multi : ''}</button>`).join('')}</div>`
      : `<div class="empty">No posts yet</div>`;
    return `<header class="topbar">
        <div class="ptitle">${pr.private ? I.lock : ''}${esc(pr.username)}${pr.verified ? BADGE : ''}</div>
        <div class="top-icons"><span class="off">${I.plus}</span><span class="off">${I.menu}</span></div>
      </header>
      <section class="phead">
        ${isEditing() ? `<div class="prof-edit"><button class="edit-pill" data-act="edit-profile">✎ 프로필 수정</button></div>` : ''}
        <div class="prow">
          <div class="pav ${pr.storyRing ? 'ring' : ''}"><img src="${esc(pr.avatar || DEFAULT_AVATAR)}" alt=""></div>
          <div class="pinfo">
            <div class="pname">${esc(pr.name)}</div>
            <div class="stats">
              <div><b>${fmt(count)}</b><span>posts</span></div>
              <div><b>${fmt(followers)}</b><span>followers</span></div>
              <div><b>${fmt(pr.following)}</b><span>following</span></div>
            </div>
          </div>
        </div>
        <div class="pbio">${pr.category ? `<div class="cat">${esc(pr.category)}</div>` : ''}${rich(pr.bio)}${pr.link ? `<div class="plink">${I.link}${esc(pr.link)}</div>` : ''}</div>
        <div class="pbtns">${btns}</div>
        ${hl}
      </section>
      <div class="ptabs"><span class="on">${I.grid}</span><span class="off">${I.reels}</span><span class="off">${I.tag}</span></div>
      ${grid}${disclaimer}`;
  }

  function detailPage() {
    return `<header class="topbar">
        <button data-act="back">${I.back}</button>
        <div class="tb-title"><small>${esc(state.profile.username)}</small><b>Posts</b></div>
        <span style="width:24px"></span>
      </header>
      <main>${profilePosts().map(postHTML).join('')}</main>`;
  }

  function bottomNav() {
    const pg = view.page;
    return `<nav class="bnav">
      <button class="${pg === 'feed' ? 'on' : ''}" data-act="go-feed">${I.home}</button>
      <span class="off">${I.search}</span>
      ${isEditing() ? `<button data-act="new-post">${I.plus}</button>` : `<span class="off">${I.plus}</span>`}
      <span class="off">${I.reels}</span>
      <button class="${pg !== 'feed' ? 'on' : ''}" data-act="go-profile"><img class="navav" src="${esc(state.profile.avatar || DEFAULT_AVATAR)}" alt=""></button>
    </nav>`;
  }

  /* ---------- 사진 넘기기 ---------- */
  function bindCarousels(root) {
    $$('.track', root).forEach(tr => {
      if (tr._bound) return;
      tr._bound = true;
      tr.addEventListener('scroll', () => syncSlide(tr), { passive: true });
    });
  }
  function syncSlide(tr) {
    const media = tr.closest('.media'), art = tr.closest('.post');
    const n = tr.children.length;
    const i = Math.max(0, Math.min(n - 1, Math.round(tr.scrollLeft / (tr.clientWidth || 1))));
    const c = $('.count', media); if (c) c.textContent = `${i + 1}/${n}`;
    $$('.dots i', art).forEach((d, k) => d.classList.toggle('on', k === i));
    $('.nav.prev', media)?.classList.toggle('hide', i === 0);
    $('.nav.next', media)?.classList.toggle('hide', i === n - 1);
  }
  function refreshPost(id) {
    $$(`[data-post="${id}"]`, app).forEach(art => {
      const sl = $('.track', art)?.scrollLeft || 0;
      const tmp = document.createElement('div');
      tmp.innerHTML = postHTML(find(id));
      const fresh = tmp.firstElementChild;
      art.replaceWith(fresh);
      bindCarousels(fresh);
      const tr = $('.track', fresh);
      if (tr) { tr.scrollLeft = sl; syncSlide(tr); }
    });
  }
  let lastTap = { id: null, t: 0 };
  function mediaTap(id) {
    const now = Date.now();
    if (lastTap.id === id && now - lastTap.t < 320) {
      lastTap = { id: null, t: 0 };
      if (!rt.liked[id]) { rt.liked[id] = true; refreshPost(id); }
      $$(`[data-post="${id}"] .heart-pop`, app).forEach(el => {
        el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
      });
    } else lastTap = { id, t: now };
  }

  /* ---------- 클릭 처리 ---------- */
  app.addEventListener('click', e => {
    const t = e.target.closest('[data-act]');
    if (!t || !app.contains(t)) return;
    const id = t.dataset.id;
    switch (t.dataset.act) {
      case 'go-feed': go('feed'); break;
      case 'go-profile': go('profile'); break;
      case 'back': go('profile'); break;
      case 'author': if (find(id)?.author.useProfile) go('profile'); break;
      case 'like': rt.liked[id] = !rt.liked[id]; refreshPost(id); break;
      case 'save': rt.saved[id] = !rt.saved[id]; refreshPost(id); break;
      case 'repost': rt.reposted[id] = !rt.reposted[id]; refreshPost(id); break;
      case 'expand': rt.expanded[id] = true; refreshPost(id); break;
      case 'comments': openComments(id); break;
      case 'media': mediaTap(id); break;
      case 'slide': {
        const tr = $('.track', t.closest('.media'));
        tr.scrollBy({ left: Number(t.dataset.dir) * tr.clientWidth, behavior: 'smooth' });
        break;
      }
      case 'open-post': view = { page: 'detail', postId: id }; render(); break;
      case 'follow': rt.followed = !rt.followed; render(); break;
      case 'edit-post': openPostEditor(id); break;
      case 'new-post': if (isEditing()) openPostEditor(null); break;
      case 'edit-profile': openProfileEditor(); break;
    }
  });

  // 깨진 이미지 주소는 회색 칸으로 대체
  document.addEventListener('error', e => {
    const el = e.target;
    if (el.tagName === 'IMG' && !el.dataset.broken) { el.dataset.broken = '1'; el.src = EMPTY_IMG; }
  }, true);

  /* ---------- 오버레이 ---------- */
  function openOverlay(el) { document.body.append(el); document.body.classList.add('noscroll'); return el; }
  function closeOverlay(el) { el.remove(); if (!$('.overlay')) document.body.classList.remove('noscroll'); }

  function openComments(id) {
    const p = find(id), a = author(p);
    const list = p.comments.length ? p.comments.map(c => `<div class="cm">
        <img class="av" src="${esc(c.avatar || DEFAULT_AVATAR)}" alt="">
        <div class="cm-b">
          <div class="cm-h"><b>${esc(c.username || 'user')}</b>${c.verified ? BADGE : ''}<span>${esc(c.time || '')}</span></div>
          <div class="cm-t">${rich(c.text)}</div>
          <div class="cm-r">Reply</div>
        </div>
        <button class="cm-l" data-cl="${esc(c.likes)}">${I.heart}<span>${fmt(c.likes)}</span></button>
      </div>`).join('') : '<div class="empty">No comments yet.</div>';
    const el = h('div', { class: 'overlay' });
    el.innerHTML = `<div class="sheet"><div class="grab"></div><div class="sheet-t">Comments</div>
      <div class="clist">${list}</div>
      <div class="cin"><img class="av" src="${esc(state.profile.avatar || DEFAULT_AVATAR)}" alt="">
      <input placeholder="Add a comment for ${esc(a.username)}..." disabled></div></div>`;
    el.addEventListener('click', e => {
      if (e.target === el) return closeOverlay(el);
      const b = e.target.closest('.cm-l');
      if (b) {
        const on = b.classList.toggle('liked');
        $('span', b).innerHTML = shown(bump(b.dataset.cl, on)) ? fmt(bump(b.dataset.cl, on)) : '';
      }
    });
    openOverlay(el);
  }

  /* ---------- 편집 창 공통 ---------- */
  function modal(title, body, onSave) {
    const el = h('div', { class: 'overlay ed' });
    el.append(h('div', { class: 'mpanel' },
      h('div', { class: 'mhead' },
        h('button', { type: 'button', class: 'mh-btn', onclick: () => closeOverlay(el) }, '취소'),
        h('b', {}, title),
        h('button', { type: 'button', class: 'mh-btn save', onclick: () => { if (onSave() !== false) closeOverlay(el); } }, '저장')),
      h('div', { class: 'mbody' }, body)));
    return openOverlay(el);
  }
  const sec = (title, ...kids) => h('section', { class: 'esec' }, h('h4', {}, title), ...kids);
  const field = (label, input, hint) => h('label', { class: 'f' }, h('span', { class: 'fl' }, label), input, hint && h('small', {}, hint));
  const text = (o, k, ph = '') => h('input', { type: 'text', value: o[k] ?? '', placeholder: ph, oninput: e => { o[k] = e.target.value; } });
  function area(o, k, ph = '', rows = 4) { const t = h('textarea', { placeholder: ph, rows, oninput: e => { o[k] = e.target.value; } }); t.value = o[k] || ''; return t; }
  function check(o, k, label, after) {
    const i = h('input', { type: 'checkbox', onchange: e => { o[k] = e.target.checked; after && after(); } });
    i.checked = !!o[k];
    return h('label', { class: 'chk' }, i, label);
  }
  function select(o, k, opts) {
    const s = h('select', { onchange: e => { o[k] = e.target.value; } }, opts.map(([v, l]) => h('option', { value: v }, l)));
    s.value = o[k];
    return s;
  }
  const btn = (label, fn, cls = '') => h('button', { type: 'button', class: 'sbtn ' + cls, onclick: fn }, label);
  function confirmBtn(label, fn) {
    const b = btn(label, () => {
      if (b.classList.contains('armed')) return fn();
      b.classList.add('armed'); b.textContent = '한 번 더 누르면 ' + label;
      setTimeout(() => { b.classList.remove('armed'); b.textContent = label; }, 3000);
    }, 'danger');
    return b;
  }
  function move(arr, i, dir) { const j = i + dir; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; }

  function readImage(file, max = 1080) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => {
        const img = new Image();
        img.onload = () => {
          const s = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          res(c.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = rej; img.src = fr.result;
      };
      fr.onerror = rej; fr.readAsDataURL(file);
    });
  }

  // 사진 1장 입력 (프로필 사진 등): 파일 또는 링크
  function imgInput(o, k, { round = false, compact = false, max = 400 } = {}) {
    const prev = h('img', { class: 'ipv' + (round ? ' round' : ''), src: o[k] || (round ? DEFAULT_AVATAR : EMPTY_IMG), title: '눌러서 파일 선택' });
    const file = h('input', {
      type: 'file', accept: 'image/*', hidden: true, onchange: async e => {
        const f = e.target.files[0]; if (!f) return;
        try { o[k] = await readImage(f, max); prev.src = o[k]; url.value = ''; } catch { toast('이미지를 읽지 못했어요'); }
      }
    });
    const url = h('input', {
      type: 'text', placeholder: '이미지 주소 (비우면 기본 이미지)',
      value: String(o[k] || '').startsWith('data:') ? '' : (o[k] || ''),
      oninput: e => { o[k] = e.target.value.trim(); prev.src = o[k] || (round ? DEFAULT_AVATAR : EMPTY_IMG); }
    });
    prev.addEventListener('click', () => file.click());
    return h('div', { class: 'imgin' + (compact ? ' compact' : '') }, prev,
      h('div', { class: 'imgin-r' }, url,
        h('div', { class: 'row', style: 'margin:0' }, btn('파일에서 선택', () => file.click()),
          btn('지우기', () => { o[k] = ''; url.value = ''; prev.src = round ? DEFAULT_AVATAR : EMPTY_IMG; })), file));
  }

  // 게시물 사진 여러 장
  function imagesEditor(d) {
    const list = h('div', { class: 'thumbs' });
    const draw = () => {
      list.innerHTML = '';
      if (!d.images.length) list.append(h('div', { class: 'note' }, '아직 사진이 없어요. 아래에서 추가하세요.'));
      d.images.forEach((s, i) => list.append(h('div', { class: 'thumb' },
        h('img', { src: s }), h('span', { class: 'tn' }, String(i + 1)),
        h('div', { class: 'tbs' },
          btn('◀', () => { move(d.images, i, -1); draw(); }),
          btn('✕', () => { d.images.splice(i, 1); draw(); }, 'danger'),
          btn('▶', () => { move(d.images, i, 1); draw(); })))));
    };
    const file = h('input', {
      type: 'file', accept: 'image/*', multiple: true, hidden: true, onchange: async e => {
        for (const f of [...e.target.files]) {
          try { d.images.push(await readImage(f)); } catch { toast('이미지를 읽지 못했어요: ' + f.name); }
        }
        e.target.value = ''; draw();
      }
    });
    const url = h('input', { type: 'text', placeholder: '이미지 주소 붙여넣기 (https://… 또는 images/파일.jpg)' });
    draw();
    return h('div', {}, list,
      h('div', { class: 'row' }, btn('＋ 파일에서 사진 추가 (여러 장 가능)', () => file.click()), file),
      h('div', { class: 'row' }, url, btn('링크로 추가', () => {
        const v = url.value.trim(); if (v) { d.images.push(v); url.value = ''; draw(); }
      })));
  }

  // 댓글 목록 편집
  function commentsEditor(d) {
    const wrap = h('div', {});
    const draw = () => {
      wrap.innerHTML = '';
      if (!d.comments.length) wrap.append(h('div', { class: 'note' }, '댓글이 없어요.'));
      d.comments.forEach((c, i) => wrap.append(h('div', { class: 'crow' },
        imgInput(c, 'avatar', { round: true, compact: true, max: 200 }),
        h('div', { class: 'grid3' },
          field('아이디', text(c, 'username', 'user_01')),
          field('시간', text(c, 'time', '예: 2h, 3d, 1w')),
          field('좋아요', text(c, 'likes', '0'))),
        area(c, 'text', '댓글 내용', 2),
        h('div', { class: 'row' },
          check(c, 'verified', '인증 배지'),
          btn('▲', () => { move(d.comments, i, -1); draw(); }),
          btn('▼', () => { move(d.comments, i, 1); draw(); }),
          btn('삭제', () => { d.comments.splice(i, 1); draw(); }, 'danger')))));
      wrap.append(
        btn('＋ 댓글 추가', () => { d.comments.push({ id: uid(), username: '', avatar: '', verified: false, text: '', time: 'now', likes: '' }); draw(); }, 'wide'),
        btn('＋ 내 계정으로 댓글 추가', () => {
          const pr = state.profile;
          d.comments.push({ id: uid(), username: pr.username, avatar: pr.avatar, verified: pr.verified, text: '', time: 'now', likes: '' }); draw();
        }, 'wide'));
    };
    draw();
    return wrap;
  }

  /* ---------- 게시물 편집 ---------- */
  function openPostEditor(id) {
    const isNew = !id;
    const d = isNew ? newPost() : clone(find(id));
    const authorBox = h('div', {});
    const drawAuthor = () => {
      authorBox.innerHTML = '';
      if (d.author.useProfile) {
        authorBox.append(h('p', { class: 'note' }, `프로필 계정(@${state.profile.username})으로 표시돼요. 프로필 그리드에도 나타나고, 프로필을 바꾸면 함께 바뀌어요.`));
      } else {
        authorBox.append(
          field('작성자 아이디', text(d.author, 'username', '예: friend_01')),
          field('작성자 프로필 사진', imgInput(d.author, 'avatar', { round: true })),
          check(d.author, 'verified', '인증 배지 표시'),
          h('p', { class: 'note' }, '다른 계정의 게시물은 피드에만 보이고, 프로필 그리드에는 나오지 않아요.'));
      }
    };
    drawAuthor();

    let m;
    const body = h('div', {},
      sec('작성자', check(d.author, 'useProfile', '내 프로필 계정으로 올리기', drawAuthor), authorBox),
      sec('게시물',
        field('사진 (◀ ▶로 순서 변경)', imagesEditor(d)),
        field('사진 비율', select(d, 'ratio', [['4:5', '4:5 세로'], ['1:1', '1:1 정사각형'], ['3:4', '3:4 세로'], ['1.91:1', '1.91:1 가로']])),
        field('내용', area(d, 'caption', '#해시태그, @멘션은 파란색으로 표시돼요', 5)),
        field('위치', text(d, 'location', '예: 서울 성수동 (비우면 숨김)')),
        field('작성 시간', text(d, 'time', '예: 3 hours ago / November 17 / March 2, 2025'), '적은 글자 그대로 표시돼요.')),
      sec('반응 수',
        h('div', { class: 'grid2' },
          field('좋아요', text(d, 'likes', '0')),
          field('댓글 수', text(d, 'commentCount', '비우면 실제 댓글 개수')),
          field('리포스트', text(d, 'reposts', '0')),
          field('공유', text(d, 'shares', '0'))),
        h('p', { class: 'note' }, '숫자만 적으면 12400 → 12.4K, 1500000 → 1.5M처럼 자동 표시돼요. 글자를 섞어 적으면 그대로 표시돼요. 비우거나 0이면 숫자를 숨겨요.')),
      sec('댓글', commentsEditor(d)),
      !isNew && sec('순서 · 삭제',
        h('div', { class: 'row' },
          btn('맨 위로', () => movePost(id, 'top')),
          btn('위로', () => movePost(id, -1)),
          btn('아래로', () => movePost(id, 1))),
        h('div', { class: 'row' }, confirmBtn('이 게시물 삭제', () => {
          state.posts = state.posts.filter(p => p.id !== id); commit(); closeOverlay(m); toast('삭제했어요');
        }))));

    m = modal(isNew ? '새 게시물' : '게시물 수정', body, () => {
      if (isNew) state.posts.unshift(d);
      else { const i = state.posts.findIndex(p => p.id === id); if (i >= 0) state.posts[i] = d; else state.posts.unshift(d); }
      commit(); toast(isNew ? '게시물을 올렸어요' : '저장했어요');
    });
  }
  function movePost(id, dir) {
    const i = state.posts.findIndex(p => p.id === id);
    if (i < 0) return;
    if (dir === 'top') state.posts.unshift(...state.posts.splice(i, 1));
    else move(state.posts, i, dir);
    commit(); toast('순서를 바꿨어요');
  }

  /* ---------- 프로필 · 설정 편집 ---------- */
  function highlightsEditor(d) {
    const wrap = h('div', {});
    const draw = () => {
      wrap.innerHTML = '';
      d.highlights.forEach((x, i) => wrap.append(h('div', { class: 'crow' },
        imgInput(x, 'image', { round: true, compact: true, max: 300 }),
        field('제목', text(x, 'title', '예: Travel')),
        h('div', { class: 'row' },
          btn('◀', () => { move(d.highlights, i, -1); draw(); }),
          btn('▶', () => { move(d.highlights, i, 1); draw(); }),
          btn('삭제', () => { d.highlights.splice(i, 1); draw(); }, 'danger')))));
      wrap.append(btn('＋ 하이라이트 추가', () => { d.highlights.push({ title: '', image: '' }); draw(); }, 'wide'));
    };
    draw();
    return wrap;
  }
  function openProfileEditor() {
    const d = clone(state.profile), s = clone(state.settings);
    const body = h('div', {},
      sec('계정',
        field('아이디', text(d, 'username')),
        field('이름', text(d, 'name')),
        field('프로필 사진', imgInput(d, 'avatar', { round: true })),
        check(d, 'verified', '인증 배지'),
        check(d, 'storyRing', '프로필 사진에 스토리 테두리'),
        check(d, 'private', '비공개 계정 자물쇠 표시')),
      sec('소개',
        field('카테고리', text(d, 'category', '예: Digital creator (비우면 숨김)')),
        field('소개글', area(d, 'bio', '', 4)),
        field('링크', text(d, 'link', '예: linktr.ee/haru (비우면 숨김)'))),
      sec('숫자',
        h('div', { class: 'grid2' },
          field('게시물 수', text(d, 'postsCount', '비우면 실제 개수')),
          field('팔로워', text(d, 'followers')),
          field('팔로잉', text(d, 'following')))),
      sec('버튼', check(d, 'ownView', '내 계정처럼 보기 ([프로필 편집] 버튼). 끄면 [팔로우]/[메시지] 버튼이 나와요.')),
      sec('하이라이트', highlightsEditor(d)),
      sec('앱 설정',
        field('상단 로고 글자', text(s, 'title')),
        field('테마', select(s, 'theme', [['light', '라이트'], ['dark', '다크']]))));
    modal('프로필 · 설정', body, () => {
      state.profile = d; state.settings = s; commit(); toast('저장했어요');
    });
  }

  /* ---------- 편집 툴바 ---------- */
  function renderToolbar() {
    if (!EDIT) return;
    let tb = $('#toolbar');
    if (!tb) { tb = h('div', { id: 'toolbar' }); document.body.prepend(tb); document.body.classList.add('has-tb'); }
    tb.innerHTML = preview
      ? `<span class="tb-label">미리보기 중</span><button class="tb-main" data-tb="preview">✏️ 편집으로 돌아가기</button>`
      : `<span class="tb-label">편집 모드</span>
         <button class="tb-main" data-tb="new">＋ 새 게시물</button>
         <button data-tb="profile">👤 프로필·설정</button>
         <button data-tb="preview">👁 미리보기</button>
         <button data-tb="export">⬇ 내보내기</button>
         <button data-tb="import">⬆ 불러오기</button>
         <button data-tb="reset">↺ 초기화</button>`;
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-tb]');
    if (!b) return;
    switch (b.dataset.tb) {
      case 'preview': preview = !preview; render(); break;
      case 'new': openPostEditor(null); break;
      case 'profile': openProfileEditor(); break;
      case 'export': exportData(); break;
      case 'import': importData(); break;
      case 'reset':
        if (!b.classList.contains('armed')) {
          b.classList.add('armed'); b.textContent = '한 번 더 누르면 초기화';
          setTimeout(() => { b.classList.remove('armed'); b.textContent = '↺ 초기화'; }, 3000);
        } else resetData();
        break;
    }
  });
  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: 'data.json' });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('data.json을 저장소에 올리면 모두에게 반영돼요');
  }
  function importData() {
    const inp = h('input', {
      type: 'file', accept: '.json,application/json', onchange: async () => {
        try {
          state = normalize(JSON.parse(await inp.files[0].text()));
          view = { page: 'feed', postId: null }; commit(); toast('불러왔어요');
        } catch { toast('올바른 data.json 파일이 아니에요'); }
      }
    });
    inp.click();
  }
  async function resetData() {
    try { localStorage.removeItem(KEY); } catch {}
    state = normalize(await fetchData());
    view = { page: 'feed', postId: null }; render(); toast('저장소의 data.json 상태로 되돌렸어요');
  }

  load();
})();
