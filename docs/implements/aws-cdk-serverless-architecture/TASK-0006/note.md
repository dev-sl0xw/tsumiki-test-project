# TASK-0006: IAM Role Construct 実装 - TDD開発ノート

**タスクID**: TASK-0006
**タスクタイプ**: TDD
**推定工数**: 4時間
**フェーズ**: Phase 1 - 基盤構築

---

## 1. 技術スタック

### 使用技術・フレームワーク

| カテゴリ | 技術 | バージョン |
|---------|------|-----------|
| IaC | AWS CDK | v2.213.0 |
| 言語 | TypeScript | ~5.6.3 |
| テスト | Jest | ^29.7.0 |
| ランタイム | Node.js | ES2018 Target |

### アーキテクチャパターン

- **パターン**: Multi-Tier Serverless Architecture
- **セキュリティ設計**: 最小権限の原則に基づく IAM Role 構成
- **ECS Task Role**: ECS Exec (SSM Session Manager) 用の権限付与
- **ECS Task Execution Role**: ECR Pull, CloudWatch Logs 書き込み用の権限付与

### 主要CDKモジュール

```typescript
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
```

**参照元**:
- `infra/package.json`
- `infra/tsconfig.json`
- `docs/design/aws-cdk-serverless-architecture/architecture.md`

---

## 2. 開発ルール

### プロジェクト固有ルール

1. **CDKコマンド実行**: `npx` を使用してワークスペースローカルのCDKバージョンを使用
2. **パラメータ管理**: `parameter.ts` で環境別設定を管理
3. **スタック分割**: 機能別に6つのスタックに分割
4. **テスト方式**: Jest スナップショットテスト
5. **セキュリティ**: 最小権限の原則を徹底

### コーディング規約

| 項目 | 規約 |
|------|------|
| ファイル命名 | kebab-case (例: `iam-role-construct.ts`) |
| クラス命名 | PascalCase (例: `IamRoleConstruct`) |
| インターフェース | 型定義ファイルで一元管理 |
| エクスポート | Named Export を使用 |
| コメント | JSDoc形式で機能・信頼性レベルを記載 |

### ディレクトリ構造

```
infra/
├── bin/
│   └── infra.ts              # CDK App エントリーポイント
├── lib/
│   ├── stack/
│   │   └── vpc-stack.ts      # VPC Stack (既存)
│   └── construct/
│       ├── vpc/
│       │   ├── vpc-construct.ts      # VPC Construct (既存)
│       │   └── endpoints-construct.ts # Endpoints Construct (既存)
│       └── security/
│           ├── security-group-construct.ts  # Security Group (既存)
│           └── iam-role-construct.ts        # 実装対象
├── test/
│   └── construct/
│       └── security/
│           └── iam-role-construct.test.ts   # テストファイル
└── parameter.ts              # 環境別パラメータ
```

**参照元**:
- `CLAUDE.md`
- `docs/design/aws-cdk-serverless-architecture/architecture.md`
- `infra/lib/construct/security/security-group-construct.ts`

---

## 3. 関連実装

### 既存コード

| ファイル | 内容 | 関連度 |
|---------|------|--------|
| `infra/lib/construct/security/security-group-construct.ts` | Security Group Construct 実装 | 高 - 同じ security ディレクトリ |
| `infra/lib/construct/vpc/vpc-construct.ts` | VPC Construct 実装 | 中 - 実装パターンの参考 |
| `infra/lib/construct/vpc/endpoints-construct.ts` | Endpoints Construct 実装 | 中 - 実装パターンの参考 |
| `infra/test/construct/security/security-group-construct.test.ts` | Security Group テスト | 高 - テストパターンの参考 |

### Security Group Construct 実装パターン (参考)

```typescript
// 既存実装からのパターン
export interface SecurityGroupConstructProps {
  readonly vpc: ec2.IVpc;
  readonly containerPort?: number;
}

export class SecurityGroupConstruct extends Construct {
  public readonly albSecurityGroup: ec2.ISecurityGroup;
  public readonly ecsSecurityGroup: ec2.ISecurityGroup;
  public readonly auroraSecurityGroup: ec2.ISecurityGroup;

  constructor(scope: Construct, id: string, props: SecurityGroupConstructProps) {
    super(scope, id);
    // デフォルト値の適用
    // リソース作成
    // プロパティ設定
  }
}
```

