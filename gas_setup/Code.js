/**
 * 【花屋EC管理】 自動セットアップ用スクリプト
 * 
 * 使い方：
 * 1. スクリプトプロパティに ADMIN_TOKEN を設定する
 * 2. 関数 setupInitialSheet を選択して「実行」ボタンを押す
 */

/**
 * 初回設定用関数（本人が何度実行してもデータは消えません）
 */
function setupInitialSheet() {
  const props = PropertiesService.getScriptProperties();
  
  // 1. ADMIN_TOKEN の確認
  const adminToken = props.getProperty('ADMIN_TOKEN');
  if (!adminToken) {
    throw new Error(
      "【エラー】ADMIN_TOKEN（管理パスワード）が設定されていません。\n" +
      "左メニューの「プロジェクトの設定（歯車マーク）」>「スクリプト プロパティを追加」から、\n" +
      "プロパティに「ADMIN_TOKEN」、値にお好きなパスワードを入れて保存してください。"
    );
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 2. products シートの作成とヘッダー設定（安全設計）
  let productsSheet = ss.getSheetByName('products');
  const productsHeaders = [
    "id", "表示", "商品名", "カテゴリ", "価格", "説明", "詳細1", "詳細2", "詳細3", 
    "画像URL", "販売状態", "予約期限", "並び順", "登録日", "更新日"
  ];
  
  if (!productsSheet) {
    productsSheet = ss.insertSheet('products');
    productsSheet.getRange(1, 1, 1, productsHeaders.length).setValues([productsHeaders]);
  } else {
    // 既存シートがある場合、1行目が空ならヘッダーを入れる
    const firstCell = productsSheet.getRange(1, 1).getValue();
    if (!firstCell) {
      productsSheet.getRange(1, 1, 1, productsHeaders.length).setValues([productsHeaders]);
    }
  }
  
  // 見た目調整（何度実行してもOK）
  productsSheet.getRange(1, 1, 1, productsHeaders.length).setFontWeight("bold").setBackground("#f3f3f3");
  productsSheet.setFrozenRows(1);
  productsSheet.setColumnWidth(3, 200); // 商品名
  productsSheet.setColumnWidth(6, 300); // 説明
  productsSheet.setColumnWidth(10, 250); // 画像URL

  // 3. orders シートの作成とヘッダー設定（安全設計）
  let ordersSheet = ss.getSheetByName('orders');
  const ordersHeaders = [
    "注文ID", "注文日時", "商品ID", "商品名", "価格", "購入者名", "購入者メール", 
    "配送先住所", "支払い状態", "発送状態", "Stripe決済ID", "通知状態", "メモ"
  ];
  
  if (!ordersSheet) {
    ordersSheet = ss.insertSheet('orders');
    ordersSheet.getRange(1, 1, 1, ordersHeaders.length).setValues([ordersHeaders]);
  } else {
    // 既存シートがある場合、1行目が空ならヘッダーを入れる
    const firstCell = ordersSheet.getRange(1, 1).getValue();
    if (!firstCell) {
      ordersSheet.getRange(1, 1, 1, ordersHeaders.length).setValues([ordersHeaders]);
    }
  }

  // 見た目調整
  ordersSheet.getRange(1, 1, 1, ordersHeaders.length).setFontWeight("bold").setBackground("#f3f3f3");
  ordersSheet.setFrozenRows(1);
  ordersSheet.setColumnWidth(6, 150); // 購入者名
  ordersSheet.setColumnWidth(7, 200); // メール
  ordersSheet.setColumnWidth(8, 300); // 住所

  // 使わないデフォルトの「シート1」があれば削除
  const sheet1 = ss.getSheetByName('シート1');
  if (sheet1 && ss.getSheets().length > 1) {
    ss.deleteSheet(sheet1);
  }

  // 4. 画像保存用フォルダの作成（未作成の場合のみ）
  let folderId = props.getProperty('IMAGE_FOLDER_ID');
  if (!folderId) {
    const folderName = "かわのほとりのお花屋_商品画像";
    const newFolder = DriveApp.createFolder(folderName);
    // フォルダの共有設定（リンクを知っている全員が閲覧可）
    newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    folderId = newFolder.getId();
    props.setProperty('IMAGE_FOLDER_ID', folderId);
  }

  Logger.log("初期セットアップ（または安全な上書き）が完了しました！");
  Logger.log("画像保存フォルダID: " + folderId);
}

/**
 * 【危険】開発用リセット関数
 * 本番運用後は絶対に実行しないでください！
 * （商品データ、注文データがすべて消去されます）
 */
function resetSheetsForDevelopmentOnly() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const tempSheet = ss.insertSheet('temp_delete_me');
  const pSheet = ss.getSheetByName('products');
  if (pSheet) ss.deleteSheet(pSheet);
  const oSheet = ss.getSheetByName('orders');
  if (oSheet) ss.deleteSheet(oSheet);
  
  setupInitialSheet();
  ss.deleteSheet(tempSheet);
  Logger.log("【警告】すべてのデータをリセットし、初期化しました。");
}

