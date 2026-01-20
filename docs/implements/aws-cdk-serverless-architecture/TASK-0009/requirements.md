# TASK-0009: Secrets Manager 統合 - 詳細要件定義書

**タスクID**: TASK-0009
**タスク名**: Secrets Manager 統合
**要件名**: aws-cdk-serverless-architecture
**フェーズ**: Phase 2 - セキュリティ・データベース
**作成日**: 2026-01-20

---

## 1. 概要

Aurora データベースの認証情報を AWS Secrets Manager で安全に管理するための統合を実装します。ECS タスクからのシークレット参照、自動ローテーション設定、暗号化設定を含みます。

### 1.1 前提条件

| 前提タスク | 提供リソース | 状態 |
|-----------|-------------|------|
| TASK-0008 Aurora Construct | `secret: secretsmanager.ISecret` プロパティ | 実装済み |
| TASK-0006 IAM Role Construct | `secretsmanager:GetSecretValue` 権限 | 実装済み |
| TASK-0007 Security Stack | `ecsTaskRole`, `ecsTaskExecutionRole` | 実装済み |

### 1.2 関連要件 ID

| 要件 ID | 内容 | 信頼性 |
|---------|------|--------|
| REQ-022 | Aurora の認証情報を安全に管理 | 🟡 |
| REQ-026 | ストレージ暗号化と合わせてシークレット暗号化 | 🔵 |
| NFR-102 | データ暗号化（KMS 使用） | 🔵 |
| REQ-018 | Task Role に Secrets Manager アクセス権限 | 🔵 |

---

## 2. 機能要件（EARS記法）

**【信頼性レベル凡例】**:
- 🔵 **青信号**: 要件定義書・設計文書・ユーザヒアリングに基づく確実な要件
- 🟡 **黄信号**: 要件定義書から妥当な推測による要件
- 🔴 **赤信号**: 要件定義書にない推測による要件

---

### 2.1 通常要件

#### シークレット管理（Aurora Construct 既存機能の活用）

- **SMR-001**: システムは Aurora クラスター作成時に Secrets Manager シークレットを自動生成しなければならない 🔵 *Aurora Construct (TASK-0008) で実装済み*

- **SMR-002**: システムは Aurora Construct の `secret` プロパティを通じてシークレット参照を公開しなければならない 🔵 *Aurora Construct (TASK-0008) で実装済み*

- **SMR-003**: システムは シークレットに以下の JSON 構造を含まなければならない 🔵 *dataflow.md 認証情報管理フローより*
  ```json
  {
    "username": "<管理者ユーザー名>",
    "password": "<自動生成パスワード>",
    "host": "<Aurora クラスターエンドポイント>",
    "port": 3306
  }
  ```

#### ECS タスク連携（新規実装）

- **SMR-004**: システムは ECS Task Definition からシークレットを環境変数として参照できるヘルパーを提供しなければならない 🟡 *note.md 実装方針 Option B より*

- **SMR-005**: システムは `ecs.Secret.fromSecretsManager()` を使用してシークレットの特定フィールドを参照できなければならない 🔵 *dataflow.md 認証情報管理フロー、TASK-0009.md より*

- **SMR-006**: システムは以下のシークレット参照パターンを提供しなければならない 🟡 *note.md ECS タスク定義でのシークレット参照パターンより*
  - `DB_PASSWORD`: password フィールド
  - `DB_USERNAME`: username フィールド
  - `DB_HOST`: host フィールド

#### 暗号化設定

- **SMR-007**: システムは Secrets Manager シークレットを KMS で暗号化しなければならない 🔵 *REQ-026、NFR-102 より*

- **SMR-008**: システムは Aurora クラスターのストレージ暗号化キーと同じ KMS キーをシークレット暗号化に使用しなければならない 🟡 *note.md 技術的制約より（Aurora Construct で自動適用）*

---

### 2.2 条件付き要件

#### 自動ローテーション設定（オプション機能）

