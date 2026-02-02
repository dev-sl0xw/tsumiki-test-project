# TASK-0023: CI/CD Pipeline 構築 - TDD開発タスクノート

**作成日時**: 2026-02-01
**タスクID**: TASK-0023
**要件名**: aws-cdk-serverless-architecture
**フェーズ**: Phase 4 - 配信・運用
**信頼性レベル**: 🟡 *要件定義書 REQ-040, REQ-041より (詳細設計は推測)*

---

## 1. 技術スタック

### 1.1 開発環境

| 項目 | 技術/ツール |
|------|------------|
| IaC フレームワーク | AWS CDK v2 |
| 言語 | TypeScript (strict mode) |
| テストフレームワーク | Jest |
| リージョン | ap-northeast-1 (Tokyo) |

### 1.2 対象 AWS リソース

| リソース | 用途 | 要件 | 信頼性 |
|----------|------|------|--------|
| AWS CodeCommit | ソースコードリポジトリ | REQ-040 | 🔵 |
| AWS CodeBuild | ビルド・テスト実行 | REQ-041 | 🟡 |
| AWS CodePipeline | CI/CD オーケストレーション | REQ-041 | 🟡 |
| Amazon S3 | アーティファクトバケット | (暗黙的依存) | 🟡 |
| Amazon ECR | Docker イメージレジストリ | (暗黙的依存) | 🔵 |
| Amazon SNS | パイプライン通知 | REQ-039 | 🔵 |
| AWS Chatbot | Slack 通知連携 | REQ-039 | 🔵 |

### 1.3 依存ライブラリ

```typescript
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as notifications from 'aws-cdk-lib/aws-codestarnotifications';
import { Construct } from 'constructs';
```

### 1.4 アーキテクチャパターン

- **パターン**: CodeCommit → CodeBuild → CodePipeline → ECS (Rolling Deploy)
- **用途**: アプリケーションコードの継続的インテグレーションと継続的デリバリー
- **利点**:
  - 自動化: コードコミットをトリガーとしたビルド・デプロイの自動化
  - 品質保証: ビルド・テストの自動実行
  - 可視化: パイプラインの進捗状況可視化と Slack 通知
  - ロールバック: デプロイ失敗時の自動ロールバック

**参照元**:
- `docs/design/aws-cdk-serverless-architecture/architecture.md`
- `docs/spec/aws-cdk-serverless-architecture/requirements.md`

---

## 2. 開発ルール

### 2.1 コーディング規約

#### ファイルヘッダー

```typescript
/**
 * [タイトル]
 *
 * TASK-0023: CI/CD Pipeline 構築
 * フェーズ: [現在のフェーズ]
 *
 * 【機能概要】: ...
 * 【実装方針】: ...
 * 【テスト対応】: TC-CICD-01 〜 TC-CICD-XX の全Xテストケースに対応
 *
 * 🟡 信頼性レベル: 要件定義書に基づく実装（詳細設計は推測）
 *
 * @module [モジュール名]
 */
```

#### 定数定義パターン

```typescript
// ============================================================================
// 【定数定義】: [説明]
// 🟡 信頼性: [根拠]
// ============================================================================

/**
 * 【定数名】: [説明]
 * 🟡 信頼性: [要件番号] より妥当な推測
 */
const DEFAULT_XXX = 'value';
```

#### インターフェース定義パターン

```typescript
/**
 * [Construct名] の Props インターフェース
 *
 * 【設計方針】: [説明]
 * 【再利用性】: [説明]
 * 🟡 信頼性: [根拠]
 *
 * @interface [Interface名]
 */
export interface XxxConstructProps {
  /**
   * [プロパティ説明]
   *
   * 【用途】: [説明]
   * 【デフォルト】: [値]
   * 🟡 信頼性: [根拠]
   *
   * @default [デフォルト値]
   * @type {[型]}
   */
  readonly propName?: PropType;
}
```

### 2.2 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| ファイル名 | ケバブケース | `codecommit-construct.ts`, `codebuild-construct.ts`, `codepipeline-construct.ts` |
| クラス名 | パスカルケース | `CodeCommitConstruct`, `CodeBuildConstruct`, `CodePipelineConstruct` |
| インターフェース名 | パスカルケース | `CodeCommitConstructProps`, `CodeBuildConstructProps`, `CodePipelineConstructProps` |
| 定数 | スネークケース(大文字) | `DEFAULT_BRANCH_NAME`, `DEFAULT_COMPUTE_TYPE` |
| 変数・プロパティ | キャメルケース | `repository`, `buildProject`, `pipeline` |
| テストファイル | `*.test.ts` | `codecommit-construct.test.ts` |