### IAM Role 作成パターン (CDK標準)

```typescript
// ECS Task Role
const taskRole = new iam.Role(this, 'EcsTaskRole', {
  assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
  description: 'IAM role for ECS Fargate tasks',
});

// AmazonSSMManagedInstanceCore ポリシーをアタッチ (ECS Exec 用)
taskRole.addManagedPolicy(
  iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')
);

// Secrets Manager アクセス権限
taskRole.addToPolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: [
    'secretsmanager:GetSecretValue',
  ],
  resources: ['*'], // 本番では特定の Secret ARN に制限
}));

// ECS Task Execution Role
const executionRole = new iam.Role(this, 'EcsTaskExecutionRole', {
  assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
  description: 'IAM role for ECS task execution',
});

// AmazonECSTaskExecutionRolePolicy ポリシーをアタッチ
executionRole.addManagedPolicy(
  iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy')
);
```

**参照元**:
- `infra/lib/construct/security/security-group-construct.ts`
- `docs/tasks/aws-cdk-serverless-architecture/TASK-0006.md`

---

## 4. 設計文書

### アーキテクチャ仕様

#### IAM Role 構成

| Role | ポリシー | 用途 |
|------|----------|------|
| ECS Task Role | AmazonSSMManagedInstanceCore | ECS Exec (SSM Session Manager) |
| ECS Task Role | secretsmanager:GetSecretValue | DB 認証情報取得 |
| ECS Task Execution Role | AmazonECSTaskExecutionRolePolicy | ECR Pull, CloudWatch Logs |

#### Trust Relationship (AssumeRole)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

### 関連要件 (REQ)

| 要件ID | 内容 | 信頼性 |
|--------|------|--------|
| REQ-018 | Task Role に `AmazonSSMManagedInstanceCore` 権限を付与 | 🔵 |
| REQ-019 | ECS Exec を有効化 (enableExecuteCommand: true) | 🔵 |

### 型定義インターフェース (推奨)

```typescript
/**
 * IamRoleConstruct の Props インターフェース
 * 🔵 信頼性: タスク定義書・要件定義書より
 */
export interface IamRoleConstructProps {
  /**
   * Secrets Manager Secret ARN (オプション)
   * @description Task Role に Secrets Manager アクセス権限を付与する際の ARN
   * @default '*' (全ての Secret にアクセス可能)
   */
  readonly secretArns?: string[];
}

/**
 * IAM Role Construct
 * 🔵 信頼性: 要件定義書 REQ-018 より
 */
export class IamRoleConstruct extends Construct {
  /** ECS Task Role */
  public readonly taskRole: iam.IRole;

  /** ECS Task Execution Role */
  public readonly executionRole: iam.IRole;
}
```

**参照元**:
- `docs/spec/aws-cdk-serverless-architecture/requirements.md`
- `docs/design/aws-cdk-serverless-architecture/architecture.md`
- `docs/design/aws-cdk-serverless-architecture/dataflow.md`
- `docs/tasks/aws-cdk-serverless-architecture/TASK-0006.md`

---

## 5. テスト要件

### テストケース概要

| テストID | 内容 | 信頼性 |
|---------|------|--------|
| TC-IAM-01 | ECS Task Role が作成されること | 🔵 |
| TC-IAM-02 | Task Role に ecs-tasks.amazonaws.com が AssumeRole できること | 🔵 |
| TC-IAM-03 | Task Role に AmazonSSMManagedInstanceCore がアタッチされていること | 🔵 |
| TC-IAM-04 | Task Role に secretsmanager:GetSecretValue 権限が含まれていること | 🔵 |
| TC-IAM-05 | ECS Task Execution Role が作成されること | 🔵 |
| TC-IAM-06 | Execution Role に ecs-tasks.amazonaws.com が AssumeRole できること | 🔵 |
| TC-IAM-07 | Execution Role に AmazonECSTaskExecutionRolePolicy がアタッチされていること | 🔵 |
| TC-IAM-08 | 管理者権限 (AdministratorAccess 等) がアタッチされていないこと | 🔵 |
| TC-IAM-09 | 公開プロパティ (taskRole, executionRole) が定義されていること | 🔵 |
| TC-IAM-10 | 作成される IAM Role が 2 つであること | 🔵 |