- **SMC-001**: 自動ローテーションが有効化されている場合、システムは指定された間隔（デフォルト 30 日）でシークレットをローテーションしなければならない 🟡 *AWS ベストプラクティスより*

- **SMC-002**: 自動ローテーションが有効化されている場合、システムは Aurora との統合により自動的にパスワードを更新しなければならない 🟡 *AWS ベストプラクティスより*

- **SMC-003**: VPC 内でローテーション Lambda が実行される場合、システムは Secrets Manager VPC Endpoint を利用しなければならない 🟡 *note.md 技術的制約より*

---

### 2.3 状態要件

- **SMS-001**: ECS タスクが起動している状態の場合、システムはシークレットから認証情報を取得可能でなければならない 🔵 *dataflow.md 認証情報管理フローより*

- **SMS-002**: シークレットがローテーション中の状態の場合、システムは前のバージョンと現在のバージョンの両方が有効でなければならない 🟡 *AWS Secrets Manager 仕様より*

---

### 2.4 オプション要件

- **SMO-001**: システムは カスタム KMS キーを指定してシークレットを暗号化してもよい 🟡 *note.md SecretsManagerConstructProps より*

- **SMO-002**: システムは ローテーション間隔を 1〜365 日の範囲で設定してもよい 🟡 *AWS Secrets Manager 仕様より*

---

### 2.5 制約要件

- **SMX-001**: システムは シークレットの平文をログに出力してはならない 🔵 *note.md 禁止事項より*

- **SMX-002**: システムは シークレット ARN を CDK 出力に直接エクスポートしてはならない 🔵 *note.md 禁止事項より*

- **SMX-003**: システムは 認証情報を環境変数にハードコードしてはならない 🔵 *note.md 禁止事項より*

- **SMX-004**: システムは `aws-cdk-lib/aws-secretsmanager` モジュールを使用しなければならない 🔵 *note.md CDK 実装制約より*

---

## 3. 非機能要件

### 3.1 セキュリティ

- **SMNFR-001**: シークレットへのアクセスは IAM ポリシーで制限しなければならない 🔵 *REQ-018 より*

- **SMNFR-002**: 最小権限の原則に基づき、特定のシークレット ARN のみにアクセスを許可しなければならない 🔵 *note.md セキュリティ考慮事項より*

- **SMNFR-003**: シークレットは保存時・転送時ともに暗号化されなければならない 🔵 *NFR-102 より*

### 3.2 パフォーマンス

- **SMNFR-004**: ECS Task Definition でシークレット参照を使用し、コンテナ起動時に自動取得しなければならない 🔵 *note.md パフォーマンス要件より*

- **SMNFR-005**: アプリケーション内でのシークレットキャッシュを推奨する 🟡 *note.md パフォーマンス要件より*

- **SMNFR-006**: 頻繁な GetSecretValue 呼び出し（5,000 回/秒超）を避けなければならない 🟡 *note.md Secrets Manager 制約より*

### 3.3 可用性

- **SMNFR-007**: シークレットは AWS リージョン内で高可用性を持たなければならない 🔵 *AWS Secrets Manager SLA より*

### 3.4 運用性

- **SMNFR-008**: シークレットのバージョン管理が可能でなければならない 🟡 *AWS Secrets Manager 仕様より*

- **SMNFR-009**: シークレットのローテーション履歴を追跡可能でなければならない 🟡 *AWS Secrets Manager 仕様より*

---

## 4. 受け入れ基準（完了条件チェックリスト）

### 4.1 必須条件

| No | 条件 | 検証方法 | 信頼性 |
|----|------|----------|--------|
| AC-001 | Aurora クラスターの認証情報が Secrets Manager で管理されている | CDK スナップショットテスト | 🔵 |
| AC-002 | シークレットの KMS 暗号化が有効になっている | CDK スナップショットテスト | 🔵 |
| AC-003 | ECS タスク定義からシークレット参照が可能である | ユニットテスト | 🟡 |
| AC-004 | IAM Role に適切な Secrets Manager アクセス権限がある | CDK スナップショットテスト | 🔵 |
| AC-005 | シークレット構造が正しい（username, password, host, port） | 統合テスト | 🟡 |
| AC-006 | ECS ヘルパー関数が正しいシークレット参照を返す | ユニットテスト | 🟡 |
| AC-007 | すべてのユニットテストが通過している | Jest テスト実行 | 🔵 |

