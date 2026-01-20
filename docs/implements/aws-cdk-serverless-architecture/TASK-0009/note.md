# TDD タスクノート: TASK-0009 - Secrets Manager 統合

**タスクID**: TASK-0009
**タスク名**: Secrets Manager 統合
**要件名**: aws-cdk-serverless-architecture
**フェーズ**: Phase 2 - セキュリティ・データベース
**作成日**: 2026-01-20

---

## 1. 技術スタック

### 使用技術・フレームワーク

| 項目 | 技術 | バージョン/詳細 |
|------|------|----------------|
| IaC | AWS CDK v2 | TypeScript |
| ランタイム | Node.js | TypeScript strict mode |
| テスト | Jest | スナップショットテスト |
| シークレット管理 | AWS Secrets Manager | DatabaseSecret クラス |
| 暗号化 | AWS KMS | カスタマーマネージドキー対応 |
| データベース | Aurora Serverless v2 | MySQL 8.0 互換 |

### アーキテクチャパターン

- **パターン**: Multi-Tier Serverless Architecture + Sidecar Pattern
- **認証情報管理**: Secrets Manager による DB 認証情報の集中管理
- **接続方式**: ECS Task Definition から Secrets Manager を参照し、環境変数として注入

### 参照元

- `docs/design/aws-cdk-serverless-architecture/architecture.md`
- `docs/design/aws-cdk-serverless-architecture/dataflow.md`
- `infra/parameter.ts`

---

## 2. 開発ルール

### プロジェクト固有のルール

#### 命名規則

- **リソース名**: kebab-case を使用（例: `db-secret`, `aurora-credentials`）
- **Construct ID**: PascalCase を使用（例: `SecretsManagerConstruct`, `DatabaseSecret`）
- **ファイル名**: kebab-case を使用（例: `secrets-manager-construct.ts`）

#### コーディング規約

- TypeScript strict mode 有効
- ESLint + Prettier によるフォーマット
- JSDoc コメント必須（機能概要、実装方針、信頼性レベル）
- セクション区切りコメント（`// ========`）によるコード構造化
- 定数は大文字スネークケースで抽出

#### テスト規約

- Jest スナップショットテストを使用
- テストケース ID 形式: `TC-SM-XX`（Secrets Manager 用）
- テストファイル配置: `test/construct/secrets/secrets-manager-construct.test.ts`

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

#### Aurora Construct（依存関係あり - 統合対象）

- **ファイル**: `infra/lib/construct/database/aurora-construct.ts`
- **提供**: `secret` - Aurora クラスター作成時に自動生成される Secrets Manager シークレット
- **実装済み機能**:
  - `rds.Credentials.fromGeneratedSecret()` による認証情報自動生成
  - `this.secret = this.cluster.secret!` による公開プロパティ提供
- **統合ポイント**: Aurora Construct の `secret` プロパティを利用

```typescript
// aurora-construct.ts より抜粋
public readonly secret: secretsmanager.ISecret;
// ...
this.secret = this.cluster.secret!;
```

#### IAM Role Construct（依存関係あり）

- **ファイル**: `infra/lib/construct/security/iam-role-construct.ts`
- **提供**: `taskRole` - ECS タスク用 IAM ロール（Secrets Manager アクセス権限付き）
- **実装済み機能**:
  - `secretsmanager:GetSecretValue` 権限付与済み

```typescript
// iam-role-construct.ts より抜粋
taskRole.addToPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ['secretsmanager:GetSecretValue'],
    resources: secretArns,
  })
);
```

#### Security Stack（依存関係あり）

- **ファイル**: `infra/lib/stack/security-stack.ts`
- **提供**: `ecsTaskRole` - Secrets Manager アクセス権限を持つ IAM ロール
- **統合ポイント**: Task Definition でシークレット参照時に使用

### BLEA 参考実装

#### Datastore Construct（Secrets Manager 連携例）

- **ファイル**: `baseline-environment-on-aws/usecases/blea-guest-ecs-app-sample/lib/construct/datastore.ts`
- **参考ポイント**:
  - `rds.Credentials.fromGeneratedSecret()` の使用方法
  - Aurora クラスターとの自動統合パターン
  - シークレット参照の実装例

