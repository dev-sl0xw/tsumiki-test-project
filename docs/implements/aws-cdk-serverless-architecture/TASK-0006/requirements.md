# TASK-0006: IAM Role Construct 要件定義書

**タスクID**: TASK-0006
**機能名**: IAM Role Construct for ECS Tasks
**要件名**: aws-cdk-serverless-architecture
**作成日**: 2026-01-18
**フェーズ**: Phase 1 - 基盤構築

---

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

### 1.1 機能概要 🔵

**信頼性**: 🔵 *要件定義書 REQ-018, REQ-019・設計文書 architecture.md より*

ECS Fargate タスクの実行に必要な IAM Role を作成する CDK Construct を実装する。

- **ECS Task Role**: タスク実行中のアプリケーションが使用する権限（ECS Exec、Secrets Manager アクセス）
- **ECS Task Execution Role**: タスク起動時に ECS エージェントが使用する権限（ECR Pull、CloudWatch Logs 書き込み）

### 1.2 解決する問題 🔵

**信頼性**: 🔵 *要件定義書 NFR-302, NFR-303・ユーザストーリーより*

| 課題 | 解決方法 |
|------|----------|
| ECS Exec によるコンテナへのアクセス | AmazonSSMManagedInstanceCore ポリシー付与 |
| DB 認証情報の安全な管理 | Secrets Manager GetSecretValue 権限付与 |
| ECR イメージの取得 | AmazonECSTaskExecutionRolePolicy 付与 |
| CloudWatch Logs への書き込み | AmazonECSTaskExecutionRolePolicy 付与 |
| セキュリティリスクの最小化 | 最小権限の原則適用 |

### 1.3 想定されるユーザー 🔵

**信頼性**: 🔵 *ユーザストーリー user-stories.md より*

- **インフラエンジニア**: CDK を使用してインフラ構築を行う
- **SRE/DevOps エンジニア**: ECS Exec を使用して運用操作を行う
- **アプリケーション開発者**: Task Role を通じて AWS サービスにアクセス

### 1.4 システム内での位置づけ 🔵

**信頼性**: 🔵 *設計文書 architecture.md Stack依存関係より*

```
VPC Stack → Security Stack (IAM Role Construct 含む) → Database Stack
                    ↓
           Application Stack (Task Definition が IAM Role を参照)
```

- **所属 Stack**: Security Stack
- **使用元**: Application Stack (Task Definition Construct)
- **依存先**: なし（独立した Construct）

### 1.5 参照文書

- **参照したEARS要件**: REQ-018, REQ-019
- **参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/architecture.md` - CDK Stack 構成、コンピューティング層

---

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

### 2.1 入力パラメータ 🔵

**信頼性**: 🔵 *タスクノート note.md・タスク定義 TASK-0006.md より*

```typescript
/**
 * IamRoleConstruct の Props インターフェース
 */
export interface IamRoleConstructProps {
  /**
   * Secrets Manager Secret ARN のリスト（オプション）
   * @description Task Role に Secrets Manager アクセス権限を付与する際の ARN
   * @default ['*'] - 全ての Secret にアクセス可能（開発環境向け）
   */
  readonly secretArns?: string[];
}
```

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| secretArns | string[] | No | ['*'] | Secrets Manager でアクセス許可する Secret ARN のリスト |

### 2.2 出力値（公開プロパティ） 🔵

**信頼性**: 🔵 *タスク定義 TASK-0006.md・タスクノート note.md より*

```typescript
export class IamRoleConstruct extends Construct {
  /**
   * ECS Task Role
   * @description タスク実行中のアプリケーションが使用する IAM Role
   */
  public readonly taskRole: iam.IRole;

