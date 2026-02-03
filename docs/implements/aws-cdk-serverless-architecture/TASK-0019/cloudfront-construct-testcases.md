# TASK-0019: CloudFront Construct 実装 - テストケース定義書

**タスクID**: TASK-0019
**機能名**: CloudFront Construct
**要件名**: aws-cdk-serverless-architecture
**作成日**: 2026-02-03
**フェーズ**: TDD Red Phase - テストケース定義

---

## 開発言語・フレームワーク

| 項目 | 値 |
|------|-----|
| **プログラミング言語** | TypeScript |
| **テストフレームワーク** | Jest + aws-cdk-lib/assertions |
| **CDK バージョン** | v2 |

**言語選択の理由**: AWS CDK プロジェクトの標準言語、型安全性による品質向上
**フレームワーク選択の理由**: CDK 公式テストライブラリ、CloudFormation テンプレート検証に最適

🔵 信頼性: プロジェクト技術スタックより

---

## テストファイル情報

| 項目 | パス |
|------|------|
| **テストファイル** | `infra/test/construct/distribution/cloudfront-construct.test.ts` |
| **実装ファイル** | `infra/lib/construct/distribution/cloudfront-construct.ts` |

---

## テストケース一覧

| カテゴリ | テストケース数 | 説明 |
|----------|----------------|------|
| 正常系 - Distribution 作成 | 6 | 基本的な Distribution リソース作成 |
| 正常系 - S3 Origin (OAC) | 5 | S3 Origin の OAC 設定 |
| 正常系 - ALB Origin | 4 | ALB Origin の設定 |
| 正常系 - Cache Behavior | 5 | パスベースルーティング設定 |
| 正常系 - エラーページ | 4 | カスタムエラーレスポンス |
| 正常系 - プロパティ | 4 | 公開プロパティ確認 |
| 正常系 - オプション設定 | 3 | オプションパラメータのデフォルト値・カスタム値 |
| 異常系 - バリデーション | 4 | Props バリデーション |
| スナップショット | 1 | CloudFormation テンプレート |
| **合計** | **36** | |

---

## 1. 正常系テストケース（Distribution 作成）

### TC-CF-001: CloudFront Distribution リソース作成確認 🔵

- **テスト名**: CloudFront Distribution リソースが作成される
  - **何をテストするか**: CloudFrontConstruct がデフォルト設定で正常に Distribution を作成すること
  - **期待される動作**: `AWS::CloudFront::Distribution` リソースが 1 つ作成される
- **入力値**: 必須パラメータ (envName, s3Bucket, originAccessControl, alb)
  - **入力データの意味**: 最小構成での Construct インスタンス化
- **期待される結果**: Distribution リソースが存在
  - **期待結果の理由**: REQ-032 により CloudFront Distribution が必須
- **テストの目的**: Distribution 作成の基本動作確認
  - **確認ポイント**: リソースカウント

**参照した EARS 要件**: REQ-032

---

### TC-CF-002: Distribution Enabled 設定確認 🔵

- **テスト名**: Distribution が有効化されている
  - **何をテストするか**: Distribution の Enabled 設定が true であること
  - **期待される動作**: `Enabled: true` が設定される
- **入力値**: 必須パラメータ
- **期待される結果**: `Enabled: true`
  - **期待結果の理由**: Distribution は作成後すぐに使用可能である必要がある
- **テストの目的**: Distribution 有効化確認

**参照した EARS 要件**: REQ-032

---

### TC-CF-003: Price Class 設定確認 🔵

- **テスト名**: Price Class が PRICE_CLASS_200 に設定される
  - **何をテストするか**: 日本を含むリージョンの Price Class が設定されること
  - **期待される動作**: `PriceClass: PriceClass200` が設定される
- **入力値**: 必須パラメータ (デフォルト priceClass)
- **期待される結果**: `PriceClass: PriceClass200`
  - **期待結果の理由**: 日本リージョンをカバーする最適なコスト設定