### 参照元一覧

- `infra/lib/construct/database/aurora-construct.ts`
- `infra/lib/construct/security/iam-role-construct.ts`
- `infra/lib/stack/security-stack.ts`
- `baseline-environment-on-aws/usecases/blea-guest-ecs-app-sample/lib/construct/datastore.ts`

---

## 4. 設計文書

### 要件定義

#### 関連要件 ID

| 要件 ID | 内容 | 信頼性 |
|---------|------|--------|
| REQ-022 | Aurora の認証情報を安全に管理 | 🟡 |
| REQ-026 | ストレージ暗号化と合わせてシークレット暗号化 | 🔵 |
| NFR-102 | データ暗号化（KMS 使用） | 🔵 |
| REQ-018 | Task Role に Secrets Manager アクセス権限 | 🔵 |

- **参照元**: `docs/spec/aws-cdk-serverless-architecture/requirements.md`

### アーキテクチャ設計

#### Secrets Manager 設定

| 設定項目 | 設定値 | 信頼性 | 備考 |
|----------|--------|--------|------|
| シークレットタイプ | DatabaseSecret | 🔵 | Aurora 専用 |
| 暗号化 | KMS カスタマーマネージドキー | 🟡 | セキュリティ強化 |
| 自動ローテーション | 30日（オプション） | 🟡 | AWS ベストプラクティス |
| シークレット構造 | JSON（username, password, host, port） | 🔵 | Aurora 標準形式 |

- **参照元**: `docs/design/aws-cdk-serverless-architecture/architecture.md`

### データフロー設計

#### 認証情報管理フロー（dataflow.md より）

```
CDK Deployment
    │
    ▼
Secrets Manager
  ┌────────────────────────────────────────────────────────────┐
  │  Secret                                                     │
  │                                                             │
  │  Name: /aurora/credentials                                  │
  │  Value:                                                     │
  │    {                                                        │
  │      "username": "admin",                                   │
  │      "password": "xxxxxxxx",                                │
  │      "host": "xxxxx.cluster-xxxx.ap-northeast-1.rds..."    │
  │      "port": 3306                                           │
  │    }                                                        │
  └────────────────────────────────────────────────────────────┘
    │
    │ GetSecretValue
    │ (Task Role で許可)
    ▼
ECS Task
  ┌────────────────────────────────────────────────────────────┐
  │  App Container                                              │
  │                                                             │
  │  Environment Variables (from Secrets Manager):              │
  │    DB_HOST=localhost (via sidecar)                          │
  │    DB_PORT=3306                                             │
  │    DB_USER=admin                                            │
  │    DB_PASSWORD=xxxxxxxx                                     │
  └────────────────────────────────────────────────────────────┘
```

- **参照元**: `docs/design/aws-cdk-serverless-architecture/dataflow.md`

### 型定義

#### SecretsManagerConstructProps インターフェース（タスク定義より）

```typescript
export interface SecretsManagerConstructProps {
  /**
   * Aurora クラスターへの参照
   * シークレットの関連付けに使用
   */
  auroraCluster: rds.IDatabaseCluster;

  /**
   * 環境名（例: 'dev', 'prod'）
   */
  envName: string;

  /**
   * 自動ローテーション間隔（日数）
   * @default 30
   */
  rotationDays?: number;

  /**
   * カスタム KMS キー（オプション）
   * 未指定時は Aurora クラスターのキーを使用
   */
  encryptionKey?: kms.IKey;
}
```

#### ECS タスク定義でのシークレット参照パターン

```typescript
// ECS Task Definition でのシークレット参照例
const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
  taskRole: securityStack.ecsTaskRole,
  executionRole: securityStack.ecsTaskExecutionRole,
});

taskDefinition.addContainer('app', {
  image: ecs.ContainerImage.fromEcrRepository(repo),
  secrets: {
    DB_PASSWORD: ecs.Secret.fromSecretsManager(aurora.secret, 'password'),
    DB_USERNAME: ecs.Secret.fromSecretsManager(aurora.secret, 'username'),
    DB_HOST: ecs.Secret.fromSecretsManager(aurora.secret, 'host'),
  },
  environment: {
    DB_PORT: '3306',
  },
});
```