### 2.3 テスト要件

#### テストファイル構成

```typescript
/**
 * [Construct名] テスト
 *
 * TASK-0023: CI/CD Pipeline 構築
 * フェーズ: TDD Red Phase - 失敗するテストケースの作成
 *
 * テストケース:
 * - TC-CICD-01: [テスト概要]
 * - TC-CICD-02: [テスト概要]
 */

import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { CodeCommitConstruct } from '../../../lib/construct/cicd/codecommit-construct';

describe('CodeCommitConstruct', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: {
        account: '123456789012',
        region: 'ap-northeast-1',
      },
    });
  });

  describe('TC-CICD-01: [テスト概要]', () => {
    // 【テスト目的】: [説明]
    // 【テスト内容】: [説明]
    // 【期待される動作】: [説明]
    // 🔵 信頼性: [要件番号] より

    beforeEach(() => {
      // テスト対象の Construct をインスタンス化
    });

    test('[テスト名]', () => {
      template.hasResourceProperties('AWS::CodeCommit::Repository', {
        ...
      });
    });
  });
});
```

#### テスト実行コマンド

```bash
# テスト実行
npm test

# 特定テスト実行
npm test -- codecommit-construct.test.ts

# スナップショット更新
npm test -- -u
```

**参照元**:
- `infra/test/construct/ecs/ecs-service-construct.test.ts`
- `infra/test/construct/alb/alb-construct.test.ts`

---

## 3. 関連実装

### 3.1 既存 Stack パターン

**ファイル**: `infra/lib/stack/application-stack.ts`

Application Stack が ECS Cluster, Task Definition, Service, ALB を統合している。
CI/CD Pipeline は Application Stack の ECS Service をデプロイターゲットとして使用する。

### 3.2 ECS Service Construct パターン

**ファイル**: `infra/lib/construct/ecs/ecs-service-construct.ts`

- ECS Service の参照パターン
- デプロイメント設定（Rolling Update）

```typescript
// ECS Service へのデプロイは CodePipeline ECS Deploy Action を使用
// imagedefinitions.json を使用して Task Definition を更新
```

### 3.3 Security Group Construct パターン

**ファイル**: `infra/lib/construct/security/security-group-construct.ts`

- IAM ロールのベストプラクティスパターン
- 最小権限の原則

### 3.4 通知系 Construct（TASK-0022 参照）

**ファイル予定**: `lib/construct/monitoring/notification-construct.ts`

- SNS Topic 作成パターン
- AWS Chatbot との連携パターン

**参照元**:
- `infra/lib/construct/ecs/ecs-service-construct.ts`
- `infra/lib/construct/security/security-group-construct.ts`
- `infra/lib/stack/application-stack.ts`
- `docs/tasks/aws-cdk-serverless-architecture/TASK-0022.md`

---

## 4. 設計文書

### 4.1 アーキテクチャ位置づけ

CI/CD Pipeline は Ops Stack に属し、以下の依存関係を持つ:

```
Application Stack (ECS Service) ← Ops Stack (CI/CD Pipeline)
                                    ↓
                              CodeCommit → CodeBuild → CodePipeline
                                    ↓                       ↓
                                  ECR                  ECS Deploy
                                    ↓                       ↓
                              Build Image            Update Service
                                                          ↓
                                                   SNS → Chatbot → Slack
```

### 4.2 CodeCommit 仕様 🔵

| 設定項目 | 設定値 | 根拠 |
|----------|--------|------|
| リポジトリ名 | `{env-name}-app-repository` | TASK-0023 |
| ブランチ | `main` (Prod), `develop` (Dev) | TASK-0023 |

### 4.3 CodeBuild 仕様 🟡

| 設定項目 | 設定値 | 根拠 |
|----------|--------|------|
| 環境 | LinuxBuildImage.STANDARD_7_0 | TASK-0023 (推測) |
| コンピュートタイプ | BUILD_GENERAL1_SMALL | TASK-0023 (推測) |
| 特権モード | 有効 | Docker ビルド用 (推測) |
| buildspec | リポジトリ内 buildspec.yml | ベストプラクティス |

