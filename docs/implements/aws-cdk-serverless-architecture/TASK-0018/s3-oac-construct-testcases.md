# S3 + OAC Construct テストケース定義書

**タスクID**: TASK-0018
**タスク名**: S3 + OAC Construct 実装
**機能名**: aws-cdk-serverless-architecture
**作成日**: 2026-02-01

---

## 1. テストケース概要

### 対象機能

S3BucketConstruct は以下の機能を提供する:
- 静的コンテンツおよび Sorry Page 提供用の S3 バケット作成
- パブリックアクセス完全ブロック設定
- サーバーサイド暗号化 (S3_MANAGED)
- バージョニング有効化
- CloudFront OAC (Origin Access Control) 設定
- CloudFront 署名付きリクエストのみ許可するバケットポリシー

### テストケース分類

| 分類 | テストケース数 | 説明 |
|------|---------------|------|
| S3 バケット作成テスト | 7 | S3 バケットリソースの作成と設定検証 |
| OAC 設定テスト | 5 | Origin Access Control の設定検証 |
| バケットポリシーテスト | 5 | CloudFront アクセス制御のポリシー検証 |
| Props バリデーションテスト | 6 | 入力パラメータの検証 |
| 公開プロパティテスト | 5 | Construct の公開プロパティ検証 |
| スナップショットテスト | 1 | CloudFormation テンプレート検証 |
| **合計** | **29** | |

### 開発言語・フレームワーク

- **プログラミング言語**: TypeScript
  - **言語選択の理由**: プロジェクト全体で AWS CDK v2 (TypeScript) を使用 (REQ-401)
  - **テストに適した機能**: 型安全性、CDK assertions ライブラリとの親和性
- **テストフレームワーク**: Jest
  - **フレームワーク選択の理由**: 既存の CDK プロジェクトで標準使用、aws-cdk-lib/assertions との連携
  - **テスト実行環境**: Node.js ランタイム、npm test で実行
- 🔵 **信頼性**: note.md および既存テストファイルより

---

## 2. テストケース一覧

### 2.1 S3 バケット作成テスト（正常系）

#### TC-S3-001: S3 バケットリソース作成確認

- **テストケースID**: TC-S3-001
- **テスト名**: S3 バケットリソースが作成されること
- **テスト目的**: S3BucketConstruct がデフォルト設定で正常に S3 バケットを作成することを確認
- **前提条件**:
  - CDK App と Stack がセットアップ済み
  - 必須パラメータ (envName) が提供される
- **テスト手順**:
  1. S3BucketConstruct を必須パラメータで作成
  2. Template.fromStack() で CloudFormation テンプレートを取得
  3. AWS::S3::Bucket リソースの存在を確認
- **期待結果**: AWS::S3::Bucket リソースが 1 つ作成される
- **信頼性レベル**: 🔵 **青信号** - REQ-031 より
- **対応要件**: REQ-031

#### TC-S3-002: パブリックアクセスブロック設定確認 (BlockPublicAcls)

- **テストケースID**: TC-S3-002
- **テスト名**: BlockPublicAcls が有効であること
- **テスト目的**: S3 バケットの BlockPublicAcls 設定が true であることを確認
- **前提条件**:
  - S3BucketConstruct が作成済み
- **テスト手順**:
  1. S3BucketConstruct を作成
  2. Template から PublicAccessBlockConfiguration を検証
  3. BlockPublicAcls: true を確認
- **期待結果**: BlockPublicAcls: true が設定される
- **信頼性レベル**: 🔵 **青信号** - REQ-031, NFR-104 より
- **対応要件**: REQ-031, NFR-104

#### TC-S3-003: パブリックアクセスブロック設定確認 (全設定)

- **テストケースID**: TC-S3-003
- **テスト名**: パブリックアクセスブロック全設定が有効であること
- **テスト目的**: BlockPublicAccess.BLOCK_ALL 相当の全設定が有効であることを確認
- **前提条件**:
  - S3BucketConstruct が作成済み
- **テスト手順**:
  1. S3BucketConstruct を作成
  2. Template から PublicAccessBlockConfiguration を検証
  3. 全 4 項目 (BlockPublicAcls, BlockPublicPolicy, IgnorePublicAcls, RestrictPublicBuckets) が true を確認
- **期待結果**: 全パブリックアクセスブロック設定が true
- **信頼性レベル**: 🔵 **青信号** - REQ-031, NFR-104 より
- **対応要件**: REQ-031, NFR-104

