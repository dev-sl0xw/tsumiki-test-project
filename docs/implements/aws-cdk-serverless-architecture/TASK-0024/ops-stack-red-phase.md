# TASK-0024: Ops Stack Red フェーズ記録

**タスクID**: TASK-0024
**機能名**: Ops Stack 統合 + 最終統合テスト
**フェーズ**: Red Phase（失敗するテスト作成）
**作成日**: 2026-02-05

---

## 作成したテストケース一覧

| テストID | テスト名 | 分類 | 信頼性 |
|----------|---------|------|--------|
| TC-OS-01 | スナップショットテスト（devConfig） | スナップショット | 🔵 |
| TC-OS-02 | スナップショットテスト（prodConfig） | スナップショット | 🔵 |
| TC-OS-03 | LogGroupConstruct 統合テスト | Construct 統合 | 🔵 |
| TC-OS-04 | AlarmConstruct 統合テスト | Construct 統合 | 🔵 |
| TC-OS-05 | ChatbotConstruct 統合テスト（有効時） | Construct 統合 | 🔵 |
| TC-OS-06 | CI/CD Pipeline 統合テスト | Construct 統合 | 🔵 |
| TC-OS-07 | Stack 公開プロパティテスト | 公開プロパティ | 🔵 |
| TC-OS-08 | CfnOutput 出力テスト | 出力 | 🔵 |
| TC-OS-09 | envName 空バリデーションエラー | 異常系 | 🔵 |
| TC-OS-10 | envName 長さバリデーションエラー | 異常系 | 🔵 |
| TC-OS-11 | envName 形式バリデーションエラー | 異常系 | 🔵 |
| TC-OS-12 | Chatbot 無効時のテスト | オプション | 🔵 |
| TC-OS-13 | Slack 設定なしで Chatbot 有効時 | オプション | 🔵 |
| TC-OS-14 | CI/CD 無効時のテスト | オプション | 🔵 |
| TC-OS-15 | LogExport 有効時のテスト（Prod） | オプション | 🔵 |
| TC-OS-16 | LogExport 無効時のテスト（Dev） | オプション | 🔵 |
| TC-OS-17 | Dev 環境設定の適用確認 | 環境別 | 🔵 |
| TC-OS-18 | Prod 環境設定の適用確認 | 環境別 | 🔵 |
| TC-OS-21 | CloudWatch Logs 暗号化テスト | セキュリティ | 🔵 |
| TC-OS-22 | SNS Topic 暗号化テスト | セキュリティ | 🔵 |

**合計**: 20 テストケース（TC-OS-19, TC-OS-20 統合テストは実装対象外として別途実施予定）

---

## テストコード

テストファイル: `infra/test/ops-stack.test.ts`

```typescript
// 詳細は infra/test/ops-stack.test.ts を参照
```

---

## 期待される失敗内容

### 現在の失敗

```
FAIL test/ops-stack.test.ts
  ● Test suite failed to run

    test/ops-stack.test.ts:28:26 - error TS2307: Cannot find module '../lib/stack/ops-stack' or its corresponding type declarations.

    28 import { OpsStack } from '../lib/stack/ops-stack';
```

### 失敗の理由

`OpsStack` クラスがまだ実装されていないため、モジュールのインポートに失敗しています。これは TDD Red フェーズの正常な状態です。

---

## Green フェーズで実装すべき内容

### 1. OpsStack クラスの作成

**ファイル**: `infra/lib/stack/ops-stack.ts`

```typescript
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../../parameter';
import { LogGroupConstruct } from '../construct/monitoring/log-group-construct';
import { AlarmConstruct } from '../construct/monitoring/alarm-construct';
import { ChatbotConstruct } from '../construct/monitoring/chatbot-construct';
import { LogExportConstruct } from '../construct/monitoring/log-export-construct';
import { CodeCommitConstruct } from '../construct/cicd/codecommit-construct';
import { CodeBuildConstruct } from '../construct/cicd/codebuild-construct';
import { CodePipelineConstruct } from '../construct/cicd/codepipeline-construct';

export interface OpsStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  ecsCluster: ecs.ICluster;
  ecsServices: {
    frontend: ecs.IService;
    backend: ecs.IService;
  };
  vpc: ec2.IVpc;
  enableLogExport?: boolean;
  enableChatbot?: boolean;
  enableCicd?: boolean;
}

export class OpsStack extends cdk.Stack {
  public readonly logGroups: LogGroupConstruct;
  public readonly alarms: AlarmConstruct;
  public readonly alarmTopic: sns.ITopic;
  public readonly chatbot?: ChatbotConstruct;
  public readonly pipeline?: CodePipelineConstruct;

  constructor(scope: Construct, id: string, props: OpsStackProps) {
    super(scope, id, props);
    // 実装内容...
  }
}
```

### 2. 実装すべき機能

1. **バリデーション**
   - envName の空文字チェック
   - envName の長さチェック（20文字以下）
   - envName の形式チェック（英数字とハイフンのみ）

2. **Construct 統合**
   - LogGroupConstruct: ECS Frontend/Backend、RDS、VPC Flow Logs 用
   - AlarmConstruct: ECS CPU/Memory Alarm、Error Pattern Alarm
   - ChatbotConstruct: Slack 連携（オプション）
   - LogExportConstruct: S3 Glacier エクスポート（オプション）
   - CodeCommit/CodeBuild/CodePipeline: CI/CD パイプライン（オプション）

3. **公開プロパティ**
   - logGroups: LogGroupConstruct
   - alarms: AlarmConstruct
   - alarmTopic: sns.ITopic

4. **CfnOutput**
   - AlarmTopicArn: SNS Topic ARN

---

## 信頼性レベルサマリー

| レベル | 件数 | 割合 |
|--------|------|------|
| 🔵 青信号 | 20 | 100% |
| 🟡 黄信号 | 0 | 0% |
| 🔴 赤信号 | 0 | 0% |

**品質評価**: ✅ **高品質** - すべてのテストケースが要件定義書・既存実装パターンに基づいて定義

---

## 次のステップ

```
次のお勧めステップ: `/tsumiki:tdd-green aws-cdk-serverless-architecture TASK-0024` で Green フェーズ（最小実装）を開始します。
```
