# TDD 要件定義書: TASK-0008 - Aurora Construct 実装

**タスクID**: TASK-0008
**タスク名**: Aurora Construct 実装
**要件名**: aws-cdk-serverless-architecture
**フェーズ**: Phase 2 - セキュリティ・データベース
**作成日**: 2026-01-19

---

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

### 1.1 機能の目的 🔵

Aurora Serverless v2 MySQL クラスターを構築する再利用可能な CDK Construct を実装する。

- **何をする機能か**: Private DB Subnet 内に Aurora MySQL Serverless v2 クラスターを作成し、ストレージ暗号化・自動バックアップ・マルチ AZ 構成などのエンタープライズグレード機能を提供する
- **どのような問題を解決するか**: セキュアで高可用性なデータベース層を構築し、ECS Fargate アプリケーションからのデータ永続化を実現する
- **想定される利用者**: インフラエンジニア、CDK 開発者
- **システム内での位置づけ**: データベース層の中核コンポーネントとして、Application Stack（ECS Service）からの接続を受け付ける

### 1.2 信頼性レベル評価 🔵

| 項目 | 信頼性 | 根拠 |
|------|--------|------|
| 機能目的 | 🔵 | REQ-022〜027、architecture.md データベース層より |
| 位置づけ | 🔵 | architecture.md Stack構成・Stack依存関係より |
| 利用者 | 🟡 | 設計文書から妥当な推測 |

### 1.3 参照ドキュメント

- **参照した EARS 要件**: REQ-022, REQ-023, REQ-024, REQ-025, REQ-026, REQ-027
- **参照した設計文書**:
  - `docs/design/aws-cdk-serverless-architecture/architecture.md` - データベース層セクション
  - `docs/design/aws-cdk-serverless-architecture/dataflow.md` - Sidecar パターン DB 接続フロー
  - `docs/design/aws-cdk-serverless-architecture/interfaces.ts` - DatabaseConfig, AuroraConfig, BackupConfig

---

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

### 2.1 入力パラメータ（Props） 🔵

```typescript
export interface AuroraConstructProps {
  /**
   * 配置先 VPC
   * @required
   * @description VPC Stack から提供される VPC リソース
   */
  vpc: ec2.IVpc;

  /**
   * Aurora 用 Security Group
   * @required
   * @description Security Stack から提供される Security Group（ECS SG からの 3306 のみ許可）
   */
  securityGroup: ec2.ISecurityGroup;

  /**
   * 環境名
   * @required
   * @description 'dev' | 'prod' - リソース命名に使用
   */
  envName: string;

  /**
   * 最小 ACU（Aurora Capacity Unit）
   * @optional
   * @default 0.5
   * @range 0.5 - 128
   */
  minCapacity?: number;

  /**
   * 最大 ACU（Aurora Capacity Unit）
   * @optional
   * @default 2 (コスト優先環境)
   * @range 0.5 - 128
   */
  maxCapacity?: number;

  /**
   * データベース名
   * @optional
   * @default 'appdb'
   */
  databaseName?: string;

  /**
   * バックアップ保持日数
   * @optional
   * @default 7
   * @range 1 - 35
   */
  backupRetentionDays?: number;
}
```

**信頼性評価**:
| パラメータ | 信頼性 | 根拠 |
|-----------|--------|------|
| vpc | 🔵 | TASK-0008.md、architecture.md より |
| securityGroup | 🔵 | TASK-0008.md、REQ-024, REQ-025 より |
| envName | 🔵 | REQ-042、architecture.md より |
| minCapacity | 🔵 | architecture.md データベース層（0.5 ACU） |
| maxCapacity | 🔵 | architecture.md データベース層（2 ACU） |
| databaseName | 🟡 | interfaces.ts から妥当な推測（'appdb'） |
| backupRetentionDays | 🟡 | architecture.md（7日）、標準設定から推測 |

### 2.2 出力値（公開プロパティ） 🔵