#### TC-S3-004: サーバーサイド暗号化設定確認

- **テストケースID**: TC-S3-004
- **テスト名**: サーバーサイド暗号化が有効であること
- **テスト目的**: S3 バケットに SSE-S3 (AES-256) 暗号化が設定されていることを確認
- **前提条件**:
  - S3BucketConstruct が作成済み
- **テスト手順**:
  1. S3BucketConstruct を作成
  2. Template から BucketEncryption を検証
  3. ServerSideEncryptionConfiguration に AES256 が設定されていることを確認
- **期待結果**: SSEAlgorithm: AES256 が設定される
- **信頼性レベル**: 🔵 **青信号** - REQ-031 より
- **対応要件**: REQ-031

#### TC-S3-005: バージョニング有効化確認

- **テストケースID**: TC-S3-005
- **テスト名**: バージョニングが有効であること
- **テスト目的**: S3 バケットのバージョニングが有効であることを確認
- **前提条件**:
  - S3BucketConstruct が作成済み
- **テスト手順**:
  1. S3BucketConstruct を作成
  2. Template から VersioningConfiguration を検証
  3. Status: Enabled を確認
- **期待結果**: VersioningConfiguration.Status: Enabled が設定される
- **信頼性レベル**: 🔵 **青信号** - REQ-031 より
- **対応要件**: REQ-031

#### TC-S3-006: バケット名命名規則確認

- **テストケースID**: TC-S3-006
- **テスト名**: バケット名が命名規則に従っていること
- **テスト目的**: S3 バケット名に環境名が含まれていることを確認
- **前提条件**:
  - S3BucketConstruct が envName='test' で作成済み
- **テスト手順**:
  1. S3BucketConstruct を envName='test' で作成
  2. バケット名に 'test' が含まれることを確認
- **期待結果**: バケット名に環境名が含まれる
- **信頼性レベル**: 🟡 **黄信号** - note.md 命名規約から妥当な推測
- **対応要件**: -

#### TC-S3-007: 削除ポリシー設定確認

- **テストケースID**: TC-S3-007
- **テスト名**: 適切な削除ポリシーが設定されること
- **テスト目的**: S3 バケットの削除ポリシーが指定通り設定されることを確認
- **前提条件**:
  - S3BucketConstruct が removalPolicy 指定で作成済み
- **テスト手順**:
  1. S3BucketConstruct を removalPolicy=DESTROY で作成
  2. Template から DeletionPolicy を検証
- **期待結果**: DeletionPolicy が指定通り設定される
- **信頼性レベル**: 🟡 **黄信号** - note.md から妥当な推測
- **対応要件**: -

---

### 2.2 OAC 設定テスト（正常系）

#### TC-OAC-001: OAC リソース作成確認

- **テストケースID**: TC-OAC-001
- **テスト名**: OAC リソースが作成されること
- **テスト目的**: CloudFront Origin Access Control リソースが正常に作成されることを確認
- **前提条件**:
  - S3BucketConstruct が作成済み
- **テスト手順**:
  1. S3BucketConstruct を作成
  2. Template.fromStack() で CloudFormation テンプレートを取得
  3. AWS::CloudFront::OriginAccessControl リソースの存在を確認
- **期待結果**: AWS::CloudFront::OriginAccessControl リソースが 1 つ作成される
- **信頼性レベル**: 🔵 **青信号** - REQ-032 より
- **対応要件**: REQ-032

#### TC-OAC-002: OAC signingBehavior 設定確認

- **テストケースID**: TC-OAC-002
- **テスト名**: signingBehavior が 'always' であること
- **テスト目的**: OAC の signingBehavior が 'always' に設定されていることを確認
- **前提条件**:
  - S3BucketConstruct が作成済み
- **テスト手順**:
  1. S3BucketConstruct を作成
  2. Template から OriginAccessControlConfig を検証
  3. SigningBehavior: 'always' を確認
- **期待結果**: SigningBehavior: 'always' が設定される
- **信頼性レベル**: 🔵 **青信号** - REQ-032 より
- **対応要件**: REQ-032

#### TC-OAC-003: OAC signingProtocol 設定確認

- **テストケースID**: TC-OAC-003
- **テスト名**: signingProtocol が 'sigv4' であること
- **テスト目的**: OAC の signingProtocol が 'sigv4' に設定されていることを確認
- **前提条件**:
  - S3BucketConstruct が作成済み