- **テストの目的**: Price Class 設定確認

**参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/architecture.md`

---

### TC-CF-004: HTTP Version 設定確認 🟡

- **テスト名**: HTTP Version が http2and3 に設定される
  - **何をテストするか**: HTTP/2 and HTTP/3 が有効であること
  - **期待される動作**: `HttpVersion: http2and3` が設定される
- **入力値**: 必須パラメータ (デフォルト httpVersion)
- **期待される結果**: `HttpVersion: http2and3`
  - **期待結果の理由**: パフォーマンス最適化
- **テストの目的**: HTTP Version 設定確認

**参照した設計文書**: タスクノート

---

### TC-CF-005: Default Root Object 設定確認 🟡

- **テスト名**: Default Root Object が index.html に設定される
  - **何をテストするか**: デフォルトルートオブジェクトが設定されること
  - **期待される動作**: `DefaultRootObject: index.html` が設定される
- **入力値**: 必須パラメータ (デフォルト defaultRootObject)
- **期待される結果**: `DefaultRootObject: index.html`
  - **期待結果の理由**: 静的サイト配信の標準設定
- **テストの目的**: Default Root Object 設定確認

---

### TC-CF-006: カスタム Price Class 設定確認 🟡

- **テスト名**: カスタム Price Class が正しく設定される
  - **何をテストするか**: priceClass オプションが反映されること
  - **期待される動作**: 指定した Price Class が設定される
- **入力値**: `priceClass: PriceClass.PRICE_CLASS_ALL`
- **期待される結果**: `PriceClass: PriceClassAll`
- **テストの目的**: オプションパラメータ反映確認

---

## 2. 正常系テストケース（S3 Origin OAC）

### TC-S3O-001: S3 Origin 作成確認 🔵

- **テスト名**: S3 Origin が作成される
  - **何をテストするか**: S3 バケットが Origin として設定されること
  - **期待される動作**: Origins 配列に S3 Origin が含まれる
- **入力値**: s3Bucket (S3BucketConstruct から取得)
- **期待される結果**: Origin に S3 バケットドメインが設定される
  - **期待結果の理由**: REQ-032 により S3 を CloudFront 経由でアクセス
- **テストの目的**: S3 Origin 設定確認

**参照した EARS 要件**: REQ-032

---

### TC-S3O-002: OAC ID 設定確認 🔵

- **テスト名**: S3 Origin に OAC ID が設定される
  - **何をテストするか**: Origin Access Control が S3 Origin に紐付けられること
  - **期待される動作**: `OriginAccessControlId` が設定される
- **入力値**: originAccessControl (S3BucketConstruct から取得)
- **期待される結果**: `OriginAccessControlId` が存在
  - **期待結果の理由**: NFR-104 により OAC 経由のみアクセス許可
- **テストの目的**: OAC 紐付け確認

**参照した EARS 要件**: NFR-104

---

### TC-S3O-003: S3 Origin Config 確認 🔵

- **テスト名**: S3OriginConfig が正しく設定される
  - **何をテストするか**: OAC 使用時の S3OriginConfig 設定
  - **期待される動作**: `OriginAccessIdentity: ''` (空文字列)
- **入力値**: 必須パラメータ
- **期待される結果**: `S3OriginConfig.OriginAccessIdentity: ''`
  - **期待結果の理由**: OAC 使用時は OAI を使用しない
- **テストの目的**: OAC/OAI 設定の正確性確認

**参照した設計文書**: CloudFront OAC 仕様

---

### TC-S3O-004: S3 Origin ID 確認 🟡

- **テスト名**: S3 Origin の ID が適切に設定される
  - **何をテストするか**: Origin の識別子が設定されること
  - **期待される動作**: Origin ID が設定される
- **入力値**: 必須パラメータ
- **期待される結果**: Origin ID が存在
- **テストの目的**: Origin 識別子確認

---

### TC-S3O-005: S3 Origin Domain Name 確認 🔵

- **テスト名**: S3 Origin のドメイン名が正しく設定される
  - **何をテストするか**: S3 バケットのリージョナルドメイン名が設定されること
  - **期待される動作**: `bucketRegionalDomainName` 形式
- **入力値**: s3Bucket
- **期待される結果**: S3 バケットドメインが設定される
- **テストの目的**: S3 Origin ドメイン確認

---

## 3. 正常系テストケース（ALB Origin）

### TC-ALBO-001: ALB Origin 作成確認 🔵

- **テスト名**: ALB Origin が作成される
  - **何をテストするか**: ALB が Origin として設定されること
  - **期待される動作**: Origins 配列に ALB Origin が含まれる
- **入力値**: alb (AlbConstruct から取得)
- **期待される結果**: Origin に ALB ドメインが設定される
- **テストの目的**: ALB Origin 設定確認

**参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/architecture.md`