### 4.2 オプション条件

| No | 条件 | 検証方法 | 信頼性 |
|----|------|----------|--------|
| AC-008 | 自動ローテーションが設定可能である | CDK スナップショットテスト | 🟡 |
| AC-009 | カスタム KMS キーの指定が可能である | CDK スナップショットテスト | 🟡 |

---

## 5. 実装方針

### 5.1 実装アプローチ: Option B - Aurora Construct の拡張（推奨）

note.md で提案された Option B を採用します。Aurora Construct の機能を拡張し、シークレット関連のヘルパーメソッドを追加します。

**理由**:
- 既存の Aurora Construct でシークレットが既に生成されている
- 重複を避けられる
- 責任の一貫性（Aurora 関連機能を Aurora Construct に集約）

### 5.2 実装ファイル

| ファイル | 説明 | 信頼性 |
|----------|------|--------|
| `infra/lib/construct/database/aurora-construct.ts` | Aurora Construct への ECS ヘルパーメソッド追加 | 🔵 |
| `infra/test/construct/database/aurora-construct.test.ts` | Secrets Manager 統合テスト追加 | 🔵 |

### 5.3 追加予定のメソッド

```typescript
/**
 * ECS Task Definition で使用するシークレット参照を取得
 *
 * @returns {Record<string, ecs.Secret>} シークレット参照のマップ
 */
public getSecretsForEcs(): Record<string, ecs.Secret> {
  return {
    DB_PASSWORD: ecs.Secret.fromSecretsManager(this.secret, 'password'),
    DB_USERNAME: ecs.Secret.fromSecretsManager(this.secret, 'username'),
    DB_HOST: ecs.Secret.fromSecretsManager(this.secret, 'host'),
  };
}
```

### 5.4 ECS Task Definition での使用例

```typescript
const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
  taskRole: securityStack.ecsTaskRole,
  executionRole: securityStack.ecsTaskExecutionRole,
});

taskDefinition.addContainer('app', {
  image: ecs.ContainerImage.fromEcrRepository(repo),
  secrets: aurora.getSecretsForEcs(),
  environment: {
    DB_PORT: '3306',
  },
});
```

---

## 6. テスト要件

### 6.1 基本テストケース

| テストID | テスト内容 | 関連要件 | 信頼性 |
|----------|-----------|----------|--------|
| TC-SM-01 | Secrets Manager シークレットが作成される | SMR-001 | 🔵 |
| TC-SM-02 | シークレットが Aurora クラスターと関連付けられている | SMR-002 | 🔵 |
| TC-SM-03 | KMS 暗号化が有効である | SMR-007 | 🔵 |
| TC-SM-04 | シークレット構造が正しい（username, password, host, port） | SMR-003 | 🟡 |
| TC-SM-05 | ECS タスクからシークレット参照が可能 | SMR-004 | 🟡 |

### 6.2 ECS ヘルパーテストケース

| テストID | テスト内容 | 関連要件 | 信頼性 |
|----------|-----------|----------|--------|
| TC-SM-06 | getSecretsForEcs() が正しいキーを返す | SMR-006 | 🟡 |
| TC-SM-07 | DB_PASSWORD が password フィールドを参照する | SMR-005 | 🟡 |
| TC-SM-08 | DB_USERNAME が username フィールドを参照する | SMR-005 | 🟡 |
| TC-SM-09 | DB_HOST が host フィールドを参照する | SMR-005 | 🟡 |

### 6.3 IAM ポリシーテストケース