### 4.4 CodePipeline 仕様 🟡

| 設定項目 | 設定値 | 根拠 |
|----------|--------|------|
| ステージ構成 | Source → Build → Deploy | TASK-0023 (推測) |
| Source | CodeCommit | TASK-0023 |
| Build | CodeBuild | TASK-0023 (推測) |
| Deploy | ECS Deploy Action | TASK-0023 (推測) |
| アーティファクト | S3 バケット | CodePipeline 標準 |

### 4.5 型定義インターフェース

```typescript
// docs/design/aws-cdk-serverless-architecture/interfaces.ts より

/**
 * CI/CD 設定 🔵
 * @description CodePipeline/CodeBuild の設定 (REQ-040〜041)
 */
export interface CicdConfig {
  /** パイプライン有効化 */
  readonly enabled: boolean;

  /** ソースリポジトリ設定 */
  readonly source: SourceConfig;

  /** ビルド設定 */
  readonly build: BuildConfig;
}

/**
 * ソースリポジトリ設定 🔵
 * @description CodeCommit リポジトリの設定
 */
export interface SourceConfig {
  /** リポジトリ名 */
  readonly repositoryName: string;

  /** ブランチ名 */
  readonly branchName: string;
}

/**
 * ビルド設定 🟡
 * @description CodeBuild プロジェクトの設定
 */
export interface BuildConfig {
  /** コンピュートタイプ */
  readonly computeType: 'BUILD_GENERAL1_SMALL' | 'BUILD_GENERAL1_MEDIUM' | 'BUILD_GENERAL1_LARGE';

  /** ビルドイメージ */
  readonly buildImage: string;

  /** 特権モード */
  readonly privilegedMode: boolean;
}
```

### 4.6 Props インターフェース設計

#### CodeCommitConstruct Props

```typescript
export interface CodeCommitConstructProps {
  /**
   * リポジトリ名 (必須)
   * 【用途】: CodeCommit リポジトリの名前
   * 🔵 信頼性: TASK-0023
   */
  readonly repositoryName: string;

  /**
   * リポジトリの説明 (オプション)
   * 【用途】: リポジトリの目的説明
   * @default undefined
   */
  readonly description?: string;
}
```

#### CodeBuildConstruct Props

```typescript
export interface CodeBuildConstructProps {
  /**
   * プロジェクト名 (必須)
   * 【用途】: CodeBuild プロジェクトの名前
   * 🟡 信頼性: TASK-0023 より推測
   */
  readonly projectName: string;

  /**
   * ビルドイメージ (オプション)
   * 【用途】: CodeBuild の実行環境
   * @default LinuxBuildImage.STANDARD_7_0
   * 🟡 信頼性: TASK-0023 より推測
   */
  readonly buildImage?: codebuild.IBuildImage;

  /**
   * コンピュートタイプ (オプション)
   * @default BUILD_GENERAL1_SMALL
   * 🟡 信頼性: TASK-0023 より推測
   */
  readonly computeType?: codebuild.ComputeType;

  /**
   * 特権モード (オプション)
   * @default true (Docker ビルド用)
   * 🟡 信頼性: TASK-0023 より推測
   */
  readonly privilegedMode?: boolean;

  /**
   * 環境変数 (オプション)
   * 【用途】: ビルド時の環境変数設定
   */
  readonly environmentVariables?: Record<string, codebuild.BuildEnvironmentVariable>;

  /**
   * buildspec ファイルパス (オプション)
   * @default 'buildspec.yml' (リポジトリルート)
   */
  readonly buildSpecPath?: string;

  /**
   * ECR リポジトリ (オプション)
   * 【用途】: Docker イメージプッシュ先
   */
  readonly ecrRepository?: ecr.IRepository;
}
```

#### CodePipelineConstruct Props