### テスト実装パターン

```typescript
import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { IamRoleConstruct } from '../../../lib/construct/security/iam-role-construct';

describe('IamRoleConstruct', () => {
  let template: Template;
  let stack: cdk.Stack;

  beforeEach(() => {
    const app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
    new IamRoleConstruct(stack, 'TestIamRoles', {});
    template = Template.fromStack(stack);
  });

  test('creates ECS Task Role', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Principal: {
              Service: 'ecs-tasks.amazonaws.com',
            },
            Action: 'sts:AssumeRole',
          }),
        ]),
      },
    });
  });

  test('Task Role has AmazonSSMManagedInstanceCore policy', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      ManagedPolicyArns: Match.arrayWith([
        Match.objectLike({
          'Fn::Join': Match.arrayWith([
            Match.arrayWith([
              Match.stringLikeRegexp('.*AmazonSSMManagedInstanceCore.*'),
            ]),
          ]),
        }),
      ]),
    });
  });

  test('Task Role has secretsmanager:GetSecretValue permission', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Action: Match.arrayWith(['secretsmanager:GetSecretValue']),
          }),
        ]),
      },
    });
  });
});
```

**参照元**:
- `docs/spec/aws-cdk-serverless-architecture/acceptance-criteria.md`
- `docs/tasks/aws-cdk-serverless-architecture/TASK-0006.md`
- `infra/test/construct/security/security-group-construct.test.ts` (参考パターン)

---

## 6. 実装対象ファイル

### 新規作成ファイル

| ファイル | 説明 |
|---------|------|
| `infra/lib/construct/security/iam-role-construct.ts` | IAM Role Construct 実装 |
| `infra/test/construct/security/iam-role-construct.test.ts` | IAM Role Construct テスト |

### 実装インターフェース

```typescript
// IamRoleConstructProps
export interface IamRoleConstructProps {
  /**
   * Secrets Manager Secret ARN (オプション)
   * @description Task Role に Secrets Manager アクセス権限を付与する際の ARN
   * @default ['*'] (全ての Secret にアクセス可能)
   */
  readonly secretArns?: string[];
}

// IamRoleConstruct
export class IamRoleConstruct extends Construct {
  /** ECS Task Role */
  public readonly taskRole: iam.IRole;

  /** ECS Task Execution Role */
  public readonly executionRole: iam.IRole;
}
```

---

## 7. 注意事項

### 技術的制約

| 項目 | 制約内容 |
|------|----------|
| リージョン | ap-northeast-1 (Tokyo) 固定 |
| Trust Relationship | ecs-tasks.amazonaws.com のみ |
| Task Role | AmazonSSMManagedInstanceCore 必須 |
| Execution Role | AmazonECSTaskExecutionRolePolicy 必須 |

### セキュリティ考慮事項

1. **最小権限の原則**:
   - Task Role は ECS Exec と Secrets Manager アクセスに必要な権限のみ
   - Execution Role は ECR Pull と CloudWatch Logs 書き込みに必要な権限のみ
   - AdministratorAccess 等の広範な権限は付与しない

2. **Secrets Manager アクセス制限**:
   - 本番環境では `secretArns` パラメータで特定の Secret ARN に制限することを推奨
   - デフォルトは `*` だが、セキュリティ監査時に指摘される可能性あり

3. **マネージドポリシーの使用**:
   - 可能な限り AWS マネージドポリシーを使用
   - カスタムポリシーは必要最小限に抑える

### CDK ベストプラクティス

1. **Role の説明設定**:
   - 各 Role に明確な `description` を設定
   - 監査・トラブルシューティング時に役立つ

2. **ManagedPolicy の使用**:
   - `ManagedPolicy.fromAwsManagedPolicyName()` を使用
   - ポリシー名は完全修飾名を使用 (例: `service-role/AmazonECSTaskExecutionRolePolicy`)