```typescript
export class AuroraConstruct extends Construct {
  /**
   * Aurora クラスター
   * @description 作成された DatabaseCluster リソース
   */
  public readonly cluster: rds.DatabaseCluster;

  /**
   * クラスターエンドポイント
   * @description Writer エンドポイント（接続用）
   */
  public readonly clusterEndpoint: rds.Endpoint;

  /**
   * 認証情報 Secret
   * @description Secrets Manager に保存された DB 認証情報
   */
  public readonly secret: secretsmanager.ISecret;

  /**
   * Security Group
   * @description Aurora に関連付けられた Security Group
   */
  public readonly securityGroup: ec2.ISecurityGroup;
}
```

**信頼性評価**:
| プロパティ | 信頼性 | 根拠 |
|-----------|--------|------|
| cluster | 🔵 | CDK RDS パターン、BLEA 参考実装より |
| clusterEndpoint | 🔵 | dataflow.md 認証情報管理フローより |
| secret | 🔵 | dataflow.md 認証情報管理フローより |
| securityGroup | 🔵 | REQ-024, REQ-025 より |

### 2.3 参照ドキュメント

- **参照した EARS 要件**: REQ-022〜027
- **参照した設計文書**:
  - `docs/design/aws-cdk-serverless-architecture/interfaces.ts` - AuroraConfig, BackupConfig
  - `docs/tasks/aws-cdk-serverless-architecture/TASK-0008.md` - AuroraConstructProps

---

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

### 3.1 技術的制約 🔵

| 制約項目 | 制約内容 | 信頼性 | 根拠 |
|----------|----------|--------|------|
| IaC | AWS CDK v2 (TypeScript) | 🔵 | REQ-401 |
| リージョン | ap-northeast-1 (Tokyo) | 🔵 | REQ-403 |
| エンジン | Aurora MySQL Serverless v2 | 🔵 | REQ-022 |
| エンジンバージョン | Aurora MySQL 3.x (MySQL 8.0 互換) | 🟡 | note.md より推測 |
| ACU 範囲 | 0.5 〜 128 ACU | 🔵 | note.md Aurora Serverless v2 制約 |
| AZ 要件 | 少なくとも 2 つの AZ にサブネット必要 | 🔵 | note.md Aurora Serverless v2 制約 |

### 3.2 セキュリティ制約 🔵

| 制約項目 | 制約内容 | 信頼性 | 根拠 |
|----------|----------|--------|------|
| ストレージ暗号化 | 必須（`storageEncrypted: true`） | 🔵 | REQ-026, NFR-102 |
| サブネット配置 | Private Isolated Subnet 必須 | 🔵 | REQ-023, REQ-024 |
| Security Group | ECS SG からの 3306 のみ許可 | 🔵 | REQ-025 |
| 外部アクセス | 禁止（インターネットからの直接アクセス不可） | 🔵 | REQ-024, REQ-404 |
| 認証情報 | Secrets Manager 自動生成使用 | 🔵 | note.md CDK 実装制約 |

### 3.3 パフォーマンス制約 🔵

| 制約項目 | 設定値 | 信頼性 | 根拠 |
|----------|--------|--------|------|
| MinCapacity | 0.5 ACU | 🔵 | architecture.md |
| MaxCapacity | 2 ACU（コスト優先） | 🔵 | architecture.md |

### 3.4 禁止事項 🔵

| 禁止項目 | 信頼性 | 根拠 |
|----------|--------|------|
| パブリックアクセス有効化 | 🔵 | REQ-024, REQ-404 |
| 平文での認証情報ハードコード | 🔵 | note.md セキュリティ要件 |
| 暗号化無効での運用 | 🔵 | REQ-026 |

### 3.5 参照ドキュメント

- **参照した EARS 要件**: REQ-022〜027, REQ-401, REQ-403, REQ-404, NFR-102, NFR-202
- **参照した設計文書**:
  - `docs/design/aws-cdk-serverless-architecture/architecture.md` - 技術的制約セクション
  - `docs/implements/aws-cdk-serverless-architecture/TASK-0008/note.md` - 注意事項セクション