```typescript
export interface CodePipelineConstructProps {
  /**
   * パイプライン名 (必須)
   * 【用途】: CodePipeline の名前
   * 🟡 信頼性: TASK-0023 より推測
   */
  readonly pipelineName: string;

  /**
   * CodeCommit リポジトリ (必須)
   * 【用途】: ソースステージのソース
   * 🔵 信頼性: TASK-0023
   */
  readonly repository: codecommit.IRepository;

  /**
   * ブランチ名 (オプション)
   * @default 'main'
   * 🔵 信頼性: TASK-0023
   */
  readonly branchName?: string;

  /**
   * CodeBuild プロジェクト (必須)
   * 【用途】: ビルドステージの実行
   * 🟡 信頼性: TASK-0023 より推測
   */
  readonly buildProject: codebuild.IProject;

  /**
   * ECS Service (必須)
   * 【用途】: デプロイターゲット
   * 🟡 信頼性: TASK-0023 より推測
   */
  readonly ecsService: ecs.IBaseService;

  /**
   * ECS Cluster (必須)
   * 【用途】: デプロイ先クラスター
   * 🟡 信頼性: TASK-0023 より推測
   */
  readonly ecsCluster: ecs.ICluster;

  /**
   * SNS Topic (オプション)
   * 【用途】: パイプライン通知
   * 🔵 信頼性: REQ-039
   */
  readonly notificationTopic?: sns.ITopic;

  /**
   * 手動承認 (オプション)
   * @default false
   * 🟡 信頼性: TASK-0023 より推測 (Prod のみ)
   */
  readonly requireManualApproval?: boolean;
}
```

### 4.7 出力プロパティ設計

#### CodeCommitConstruct

```typescript
export class CodeCommitConstruct extends Construct {
  /**
   * CodeCommit リポジトリ
   */
  public readonly repository: codecommit.IRepository;

  /**
   * リポジトリ ARN
   */
  public readonly repositoryArn: string;

  /**
   * リポジトリ Clone URL (HTTPS)
   */
  public readonly cloneUrlHttp: string;
}
```

#### CodeBuildConstruct

```typescript
export class CodeBuildConstruct extends Construct {
  /**
   * CodeBuild プロジェクト
   */
  public readonly project: codebuild.IProject;

  /**
   * プロジェクト ARN
   */
  public readonly projectArn: string;

  /**
   * プロジェクトロール
   */
  public readonly role: iam.IRole;
}
```

#### CodePipelineConstruct

```typescript
export class CodePipelineConstruct extends Construct {
  /**
   * CodePipeline
   */
  public readonly pipeline: codepipeline.IPipeline;

  /**
   * パイプライン ARN
   */
  public readonly pipelineArn: string;

  /**
   * アーティファクトバケット
   */
  public readonly artifactBucket: s3.IBucket;
}
```

**参照元**:
- `docs/design/aws-cdk-serverless-architecture/architecture.md`
- `docs/design/aws-cdk-serverless-architecture/interfaces.ts`
- `docs/tasks/aws-cdk-serverless-architecture/TASK-0023.md`

---

## 5. テスト要件

### 5.1 必須テストケース

#### CodeCommit Construct テスト 🔵

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-CICD-01 | リポジトリ作成確認 | AWS::CodeCommit::Repository が作成される |
| TC-CICD-02 | リポジトリ名確認 | RepositoryName が正しく設定される |

#### CodeBuild Construct テスト 🟡

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-CICD-03 | プロジェクト作成確認 | AWS::CodeBuild::Project が作成される |
| TC-CICD-04 | 環境設定確認 | Environment が正しく設定される |
| TC-CICD-05 | 特権モード確認 | PrivilegedMode が有効に設定される |
| TC-CICD-06 | コンピュートタイプ確認 | ComputeType が正しく設定される |
| TC-CICD-07 | IAM ロール確認 | ServiceRole が作成される |

#### CodePipeline Construct テスト 🟡

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-CICD-08 | パイプライン作成確認 | AWS::CodePipeline::Pipeline が作成される |
| TC-CICD-09 | Source ステージ確認 | Source ステージが CodeCommit を参照する |
| TC-CICD-10 | Build ステージ確認 | Build ステージが CodeBuild を参照する |
| TC-CICD-11 | Deploy ステージ確認 | Deploy ステージが ECS を参照する |
| TC-CICD-12 | アーティファクトバケット確認 | ArtifactStore が設定される |

#### ECS Deploy Action テスト 🟡

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-CICD-13 | ECS Deploy Action 確認 | ECS Deploy アクションが設定される |
| TC-CICD-14 | サービス参照確認 | 正しい ECS Service をターゲットとする |