/**
 * 既存の画像URLを修正し、共有設定を付与するヘルパー関数
 */
function fixExistingImageLinks() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('products');
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  // 1行目はヘッダーなので2行目から
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const imageUrl = String(row[9] || '');
    
    // URLからIDを抽出
    let fileId = null;
    const ucMatch = imageUrl.match(/id=([a-zA-Z0-9_-]+)/);
    const dMatch = imageUrl.match(/file\/d\/([a-zA-Z0-9_-]+)/);
    
    if (ucMatch) {
      fileId = ucMatch[1];
    } else if (dMatch) {
      fileId = dMatch[1];
    }

    if (fileId) {
      // 共有設定を再付与
      try {
        const file = DriveApp.getFileById(fileId);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (e) {
        Logger.log(`ファイルID ${fileId} の権限変更に失敗しました: ${e.message}`);
      }
      
      // 新しいURL形式に書き換え
      const newUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
      sheet.getRange(i + 1, 10).setValue(newUrl); // J列(10列目)
    }
  }
  Logger.log("既存の画像リンクの修正と共有設定が完了しました。");
}

/**
 * 画像URLを適切な形式に変換する内部関数 (getProductsListで使用)
 */
function convertImageUrl(url) {
  if (!url) return "";
  let fileId = null;
  const ucMatch = url.match(/id=([a-zA-Z0-9_-]+)/);
  const dMatch = url.match(/file\/d\/([a-zA-Z0-9_-]+)/);
  
  if (ucMatch) {
    fileId = ucMatch[1];
  } else if (dMatch) {
    fileId = dMatch[1];
  }
  
  if (fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  }
  return url;
}

/**
 * 管理者トークンを検証するヘルパー関数
 */
function verifyAdminToken(token) {
  const props = PropertiesService.getScriptProperties();
  const validToken = props.getProperty('ADMIN_TOKEN');
  if (!validToken) {
    throw new Error("サーバー側にADMIN_TOKENが設定されていません。");
  }
  return token === validToken;
}

/**
 * 商品一覧を取得する処理 (LP公開用API)
 */
function getProductsList() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('products');
    if (!sheet) throw new Error("productsシートが見つかりません");
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: true, products: [] };
    }
    
    const products = [];
    // 1行目はヘッダーなので2行目(インデックス1)からループ
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const id = row[0];
      const isVisible = row[1];
      const name = row[2];
      const category = row[3];
      const price = row[4];
      const description = row[5];
      const detail1 = row[6];
      const detail2 = row[7];
      const detail3 = row[8];
      const image = convertImageUrl(String(row[9] || '')); // 表示用に変換
      const status = row[10];
      const sortOrder = row[12];
      
      // 空行はスキップ
      if (!id || String(id).trim() === "") continue;
      
      // 表示がTRUE かつ hidden 以外を抽出
      if (isVisible === true && status !== "hidden") {
        const details = [];
        if (detail1) details.push(String(detail1));
        if (detail2) details.push(String(detail2));
        if (detail3) details.push(String(detail3));
        
        products.push({
          id: String(id),
          name: String(name),
          category: String(category),
          price: Number(price),
          description: String(description),
          details: details,
          image: image,
          status: String(status),
          sortOrder: Number(sortOrder) || 0
        });
      }
    }
    
    // 並び順(sortOrder)で昇順ソート
    products.sort((a, b) => a.sortOrder - b.sortOrder);
    
    return { success: true, products: products };
    
  } catch (error) {
    console.error(error);
    return { success: false, message: error.message, products: [] };
  }
}