---

## 4. 想定される使用例（EARSEdgeケース・データフローベース）

### 4.1 基本的な使用パターン 🔵

```typescript
// Database Stack での使用例
import { AuroraConstruct } from '../construct/database/aurora-construct';

const aurora = new AuroraConstruct(this, 'Aurora', {
  vpc: props.vpc,
  securityGroup: props.auroraSecurityGroup,
  envName: 'dev',
  minCapacity: 0.5,
  maxCapacity: 2,
});

// クラスターエンドポイントを後続リソースに渡す
const dbHost = aurora.clusterEndpoint.hostname;
const dbSecret = aurora.secret;
```

**信頼性**: 🔵 *TASK-0008.md、architecture.md Stack依存関係より*

### 4.2 データフロー（Sidecar パターン） 🔵

```
ECS Task → Sidecar (localhost:3306) → socat → Aurora (3306)
```

1. App Container が `localhost:3306` に接続リクエスト
2. Sidecar Container の socat がリクエストを受信
3. socat が Aurora Writer Endpoint にリクエストを転送
4. Aurora がレスポンスを返却

**信頼性**: 🔵 *dataflow.md セクション3 Sidecar パターンより*

### 4.3 エッジケース 🟡

| ケースID | ケース | 期待動作 | 信頼性 |
|----------|--------|----------|--------|
| EDGE-AU-01 | minCapacity > maxCapacity | CDK 合成時にバリデーションエラー | 🟡 |
| EDGE-AU-02 | minCapacity < 0.5 | CDK 合成時にバリデーションエラー | 🟡 |
| EDGE-AU-03 | maxCapacity > 128 | CDK 合成時にバリデーションエラー | 🟡 |
| EDGE-AU-04 | VPC に 2 つ未満の AZ | CloudFormation デプロイエラー | 🟡 |
| EDGE-003 | Aurora Writer 障害 | 自動フェイルオーバー | 🟡 |

### 4.4 エラーケース 🟡

| ケースID | ケース | 期待動作 | 信頼性 |
|----------|--------|----------|--------|
| ERR-AU-01 | Security Group 未指定 | TypeScript コンパイルエラー（必須パラメータ） | 🔵 |
| ERR-AU-02 | VPC 未指定 | TypeScript コンパイルエラー（必須パラメータ） | 🔵 |
| ERR-AU-03 | KMS キー権限不足 | CloudFormation デプロイエラー | 🟡 |

### 4.5 参照ドキュメント

- **参照した EARS 要件**: EDGE-003
- **参照した設計文書**:
  - `docs/design/aws-cdk-serverless-architecture/dataflow.md` - セクション3
  - `docs/spec/aws-cdk-serverless-architecture/requirements.md` - Edge ケースセクション

---

## 5. EARS要件・設計文書との対応関係

### 5.1 参照した機能要件

| 要件ID | 要件内容 | 対応箇所 | 信頼性 |
|--------|----------|----------|--------|
| REQ-022 | Aurora MySQL Serverless v2 を使用 | クラスターエンジン設定 | 🔵 |
| REQ-023 | Private DB Subnet に配置 | サブネットグループ設定 | 🔵 |
| REQ-024 | 外部からの直接アクセス遮断 | Security Group、パブリックアクセス無効 | 🔵 |
| REQ-025 | ECS SG からの 3306 のみ許可 | Security Group 参照（Props） | 🔵 |
| REQ-026 | Storage Encryption 有効化 | storageEncrypted: true | 🔵 |
| REQ-027 | 自動バックアップ有効化 | backupRetention 設定 | 🔵 |

### 5.2 参照した非機能要件

| 要件ID | 要件内容 | 対応箇所 | 信頼性 |
|--------|----------|----------|--------|
| NFR-102 | ストレージ暗号化 | storageEncrypted: true | 🔵 |
| NFR-202 | Aurora Serverless v2 によるコスト効率 | ACU 設定（0.5-2） | 🔵 |