  /**
   * ECS Task Execution Role
   * @description タスク起動時に ECS エージェントが使用する IAM Role
   */
  public readonly executionRole: iam.IRole;
}
```

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| taskRole | iam.IRole | ECS Task Role（アプリケーション用） |
| executionRole | iam.IRole | ECS Task Execution Role（ECSエージェント用） |

### 2.3 入出力の関係性 🔵

**信頼性**: 🔵 *CDK ベストプラクティス・タスクノートより*

```
IamRoleConstructProps
    │
    ├─ secretArns (optional)
    │       │
    │       ▼
    │   PolicyStatement (secretsmanager:GetSecretValue)
    │       │
    │       ▼
    └─► IamRoleConstruct
            │
            ├─► taskRole ────────► Task Definition (taskRole)
            │       │
            │       ├─ AmazonSSMManagedInstanceCore (Managed Policy)
            │       └─ secretsmanager:GetSecretValue (Inline Policy)
            │
            └─► executionRole ──► Task Definition (executionRole)
                    │
                    └─ AmazonECSTaskExecutionRolePolicy (Managed Policy)
```

### 2.4 参照文書

- **参照したEARS要件**: REQ-018, REQ-019
- **参照した設計文書**: `docs/implements/aws-cdk-serverless-architecture/TASK-0006/note.md` - 型定義インターフェース

---

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

### 3.1 セキュリティ要件 🔵

**信頼性**: 🔵 *要件定義書 NFR-101〜105・タスク定義より*

| 項目 | 制約内容 | 根拠 |
|------|----------|------|
| Trust Relationship | `ecs-tasks.amazonaws.com` のみ AssumeRole 可能 | ECS Fargate 仕様 |
| Task Role 権限 | ECS Exec + Secrets Manager のみ | 最小権限の原則 |
| Execution Role 権限 | ECR + CloudWatch Logs のみ | 最小権限の原則 |
| 禁止権限 | AdministratorAccess, PowerUserAccess 等の広範な権限 | セキュリティベストプラクティス |

### 3.2 アーキテクチャ制約 🔵

**信頼性**: 🔵 *要件定義書 REQ-401〜405・設計文書より*

| 項目 | 制約内容 |
|------|----------|
| IaC | AWS CDK v2 (TypeScript) |
| リージョン | ap-northeast-1 (Tokyo) 固定 |
| ファイル配置 | `infra/lib/construct/security/iam-role-construct.ts` |
| テスト配置 | `infra/test/construct/security/iam-role-construct.test.ts` |
| 命名規則 | ファイル: kebab-case、クラス: PascalCase |

### 3.3 CDK 実装制約 🔵

**信頼性**: 🔵 *CDK ベストプラクティス・タスクノートより*

| 項目 | 制約内容 |
|------|----------|
| 継承元 | `Construct` クラスを継承 |
| エクスポート | Named Export を使用 |
| マネージドポリシー参照 | `ManagedPolicy.fromAwsManagedPolicyName()` を使用 |
| インラインポリシー | `addToPolicy()` + `PolicyStatement` を使用 |
| Role 説明 | 各 Role に明確な `description` を設定 |

### 3.4 IAM Role 固有の制約 🔵

**信頼性**: 🔵 *要件定義書 REQ-018・AWS IAM ベストプラクティスより*

#### ECS Task Role に必須のポリシー

```typescript
// マネージドポリシー
'AmazonSSMManagedInstanceCore'  // ECS Exec 用

// インラインポリシー (PolicyStatement)
{
  actions: ['secretsmanager:GetSecretValue'],
  resources: secretArns ?? ['*']
}
```

#### ECS Task Execution Role に必須のポリシー

```typescript
// マネージドポリシー
'service-role/AmazonECSTaskExecutionRolePolicy'  // ECR + CloudWatch Logs
```

### 3.5 参照文書

- **参照したEARS要件**: REQ-018, REQ-019, REQ-401〜405, NFR-101〜105
- **参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/architecture.md` - 技術的制約、セキュリティ制約

---

## 4. 想定される使用例（EARSEdgeケース・データフローベース）

### 4.1 基本的な使用パターン 🔵

**信頼性**: 🔵 *タスク定義 TASK-0006.md・タスクノートより*

#### パターン1: デフォルト設定での使用

```typescript
import { IamRoleConstruct } from '../construct/security/iam-role-construct';

// Security Stack 内での使用
const iamRoles = new IamRoleConstruct(this, 'IamRoles', {});

// Task Definition での参照
const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
  taskRole: iamRoles.taskRole,
  executionRole: iamRoles.executionRole,
});
```

#### パターン2: Secret ARN を指定した使用 🟡

