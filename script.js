document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('grid');
  const errorMsg = document.getElementById('error-msg');
  const dlg = document.getElementById('dlg');
  const dclose = document.getElementById('dclose');
  const dimg = document.getElementById('dimg');
  const dcat = document.getElementById('dcat');
  const dname = document.getElementById('dname');
  const dprice = document.getElementById('dprice');
  const ddesc = document.getElementById('ddesc');
  const ddetails = document.getElementById('ddetails');
  const dbuy = document.getElementById('dbuy');
  const dnote = document.getElementById('dnote');
  const header = document.getElementById('header');

  let productsData = [];

  const FALLBACK_PRODUCTS = [
    {
      "id": "p1",
      "name": "グリーンモスリース",
      "price": 1200,
      "category": "リース",
      "image": "product1.jpg",
      "desc": "やわらかなグリーンを中心に仕立てた、ナチュラルな壁飾りです。",
      "details": [
        "一点もの",
        "税込・送料込み",
        "壁掛け用"
      ],
      "status": "available",
      "stripe_url": ""
    },
    {
      "id": "p2",
      "name": "ナチュラルバスケットアレンジ",
      "price": 1500,
      "category": "アレンジメント",
      "image": "product2.jpg",
      "desc": "オレンジやホワイトの花材を組み合わせた、華やかなバスケットアレンジです。",
      "details": [
        "一点もの",
        "税込・送料込み",
        "ギフトにもおすすめ"
      ],
      "status": "available",
      "stripe_url": ""
    },
    {
      "id": "p3",
      "name": "レッドドライフラワーブーケ",
      "price": 1300,
      "category": "ブーケ",
      "image": "product3.jpg",
      "desc": "深みのある赤とピンクを重ねた、存在感のあるドライフラワーブーケです。",
      "details": [
        "一点もの",
        "税込・送料込み",
        "ラッピング付き"
      ],
      "status": "available",
      "stripe_url": ""
    },
    {
      "id": "p4",
      "name": "ミモザとグリーンのリース",
      "price": 1400,
      "category": "リース",
      "image": "product4.jpg",
      "desc": "ミモザの黄色とグリーンが明るい印象の、春らしいリースです。",
      "details": [
        "一点もの",
        "税込・送料込み",
        "壁掛け用"
      ],
      "status": "available",
      "stripe_url": ""
    },
    {
      "id": "p5",
      "name": "ミモザのハーフリース",
      "price": 1200,
      "category": "リース",
      "image": "product5.jpg",
      "desc": "ミモザと淡いピンクの花材を合わせた、軽やかなハーフリースです。",
      "details": [
        "一点もの",
        "税込・送料込み",
        "壁掛け用"
      ],
      "status": "available",
      "stripe_url": ""
    },
    {
      "id": "p6",
      "name": "ブルーフラワーバスケット",
      "price": 1500,
      "category": "アレンジメント",
      "image": "product6.jpg",
      "desc": "ブルーとホワイトを基調にした、落ち着いたバスケットアレンジです。",
      "details": [
        "一点もの",
        "税込・送料込み",
        "インテリア向け"
      ],
      "status": "available",
      "stripe_url": ""
    },
    {
      "id": "p7",
      "name": "グリーンハーフリース",
      "price": 1300,
      "category": "リース",
      "image": "product7.jpg",
      "desc": "ユーカリを中心に仕立てた、落ち着いた雰囲気のハーフリースです。",
      "details": [
        "一点もの",
        "税込・送料込み",
        "壁掛け用"
      ],
      "status": "available",
      "stripe_url": ""
    },
    {
      "id": "p8",
      "name": "ナチュラルスワッグ",
      "price": 1400,
      "category": "スワッグ",
      "image": "product8.jpg",
      "desc": "グリーンとブラウンの花材を束ねた、自然な風合いのスワッグです。",
      "details": [
        "一点もの",
        "税込・送料込み",
        "壁掛け用"
      ],
      "status": "soldout",
      "stripe_url": ""
    },
    {
      "id": "p9",
      "name": "紫陽花のドライフラワーブーケ",
      "price": 1500,
      "category": "ブーケ",
      "image": "hero.jpg",
      "desc": "紫陽花を中心に、やさしい色合いでまとめたドライフラワーブーケです。",
      "details": [
        "一点もの",
        "税込・送料込み",
        "ギフトにもおすすめ"
      ],
      "status": "available",
      "stripe_url": ""
    }
  ];

  // ==========================================
  // Scroll Restoration & Smooth Scroll
  // ==========================================
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({ behavior: 'smooth' });
        // URLにハッシュを残さない
        history.replaceState(null, null, window.location.pathname + window.location.search);
      }
    });
  });

  // ==========================================
  // Header Scroll Effect
  // ==========================================
  let lastScrollY = window.scrollY;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.style.padding = '10px 5vw';
      header.style.background = 'rgba(252, 251, 250, 0.9)';
    } else {
      header.style.padding = '16px 5vw';
      header.style.background = 'rgba(252, 251, 250, 0.7)';
    }
    lastScrollY = window.scrollY;
  }, { passive: true });

  // ==========================================
  // Intersection Observer for Animations
  // ==========================================
  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -10% 0px',
    threshold: 0.1
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target); // 一度発火したら監視を解除
      }
    });
  }, observerOptions);

  // 初期の監視対象を登録
  document.querySelectorAll('.reveal, .clip-reveal, .img-reveal-wrapper, .reveal-mask').forEach(el => observer.observe(el));

  // ==========================================
  // Parallax Effect
  // ==========================================
  const parallaxImages = document.querySelectorAll('.parallax-img');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  
  if (parallaxImages.length > 0) {
    window.addEventListener('scroll', () => {
      if (prefersReducedMotion.matches) return;
      
      parallaxImages.forEach(img => {
        const rect = img.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          const centerOffset = (rect.top + rect.height / 2) - (window.innerHeight / 2);
          const yPos = centerOffset * 0.05;
          img.style.transform = `scale(1.03) translateY(${yPos}px)`;
        }
      });
    }, { passive: true });
  }

  // ==========================================
  // Fetch Products
  // ==========================================
  async function loadProducts() {
    if (Array.isArray(window.PREVIEW_PRODUCTS)) return window.PREVIEW_PRODUCTS;
    if (Array.isArray(window.FALLBACK_PRODUCTS)) return window.FALLBACK_PRODUCTS;

    try {
      const res = await fetch('products.json');
      if (!res.ok) throw new Error('products.json fetch failed');
      return await res.json();
    } catch (error) {
      console.warn('Fetch error. Using fallback products.', error);
      return FALLBACK_PRODUCTS;
    }
  }

  loadProducts().then(data => {
    if (data && data.length > 0) {
      productsData = data;
      renderProducts(data);
    } else {
      if (errorMsg) {
        errorMsg.innerHTML = '商品データを読み込めませんでした。<br>preview.htmlで確認するか、GitHub Pages公開後のURLでご確認ください。';
        errorMsg.style.display = 'block';
      }
    }
  });

  // ==========================================
  // Render Products
  // ==========================================
  function renderProducts(products) {
    if (!grid) return;
    
    grid.innerHTML = products.map((p, index) => {
      const isSold = p.status === 'soldout';
      // 最大8個分（400ms）を上限とする遅延
      const delayMs = Math.min(index * 50, 400);

      return `
        <article class="product-card reveal ${isSold ? 'is-sold' : ''}" style="transition-delay: ${delayMs}ms;" data-id="${p.id}" tabindex="0" role="button" aria-label="${p.name}の詳細を見る">
          <div class="product-image">
            <img src="${p.image}" alt="${p.name}" loading="lazy">
            <div class="badge-wrapper">
              <span class="badge">${isSold ? '完売' : '一点もの'}</span>
            </div>
            ${isSold ? `
              <div class="sold-overlay">
                <span class="sold-title">SOLD OUT</span>
                <span class="sold-sub">次の作品をお楽しみに</span>
              </div>
            ` : ''}
          </div>
          <div class="product-info">
            <span class="product-cat">${p.category}</span>
            <h3 class="product-name">${p.name}</h3>
            <div class="product-price">¥${p.price.toLocaleString()} <small>税込</small></div>
          </div>
        </article>
      `;
    }).join('');

    // 新しく生成された要素をObserverに登録し、クリックイベントを付与
    document.querySelectorAll('.product-card').forEach(card => {
      observer.observe(card);
      
      // クリックとキーボード(Enter)対応
      card.addEventListener('click', () => openModal(card.dataset.id));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(card.dataset.id);
        }
      });
    });
  }

  // ==========================================
  // Modal Control
  // ==========================================
  function openModal(id) {
    const p = productsData.find(x => x.id === id);
    if (!p) return;

    dimg.src = p.image;
    dimg.alt = p.name;
    dcat.textContent = p.category;
    dname.textContent = p.name;
    dprice.textContent = `¥${p.price.toLocaleString()}`;
    ddesc.textContent = p.desc;
    ddetails.innerHTML = p.details.map(x => `<li>${x}</li>`).join('');

    // ボタンの制御
    if (p.status === 'soldout') {
      dbuy.textContent = 'SOLD OUT';
      dbuy.href = '#';
      dbuy.disabled = true;
      dbuy.setAttribute('aria-disabled', 'true');
      dbuy.style.pointerEvents = 'none';
      dnote.textContent = 'こちらの商品は完売いたしました。';
    } else if (!p.stripe_url) {
      dbuy.textContent = '購入手続きへ（準備中）';
      dbuy.href = '#';
      dbuy.disabled = false;
      dbuy.removeAttribute('aria-disabled');
      dbuy.style.pointerEvents = 'auto';
      dbuy.onclick = (e) => {
        e.preventDefault();
        alert('現在準備中です。Stripeリンク設定後に購入可能になります。');
      };
      dnote.textContent = '現在はデモ表示のため購入できません。';
    } else {
      dbuy.textContent = '購入手続きへ';
      dbuy.href = p.stripe_url;
      dbuy.disabled = false;
      dbuy.removeAttribute('aria-disabled');
      dbuy.style.pointerEvents = 'auto';
      dbuy.onclick = null;
      dnote.textContent = 'Stripeの安全な決済画面へ移動します。';
    }

    dlg.showModal();
    // モーダルが開いたら本文のスクロールを防ぐ
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    dlg.close();
    document.body.style.overflow = '';
  }

  // 閉じるボタン
  if (dclose) {
    dclose.addEventListener('click', closeModal);
  }

  // 背景クリックで閉じる
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) closeModal();
  });

  // ESCキー対応（デフォルト動作をフックしてスクロールロックを解除）
  dlg.addEventListener('cancel', () => {
    document.body.style.overflow = '';
  });
});