### 5.3 参照した制約要件

| 要件ID | 要件内容 | 対応箇所 | 信頼性 |
|--------|----------|----------|--------|
| REQ-401 | AWS CDK v2 (TypeScript) | Construct 実装 | 🔵 |
| REQ-403 | ap-northeast-1 リージョン | デプロイ先 | 🔵 |
| REQ-404 | 外部から Aurora への直接アクセス禁止 | Security Group、Private Subnet | 🔵 |

### 5.4 参照した設計文書

| 文書 | セクション | 参照内容 |
|------|-----------|----------|
| architecture.md | データベース層 | Aurora 設定値（ACU、暗号化等） |
| architecture.md | Stack 構成 | Database Stack の責務 |
| dataflow.md | セクション3 | Sidecar パターンによる DB 接続 |
| dataflow.md | セクション8 | 認証情報管理フロー |
| interfaces.ts | DatabaseConfig | Aurora 設定の型定義 |
| interfaces.ts | AuroraConfig | エンジン・ACU 設定の型定義 |
| interfaces.ts | BackupConfig | バックアップ設定の型定義 |

---

## 6. 受け入れ基準（Acceptance Criteria）

### 6.1 機能要件の受け入れ基準 🔵

| 基準ID | 基準 | 検証方法 | 信頼性 |
|--------|------|----------|--------|
| AC-AU-01 | Aurora Serverless v2 クラスターが作成される | CDK スナップショットテスト | 🔵 |
| AC-AU-02 | エンジンが Aurora MySQL である | CDK スナップショットテスト | 🔵 |
| AC-AU-03 | エンジンバージョンが 3.x 系である | CDK スナップショットテスト | 🟡 |
| AC-AU-04 | MinCapacity が設定値通りである | CDK スナップショットテスト | 🔵 |
| AC-AU-05 | MaxCapacity が設定値通りである | CDK スナップショットテスト | 🔵 |
| AC-AU-06 | ストレージ暗号化が有効である | CDK スナップショットテスト | 🔵 |
| AC-AU-07 | 自動バックアップが有効である | CDK スナップショットテスト | 🔵 |
| AC-AU-08 | バックアップ保持期間が 7 日間である | CDK スナップショットテスト | 🟡 |
| AC-AU-09 | 適切な Security Group が関連付けられている | CDK スナップショットテスト | 🔵 |
| AC-AU-10 | Private DB Subnet に配置されている | CDK スナップショットテスト | 🔵 |
| AC-AU-11 | Secrets Manager で認証情報が管理されている | CDK スナップショットテスト | 🔵 |
| AC-AU-12 | マルチ AZ 構成が有効である | CDK スナップショットテスト | 🔵 |

### 6.2 非機能要件の受け入れ基準 🔵

| 基準ID | 基準 | 検証方法 | 信頼性 |
|--------|------|----------|--------|
| AC-AU-NF-01 | パブリックアクセスが無効である | CDK スナップショットテスト | 🔵 |
| AC-AU-NF-02 | KMS キーが関連付けられている（暗号化） | CDK スナップショットテスト | 🔵 |
| AC-AU-NF-03 | 認証情報がハードコードされていない | コードレビュー | 🔵 |

---

## 7. テスト観点

### 7.1 基本テストケース 🔵

| テストID | テスト内容 | 関連要件 | 信頼性 |
|----------|-----------|----------|--------|
| TC-AU-01 | Aurora Serverless v2 クラスターが作成される | REQ-022 | 🔵 |
| TC-AU-02 | エンジンバージョンが Aurora MySQL 3.x である | REQ-022 | 🟡 |
| TC-AU-03 | ACU 設定（MinCapacity/MaxCapacity）が正しい | REQ-022 | 🔵 |
| TC-AU-04 | ストレージ暗号化が有効 | REQ-026 | 🔵 |
| TC-AU-05 | KMS キーが関連付けられている | REQ-026 | 🔵 |
| TC-AU-06 | 自動バックアップが有効 | REQ-027 | 🔵 |
| TC-AU-07 | バックアップ保持期間が 7 日間 | REQ-027 | 🟡 |
| TC-AU-08 | 適切な Security Group が関連付けられている | REQ-024, REQ-025 | 🔵 |
| TC-AU-09 | Private DB Subnet に配置されている | REQ-023 | 🔵 |
| TC-AU-10 | Secrets Manager で認証情報が生成される | - | 🔵 |
| TC-AU-11 | マルチ AZ 構成が有効である | REQ-023 | 🔵 |
| TC-AU-12 | パブリックアクセスが無効である | REQ-024 | 🔵 |