**信頼性**: 🟡 *セキュリティベストプラクティスからの妥当な推測*

```typescript
const iamRoles = new IamRoleConstruct(this, 'IamRoles', {
  secretArns: [
    'arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:my-db-secret-abc123',
  ],
});
```

### 4.2 データフロー 🔵

**信頼性**: 🔵 *設計文書 dataflow.md・architecture.md より*

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ECS Task 実行フロー                              │
└─────────────────────────────────────────────────────────────────────────┘

1. Task 起動時 (Execution Role)
   ECS Agent ─── executionRole ───► ECR (イメージ Pull)
                                  └─► CloudWatch Logs (ログストリーム作成)

2. Task 実行時 (Task Role)
   App Container ─── taskRole ───► Secrets Manager (GetSecretValue)
                                 └─► SSM (ECS Exec セッション)
```

### 4.3 エッジケース 🔵

**信頼性**: 🔵 *タスクノート・受け入れ基準より*

| ID | ケース | 期待動作 |
|----|--------|----------|
| EC-01 | secretArns が空配列の場合 | デフォルト ['*'] を使用 |
| EC-02 | secretArns に無効な ARN 形式 | CDK Synth 時にエラー無し（実行時に権限エラー） |
| EC-03 | Props が undefined の場合 | デフォルト値で Role 作成 |

### 4.4 エラーケース 🟡

**信頼性**: 🟡 *CDK・IAM の動作から妥当な推測*

| ID | ケース | 期待動作 |
|----|--------|----------|
| ER-01 | Role 名重複 | CDK Deploy 時に CloudFormation エラー |
| ER-02 | 存在しない Secret ARN 指定 | Task 実行時に権限エラー |
| ER-03 | マネージドポリシー名の誤り | CDK Deploy 時に CloudFormation エラー |

### 4.5 参照文書

- **参照したEARS要件**: REQ-018, REQ-019
- **参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/dataflow.md`

---

## 5. EARS要件・設計文書との対応関係

### 5.1 参照したユーザストーリー 🔵

**信頼性**: 🔵 *user-stories.md より*

- **US-ECS-01**: ECS Exec によるコンテナアクセス
- **US-SEC-01**: 最小権限の原則によるセキュリティ確保

### 5.2 参照した機能要件 🔵

**信頼性**: 🔵 *requirements.md より*

| 要件ID | 内容 | 本タスクでの実装 |
|--------|------|-----------------|
| REQ-018 | Task Role に `AmazonSSMManagedInstanceCore` 権限付与 | taskRole にマネージドポリシーアタッチ |
| REQ-019 | `enableExecuteCommand: true` 設定 | 本 Construct の範囲外（Service 側で設定） |

### 5.3 参照した非機能要件 🔵

**信頼性**: 🔵 *requirements.md より*

| 要件ID | 内容 | 本タスクでの実装 |
|--------|------|-----------------|
| NFR-101 | VPC Endpoint でトラフィックを AWS 内に閉じる | 関連（VPC Endpoint で SSM 通信） |
| NFR-302 | ECS Exec 有効化で運用操作可能 | taskRole に SSM 権限付与 |
| NFR-303 | Sidecar パターンでセキュア DB 接続 | taskRole に Secrets Manager 権限付与 |

### 5.4 参照したEdgeケース 🔵

**信頼性**: 🔵 *acceptance-criteria.md より*

| ケースID | 内容 |
|----------|------|
| TC-ECS-05 | Task Role に SSM 権限が付与されている |
| TC-DB-06 | Secrets Manager でクレデンシャルが管理される |

### 5.5 参照した受け入れ基準 🔵

**信頼性**: 🔵 *acceptance-criteria.md より*

- **TC-ECS-05**: Task Role に `AmazonSSMManagedInstanceCore` がアタッチされている
- REQ-012〜021 の ECS Fargate 関連テストケース

### 5.6 参照した設計文書 🔵

**信頼性**: 🔵 *docs/design/aws-cdk-serverless-architecture/ より*