/**
 * HTTP GETリクエストを受け取った時の処理
 * (商品登録フォームの表示 or 商品一覧APIの返却)
 */
function doGet(e) {
  // パラメータがない場合は、e.parameter.action が undefined になるのを防ぐ
  const params = e.parameter || {};
  const action = params.action;
  const callback = params.callback;

  // 購入開始API
  if (action === 'createCheckoutSession') {
    const result = createCheckoutSession(params);
    const jsonString = JSON.stringify(result);
    if (callback) {
      return ContentService.createTextOutput(callback + '(' + jsonString + ');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      return ContentService.createTextOutput(jsonString)
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // 商品一覧JSON取得API
  if (action === 'getProducts') {
    const result = getProductsList();
    const jsonString = JSON.stringify(result);
    
    // GitHub Pages等からのCORS対策（JSONP）
    if (callback) {
      return ContentService.createTextOutput(callback + '(' + jsonString + ');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      // 通常のJSON
      return ContentService.createTextOutput(jsonString)
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // action指定がない場合は商品登録フォーム（Index.html）を表示
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('商品登録フォーム - かわのほとりのお花屋')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * フォームから送信されたデータを受け取り、シートに登録する処理
 */
function registerProduct(formObject) {
  try {
    // 1. 管理者パスワードの検証
    if (!verifyAdminToken(formObject.adminToken)) {
      return { success: false, message: "【エラー】管理パスワードが間違っています。" };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('products');
    if (!sheet) throw new Error("productsシートが見つかりません。setupInitialSheetを実行してください。");

    // 2. 画像をGoogleドライブに保存
    let imageUrl = "";
    if (formObject.imageFile && formObject.imageFile.length > 0) {
      const props = PropertiesService.getScriptProperties();
      const folderId = props.getProperty('IMAGE_FOLDER_ID');
      if (!folderId) throw new Error("画像保存フォルダが設定されていません。setupInitialSheetを実行してください。");
      
      const folder = DriveApp.getFolderById(folderId);
      const blob = formObject.imageFile;
      const file = folder.createFile(blob);
      
      // 【重要】ファイル単体にも「リンクを知っている全員が閲覧可」の権限を明示的に付与する
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      // 直接画像を表示できるURL形式に変換（安定表示用フォーマット）
      imageUrl = "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w1000";
    }

    // 3. 新しいIDの生成 (例: p1, p2...)
    const data = sheet.getDataRange().getValues();
    let newId = "p1";
    if (data.length > 1) {
      const lastId = data[data.length - 1][0]; // A列がidと仮定
      const numMatch = String(lastId).match(/\d+/);
      if (numMatch) {
        newId = "p" + (parseInt(numMatch[0], 10) + 1);
      }
    }

    // 4. シートへ追記するデータの配列作成
    const now = new Date();
    const rowData = [
      newId,                            // A列: id
      formObject.isVisible === "true",  // B列: 表示
      formObject.productName,           // C列: 商品名
      formObject.category,              // D列: カテゴリ
      parseInt(formObject.price, 10),   // E列: 価格
      formObject.description,           // F列: 説明
      formObject.detail1 || "一点もの",  // G列: 詳細1
      formObject.detail2 || "税込・送料込み", // H列: 詳細2
      formObject.detail3 || "",         // I列: 詳細3
      imageUrl,                         // J列: 画像URL
      "available",                      // K列: 販売状態
      "",                               // L列: 予約期限
      1,                                // M列: 並び順
      now,                              // N列: 登録日
      now                               // O列: 更新日
    ];

    sheet.appendRow(rowData);
    return { success: true, message: "商品が正常に登録されました！" };

  } catch (error) {
    console.error(error);
    return { success: false, message: "登録に失敗しました: " + error.message };
  }
}

/**
 * 購入開始処理 (Stripe Checkout Session作成)
 */
function createCheckoutSession(params) {
  const productId = params.productId;
  if (!productId) {
    return { success: false, message: "商品IDが指定されていません。" };
  }

  const lock = LockService.getScriptLock();
  try {
    // 10秒間ロックを取得。他人が同時に購入ボタンを押した場合の排他制御
    lock.waitLock(10000);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('products');
    const data = sheet.getDataRange().getValues();
    
    let rowIndex = -1;
    let productRow = null;
    
    // 商品を探す (1行目はヘッダー)
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === productId) {
        rowIndex = i + 1; // getRangeは1始まり
        productRow = data[i];
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, message: "商品が見つかりません。" };
    }
    
    const isVisible = productRow[1];
    const productName = productRow[2];
    const price = parseInt(productRow[4], 10);
    const status = productRow[10];
    
    if (isVisible !== true) {
      return { success: false, message: "この商品は現在販売されていません。" };
    }
    
    if (status !== "available") {
      return { success: false, message: "現在、他のお客様が手続き中です。" };
    }
    
    // 状態を reserved にし、予約期限を30分後に設定
    const now = new Date();
    const expireTime = new Date(now.getTime() + 30 * 60000); // 30分後
    
    sheet.getRange(rowIndex, 11).setValue("reserved"); // K列
    sheet.getRange(rowIndex, 12).setValue(expireTime); // L列
    SpreadsheetApp.flush(); // 即時反映
    
    // Stripeキーの取得
    const props = PropertiesService.getScriptProperties();
    const stripeSecretKey = props.getProperty('STRIPE_SECRET_KEY');
    const successUrl = props.getProperty('SUCCESS_URL');
    const cancelUrl = props.getProperty('CANCEL_URL');
    
    if (!stripeSecretKey || !successUrl || !cancelUrl) {
      // 未設定時はロールバックして、やさしいエラーを返す
      sheet.getRange(rowIndex, 11).setValue("available");
      sheet.getRange(rowIndex, 12).setValue("");
      SpreadsheetApp.flush();
      return { 
        success: false, 
        message: "現在、決済準備中です。オーダー相談はLINEからお願いします。",
        code: "STRIPE_NOT_CONFIGURED"
      };
    }
    
    // Stripe API呼び出し
    const url = "https://api.stripe.com/v1/checkout/sessions";
    const payload = {
      "payment_method_types[0]": "card",
      "mode": "payment",
      "success_url": successUrl,
      "cancel_url": cancelUrl,
      "line_items[0][price_data][currency]": "jpy",
      "line_items[0][price_data][product_data][name]": productName,
      "line_items[0][price_data][unit_amount]": price,
      "line_items[0][quantity]": 1,
      "metadata[productId]": productId
    };
    
    const options = {
      "method": "post",
      "headers": {
        "Authorization": "Bearer " + stripeSecretKey
      },
      "payload": payload,
      "muteHttpExceptions": true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());
    
    if (response.getResponseCode() === 200 && result.url) {
      return { success: true, checkoutUrl: result.url };
    } else {
      // Stripe側でエラーになった場合もロールバック
      sheet.getRange(rowIndex, 11).setValue("available");
      sheet.getRange(rowIndex, 12).setValue("");
      SpreadsheetApp.flush();
      console.error("Stripe Checkout Error: ", result);
      return { success: false, message: "決済セッションの作成に失敗しました。" };
    }
    
  } catch (e) {
    console.error(e);
    return { success: false, message: "混雑しているか、予期せぬエラーが発生しました。" };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Cloudflare WorkersからWebhookを受け取る処理
 */
function doPost(e) {
  const props = PropertiesService.getScriptProperties();
  const validToken = props.getProperty('GAS_WEBHOOK_TOKEN');
  
  // 1. トークン検証（未設定時はエラー）
  if (!validToken || e.parameter.token !== validToken) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "Invalid Token"
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  try {
    const payload = JSON.parse(e.postData.contents);
    const eventType = payload.type;
    const session = payload.data.object;
    const productId = session.metadata ? session.metadata.productId : null;
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const productsSheet = ss.getSheetByName('products');
    const ordersSheet = ss.getSheetByName('orders');
    
    if (!productId || !productsSheet || !ordersSheet) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: "Missing required data"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (eventType === 'checkout.session.completed') {
      // 2. Webhook重複対策（すでに同じStripe決済IDが存在するか確認）
      const sessionId = session.id;
      const ordersData = ordersSheet.getDataRange().getValues();
      for (let i = 1; i < ordersData.length; i++) {
        if (ordersData[i][10] === sessionId) { // K列(10): Stripe決済ID
          return ContentService.createTextOutput(JSON.stringify({
            success: true,
            message: "Already processed"
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      
      // 3. 商品を soldout にする
      const pData = productsSheet.getDataRange().getValues();
      let rowIndex = -1;
      let productName = "不明な商品";
      let price = 0;
      
      for (let i = 1; i < pData.length; i++) {
        if (pData[i][0] === productId) {
          rowIndex = i + 1;
          productName = pData[i][2];
          price = pData[i][4];
          break;
        }
      }
      
      if (rowIndex !== -1) {
        productsSheet.getRange(rowIndex, 11).setValue("soldout"); // 販売状態
        productsSheet.getRange(rowIndex, 12).setValue("");        // 予約期限クリア
      }
      
      // 4. ordersシートに記録
      const customerName = session.customer_details ? session.customer_details.name : "";
      const customerEmail = session.customer_details ? session.customer_details.email : "";
      
      // 住所の組み立て
      let addressStr = "";
      if (session.shipping_details && session.shipping_details.address) {
        const addr = session.shipping_details.address;
        addressStr = `${addr.postal_code || ''} ${addr.state || ''}${addr.city || ''}${addr.line1 || ''} ${addr.line2 || ''}`.trim();
        if (session.shipping_details.name) {
          addressStr += ` (宛名: ${session.shipping_details.name})`;
        }
      }
      
      // 注文ID生成 (例: ORD-20260620-XXXX)
      const dateStr = Utilities.formatDate(new Date(), "JST", "yyyyMMdd");
      const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
      const orderId = `ORD-${dateStr}-${randomStr}`;
      
      const orderRow = [
        orderId,                    // A: 注文ID
        new Date(),                 // B: 注文日時
        productId,                  // C: 商品ID
        productName,                // D: 商品名
        session.amount_total || price, // E: 価格
        customerName,               // F: 購入者名
        customerEmail,              // G: 購入者メール
        addressStr,                 // H: 配送先住所
        session.payment_status,     // I: 支払い状態
        "未発送",                     // J: 発送状態
        sessionId,                  // K: Stripe決済ID
        "未通知",                     // L: 通知状態
        ""                          // M: メモ
      ];
      ordersSheet.appendRow(orderRow);
      
      // 5. 発送通知メール送信 (OWNER_EMAILが設定されている場合のみ)
      const ownerEmail = props.getProperty('OWNER_EMAIL');
      if (ownerEmail) {
        try {
          const subject = `[新規注文] ${productName} が売れました`;
          const body = `
かわのほとりのお花屋に新規注文が入りました。

■ 注文内容
注文ID: ${orderId}
商品名: ${productName}
金額: ${session.amount_total || price}円

■ 購入者情報
お名前: ${customerName}
メール: ${customerEmail}
配送先: ${addressStr}

StripeダッシュボードやGoogleスプレッドシート(ordersシート)で詳細を確認し、発送準備をお願いします。
          `.trim();
          
          MailApp.sendEmail(ownerEmail, subject, body);
        } catch (mailErr) {
          console.error("Mail send error:", mailErr);
          // メールエラーで止まらないようにする
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Success"
      })).setMimeType(ContentService.MimeType.JSON);
      
    } else if (eventType === 'checkout.session.expired') {
      // 決済期限切れ時は available に戻す
      const pData = productsSheet.getDataRange().getValues();
      for (let i = 1; i < pData.length; i++) {
        if (pData[i][0] === productId && pData[i][10] === "reserved") {
          productsSheet.getRange(i + 1, 11).setValue("available");
          productsSheet.getRange(i + 1, 12).setValue("");
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Session expired handled"
      })).setMimeType(ContentService.MimeType.JSON);
      
    } else {
      // その他のイベントは無視
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Ignored event"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
  } catch (err) {
    console.error(err);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "Internal Server Error"
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 予約期限切れの商品を available に戻す (時間主導型トリガー用)
 */
function releaseExpiredReservations() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('products');
  if (!sheet) return;
  
  const data = sheet.getDataRange().getValues();
  const now = new Date();
  let changed = false;
  
  for (let i = 1; i < data.length; i++) {
    const status = data[i][10];
    const expireTime = data[i][11]; // L列: 予約期限
    
    if (status === "reserved" && expireTime) {
      const expireDate = new Date(expireTime);
      if (now > expireDate) {
        // 期限切れ
        sheet.getRange(i + 1, 11).setValue("available");
        sheet.getRange(i + 1, 12).setValue("");
        changed = true;
      }
    }
  }
  
  if (changed) {
    Logger.log("期限切れの予約を available に戻しました。");
  }
}