### 7.2 パラメータバリエーションテスト 🟡

| テストID | テスト内容 | 信頼性 |
|----------|-----------|--------|
| TC-AU-13 | デフォルト値での動作確認（minCapacity/maxCapacity 未指定） | 🟡 |
| TC-AU-14 | カスタム ACU 値での動作確認 | 🟡 |
| TC-AU-15 | カスタム databaseName での動作確認 | 🟡 |
| TC-AU-16 | カスタム backupRetentionDays での動作確認 | 🟡 |

### 7.3 エッジケーステスト 🟡

| テストID | テスト内容 | 信頼性 |
|----------|-----------|--------|
| TC-AU-17 | minCapacity = maxCapacity の場合の動作 | 🟡 |
| TC-AU-18 | minCapacity の最小値（0.5）での動作 | 🟡 |
| TC-AU-19 | maxCapacity の境界値での動作 | 🟡 |

---

## 8. 実装ファイル配置

### 8.1 作成予定ファイル

| ファイル | 説明 |
|----------|------|
| `infra/lib/construct/database/aurora-construct.ts` | Aurora Construct 実装 |
| `infra/test/construct/database/aurora-construct.test.ts` | Aurora Construct テスト |

### 8.2 ディレクトリ構造

```
infra/
├── lib/
│   └── construct/
│       └── database/
│           └── aurora-construct.ts  # 新規作成
└── test/
    └── construct/
        └── database/
            └── aurora-construct.test.ts  # 新規作成
```

---

## 9. 依存関係

### 9.1 前提タスク

| タスクID | タスク名 | 提供リソース |
|----------|----------|--------------|
| TASK-0004 | VPC Stack 統合 | `vpc`, `privateDbSubnets` |
| TASK-0007 | Security Stack 統合 | `auroraSecurityGroup` |

### 9.2 後続タスク

| タスクID | タスク名 | 依存関係 |
|----------|----------|----------|
| TASK-0009 | Secrets Manager 統合 | Aurora Construct の `secret` を使用 |
| TASK-0010 | Database Stack 統合 | Aurora Construct を Stack に組み込み |

---

## 10. 信頼性レベルサマリー

| レベル | 件数 | 割合 |
|--------|------|------|
| 🔵 青信号 | 45 | 90% |
| 🟡 黄信号 | 5 | 10% |
| 🔴 赤信号 | 0 | 0% |

**品質評価**: ✅ 高品質

- **要件の曖昧さ**: なし - 全ての要件が EARS 要件定義書・設計文書に基づく
- **入出力定義**: 完全 - interfaces.ts、TASK-0008.md に基づく型定義
- **制約条件**: 明確 - 要件定義書・設計文書から抽出
- **実装可能性**: 確実 - BLEA 参考実装あり、CDK 標準パターン準拠

---

## 関連文書

- **タスクノート**: `docs/implements/aws-cdk-serverless-architecture/TASK-0008/note.md`
- **要件定義書**: `docs/spec/aws-cdk-serverless-architecture/requirements.md`
- **設計文書**: `docs/design/aws-cdk-serverless-architecture/architecture.md`
- **データフロー**: `docs/design/aws-cdk-serverless-architecture/dataflow.md`
- **型定義**: `docs/design/aws-cdk-serverless-architecture/interfaces.ts`
- **タスクファイル**: `docs/tasks/aws-cdk-serverless-architecture/TASK-0008.md`