| 文書 | 該当セクション |
|------|---------------|
| architecture.md | CDK Stack 構成、各 Stack の責務、コンピューティング層、技術的制約 |
| dataflow.md | ECS Task 実行フロー |
| note.md (タスクノート) | 型定義インターフェース、実装パターン、テストパターン |

---

## 6. 実装詳細

### 6.1 実装ファイル構成 🔵

**信頼性**: 🔵 *タスクノート note.md・プロジェクト構造より*

```
infra/
├── lib/
│   └── construct/
│       └── security/
│           └── iam-role-construct.ts    # 実装対象
└── test/
    └── construct/
        └── security/
            └── iam-role-construct.test.ts  # テストファイル
```

### 6.2 作成される AWS リソース 🔵

**信頼性**: 🔵 *要件定義書 REQ-018・タスク定義より*

| リソース種別 | 数量 | 説明 |
|-------------|------|------|
| AWS::IAM::Role | 2 | Task Role, Execution Role |
| AWS::IAM::Policy | 1 | Task Role のインラインポリシー |

### 6.3 マネージドポリシー参照 🔵

**信頼性**: 🔵 *AWS マネージドポリシー仕様より*

| ポリシー名 | 用途 | 付与先 |
|-----------|------|--------|
| AmazonSSMManagedInstanceCore | ECS Exec (SSM Session Manager) | Task Role |
| service-role/AmazonECSTaskExecutionRolePolicy | ECR Pull + CloudWatch Logs | Execution Role |

### 6.4 インラインポリシー 🔵

**信頼性**: 🔵 *タスク定義 TASK-0006.md より*

```typescript
// Task Role に追加するインラインポリシー
new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['secretsmanager:GetSecretValue'],
  resources: secretArns ?? ['*'],
})
```

---

## 7. 信頼性レベルサマリー

### 項目別信頼性

| セクション | 🔵 青信号 | 🟡 黄信号 | 🔴 赤信号 |
|-----------|----------|----------|----------|
| 1. 機能の概要 | 5 | 0 | 0 |
| 2. 入出力の仕様 | 4 | 0 | 0 |
| 3. 制約条件 | 5 | 0 | 0 |
| 4. 使用例 | 3 | 2 | 0 |
| 5. 対応関係 | 6 | 0 | 0 |
| 6. 実装詳細 | 4 | 0 | 0 |
| **合計** | **27** | **2** | **0** |

### 信頼性分布

- 🔵 **青信号**: 27項目 (93%)
- 🟡 **黄信号**: 2項目 (7%)
- 🔴 **赤信号**: 0項目 (0%)

---

## 8. 品質評価

### 評価基準チェック

| 基準 | 評価 | 詳細 |
|------|------|------|
| 要件の曖昧さ | ✅ なし | 入出力、制約が明確に定義 |
| 入出力定義 | ✅ 完全 | Props、公開プロパティが型定義付きで記載 |
| 制約条件 | ✅ 明確 | セキュリティ、アーキテクチャ、CDK 制約を網羅 |
| 実装可能性 | ✅ 確実 | 既存パターンとの整合性あり |
| 信頼性レベル | ✅ 青多数 | 93% が青信号 |

### 総合評価

**✅ 高品質** - 要件の大部分が EARS 要件定義書・設計文書により確認済み

---

## 9. 関連文書リンク

| 文書 | パス |
|------|------|
| タスク定義 | `docs/tasks/aws-cdk-serverless-architecture/TASK-0006.md` |
| タスクノート | `docs/implements/aws-cdk-serverless-architecture/TASK-0006/note.md` |
| 要件定義書 | `docs/spec/aws-cdk-serverless-architecture/requirements.md` |
| ユーザストーリー | `docs/spec/aws-cdk-serverless-architecture/user-stories.md` |
| 受け入れ基準 | `docs/spec/aws-cdk-serverless-architecture/acceptance-criteria.md` |
| アーキテクチャ設計 | `docs/design/aws-cdk-serverless-architecture/architecture.md` |
| データフロー設計 | `docs/design/aws-cdk-serverless-architecture/dataflow.md` |
| Security Group Construct (参考) | `infra/lib/construct/security/security-group-construct.ts` |
| Security Group テスト (参考) | `infra/test/construct/security/security-group-construct.test.ts` |