#### 通知テスト 🔵

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-CICD-15 | 通知ルール作成確認 | AWS::CodeStarNotifications::NotificationRule が作成される |
| TC-CICD-16 | SNS Target 確認 | SNS Topic が通知ターゲットに設定される |
| TC-CICD-17 | 通知イベント確認 | パイプラインイベントが設定される |

#### デフォルト値テスト 🟡

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-CICD-18 | ブランチ名デフォルト確認 | 未指定時に 'main' が設定される |
| TC-CICD-19 | 特権モードデフォルト確認 | 未指定時に true が設定される |
| TC-CICD-20 | コンピュートタイプデフォルト確認 | 未指定時に SMALL が設定される |

#### スナップショットテスト

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-CICD-21 | CloudFormation テンプレート確認 | 期待通りのテンプレートが生成される |

### 5.2 テスト実行コマンド

```bash
# CI/CD 関連テスト実行
npm test -- cicd

# 特定 Construct テスト
npm test -- codecommit-construct.test.ts
npm test -- codebuild-construct.test.ts
npm test -- codepipeline-construct.test.ts

# スナップショット更新
npm test -- -u
```

**参照元**:
- `docs/tasks/aws-cdk-serverless-architecture/TASK-0023.md`
- `docs/spec/aws-cdk-serverless-architecture/acceptance-criteria.md`

---

## 6. 注意事項

### 6.1 技術的制約

#### 信頼性レベルに関する重要な注意 🟡

**このタスクは信頼性レベル 🟡（黄信号）です。**

要件定義書で CI/CD の必要性は明確に述べられている（REQ-040, REQ-041）ものの、以下の詳細設計は推測に基づいています:

- CodeBuild の詳細設定（ビルドイメージ、コンピュートタイプ）
- パイプラインステージ構成
- デプロイ方式（Rolling Update vs Blue/Green）
- buildspec.yml の詳細内容
- 手動承認フローの要否

**実装前に確認すべき事項**:

1. ブランチ戦略の詳細（main/develop の使い分け）
2. 手動承認フローの要否（Prod 環境のみ？）
3. Blue/Green vs Rolling Update の選択
4. buildspec.yml の詳細内容

#### CodeBuild の制約 🟡

- **特権モード**: Docker ビルドを行う場合は必須
- **VPC 設定**: VPC 内リソースにアクセスする場合は VPC 設定が必要
- **キャッシュ**: ビルド高速化のため S3 キャッシュを検討

```typescript
// 特権モード設定
const buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
  environment: {
    buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
    computeType: codebuild.ComputeType.SMALL,
    privileged: true,  // Docker ビルド用
  },
});
```

#### CodePipeline の制約 🟡

- **アーティファクト**: S3 バケットが自動作成される
- **クロスリージョン**: 同一リージョン内でのデプロイを想定
- **並列実行**: デフォルトでは並列実行が無効

```typescript
// ECS Deploy Action の設定
new codepipeline_actions.EcsDeployAction({
  actionName: 'Deploy',
  service: props.ecsService,
  input: buildOutput,
  deploymentTimeout: cdk.Duration.minutes(60),
});
```

### 6.2 セキュリティ要件

#### IAM ロールの最小権限 🔵

- CodeBuild ロール: ECR プッシュ、S3 アクセス、CloudWatch Logs 書き込み
- CodePipeline ロール: CodeCommit 読み取り、CodeBuild 起動、ECS デプロイ

```typescript
// CodeBuild ロールに ECR 権限を付与
props.ecrRepository?.grantPullPush(buildProject);

// CodeBuild ロールに S3 権限を付与
buildProject.addToRolePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['s3:GetObject', 's3:PutObject'],
  resources: ['arn:aws:s3:::*/*'],
}));
```

#### Secrets の安全な取り扱い 🔵

- buildspec.yml 内でのシークレット参照は Secrets Manager または SSM Parameter Store を使用
- 環境変数への直接シークレット埋め込みは禁止

### 6.3 パフォーマンス要件

#### ビルド時間の最適化 🟡

- S3 キャッシュの使用を検討
- Docker レイヤーキャッシュの活用
- 適切なコンピュートタイプの選択

#### デプロイ時間の最適化 🟡

