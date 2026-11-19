
'use strict';

const $ = id => document.getElementById(id);

const state = {
  places: [],
  city: '전체',
  category: '전체',
  query: '',
  sort: 'default'
};

const labels = {
  visited: '직접 방문',
  researched: '직접 조사',
  heard: '타인에게 들음',
  unverified: '미확인'
};

// GA4 이벤트 전송
function track(eventName, params = {}) {
  if (typeof window.gtag !== 'function') return;

  try {
    window.gtag('event', eventName, params);
  } catch (error) {
    console.warn('GA4 이벤트 전송 실패:', error);
  }
}

function node(tag, cls, text) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
}

function chip(label, active, onClick) {
  const b = node('button', 'chip', label);
  b.type = 'button';
  b.setAttribute('aria-pressed', String(active));
  b.addEventListener('click', onClick);
  return b;
}

// 현재 검색 및 필터 결과
function getFilteredPlaces() {
  const q = state.query.toLocaleLowerCase().trim();

  let items = state.places.filter(p =>
    (state.city === '전체' || p.city === state.city) &&
    (state.category === '전체' || p.category === state.category) &&
    [
      p.name,
      p.local_name,
      p.area,
      p.address,
      p.description
    ].some(x =>
      String(x || '').toLocaleLowerCase().includes(q)
    )
  );

  if (state.sort === 'name') {
    items = items.slice().sort((a, b) =>
      a.name.localeCompare(b.name, 'ko')
    );
  }

  return items;
}

// 도시 및 카테고리 필터
function filters() {
  for (const [key, target] of [
    ['city', 'cities'],
    ['category', 'categories']
  ]) {
    const el = $(target);
    el.replaceChildren();

    const vals = [
      '전체',
      ...new Set(state.places.map(p => p[key]).filter(Boolean))
    ];

    for (const value of vals) {
      el.append(chip(
        value,
        state[key] === value,
        () => {
          state[key] = value;

          filters();
          render();

          track('place_filter', {
            filter_type: key,
            filter_value: value,
            result_count: getFilteredPlaces().length
          });
        }
      ));
    }
  }
}

// 외부 링크 버튼
function action(label, url, primary = false, onOpen = null) {
  if (!url) return null;

  try {
    const u = new URL(url);

    if (!['https:', 'http:'].includes(u.protocol)) {
      return null;
    }

    const a = node(
      'a',
      'action' + (primary ? ' primary' : ''),
      label
    );

    a.href = u.href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';

    if (onOpen) {
      a.addEventListener('click', onOpen);
    }

    return a;
  } catch {
    return null;
  }
}

// 복사 버튼
function copyButton(label, value) {
  if (!value) return null;

  const b = node('button', 'action', label);
  b.type = 'button';

  b.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(value);

      b.textContent = '복사 완료 ✓';

      setTimeout(() => {
        b.textContent = label;
      }, 1700);

    } catch {
      window.prompt('아래 내용을 복사하세요', value);
    }
  });

  return b;
}

// 장소 카드
function placeCard(p) {
  const card = node('article', 'place');

  const top = node('div', 'place-top');
  const info = node('div');

  info.append(node('h3', '', p.name));

  if (p.local_name) {
    info.append(node('div', 'local', p.local_name));
  }

  top.append(info);
  card.append(top);

  const badges = node('div', 'badges');

  for (const value of [
    p.area,
    p.category,
    labels[p.source]
  ]) {
    if (value) {
      badges.append(
        node(
          'span',
          'badge' + (labels[p.source] === value ? ' source' : ''),
          value
        )
      );
    }
  }

  card.append(badges);

  if (p.description) {
    card.append(node('p', 'desc', p.description));
  }

  if (p.address) {
    card.append(node('div', 'address', p.address));
  }

  const actions = node('div', 'actions');

  // 고덕지도 클릭 추적
  const mapButton = action(
    '지도 열기',
    p.map_url,
    true,
    () => {
      track('amap_click', {
        place_id: String(p.id || ''),
        place_name: String(p.name || ''),
        city: String(p.city || ''),
        category: String(p.category || '')
      });
    }
  );

  // 블로그 후기 클릭 추적
  const blogButton = action(
    '블로그 후기',
    p.blog_url,
    false,
    () => {
      track('blog_click', {
        place_id: String(p.id || ''),
        place_name: String(p.name || ''),
        city: String(p.city || '')
      });
    }
  );

  for (const a of [
    mapButton,
    copyButton('현지어 이름 복사', p.local_name),
    copyButton('주소 복사', p.address),
    blogButton
  ]) {
    if (a) actions.append(a);
  }

  if (actions.childNodes.length) {
    card.append(actions);
  }

  return card;
}

// 장소 목록 렌더링
function render() {
  const items = getFilteredPlaces();

  $('result-count').textContent = items.length;

  const list = $('list');
  list.replaceChildren();

  if (!items.length) {
    list.append(
      node('div', 'empty', '검색 조건에 맞는 장소가 없어요.')
    );
    return;
  }

  for (const p of items) {
    list.append(placeCard(p));
  }
}

// 장소 데이터 불러오기
async function load() {
  try {
    const response = await fetch('data/places.json', {
      cache: 'no-cache'
    });

    if (!response.ok) {
      throw Error('데이터 로드 실패');
    }

    const data = await response.json();

    if (!Array.isArray(data.places)) {
      throw Error('데이터 형식 오류');
    }

    state.places = data.places.filter(p => p && p.name);

    $('count-all').textContent = state.places.length;

    $('count-city').textContent =
      new Set(state.places.map(p => p.city)).size;

    $('update-date').textContent = data.updated_at
      ? '업데이트 ' + data.updated_at.slice(0, 10)
      : '';

    filters();
    render();

  } catch (error) {
    $('list').replaceChildren(
      node(
        'div',
        'empty',
        '장소 목록을 불러오지 못했어요. 잠시 후 새로고침해 주세요.'
      )
    );

    console.error(error);
  }
}

// 검색 이벤트: 마지막 입력 후 1초
let searchTimer = null;
let lastTrackedSearch = '';

$('search').addEventListener('input', e => {
  state.query = e.target.value;
  render();

  clearTimeout(searchTimer);

  const query = state.query.trim();

  if (!query) {
    lastTrackedSearch = '';
    return;
  }

  searchTimer = setTimeout(() => {
    const normalized = query.toLocaleLowerCase();

    // 동일 검색어 연속 중복 기록 방지
    if (normalized === lastTrackedSearch) return;

    lastTrackedSearch = normalized;

    track('place_search', {
      result_count: getFilteredPlaces().length,
      city: state.city,
      category: state.category
    });

  }, 1000);
});

// 정렬 기능
$('sort').addEventListener('change', e => {
  state.sort = e.target.value;
  render();
});

// 연도 표시
$('year').textContent = new Date().getFullYear();

// 웹사이트 시작
load();