- **テスト手順**:
  1. S3BucketConstruct を作成
  2. Template から OriginAccessControlConfig を検証
  3. SigningProtocol: 'sigv4' を確認
- **期待結果**: SigningProtocol: 'sigv4' が設定される
- **信頼性レベル**: 🔵 **青信号** - REQ-032 より
- **対応要件**: REQ-032

#### TC-OAC-004: OAC originType 設定確認

- **テストケースID**: TC-OAC-004
- **テスト名**: originAccessControlOriginType が 's3' であること
- **テスト目的**: OAC の Origin Type が 's3' に設定されていることを確認
- **前提条件**:
  - S3BucketConstruct が作成済み
- **テスト手順**:
  1. S3BucketConstruct を作成
  2. Template から OriginAccessControlConfig を検証
  3. OriginAccessControlOriginType: 's3' を確認
- **期待結果**: OriginAccessControlOriginType: 's3' が設定される
- **信頼性レベル**: 🔵 **青信号** - OAC for S3 の標準設定
- **対応要件**: REQ-032

#### TC-OAC-005: OAC 名命名規則確認

- **テストケースID**: TC-OAC-005
- **テスト名**: OAC 名が命名規則に従っていること
- **テスト目的**: OAC の名前に環境名が含まれていることを確認
- **前提条件**:
  - S3BucketConstruct が envName='test' で作成済み
- **テスト手順**:
  1. S3BucketConstruct を envName='test' で作成
  2. Template から OriginAccessControlConfig.Name を検証
  3. 'test' が含まれることを確認
- **期待結果**: OAC 名に環境名が含まれる
- **信頼性レベル**: 🟡 **黄信号** - note.md 命名規約から妥当な推測
- **対応要件**: -

---

### 2.3 バケットポリシーテスト（正常系）

#### TC-BP-001: バケットポリシー作成確認

- **テストケースID**: TC-BP-001
- **テスト名**: バケットポリシーが設定されること
- **テスト目的**: S3 バケットにバケットポリシーが設定されることを確認
- **前提条件**:
  - S3BucketConstruct が cloudFrontDistributionArn 付きで作成済み
- **テスト手順**:
  1. S3BucketConstruct を cloudFrontDistributionArn 指定で作成
  2. Template から AWS::S3::BucketPolicy リソースを検証
- **期待結果**: AWS::S3::BucketPolicy リソースが作成される
- **信頼性レベル**: 🔵 **青信号** - REQ-032 より
- **対応要件**: REQ-032

#### TC-BP-002: Principal 設定確認

- **テストケースID**: TC-BP-002
- **テスト名**: Principal が cloudfront.amazonaws.com であること
- **テスト目的**: バケットポリシーの Principal が CloudFront サービスプリンシパルであることを確認
- **前提条件**:
  - S3BucketConstruct が cloudFrontDistributionArn 付きで作成済み
- **テスト手順**:
  1. S3BucketConstruct を作成
  2. Template から BucketPolicy の Statement を検証
  3. Principal.Service: 'cloudfront.amazonaws.com' を確認
- **期待結果**: Principal が cloudfront.amazonaws.com
- **信頼性レベル**: 🔵 **青信号** - REQ-032、OAC 標準設定より
- **対応要件**: REQ-032

#### TC-BP-003: Action 設定確認

- **テストケースID**: TC-BP-003
- **テスト名**: Action が s3:GetObject であること
- **テスト目的**: バケットポリシーの Action が s3:GetObject であることを確認
- **前提条件**:
  - S3BucketConstruct が cloudFrontDistributionArn 付きで作成済み
- **テスト手順**:
  1. S3BucketConstruct を作成
  2. Template から BucketPolicy の Statement を検証
  3. Action: 's3:GetObject' を確認
- **期待結果**: Action が s3:GetObject
- **信頼性レベル**: 🔵 **青信号** - REQ-032、OAC 標準設定より
- **対応要件**: REQ-032

#### TC-BP-004: Condition aws:SourceArn 設定確認

- **テストケースID**: TC-BP-004
- **テスト名**: Condition で aws:SourceArn が設定されること
- **テスト目的**: バケットポリシーに CloudFront Distribution ARN の条件が設定されていることを確認
- **前提条件**:
  - S3BucketConstruct が cloudFrontDistributionArn 付きで作成済み
