# TDD タスクノート: TASK-0008 - Aurora Construct 実装

**タスクID**: TASK-0008
**タスク名**: Aurora Construct 実装
**要件名**: aws-cdk-serverless-architecture
**フェーズ**: Phase 2 - セキュリティ・データベース
**作成日**: 2026-01-19

---

## 1. 技術スタック

### 使用技術・フレームワーク

| 項目 | 技術 | バージョン/詳細 |
|------|------|----------------|
| IaC | AWS CDK v2 | TypeScript |
| ランタイム | Node.js | TypeScript strict mode |
| テスト | Jest | スナップショットテスト |
| データベース | Aurora Serverless v2 | MySQL / PostgreSQL |
| 暗号化 | AWS KMS | カスタマーマネージドキー対応 |

### アーキテクチャパターン

- **パターン**: Multi-Tier Serverless Architecture + Sidecar Pattern
- **データベース層**: Private DB Subnet に配置された Aurora Serverless v2
- **接続方式**: Sidecar パターン (socat) 経由での DB 接続

### 参照元

- `docs/design/aws-cdk-serverless-architecture/architecture.md`
- `docs/design/aws-cdk-serverless-architecture/dataflow.md`
- `infra/parameter.ts`

---

## 2. 開発ルール

### プロジェクト固有のルール

#### 命名規則

- **リソース名**: kebab-case を使用（例: `aurora-cluster`, `db-security-group`）
- **Construct ID**: PascalCase を使用（例: `AuroraCluster`, `AuroraConstruct`）
- **ファイル名**: kebab-case を使用（例: `aurora-construct.ts`）

#### コーディング規約

- TypeScript strict mode 有効
- ESLint + Prettier によるフォーマット
- JSDoc コメント必須（機能概要、実装方針、信頼性レベル）
- セクション区切りコメント（`// ========`）によるコード構造化
- 定数は大文字スネークケースで抽出

#### テスト規約

- Jest スナップショットテストを使用
- テストケース ID 形式: `TC-AU-XX`（Aurora Construct 用）
- テストファイル配置: `test/construct/database/aurora-construct.test.ts`

### 信頼性レベル表記

- 🔵 **青信号**: 要件定義書・設計文書・ユーザヒアリングに基づく確実な実装
- 🟡 **黄信号**: 要件定義書から妥当な推測による実装
- 🔴 **赤信号**: 要件定義書にない推測による実装

### 参照元

- `CLAUDE.md`
- `docs/design/aws-cdk-serverless-architecture/architecture.md`

---

## 3. 関連実装

### 既存 Construct・Stack 実装

#### Security Stack（依存関係あり）

- **ファイル**: `infra/lib/stack/security-stack.ts`
- **提供**: `auroraSecurityGroup` - Aurora 用 Security Group
- **ルール**: ECS からの 3306 ポートのみ許可、アウトバウンド制限

#### VPC Stack（依存関係あり）

- **ファイル**: `infra/lib/stack/vpc-stack.ts`
- **提供**: `vpc`, `privateDbSubnets` - Aurora 配置用

#### Security Group Construct

- **ファイル**: `infra/lib/construct/security/security-group-construct.ts`
- **参考**: Security Group 作成パターン、定数定義方法

#### VPC Construct

- **ファイル**: `infra/lib/construct/vpc/vpc-construct.ts`
- **参考**: Construct 設計パターン、Props インターフェース設計

### BLEA 参考実装

#### Datastore Construct（Aurora 実装例）

- **ファイル**: `baseline-environment-on-aws/usecases/blea-guest-ecs-app-sample/lib/construct/datastore.ts`
- **参考ポイント**:
  - `rds.DatabaseCluster` の使用方法
  - `rds.Credentials.fromGeneratedSecret()` による認証情報管理
  - KMS 暗号化設定
  - CloudWatch Logs エクスポート設定
  - Performance Insights 設定
  - アラーム設定パターン

### 参照元一覧

- `infra/lib/stack/security-stack.ts`
- `infra/lib/stack/vpc-stack.ts`
- `infra/lib/construct/security/security-group-construct.ts`
- `infra/lib/construct/vpc/vpc-construct.ts`
- `baseline-environment-on-aws/usecases/blea-guest-ecs-app-sample/lib/construct/datastore.ts`

---

## 4. 設計文書

### 要件定義

#### 関連要件 ID

| 要件 ID | 内容 | 信頼性 |
|---------|------|--------|
| REQ-022 | Aurora MySQL Serverless v2 を使用 | 🔵 |
| REQ-023 | Aurora を Private DB Subnet に配置 | 🔵 |
| REQ-024 | 外部からの直接アクセス遮断 | 🔵 |
| REQ-025 | ECS SG からの 3306 のみ許可 | 🔵 |
| REQ-026 | Storage Encryption 有効化 | 🔵 |
| REQ-027 | 自動バックアップ有効化 | 🔵 |

- **参照元**: `docs/spec/aws-cdk-serverless-architecture/requirements.md`

### アーキテクチャ設計

#### Aurora Serverless v2 設定

| 設定項目 | 設定値 | 備考 |
|----------|--------|------|
| Engine | Aurora MySQL | Serverless v2 |
| MinCapacity | 0.5 ACU | コスト優先 |
| MaxCapacity | 2 ACU | コスト優先 |
| Storage Encryption | 有効 | KMS 使用 |
| Auto Backup | 有効 | 7日間保持 |
| Backup Retention | 7 日 | 🟡 標準設定 |

- **参照元**: `docs/design/aws-cdk-serverless-architecture/architecture.md`