| テストID | テスト内容 | 関連要件 | 信頼性 |
|----------|-----------|----------|--------|
| TC-SM-10 | ECS Task Role に GetSecretValue 権限がある | SMNFR-001 | 🔵 |
| TC-SM-11 | 最小権限の原則が適用されている | SMNFR-002 | 🟡 |

### 6.4 オプション機能テストケース

| テストID | テスト内容 | 関連要件 | 信頼性 |
|----------|-----------|----------|--------|
| TC-SM-12 | 自動ローテーションが設定可能（オプション） | SMC-001 | 🟡 |
| TC-SM-13 | カスタム KMS キーの指定が可能（オプション） | SMO-001 | 🟡 |

---

## 7. 技術的制約

### 7.1 Secrets Manager 制約

| 制約項目 | 制約内容 | 信頼性 |
|----------|----------|--------|
| シークレット名 | AWS アカウント・リージョン内で一意 | 🔵 |
| シークレットバージョン | 最大 100 バージョンまで保持 | 🟡 |
| 取得制限 | 1 秒あたり最大 5,000 回の GetSecretValue 呼び出し | 🟡 |
| ローテーション Lambda | VPC 内で実行する場合は VPC Endpoint が必要 | 🟡 |

### 7.2 CDK 実装制約

| 制約項目 | 制約内容 | 信頼性 |
|----------|----------|--------|
| モジュール | `aws-cdk-lib/aws-secretsmanager` を使用 | 🔵 |
| Aurora 認証情報 | `rds.Credentials.fromGeneratedSecret()` で自動生成済み | 🔵 |
| シークレット作成 | Aurora クラスター作成時に自動で作成される（追加作成不要） | 🔵 |

---

## 8. 既存実装との統合

### 8.1 Aurora Construct（TASK-0008）で実装済み

```typescript
// aurora-construct.ts より
credentials: rds.Credentials.fromGeneratedSecret(MASTER_USERNAME),
// ...
this.secret = this.cluster.secret!;
```

- Secrets Manager シークレットが自動生成される
- `secret` プロパティで他のリソースから参照可能
- KMS 暗号化が適用される（Aurora の暗号化キーを使用）

### 8.2 IAM Role Construct（TASK-0006）で実装済み

```typescript
// iam-role-construct.ts より
taskRole.addToPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ['secretsmanager:GetSecretValue'],
    resources: secretArns,
  })
);
```

- `secretsmanager:GetSecretValue` アクション許可
- `secretArns` パラメータでリソース制限可能

### 8.3 本タスク（TASK-0009）で新規実装が必要な項目

1. **ECS 統合ヘルパー**: `getSecretsForEcs()` メソッドの追加
2. **テストケース**: Secrets Manager 統合の検証テスト
3. **自動ローテーション設定**: オプション機能（必要に応じて）

---

## 9. 信頼性レベルサマリー

| レベル | 件数 | 割合 |
|--------|------|------|
| 🔵 青信号 | 25 | 58% |
| 🟡 黄信号 | 18 | 42% |
| 🔴 赤信号 | 0 | 0% |

**品質評価**: 要改善 - AWS ベストプラクティスに基づく推測が含まれるため、実装時に確認が必要

---

## 10. 関連文書

- **タスクファイル**: [TASK-0009.md](../../../tasks/aws-cdk-serverless-architecture/TASK-0009.md)
- **タスクノート**: [note.md](note.md)
- **要件定義書**: [requirements.md](../../../spec/aws-cdk-serverless-architecture/requirements.md)
- **設計文書**: [architecture.md](../../../design/aws-cdk-serverless-architecture/architecture.md)
- **データフロー**: [dataflow.md](../../../design/aws-cdk-serverless-architecture/dataflow.md)
- **Aurora Construct**: [aurora-construct.ts](../../../../infra/lib/construct/database/aurora-construct.ts)
- **IAM Role Construct**: [iam-role-construct.ts](../../../../infra/lib/construct/security/iam-role-construct.ts)