- Rolling Update の設定（minimumHealthyPercent, maximumPercent）
- デプロイタイムアウトの適切な設定

### 6.4 依存タスク

| タスクID | タスク名 | 関係 |
|----------|----------|------|
| TASK-0017 | Application Stack 統合 | 前提（ECS Service が必要）完了 |
| TASK-0022 | CloudWatch Alarms + Chatbot 設定 | 関連（SNS Topic/Chatbot 連携） |
| TASK-0024 | Ops Stack 統合 + 最終統合テスト | 後続 |

### 6.5 CDK ベストプラクティス

- `npx` を使用してワークスペースローカルの CDK バージョンを使用
- テスト更新時は `npm test -- -u` でスナップショット更新
- パイプラインリソースは `codepipeline.Pipeline` を使用
- 通知は `aws-codestarnotifications` モジュールを使用

**参照元**:
- `docs/spec/aws-cdk-serverless-architecture/requirements.md` (REQ-040, REQ-041)
- `docs/design/aws-cdk-serverless-architecture/architecture.md`
- `docs/tasks/aws-cdk-serverless-architecture/TASK-0023.md`

---

## 7. 実装ファイル

### 7.1 実装対象ファイル

| ファイルパス | 内容 |
|--------------|------|
| `infra/lib/construct/cicd/codecommit-construct.ts` | CodeCommit Construct 実装 |
| `infra/lib/construct/cicd/codebuild-construct.ts` | CodeBuild Construct 実装 |
| `infra/lib/construct/cicd/codepipeline-construct.ts` | CodePipeline Construct 実装 |
| `infra/test/construct/cicd/codecommit-construct.test.ts` | CodeCommit テストファイル |
| `infra/test/construct/cicd/codebuild-construct.test.ts` | CodeBuild テストファイル |
| `infra/test/construct/cicd/codepipeline-construct.test.ts` | CodePipeline テストファイル |

### 7.2 関連ファイル

| ファイルパス | 用途 |
|--------------|------|
| `infra/lib/stack/ops-stack.ts` | Ops Stack 統合（TASK-0024） |
| `infra/lib/stack/application-stack.ts` | ECS Service 参照元 |
| `infra/parameter.ts` | 環境設定 |
| `buildspec.yml` | CodeBuild ビルド仕様（リポジトリルート） |

---

## 8. TDD 実行手順

### 8.1 Red フェーズ

1. `/tsumiki:tdd-requirements TASK-0023` - 詳細要件定義
2. `/tsumiki:tdd-testcases` - テストケース洗い出し
3. `/tsumiki:tdd-red` - 失敗するテスト実装

### 8.2 Green フェーズ

4. `/tsumiki:tdd-green` - テストを通す最小実装

### 8.3 Refactor フェーズ

5. `/tsumiki:tdd-refactor` - コード品質改善

### 8.4 完了確認

6. `/tsumiki:tdd-verify-complete` - 品質確認・テスト網羅性確認

---

## 9. 参考リソース

### 9.1 プロジェクト内ドキュメント

- `docs/spec/aws-cdk-serverless-architecture/requirements.md` - 要件定義書
- `docs/design/aws-cdk-serverless-architecture/architecture.md` - アーキテクチャ設計
- `docs/design/aws-cdk-serverless-architecture/interfaces.ts` - 型定義
- `docs/tasks/aws-cdk-serverless-architecture/TASK-0023.md` - タスク定義

### 9.2 既存実装参照

- `infra/lib/construct/ecs/ecs-service-construct.ts` - ECS Service 実装
- `infra/lib/construct/alb/alb-construct.ts` - ALB 実装
- `infra/lib/stack/application-stack.ts` - Application Stack 実装
- `infra/test/construct/alb/alb-construct.test.ts` - テストパターン

### 9.3 AWS ドキュメント

- [AWS CDK CodeCommit Module](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_codecommit-readme.html)
- [AWS CDK CodeBuild Module](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_codebuild-readme.html)
- [AWS CDK CodePipeline Module](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_codepipeline-readme.html)
- [AWS CDK CodePipeline Actions Module](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_codepipeline_actions-readme.html)
- [ECS Deploy Action](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_codepipeline_actions.EcsDeployAction.html)

---

## 10. デフォルト定数設計