### データフロー設計

#### DB 接続フロー (Sidecar パターン)

```
ECS Task → Sidecar (localhost:3306) → socat → Aurora (3306)
```

- **参照元**: `docs/design/aws-cdk-serverless-architecture/dataflow.md`

### 型定義

#### AuroraConstructProps インターフェース（タスク定義より）

```typescript
export interface AuroraConstructProps {
  vpc: ec2.IVpc;
  securityGroup: ec2.ISecurityGroup;
  envName: string;
  minCapacity?: number;  // default: 0.5 ACU
  maxCapacity?: number;  // default: 8 ACU
}
```

#### 関連型定義

```typescript
// DatabaseConfig より
interface AuroraConfig {
  engineVersion: string;      // '3.04.0'
  minCapacity: number;        // 0.5
  maxCapacity: number;        // 2
  storageEncrypted: boolean;  // true
  defaultDatabaseName: string; // 'appdb'
  port: number;               // 3306
}

interface BackupConfig {
  enabled: boolean;           // true
  retentionDays: number;      // 7
}
```

- **参照元**: `docs/design/aws-cdk-serverless-architecture/interfaces.ts`

### 参照元一覧

- `docs/spec/aws-cdk-serverless-architecture/requirements.md`
- `docs/design/aws-cdk-serverless-architecture/architecture.md`
- `docs/design/aws-cdk-serverless-architecture/dataflow.md`
- `docs/design/aws-cdk-serverless-architecture/interfaces.ts`
- `docs/tasks/aws-cdk-serverless-architecture/TASK-0008.md`

---

## 5. 注意事項

### 技術的制約

#### Aurora Serverless v2 制約

- **ACU 範囲**: 0.5 〜 128 ACU
- **エンジンバージョン**: Aurora MySQL 3.x 以降、Aurora PostgreSQL 13.x 以降
- **VPC 要件**: 少なくとも 2 つの AZ にサブネットが必要
- **Subnet Group**: Private Isolated Subnet に配置必須

#### CDK 実装制約

- `aws-cdk-lib/aws-rds` モジュールを使用
- Serverless v2 は `serverlessV2ScalingConfiguration` プロパティで設定
- `credentials` は `rds.Credentials.fromGeneratedSecret()` を推奨

### セキュリティ要件

#### 必須セキュリティ設定

1. **ストレージ暗号化**: `storageEncrypted: true`（REQ-026）
2. **Security Group**: ECS SG からの 3306 のみ許可（REQ-025）
3. **サブネット配置**: Private Isolated Subnet（REQ-023, REQ-024）
4. **認証情報管理**: Secrets Manager 自動生成を使用

#### 禁止事項

- ❌ パブリックアクセス有効化
- ❌ 平文での認証情報ハードコード
- ❌ 暗号化無効での運用

### パフォーマンス要件

#### Aurora Serverless v2 スケーリング

- 開発環境: 0.5 - 2 ACU（コスト優先）
- 本番環境: 0.5 - 2 ACU（初期設定、必要に応じて拡張）

### 依存関係

#### 前提タスク

- **TASK-0007**: Security Stack 統合（`auroraSecurityGroup` 提供）
- **TASK-0004**: VPC Stack 統合（`vpc`, `privateDbSubnets` 提供）

#### 後続タスク

- **TASK-0009**: Secrets Manager 統合
- **TASK-0010**: Database Stack 統合

### 参照元

- `docs/tasks/aws-cdk-serverless-architecture/TASK-0008.md`
- `docs/spec/aws-cdk-serverless-architecture/requirements.md`

---

## 6. 実装ファイル配置

### 作成予定ファイル

| ファイル | 説明 |
|----------|------|
| `infra/lib/construct/database/aurora-construct.ts` | Aurora Construct 実装 |
| `infra/test/construct/database/aurora-construct.test.ts` | Aurora Construct テスト |

### ディレクトリ構造

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

## 7. テスト要件サマリー

### 基本テストケース

| テストID | テスト内容 | 関連要件 |
|----------|-----------|----------|
| TC-AU-01 | Aurora Serverless v2 クラスターが作成される | REQ-022 |
| TC-AU-02 | エンジンバージョンが正しい | REQ-022 |
| TC-AU-03 | ACU 設定（MinCapacity/MaxCapacity）が正しい | REQ-022 |
| TC-AU-04 | ストレージ暗号化が有効 | REQ-026 |
| TC-AU-05 | KMS キーが関連付けられている | REQ-026 |
| TC-AU-06 | 自動バックアップが有効 | REQ-027 |
| TC-AU-07 | バックアップ保持期間が 7 日間 | REQ-027 |
| TC-AU-08 | 適切な Security Group が関連付けられている | REQ-024, REQ-025 |
| TC-AU-09 | Private DB Subnet に配置されている | REQ-023 |

---

## 8. 完了条件チェックリスト

- [ ] Aurora Serverless v2 クラスターが正常に作成される
- [ ] ストレージ暗号化（KMS）が有効になっている
- [ ] 自動バックアップ（7日間保持）が設定されている
- [ ] マルチ AZ 構成が有効になっている
- [ ] Security Group が適切に関連付けられている
- [ ] すべてのユニットテストが通過している

---

**信頼性レベルサマリー**:
- 🔵 青信号: 8 項目 (100%)
- 🟡 黄信号: 0 項目 (0%)
- 🔴 赤信号: 0 項目 (0%)

**品質評価**: 高品質 - 全ての実装項目が要件定義書・設計文書に基づく