---

### TC-ALBO-002: ALB Origin Protocol Policy 確認 🔵

- **テスト名**: ALB Origin が HTTPS-only で設定される
  - **何をテストするか**: ALB への通信が HTTPS であること
  - **期待される動作**: `OriginProtocolPolicy: https-only`
- **入力値**: alb
- **期待される結果**: `CustomOriginConfig.OriginProtocolPolicy: https-only`
  - **期待結果の理由**: NFR-105 により HTTPS 強制
- **テストの目的**: Origin プロトコル確認

**参照した EARS 要件**: NFR-105

---

### TC-ALBO-003: ALB Origin HTTPS Port 確認 🔵

- **テスト名**: ALB Origin の HTTPS ポートが 443 に設定される
  - **何をテストするか**: HTTPS ポート設定
  - **期待される動作**: `HTTPSPort: 443`
- **入力値**: alb
- **期待される結果**: `CustomOriginConfig.HTTPSPort: 443`
- **テストの目的**: Origin ポート確認

---

### TC-ALBO-004: ALB Origin Domain Name 確認 🔵

- **テスト名**: ALB Origin のドメイン名が正しく設定される
  - **何をテストするか**: ALB の DNS 名が設定されること
  - **期待される動作**: ALB の `loadBalancerDnsName` が設定される
- **入力値**: alb
- **期待される結果**: ALB ドメインが設定される
- **テストの目的**: ALB Origin ドメイン確認

---

## 4. 正常系テストケース（Cache Behavior）

### TC-CB-001: Default Cache Behavior 確認 🔵

- **テスト名**: Default Cache Behavior が ALB Origin を指す
  - **何をテストするか**: デフォルトのリクエストが ALB に転送されること
  - **期待される動作**: `DefaultCacheBehavior.TargetOriginId` が ALB Origin
- **入力値**: 必須パラメータ
- **期待される結果**: ALB Origin への転送設定
  - **期待結果の理由**: 動的コンテンツ (API, フロントエンド) のデフォルト配信
- **テストの目的**: デフォルトルーティング確認