```typescript
// ============================================================================
// 【定数定義】: CI/CD パイプライン構成のデフォルト値
// 🟡 信頼性: REQ-040, REQ-041 より（詳細は推測）
// ============================================================================

/**
 * 【デフォルトブランチ名】: CodeCommit のデフォルトブランチ
 * 🔵 信頼性: TASK-0023 より
 */
const DEFAULT_BRANCH_NAME = 'main';

/**
 * 【デフォルトビルドイメージ】: CodeBuild のビルドイメージ
 * 🟡 信頼性: TASK-0023 より推測
 */
const DEFAULT_BUILD_IMAGE = codebuild.LinuxBuildImage.STANDARD_7_0;

/**
 * 【デフォルトコンピュートタイプ】: CodeBuild のコンピュートタイプ
 * 🟡 信頼性: TASK-0023 より推測
 */
const DEFAULT_COMPUTE_TYPE = codebuild.ComputeType.SMALL;

/**
 * 【デフォルト特権モード】: Docker ビルド用
 * 🟡 信頼性: TASK-0023 より推測
 */
const DEFAULT_PRIVILEGED_MODE = true;

/**
 * 【デフォルトビルドスペックパス】: buildspec.yml の配置場所
 * 🟡 信頼性: ベストプラクティスより
 */
const DEFAULT_BUILDSPEC_PATH = 'buildspec.yml';

/**
 * 【デフォルトデプロイタイムアウト】: ECS デプロイのタイムアウト（分）
 * 🟡 信頼性: AWS デフォルト値
 */
const DEFAULT_DEPLOY_TIMEOUT_MINUTES = 60;

/**
 * 【パイプライン通知イベント】: SNS 通知対象イベント
 * 🔵 信頼性: TASK-0023・REQ-039 より
 */
const PIPELINE_NOTIFICATION_EVENTS = [
  'codepipeline-pipeline-pipeline-execution-started',
  'codepipeline-pipeline-pipeline-execution-succeeded',
  'codepipeline-pipeline-pipeline-execution-failed',
  'codepipeline-pipeline-manual-approval-needed',
];
```

---

## 11. 想定されるビルドスペック構造 🟡

**信頼性**: 🟡 *TASK-0023 より推測*

```yaml
# buildspec.yml (推測)
version: 0.2

phases:
  pre_build:
    commands:
      - echo Logging in to Amazon ECR...
      - aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com
  build:
    commands:
      - echo Build started on `date`
      - echo Installing dependencies...
      - npm ci
      - echo Running tests...
      - npm test
      - echo Building the Docker image...
      - docker build -t $REPOSITORY_URI:$IMAGE_TAG .
      - docker tag $REPOSITORY_URI:$IMAGE_TAG $REPOSITORY_URI:latest
  post_build:
    commands:
      - echo Build completed on `date`
      - echo Pushing the Docker image...
      - docker push $REPOSITORY_URI:$IMAGE_TAG
      - docker push $REPOSITORY_URI:latest
      - echo Writing image definitions file...
      - printf '[{"name":"app","imageUri":"%s"}]' $REPOSITORY_URI:$IMAGE_TAG > imagedefinitions.json

artifacts:
  files:
    - imagedefinitions.json
```

---

## 信頼性レベルサマリー

| レベル | 件数 | 割合 |
|--------|------|------|
| 🔵 青信号 | 4項目 | 40% |
| 🟡 黄信号 | 6項目 | 60% |
| 🔴 赤信号 | 0項目 | 0% |

**品質評価**: 要改善 - CI/CD の詳細設計について追加ヒアリングを推奨

---

## 12. TDD 進捗状況

| フェーズ | ステータス | 完了日 | レポート |
|---------|----------|--------|----------|
| TaskNote | ✅ 完了 | 2026-02-01 | 本ドキュメント |
| Requirements | ✅ 完了 | 2026-02-01 | `cicd-pipeline-requirements.md` |
| TestCases | ✅ 完了 | 2026-02-01 | `cicd-pipeline-testcases.md` |
| Red | ✅ 完了 | 2026-02-01 | - |
| Green | ✅ 完了 | 2026-02-01 | - |
| Refactor | ✅ 完了 | 2026-02-01 | - |
| Verify | ✅ 完了 | 2026-02-02 | `completion-report.md` |

**ステータス**: TDD開発完了（31/31テストケース全通過）