- **テスト手順**:
  1. S3BucketConstruct を cloudFrontDistributionArn='arn:aws:cloudfront::123456789012:distribution/EXAMPLEID' で作成
  2. Template から BucketPolicy の Condition を検証
  3. StringEquals.'aws:SourceArn' が指定した ARN であることを確認
- **期待結果**: Condition に aws:SourceArn が設定される
- **信頼性レベル**: 🔵 **青信号** - REQ-032、OAC 標準設定より
- **対応要件**: REQ-032

#### TC-BP-005: addCloudFrontBucketPolicy メソッド確認

- **テストケースID**: TC-BP-005
- **テスト名**: addCloudFrontBucketPolicy メソッドでポリシーが追加されること
- **テスト目的**: cloudFrontDistributionArn なしで作成後、後からポリシーを追加できることを確認
- **前提条件**:
  - S3BucketConstruct が cloudFrontDistributionArn なしで作成済み
- **テスト手順**:
  1. S3BucketConstruct を cloudFrontDistributionArn なしで作成
  2. addCloudFrontBucketPolicy() メソッドを呼び出し
  3. バケットポリシーが追加されることを確認
- **期待結果**: ポリシーが正常に追加される
- **信頼性レベル**: 🔵 **青信号** - note.md 設計文書より
- **対応要件**: REQ-032

---

### 2.4 Props バリデーションテスト（異常系）

#### TC-VAL-001: envName 空文字エラー確認

- **テストケースID**: TC-VAL-001
- **テスト名**: envName が空の場合エラーとなること
- **テスト目的**: envName に空文字を指定した場合にバリデーションエラーが発生することを確認
- **前提条件**:
  - CDK App と Stack がセットアップ済み
- **テスト手順**:
  1. S3BucketConstruct を envName='' で作成
  2. エラーがスローされることを確認
- **期待結果**: バリデーションエラーがスローされる
- **信頼性レベル**: 🟡 **黄信号** - 既存 Construct パターンから妥当な推測
- **対応要件**: -

#### TC-VAL-002: envName 長さ超過エラー確認

- **テストケースID**: TC-VAL-002
- **テスト名**: envName が長すぎる場合エラーとなること
- **テスト目的**: envName が制限長を超えた場合にバリデーションエラーが発生することを確認
- **前提条件**:
  - CDK App と Stack がセットアップ済み
- **テスト手順**:
  1. S3BucketConstruct を envName='a'.repeat(64) で作成
  2. エラーがスローされることを確認
- **期待結果**: バリデーションエラーがスローされる
- **信頼性レベル**: 🟡 **黄信号** - S3 バケット名の制限から妥当な推測
- **対応要件**: -

#### TC-VAL-003: envName 不正文字エラー確認

- **テストケースID**: TC-VAL-003
- **テスト名**: envName が不正な形式の場合エラーとなること
- **テスト目的**: envName に不正な文字が含まれる場合にバリデーションエラーが発生することを確認
- **前提条件**:
  - CDK App と Stack がセットアップ済み
- **テスト手順**:
  1. S3BucketConstruct を envName='test_env!' で作成
  2. エラーがスローされることを確認
- **期待結果**: バリデーションエラーがスローされる
- **信頼性レベル**: 🟡 **黄信号** - S3 バケット名の制限から妥当な推測
- **対応要件**: -

#### TC-VAL-004: デフォルト値適用確認

- **テストケースID**: TC-VAL-004
- **テスト名**: デフォルト値が正しく適用されること
- **テスト目的**: オプションパラメータを省略した場合にデフォルト値が適用されることを確認
- **前提条件**:
  - CDK App と Stack がセットアップ済み
- **テスト手順**:
  1. S3BucketConstruct を必須パラメータのみで作成
  2. versioned がデフォルトで true であることを確認
  3. bucketNameSuffix がデフォルトで 'static-content' であることを確認
- **期待結果**: デフォルト値が正しく適用される
- **信頼性レベル**: 🟡 **黄信号** - note.md Props インターフェースから妥当な推測
- **対応要件**: -

#### TC-VAL-005: versioned=false 設定確認

- **テストケースID**: TC-VAL-005
- **テスト名**: versioned=false が正しく反映されること
- **テスト目的**: versioned を false に設定した場合にバージョニングが無効になることを確認
- **前提条件**:
  - CDK App と Stack がセットアップ済み