**参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/dataflow.md`

---

### TC-CB-002: Default Viewer Protocol Policy 確認 🔵

- **テスト名**: Default Cache Behavior で HTTPS リダイレクトが設定される
  - **何をテストするか**: HTTPS 強制設定
  - **期待される動作**: `ViewerProtocolPolicy: redirect-to-https`
- **入力値**: 必須パラメータ
- **期待される結果**: `ViewerProtocolPolicy: redirect-to-https`
  - **期待結果の理由**: NFR-105 により HTTPS 強制
- **テストの目的**: HTTPS 強制確認

**参照した EARS 要件**: NFR-105

---

### TC-CB-003: Static Asset Path Behavior 確認 🔵

- **テスト名**: /static/* パスが S3 Origin にルーティングされる
  - **何をテストするか**: 静的アセットパスのルーティング
  - **期待される動作**: `/static/*` が S3 Origin を指す CacheBehavior
- **入力値**: デフォルト staticAssetPaths
- **期待される結果**: `/static/*` → S3 Origin
- **テストの目的**: 静的アセットルーティング確認

**参照した EARS 要件**: REQ-032

---

### TC-CB-004: Assets Path Behavior 確認 🔵

- **テスト名**: /assets/* パスが S3 Origin にルーティングされる
  - **何をテストするか**: アセットパスのルーティング
  - **期待される動作**: `/assets/*` が S3 Origin を指す CacheBehavior
- **入力値**: デフォルト staticAssetPaths
- **期待される結果**: `/assets/*` → S3 Origin
- **テストの目的**: アセットルーティング確認

---

### TC-CB-005: API Path Behavior 確認 🔵

- **テスト名**: /api/* パスが ALB Origin にルーティングされる
  - **何をテストするか**: API パスのルーティング
  - **期待される動作**: `/api/*` が ALB Origin を指す CacheBehavior
- **入力値**: デフォルト apiPaths
- **期待される結果**: `/api/*` → ALB Origin (キャッシュ無効)
- **テストの目的**: API ルーティング確認

---

## 5. 正常系テストケース（エラーページ）

### TC-ERR-001: 403 Custom Error Response 確認 🔵

- **テスト名**: 403 エラー時にエラーページが返される
  - **何をテストするか**: 403 エラーのカスタムレスポンス設定
  - **期待される動作**: 403 → 200 + /error.html
- **入力値**: enableErrorPages: true (デフォルト)
- **期待される結果**: ErrorCode: 403, ResponseCode: 200, ResponsePagePath: /error.html
  - **期待結果の理由**: REQ-031 により Sorry Page 表示
- **テストの目的**: 403 エラーハンドリング確認

**参照した EARS 要件**: REQ-031

---

### TC-ERR-002: 404 Custom Error Response 確認 🔵

- **テスト名**: 404 エラー時にエラーページが返される
  - **何をテストするか**: 404 エラーのカスタムレスポンス設定
  - **期待される動作**: 404 → 200 + /error.html
- **入力値**: enableErrorPages: true (デフォルト)
- **期待される結果**: ErrorCode: 404, ResponseCode: 200, ResponsePagePath: /error.html
- **テストの目的**: 404 エラーハンドリング確認

**参照した EARS 要件**: REQ-031

---

### TC-ERR-003: 5xx Custom Error Response 確認 🔵

- **テスト名**: 5xx エラー時にエラーページが返される
  - **何をテストするか**: 500/502/503/504 エラーのカスタムレスポンス設定
  - **期待される動作**: 5xx → 200 + /error.html (TTL: 0)
- **入力値**: enableErrorPages: true (デフォルト)
- **期待される結果**: 5xx エラーのカスタムレスポンスが設定される
- **テストの目的**: 5xx エラーハンドリング確認

**参照した EARS 要件**: REQ-031, EDGE-001

---

### TC-ERR-004: カスタム Error Page Path 確認 🟡

- **テスト名**: カスタムエラーページパスが設定される
  - **何をテストするか**: errorPagePath オプションの反映
  - **期待される動作**: 指定したパスが ResponsePagePath に設定される
- **入力値**: errorPagePath: '/sorry.html'
- **期待される結果**: ResponsePagePath: /sorry.html
- **テストの目的**: オプションパラメータ反映確認

---

## 6. 正常系テストケース（プロパティ）

### TC-PROP-001: distribution プロパティ確認 🔵

- **テスト名**: distribution プロパティが正しく公開される
  - **何をテストするか**: IDistribution 型のプロパティが取得できること
  - **期待される動作**: distribution プロパティが定義されている
- **入力値**: 必須パラメータ
- **期待される結果**: distribution プロパティが存在
- **テストの目的**: 公開プロパティ確認

---

### TC-PROP-002: distributionArn プロパティ確認 🔵

- **テスト名**: distributionArn プロパティが正しく公開される
  - **何をテストするか**: Distribution ARN が取得できること
  - **期待される動作**: ARN 形式の文字列
- **入力値**: 必須パラメータ
- **期待される結果**: `arn:aws:cloudfront::...` 形式
  - **期待結果の理由**: S3 バケットポリシー設定に必要
- **テストの目的**: ARN 取得確認

---

### TC-PROP-003: distributionDomainName プロパティ確認 🔵

- **テスト名**: distributionDomainName プロパティが正しく公開される
  - **何をテストするか**: Distribution ドメイン名が取得できること
  - **期待される動作**: `*.cloudfront.net` 形式
- **入力値**: 必須パラメータ
- **期待される結果**: CloudFront ドメインが取得できる
  - **期待結果の理由**: REQ-043 によりデフォルトドメイン使用
- **テストの目的**: ドメイン取得確認

**参照した EARS 要件**: REQ-043

---

### TC-PROP-004: distributionId プロパティ確認 🔵

- **テスト名**: distributionId プロパティが正しく公開される
  - **何をテストするか**: Distribution ID が取得できること
  - **期待される動作**: Distribution ID 文字列
- **入力値**: 必須パラメータ
- **期待される結果**: Distribution ID が取得できる
  - **期待結果の理由**: キャッシュ無効化に必要
- **テストの目的**: ID 取得確認

---

## 7. 正常系テストケース（オプション設定）

### TC-OPT-001: デフォルト値適用確認 🟡

- **テスト名**: オプションパラメータのデフォルト値が適用される
  - **何をテストするか**: 省略時のデフォルト値適用
  - **期待される動作**: 全デフォルト値が正しく設定される
- **入力値**: 必須パラメータのみ
- **期待される結果**: priceClass: PRICE_CLASS_200, httpVersion: HTTP2_AND_3, etc.
- **テストの目的**: デフォルト値確認

---

### TC-OPT-002: カスタム staticAssetPaths 確認 🟡

- **テスト名**: カスタム静的アセットパスが設定される
  - **何をテストするか**: staticAssetPaths オプションの反映
  - **期待される動作**: 指定したパスの CacheBehavior が作成される
- **入力値**: staticAssetPaths: ['/static/*', '/images/*', '/css/*']
- **期待される結果**: 3 つのパスが S3 Origin にルーティング
- **テストの目的**: カスタムパス設定確認

---

### TC-OPT-003: カスタム apiPaths 確認 🟡

- **テスト名**: カスタム API パスが設定される
  - **何をテストするか**: apiPaths オプションの反映
  - **期待される動作**: 指定したパスの CacheBehavior が作成される
- **入力値**: apiPaths: ['/api/*', '/graphql/*']
- **期待される結果**: 2 つのパスが ALB Origin にルーティング
- **テストの目的**: カスタム API パス設定確認

---

## 8. 異常系テストケース（バリデーション）

### TC-VAL-001: envName 空文字エラー確認 🟡

- **テスト名**: envName が空文字の場合にエラーが発生する
  - **エラーケースの概要**: 必須パラメータの空文字チェック
  - **エラー処理の重要性**: 不正な命名によるリソース作成失敗防止
- **入力値**: envName: ''
  - **不正な理由**: 必須パラメータが空
  - **実際の発生シナリオ**: 設定ミス、環境変数未設定
- **期待される結果**: `Error: envName は必須です。空文字列は指定できません。`
- **テストの目的**: 必須チェック確認

**参照した設計文書**: `infra/lib/construct/storage/s3-bucket-construct.ts`

---

### TC-VAL-002: envName 長さ超過エラー確認 🟡

- **テスト名**: envName が 20 文字を超える場合にエラーが発生する
  - **エラーケースの概要**: 長さ制限チェック
  - **エラー処理の重要性**: リソース名の長さ制限対応
- **入力値**: envName: 'a'.repeat(21)
  - **不正な理由**: 20 文字制限超過
- **期待される結果**: `Error: envName は 20 文字以下である必要があります。`
- **テストの目的**: 長さチェック確認

---

### TC-VAL-003: envName 不正文字エラー確認 🟡

- **テスト名**: envName に不正な文字が含まれる場合にエラーが発生する
  - **エラーケースの概要**: 形式チェック
  - **エラー処理の重要性**: AWS リソース命名規則準拠
- **入力値**: envName: 'Test_Env'
  - **不正な理由**: 大文字、アンダースコアが含まれる
- **期待される結果**: `Error: envName は小文字英数字とハイフンのみで構成されます。`
- **テストの目的**: 形式チェック確認

---

### TC-VAL-004: envName ハイフン開始エラー確認 🟡

- **テスト名**: envName がハイフンで開始する場合にエラーが発生する
  - **エラーケースの概要**: 形式チェック (開始文字)
  - **エラー処理の重要性**: 有効なリソース名生成
- **入力値**: envName: '-dev'
  - **不正な理由**: ハイフンで開始
- **期待される結果**: `Error: envName は小文字英数字とハイフンのみで構成されます。`
- **テストの目的**: 形式チェック確認

---

## 9. スナップショットテスト

### TC-SNAP-001: CloudFormation テンプレートスナップショット確認 🔵

- **テスト名**: CloudFormation テンプレートが期待通りに生成される
  - **何をテストするか**: テンプレート全体の一貫性
  - **期待される動作**: 前回スナップショットと一致
- **入力値**: 必須パラメータ + 代表的なオプション
- **期待される結果**: スナップショット一致
  - **期待結果の理由**: 予期しない変更の検出
- **テストの目的**: リグレッション防止

---

## 信頼性レベルサマリー

| レベル | 件数 | 割合 |
|--------|------|------|
| 🔵 青信号 | 27 | 75% |
| 🟡 黄信号 | 9 | 25% |
| 🔴 赤信号 | 0 | 0% |

**品質評価**: ✅ 高品質 - テストケースの大部分が要件定義書・設計文書に基づく

---

## テスト実装時の日本語コメント指針

### テストケース開始時のコメント例

```typescript
// 【テスト目的】: CloudFront Distribution リソースが正常に作成されることを確認
// 【テスト内容】: 必須パラメータで CloudFrontConstruct をインスタンス化し、テンプレートを検証
// 【期待される動作】: AWS::CloudFront::Distribution リソースが 1 つ作成される
// 🔵 信頼性: REQ-032 より
```

### Given（準備フェーズ）のコメント例

```typescript
// 【テストデータ準備】: 必須パラメータで CloudFrontConstruct を作成
// 【初期条件設定】: S3BucketConstruct と AlbConstruct のモックを使用
// 【前提条件確認】: TASK-0018 (S3+OAC) と TASK-0016 (ALB) の Construct が利用可能
```

### When（実行フェーズ）のコメント例

```typescript
// 【実際の処理実行】: CloudFrontConstruct をインスタンス化
// 【処理内容】: Distribution、Origin、CacheBehavior の作成
// 【実行タイミング】: CDK synth 相当の処理
```

### Then（検証フェーズ）のコメント例

```typescript
// 【結果検証】: CloudFormation テンプレートの検証
// 【期待値確認】: Distribution リソースが存在すること
// 【品質保証】: REQ-032 の要件充足確認
```

---

## 要件定義との対応関係

| テストカテゴリ | 参照した要件定義セクション |
|---------------|---------------------------|
| Distribution 作成 | 1. 機能の概要、6. CloudFormation リソース仕様 |
| S3 Origin (OAC) | 2.1 入力パラメータ、3.2 セキュリティ要件 |
| ALB Origin | 2.1 入力パラメータ、2.3 データフロー |
| Cache Behavior | 2.3 データフロー、6.2 Distribution 設定詳細 |
| エラーページ | 4.3 エッジケース、6.2 Distribution 設定詳細 |
| プロパティ | 2.2 出力プロパティ |
| バリデーション | 3.4 Props バリデーション |

---

*このテストケース定義書は TDD Red Phase のテスト実装に使用されます*