- **参照元**: `docs/design/aws-cdk-serverless-architecture/interfaces.ts`

### 参照元一覧

- `docs/spec/aws-cdk-serverless-architecture/requirements.md`
- `docs/design/aws-cdk-serverless-architecture/architecture.md`
- `docs/design/aws-cdk-serverless-architecture/dataflow.md`
- `docs/design/aws-cdk-serverless-architecture/interfaces.ts`
- `docs/tasks/aws-cdk-serverless-architecture/TASK-0009.md`

---

## 5. 注意事項

### 技術的制約

#### Secrets Manager 制約

- **シークレット名**: AWS アカウント・リージョン内で一意である必要あり
- **シークレットバージョン**: 最大 100 バージョンまで保持
- **ローテーション Lambda**: VPC 内で実行する場合は VPC Endpoint が必要
- **取得制限**: 1 秒あたり最大 5,000 回の GetSecretValue 呼び出し

#### CDK 実装制約

- `aws-cdk-lib/aws-secretsmanager` モジュールを使用
- Aurora の `credentials` は `rds.Credentials.fromGeneratedSecret()` で自動生成済み
- シークレットは Aurora クラスター作成時に自動で作成される（追加作成は不要）
- **重要**: TASK-0008 の Aurora Construct で既にシークレットが生成されている

#### Aurora 認証情報の自動生成について

Aurora Construct（TASK-0008）の実装により、以下が既に実現されている：

```typescript
// aurora-construct.ts での実装（既存）
credentials: rds.Credentials.fromGeneratedSecret(MASTER_USERNAME),
// ...
this.secret = this.cluster.secret!;
```

この実装により：
1. Secrets Manager シークレットが自動生成される
2. `secret` プロパティで他のリソースから参照可能
3. KMS 暗号化が適用される（Aurora の暗号化キーを使用）

### セキュリティ要件

#### 必須セキュリティ設定

1. **暗号化**: KMS カスタマーマネージドキーによる暗号化（REQ-026、NFR-102）
2. **IAM ポリシー**: 最小権限の原則に基づくアクセス制御
3. **リソースポリシー**: 特定の IAM ロールのみにアクセスを許可

#### IAM 権限（既に IamRoleConstruct で実装済み）

```typescript
// 必要な IAM 権限（iam-role-construct.ts で実装済み）
{
  Effect: 'Allow',
  Action: ['secretsmanager:GetSecretValue'],
  Resource: secretArns,
}
```

#### 禁止事項

- ❌ シークレットの平文ログ出力
- ❌ シークレット ARN の CDK 出力への直接エクスポート
- ❌ 環境変数への認証情報のハードコード

### パフォーマンス要件

#### シークレット取得のベストプラクティス

- ECS Task Definition でシークレット参照を使用（コンテナ起動時に自動取得）
- アプリケーション内でのキャッシュを推奨
- 頻繁な GetSecretValue 呼び出しを避ける

### 依存関係

#### 前提タスク

- **TASK-0008**: Aurora Construct 実装（`secret` プロパティ提供）
- **TASK-0006**: IAM Role Construct 実装（`secretsmanager:GetSecretValue` 権限）
- **TASK-0007**: Security Stack 統合（`ecsTaskRole` 提供）

#### 後続タスク

- **TASK-0010**: Database Stack 統合

### 参照元

- `docs/tasks/aws-cdk-serverless-architecture/TASK-0009.md`
- `docs/spec/aws-cdk-serverless-architecture/requirements.md`

---

## 6. 実装ファイル配置

### 作成予定ファイル

| ファイル | 説明 |
|----------|------|
| `infra/lib/construct/secrets/secrets-manager-construct.ts` | Secrets Manager Construct 実装 |
| `infra/test/construct/secrets/secrets-manager-construct.test.ts` | Secrets Manager Construct テスト |

### ディレクトリ構造

```
infra/
├── lib/
│   └── construct/
│       ├── database/
│       │   └── aurora-construct.ts  # 既存（secret プロパティ提供）
│       └── secrets/
│           └── secrets-manager-construct.ts  # 新規作成
└── test/
    └── construct/
        └── secrets/
            └── secrets-manager-construct.test.ts  # 新規作成
```