- **テスト手順**:
  1. S3BucketConstruct を versioned=false で作成
  2. VersioningConfiguration が未設定または Suspended であることを確認
- **期待結果**: バージョニングが無効
- **信頼性レベル**: 🟡 **黄信号** - note.md Props インターフェースから妥当な推測
- **対応要件**: -

#### TC-VAL-006: bucketNameSuffix カスタム値確認

- **テストケースID**: TC-VAL-006
- **テスト名**: bucketNameSuffix が正しく反映されること
- **テスト目的**: bucketNameSuffix をカスタム値で設定した場合にバケット名に反映されることを確認
- **前提条件**:
  - CDK App と Stack がセットアップ済み
- **テスト手順**:
  1. S3BucketConstruct を bucketNameSuffix='custom-assets' で作成
  2. バケット名に 'custom-assets' が含まれることを確認
- **期待結果**: カスタムサフィックスがバケット名に反映される
- **信頼性レベル**: 🟡 **黄信号** - note.md Props インターフェースから妥当な推測
- **対応要件**: -

---

### 2.5 公開プロパティテスト

#### TC-PROP-001: bucket プロパティ確認

- **テストケースID**: TC-PROP-001
- **テスト名**: bucket プロパティが定義されていること
- **テスト目的**: Construct から bucket プロパティにアクセスできることを確認
- **前提条件**:
  - S3BucketConstruct が作成済み
- **テスト手順**:
  1. S3BucketConstruct を作成
  2. construct.bucket が undefined でないことを確認
- **期待結果**: bucket プロパティが定義されている
- **信頼性レベル**: 🔵 **青信号** - note.md 設計文書より
- **対応要件**: REQ-031

#### TC-PROP-002: bucketArn プロパティ確認

- **テストケースID**: TC-PROP-002
- **テスト名**: bucketArn プロパティが定義されていること
- **テスト目的**: Construct から bucketArn プロパティにアクセスできることを確認
- **前提条件**:
  - S3BucketConstruct が作成済み
- **テスト手順**:
  1. S3BucketConstruct を作成
  2. construct.bucketArn が undefined でないことを確認
- **期待結果**: bucketArn プロパティが定義されている
- **信頼性レベル**: 🔵 **青信号** - note.md 設計文書より
- **対応要件**: REQ-031

#### TC-PROP-003: bucketDomainName プロパティ確認

- **テストケースID**: TC-PROP-003
- **テスト名**: bucketDomainName プロパティが定義されていること
- **テスト目的**: Construct から bucketDomainName プロパティにアクセスできることを確認
- **前提条件**:
  - S3BucketConstruct が作成済み
- **テスト手順**:
  1. S3BucketConstruct を作成
  2. construct.bucketDomainName が undefined でないことを確認
- **期待結果**: bucketDomainName プロパティが定義されている
- **信頼性レベル**: 🔵 **青信号** - note.md 設計文書より
- **対応要件**: REQ-031

#### TC-PROP-004: originAccessControl プロパティ確認

- **テストケースID**: TC-PROP-004
- **テスト名**: originAccessControl プロパティが定義されていること
- **テスト目的**: Construct から originAccessControl プロパティにアクセスできることを確認
- **前提条件**:
  - S3BucketConstruct が作成済み
- **テスト手順**:
  1. S3BucketConstruct を作成
  2. construct.originAccessControl が undefined でないことを確認
- **期待結果**: originAccessControl プロパティが定義されている
- **信頼性レベル**: 🔵 **青信号** - note.md 設計文書より
- **対応要件**: REQ-032

#### TC-PROP-005: originAccessControlId プロパティ確認

- **テストケースID**: TC-PROP-005
- **テスト名**: originAccessControlId プロパティが定義されていること
- **テスト目的**: Construct から originAccessControlId プロパティにアクセスできることを確認
- **前提条件**:
  - S3BucketConstruct が作成済み
- **テスト手順**:
  1. S3BucketConstruct を作成
  2. construct.originAccessControlId が undefined でないことを確認
- **期待結果**: originAccessControlId プロパティが定義されている
- **信頼性レベル**: 🔵 **青信号** - note.md 設計文書より
- **対応要件**: REQ-032

---

### 2.6 スナップショットテスト

#### TC-SNAP-001: CloudFormation テンプレートスナップショット確認

