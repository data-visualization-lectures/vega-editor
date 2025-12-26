# Dataviz API 仕様書

## 概要
`api.dataviz.jp` で提供されるプロジェクト管理APIの仕様です。
クライアントアプリケーション（各可視化ツール）は、本APIを通じてユーザーのプロジェクトデータの保存、読み込み、更新、削除を行います。

## 認証
全てのエンドポイントで **Bearer Token認証** が必要です。
Supabase Auth (Gotrue) で取得した `access_token` を Authorization ヘッダーに付与してください。

```http
Authorization: Bearer <access_token>
```

---

## エンドポイント一覧

### 1. プロジェクト一覧取得
**GET** `/api/projects`

指定したアプリケーションのプロジェクト一覧を、更新日時の降順で取得します。

**Query Parameters:**
- `app`: (Required) アプリケーション識別子 (例: `voyager`, `kepler.gl`)

**Response (200 OK):**
```json
{
  "projects": [
    {
      "id": "uuid-string",
      "name": "My Project",
      "app_name": "voyager",
      "thumbnail_path": "user_id/uuid.png",
      "created_at": "ISO8601 string",
      "updated_at": "ISO8601 string"
    },
    ...
  ]
}
```

---

### 2. プロジェクト新規作成
**POST** `/api/projects`

新しいプロジェクトを作成し、データを保存します。

**Request Body (JSON):**
```json
{
  "name": "My New Project",           // (Required) プロジェクト名
  "app_name": "voyager",              // (Required) アプリケーション識別子
  "data": { ... },                    // (Required) 保存するJSONデータ本体
  "thumbnail": "data:image/png;..."   // (Optional) サムネイル画像のBase64 Data URI
}
```
*   `thumbnail`: プレフィックス（`data:image/png;base64,` 等）を含むBase64文字列を受け付けます。サーバー側でデコードされ PNG として保存されます。

**Response (200 OK):**
```json
{
  "project": {
    "id": "generated-uuid",
    "name": "My New Project",
    "storage_path": "user_id/uuid.json",
    "thumbnail_path": "user_id/uuid.png",
    ...
  }
}
```

---

### 3. プロジェクト詳細（データ）取得
**GET** `/api/projects/[id]`

指定したプロジェクトの **実データ(JSON)** を取得します。
メタデータではなく、保存されたJSONの中身がそのままレスポンスボディとして返却されます。

**Parameters:**
- `id`: プロジェクトID (UUID)

**Response (200 OK):**
- Content-Type: `application/json`
- Body: 保存されたJSONデータオブジェクト

---

### 4. プロジェクト更新
**PUT** `/api/projects/[id]`

既存プロジェクトの情報を更新します。変更したいフィールドのみを送信してください（Partial Update）。

**Parameters:**
- `id`: プロジェクトID (UUID)

**Request Body (JSON):**
```json
{
  "name": "Updated Name",             // (Optional) プロジェクト名
  "data": { ... },                    // (Optional) 新しいJSONデータ本体
  "thumbnail": "data:image/png;..."   // (Optional) 新しいサムネイル画像(Base64)
}
```
*   `data`: 送信された場合、既存のJSONファイルを上書きします。
*   `thumbnail`: 送信された場合、既存の画像を上書き（または新規作成）し、DBのパス情報を更新します。

**Response (200 OK):**
```json
{
  "project": {
    "id": "uuid",
    "updated_at": "new-timestamp",
    ...
  }
}
```

---

### 5. プロジェクト削除
**DELETE** `/api/projects/[id]`

プロジェクトを削除します。DB上のレコード、JSONファイル、サムネイル画像の全てが削除されます。

**Parameters:**
- `id`: プロジェクトID (UUID)

**Response (200 OK):**
```json
{
  "success": true
}
```

---

### 6. サムネイル画像取得
**GET** `/api/projects/[id]/thumbnail`

プロジェクトのサムネイル画像（PNG）をダウンロードします。
`thumbnail_path` が設定されているプロジェクトのみ利用可能です。

**Parameters:**
- `id`: プロジェクトID (UUID)

**Response (200 OK):**
- Content-Type: `image/png`
- Body: PNG画像バイナリデータ

**Response (Errors):**
- `404 thumbnail_not_found`: プロジェクトにサムネイルが設定されていない
```

---

## エラー応答

エラー発生時はステータスコードとともに以下の形式でJSONが返却されます。

```json
{
  "error": "error_code",
  "detail": "Detailed error message (Optional)"
}
```

**主なエラーコード:**
- `400 missing_required_fields`: 必須パラメータ不足
- `401 not_authenticated`: 認証トークンが無効または期限切れ
- `403 subscription_required`: 有効なサブスクリプションがない
- `404 project_not_found`: 指定IDのプロジェクトが存在しない、またはアクセス権がない
- `500 internal_error`: サーバー内部エラー
