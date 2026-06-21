/**
 * Stripe Webhook中継用 Cloudflare Workers テンプレート
 * 
 * 役割：
 * 1. Stripeから送られてきたWebhookの署名（Stripe-Signature）を検証する
 * 2. 検証に成功した場合のみ、GAS（Google Apps Script）へペイロードを安全に転送する
 * 
 * 【必要な環境変数】
 * STRIPE_WEBHOOK_SECRET : Stripeダッシュボードから取得するWebhookシークレット (whsec_...)
 * GAS_WEBHOOK_URL       : GASの「ウェブアプリのURL」 (https://script.google.com/macros/s/.../exec)
 * GAS_WEBHOOK_TOKEN     : GAS側と共通で決める任意の推測困難な文字列（認証用）
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // StripeからのPOSTリクエストのみ受け付ける
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const signatureHeader = request.headers.get('Stripe-Signature');
  if (!signatureHeader) {
    return new Response('Missing Stripe-Signature header', { status: 400 });
  }

  try {
    const payload = await request.text();

    // 1. Stripe署名の検証
    // Web Crypto APIを使って簡易的に署名を検証するか、あるいは
    // より厳密な検証が必要な場合は npm の stripe などをWebPack等でビルドして利用します。
    // ※ ここでは署名検証のロジックとして、Stripe公式の仕様に基づいた検証（HMAC SHA256）を行います。
    
    if (typeof STRIPE_WEBHOOK_SECRET === 'undefined' || !STRIPE_WEBHOOK_SECRET) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not set');
    }

    const isValid = await verifyStripeSignature(payload, signatureHeader, STRIPE_WEBHOOK_SECRET);
    if (!isValid) {
      return new Response('Invalid Signature', { status: 400 });
    }

    // 2. GASへの転送
    if (typeof GAS_WEBHOOK_URL === 'undefined' || !GAS_WEBHOOK_URL || typeof GAS_WEBHOOK_TOKEN === 'undefined' || !GAS_WEBHOOK_TOKEN) {
      throw new Error('GAS webhook configuration is missing');
    }

    // URLにGAS_WEBHOOK_TOKENを付与して送信（GAS側で検証）
    const targetUrl = new URL(GAS_WEBHOOK_URL);
    targetUrl.searchParams.append('token', GAS_WEBHOOK_TOKEN);

    const gasResponse = await fetch(targetUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: payload
    });

    const resultText = await gasResponse.text();

    return new Response(`Forwarded to GAS. Status: ${gasResponse.status}, Response: ${resultText}`, { status: 200 });

  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
}

/**
 * Stripeの署名を検証する関数（Web Crypto APIを使用）
 */
async function verifyStripeSignature(payload, signatureHeader, secret) {
  // signatureHeader の例: "t=1620000000,v1=xxxxxxxxxx,v0=yyyyyyyyy"
  const parsed = signatureHeader.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    if (!acc[key]) acc[key] = [];
    acc[key].push(value);
    return acc;
  }, {});

  const timestamp = parsed['t'] ? parsed['t'][0] : null;
  const signatures = parsed['v1'] || [];

  if (!timestamp || signatures.length === 0) return false;

  // タイムスタンプが古すぎる場合（例：5分以上前）はリプレイ攻撃とみなす
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
    return false;
  }

  // 署名対象の文字列を生成: timestamp + '.' + payload
  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  
  // シークレットキーをCryptoKeyに変換
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify', 'sign']
  );

  // HMAC-SHA256 を計算
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signedPayload)
  );

  // 計算した署名を16進数文字列に変換
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // 送られてきた署名（v1）のいずれかと一致するか確認
  return signatures.includes(expectedSignature);
}