- **テストケースID**: TC-SNAP-001
- **テスト名**: CloudFormation テンプレートがスナップショットと一致すること
- **テスト目的**: 生成される CloudFormation テンプレートが期待通りであることを確認
- **前提条件**:
  - S3BucketConstruct が作成済み
- **テスト手順**:
  1. S3BucketConstruct を全オプション指定で作成
  2. Template.fromStack() で CloudFormation テンプレートを取得
  3. toMatchSnapshot() でスナップショット比較
- **期待結果**: テンプレートがスナップショットと一致する
- **信頼性レベル**: 🔵 **青信号** - CDK ベストプラクティスより
- **対応要件**: -

---

## 3. テスト実装時の日本語コメント指針

### テストケース開始時のコメント

```typescript
// 【テスト目的】: S3BucketConstruct がデフォルト設定で正常に S3 バケットを作成することを確認
// 【テスト内容】: 必須パラメータのみで Construct をインスタンス化し、CloudFormation テンプレートを検証
// 【期待される動作】: AWS::S3::Bucket リソースが 1 つ作成される
// 🔵 信頼性: REQ-031 より
```

### Given（準備フェーズ）のコメント

```typescript
// 【テストデータ準備】: CDK App と Stack を作成
// 【初期条件設定】: テスト用の環境名とオプションパラメータを設定
// 【前提条件確認】: S3BucketConstruct のインスタンス化に必要なパラメータが揃っていること
```

### When（実行フェーズ）のコメント

```typescript
// 【実際の処理実行】: S3BucketConstruct を必須パラメータで作成
// 【処理内容】: envName を指定して Construct をインスタンス化
// 【実行タイミング】: テスト対象の Construct 作成
```

### Then（検証フェーズ）のコメント

```typescript
// 【結果検証】: S3 バケットリソースの存在確認
// 【期待値確認】: 1 つの S3 バケットが作成されること
// 【品質保証】: REQ-031 の要件を満たしていることを確認
```

### 各 expect ステートメントのコメント

```typescript
// 【検証項目】: S3 バケットリソース数
// 🔵 信頼性: REQ-031 より
template.resourceCountIs('AWS::S3::Bucket', 1); // 【確認内容】: S3 バケットが1つ存在する

// 【検証項目】: パブリックアクセスブロック設定
// 🔵 信頼性: REQ-031, NFR-104 より
expect(publicAccessBlockConfig.BlockPublicAcls).toBe(true); // 【確認内容】: BlockPublicAcls が有効
```

---

## 4. 要件定義との対応関係

### 参照した要件定義

| 要件ID | 要件内容 | 対応テストケース |
|--------|----------|-----------------|
| REQ-031 | 静的リソース及び Sorry Page 提供用の S3 バケット作成 | TC-S3-001〜007 |
| REQ-032 | OAC 構成、S3 バケットが CloudFront 経由のみアクセス可能 | TC-OAC-001〜005, TC-BP-001〜005 |
| NFR-104 | OAC を使用して S3 バケットへの直接アクセス防止 | TC-S3-002〜003, TC-BP-001〜005 |

### 参照した設計文書

| 文書 | 参照セクション | 対応テストケース |
|------|---------------|-----------------|
| note.md | Props インターフェース | TC-VAL-001〜006 |
| note.md | 公開プロパティ | TC-PROP-001〜005 |
| note.md | OAC 設計 | TC-OAC-001〜005 |
| note.md | バケットポリシー設計 | TC-BP-001〜005 |

---

## 5. 信頼性レベルサマリー

| レベル | 件数 | 割合 | 説明 |
|--------|------|------|------|
| 🔵 青信号 | 20 | 69% | REQ-031, REQ-032, NFR-104 および設計文書より |
| 🟡 黄信号 | 9 | 31% | 既存パターン・設計から妥当な推測 |
| 🔴 赤信号 | 0 | 0% | なし |

**品質評価**: 高品質 - テストケースの大部分が要件定義書により確認済み

---

## 6. テストファイル配置

- **テストファイルパス**: `infra/test/construct/storage/s3-bucket-construct.test.ts`
- **実装ファイルパス**: `infra/lib/construct/storage/s3-bucket-construct.ts`

---

## 7. 次のステップ

次のお勧めステップ: `/tsumiki:tdd-red aws-cdk-serverless-architecture TASK-0018` で Red フェーズ（失敗テスト作成）を開始します。