3. **インラインポリシーの追加**:
   - `addToPolicy()` を使用して明示的にポリシーを追加
   - `PolicyStatement` で actions と resources を明確に指定

**参照元**:
- `docs/spec/aws-cdk-serverless-architecture/requirements.md`
- `docs/design/aws-cdk-serverless-architecture/architecture.md`
- `docs/design/aws-cdk-serverless-architecture/dataflow.md`
- `docs/implements/aws-cdk-serverless-architecture/TASK-0005/note.md`

---

## 8. 依存関係

### 前提タスク

| タスクID | 内容 | 状態 |
|---------|------|------|
| TASK-0004 | VPC Stack 統合 | 完了 |

### 後続タスク

| タスクID | 内容 | 依存理由 |
|---------|------|----------|
| TASK-0007 | Security Stack 統合 | IAM Role Construct を使用 |
| TASK-0014 | Task Definition Construct 実装 | taskRole, executionRole を参照 |

---

## 9. TDD 実装手順

### Requirements Phase
1. タスク定義書を確認し、要件を整理
2. IAM Role の構成と権限を明確化

### Testcases Phase
1. テストケース一覧を作成
2. 各テストケースの入力・期待値を定義

### Red Phase
1. `infra/test/construct/security/iam-role-construct.test.ts` を作成
2. 全テストケースを実装
3. テスト実行 → 全て失敗することを確認

### Green Phase
1. `infra/lib/construct/security/iam-role-construct.ts` を作成
2. 最小限の実装でテストを通す
3. テスト実行 → 全て成功することを確認

### Refactor Phase
1. コードの整理・最適化
2. Props のデフォルト値設定
3. JSDoc コメント追加
4. 定数の抽出
5. テスト実行 → 全て成功することを確認

---

## 10. コマンドリファレンス

### 開発コマンド

```bash
# プロジェクトディレクトリ
cd infra

# 依存関係インストール
npm install

# ビルド
npm run build

# テスト実行
npm test

# 特定テストファイル実行
npm test -- iam-role-construct.test.ts

# CDK Synth (CloudFormation テンプレート生成)
npx cdk synth

# CDK Diff (差分確認)
npx cdk diff --profile <aws-profile>
```

### テストコマンド

```bash
# 全テスト実行
npm test

# Watch モード
npm test -- --watch

# カバレッジ付き
npm test -- --coverage

# スナップショット更新
npm test -- -u
```

---

## 11. 信頼性レベルサマリー

- **総項目数**: 10項目 (テストケース)
- 🔵 **青信号**: 10項目 (100%)
- 🟡 **黄信号**: 0項目 (0%)
- 🔴 **赤信号**: 0項目 (0%)

**品質評価**: 高品質 - 全ての要件が要件定義書・設計文書により確認済み

---

## 12. 関連文書リンク

| 文書 | パス |
|------|------|
| タスク定義 | `docs/tasks/aws-cdk-serverless-architecture/TASK-0006.md` |
| 要件定義書 | `docs/spec/aws-cdk-serverless-architecture/requirements.md` |
| ユーザストーリー | `docs/spec/aws-cdk-serverless-architecture/user-stories.md` |
| 受け入れ基準 | `docs/spec/aws-cdk-serverless-architecture/acceptance-criteria.md` |
| アーキテクチャ設計 | `docs/design/aws-cdk-serverless-architecture/architecture.md` |
| データフロー設計 | `docs/design/aws-cdk-serverless-architecture/dataflow.md` |
| タスク概要 | `docs/tasks/aws-cdk-serverless-architecture/overview.md` |
| Security Group Construct (参考) | `infra/lib/construct/security/security-group-construct.ts` |
| Security Group テスト (参考) | `infra/test/construct/security/security-group-construct.test.ts` |
| VPC Stack (参考) | `infra/lib/stack/vpc-stack.ts` |
| プロジェクト設定 | `infra/package.json` |
| TypeScript設定 | `infra/tsconfig.json` |
| CDK設定 | `infra/cdk.json` |