### 実装方針の選択肢

#### Option A: 独立した SecretsManagerConstruct を作成

新規 Construct を作成し、Aurora シークレットのラッパーとして機能させる。

**メリット**:
- 責任分離が明確
- 将来的なローテーション設定追加が容易

**デメリット**:
- Aurora Construct で既にシークレットが生成されているため冗長

#### Option B: Aurora Construct の拡張（推奨）

Aurora Construct の機能を拡張し、シークレット関連のヘルパーメソッドを追加。

**メリット**:
- 既存実装を活用
- 重複を避けられる

**実装例**:
```typescript
// aurora-construct.ts への追加
public getSecretForEcs(): { [key: string]: ecs.Secret } {
  return {
    DB_PASSWORD: ecs.Secret.fromSecretsManager(this.secret, 'password'),
    DB_USERNAME: ecs.Secret.fromSecretsManager(this.secret, 'username'),
  };
}
```

#### Option C: ユーティリティ関数として実装

ECS Task Definition 作成時に使用するユーティリティ関数を提供。

---

## 7. テスト要件サマリー

### 基本テストケース

| テストID | テスト内容 | 関連要件 | 信頼性 |
|----------|-----------|----------|--------|
| TC-SM-01 | Secrets Manager シークレットが作成される | REQ-022 | 🔵 |
| TC-SM-02 | シークレットが Aurora クラスターと関連付けられている | REQ-022 | 🔵 |
| TC-SM-03 | KMS 暗号化が有効である | REQ-026, NFR-102 | 🔵 |
| TC-SM-04 | シークレット構造が正しい（username, password, host, port） | - | 🟡 |
| TC-SM-05 | ECS タスクからシークレット参照が可能 | REQ-018 | 🟡 |

### IAM ポリシーテスト

| テストID | テスト内容 | 関連要件 | 信頼性 |
|----------|-----------|----------|--------|
| TC-SM-06 | ECS Task Role に GetSecretValue 権限がある | REQ-018 | 🔵 |
| TC-SM-07 | 最小権限の原則が適用されている | - | 🟡 |

### オプション機能テスト

| テストID | テスト内容 | 関連要件 | 信頼性 |
|----------|-----------|----------|--------|
| TC-SM-08 | 自動ローテーションが設定可能（オプション） | - | 🟡 |
| TC-SM-09 | カスタム KMS キーの指定が可能（オプション） | NFR-102 | 🟡 |

---

## 8. 完了条件チェックリスト

- [ ] Aurora クラスターの認証情報が Secrets Manager で管理されている
- [ ] シークレットの KMS 暗号化が有効になっている
- [ ] ECS タスク定義からシークレット参照が可能である
- [ ] IAM Role に適切な Secrets Manager アクセス権限がある
- [ ] 自動ローテーションが設定可能である（オプション）
- [ ] すべてのユニットテストが通過している

---

## 9. 既存実装の活用ポイント

### Aurora Construct（TASK-0008）で既に実装済みの機能

1. **シークレット自動生成**: `rds.Credentials.fromGeneratedSecret()` 使用
2. **公開プロパティ**: `secret: secretsmanager.ISecret` として公開
3. **KMS 暗号化**: Aurora のストレージ暗号化キーを共有

### IAM Role Construct（TASK-0006）で既に実装済みの機能

1. **GetSecretValue 権限**: `secretsmanager:GetSecretValue` アクション許可
2. **リソース制限**: `secretArns` パラメータで制限可能

### 本タスク（TASK-0009）で新規実装が必要な項目

1. **ECS 統合ヘルパー**: `ecs.Secret.fromSecretsManager()` のラッパー
2. **自動ローテーション設定**: `secretsmanager.SecretRotation` の追加（オプション）
3. **テストケース**: Secrets Manager 統合の検証テスト

---

**信頼性レベルサマリー**:
- 🔵 青信号: 5 項目 (56%)
- 🟡 黄信号: 4 項目 (44%)
- 🔴 赤信号: 0 項目 (0%)

**品質評価**: 要改善 - AWS ベストプラクティスに基づく推測が含まれるため、実装時に要確認
