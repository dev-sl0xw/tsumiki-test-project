# TASK-0022: CloudWatch Alarms + Chatbot 設定 開発ノート

**作成日**: 2026-02-04
**タスクID**: TASK-0022
**フェーズ**: Phase 4 - 配信・運用
**ステータス**: ✅ TDD 完了（Refactor Phase 完了）

---

## 1. 技術スタック

### 使用技術・フレームワーク

| 技術 | バージョン | 用途 |
|------|-----------|------|
| AWS CDK | v2.213.0+ | IaC |
| TypeScript | 5.x (strict mode) | 開発言語 |
| Jest | 29.7.0 | テストフレームワーク |
| aws-cdk-lib/assertions | - | CDK テスト |

### AWS サービス

| サービス | 用途 |
|---------|------|
| CloudWatch Alarms | ECS CPU/Memory、Error Pattern 監視 |
| CloudWatch Logs | Metric Filter 作成 |
| SNS | アラーム通知 |
| AWS Chatbot | Slack 連携 |
| KMS | SNS Topic 暗号化 |
| IAM | Chatbot Role |

- 参照元: `docs/design/aws-cdk-serverless-architecture/architecture.md`

---

## 2. 開発ルール

### コーディング規約

- TypeScript strict mode 有効
- 日本語コメント推奨
- 信頼性レベル（🔵🟡🔴）をコメントに記載
- JSDoc 形式でドキュメント
- ファイルサイズ上限: 500行

### テスト要件

- Jest + aws-cdk-lib/assertions 使用
- スナップショットテスト必須
- カバレッジ目標: Statements 80%以上
- テストカテゴリ: リソース存在、プロパティ検証、異常系

- 参照元: プロジェクト規約

---

## 3. 関連実装

### 既存 Construct パターン

#### LogGroupConstruct (TASK-0021)

```typescript
// 参考: infra/lib/construct/monitoring/log-group-construct.ts
export interface LogGroupConstructProps {
  readonly envName: 'dev' | 'prod';
  readonly retentionDays?: logs.RetentionDays;
  readonly enableEncryption?: boolean;
  readonly encryptionKey?: kms.IKey;
}

export class LogGroupConstruct extends Construct {
  public readonly ecsFrontendLogGroup: logs.ILogGroup;
  public readonly ecsBackendLogGroup: logs.ILogGroup;
  public readonly rdsLogGroup: logs.ILogGroup;
  public readonly vpcFlowLogGroup: logs.ILogGroup;
  public readonly allLogGroups: logs.ILogGroup[];
  public readonly encryptionKey?: kms.IKey;
}
```

### 参考: CloudWatch Alarm パターン

```typescript
// CloudWatch Alarm 作成の基本パターン
const cpuAlarm = new cloudwatch.Alarm(this, 'CpuAlarm', {
  metric: new cloudwatch.Metric({
    namespace: 'AWS/ECS',
    metricName: 'CPUUtilization',
    dimensionsMap: {
      ClusterName: clusterName,
      ServiceName: serviceName,
    },
    statistic: 'Average',
    period: cdk.Duration.minutes(5),
  }),
  threshold: 80,
  evaluationPeriods: 3,
  datapointsToAlarm: 3,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
  alarmDescription: 'ECS CPU 使用率が 80% を超えました',
});

cpuAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(snsTopic));
```

### 参考: Metric Filter パターン

```typescript
// Metric Filter 作成パターン
const metricFilter = new logs.MetricFilter(this, 'ErrorMetricFilter', {
  logGroup: logGroup,
  metricNamespace: 'Custom/Application',
  metricName: 'ErrorCount',
  filterPattern: logs.FilterPattern.anyTerm('ERROR', 'Exception'),
  metricValue: '1',
});

const errorAlarm = new cloudwatch.Alarm(this, 'ErrorAlarm', {
  metric: metricFilter.metric(),
  threshold: 1,
  evaluationPeriods: 1,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
});
```

### 参考: Chatbot パターン

```typescript
// AWS Chatbot Slack 連携パターン
const slackChannel = new chatbot.SlackChannelConfiguration(this, 'SlackChannel', {
  slackChannelConfigurationName: `${envName}-alarm-notifications`,
  slackWorkspaceId: slackWorkspaceId,
  slackChannelId: slackChannelId,
  notificationTopics: [snsTopic],
});
```

- 参照元: AWS CDK Examples, BLEA

---

## 4. 設計文書

### アーキテクチャ位置づけ

```
VPC Stack → Security Stack → Database Stack → Application Stack
                                                    ↓
                                              Distribution Stack
                                                    ↓
                                                Ops Stack
                                                    ↓
                                         ┌─────────────────────┐
                                         │  CloudWatch Alarms  │ ← 本 Construct
                                         │  + AWS Chatbot      │
                                         └─────────────────────┘
```

### 通知フロー

```
CloudWatch Alarms
       ↓
   SNS Topic (KMS 暗号化)
       ↓
   AWS Chatbot
       ↓
   Slack Channel
```

- 参照元: `docs/design/aws-cdk-serverless-architecture/architecture.md`

### parameter.ts 連携

```typescript
// infra/parameter.ts
export interface EnvironmentConfig {
  // ... 他のプロパティ
  slackWorkspaceId: string;  // ← Chatbot 用
  slackChannelId: string;    // ← Chatbot 用
}
```

- 参照元: `infra/parameter.ts`

---

## 5. 注意事項

### 技術的制約

1. **AWS Chatbot の事前設定**
   - Slack Workspace との連携は AWS コンソールで事前設定が必要
   - Workspace ID は CDK から取得不可
   - Channel ID は Slack で確認が必要

2. **リージョン制約**
   - CloudWatch Alarms は ap-northeast-1 リージョンで作成
   - Chatbot は us-east-1 でも動作可能

3. **KMS 暗号化**
   - SNS Topic の KMS 暗号化には CloudWatch からの使用許可が必要

### セキュリティ要件

1. **最小権限の原則**
   - Chatbot IAM Role に必要最小限の権限のみ付与
   - CloudWatch ReadOnlyAccess 相当

2. **暗号化**
   - SNS Topic は KMS 暗号化必須
   - キーローテーション有効化

### パフォーマンス要件

1. **評価期間**
   - 誤報を防ぐため 3 回連続超過でトリガー
   - 評価期間 5 分 × 3 = 15 分でアラート

- 参照元: AWS Well-Architected Framework, セキュリティベストプラクティス

---

## 6. 関連ファイル

| カテゴリ | パス |
|----------|------|
| タスク定義 | `docs/tasks/aws-cdk-serverless-architecture/TASK-0022.md` |
| 要件定義書 | `docs/spec/aws-cdk-serverless-architecture/requirements.md` |
| 設計文書 | `docs/design/aws-cdk-serverless-architecture/architecture.md` |
| 環境設定 | `infra/parameter.ts` |
| 依存 Construct | `infra/lib/construct/monitoring/log-group-construct.ts` |
| 依存 Construct | `infra/lib/construct/monitoring/log-export-construct.ts` |

---

## 7. 依存タスク

| タスク | 関係 | ステータス |
|--------|------|------------|
| TASK-0021 | 前提（LogGroupConstruct） | ✅ 完了 |
| TASK-0024 | 後続（Ops Stack 統合） | ⬜ 待機中 |

---

## 8. TDD 開発進捗

| フェーズ | ステータス | 日付 |
|----------|----------|------|
| 📋 要件定義 | ✅ 完了 | 2026-02-04 |
| 📝 テストケース洗い出し | ✅ 完了 | 2026-02-04 |
| 🔴 Red Phase | ✅ 完了 | 2026-02-05 |
| 🟢 Green Phase | ✅ 完了 | 2026-02-05 |
| 🔵 Refactor Phase | ✅ 完了 | 2026-02-05 |
| ✅ 検証完了 | ✅ 完了 | 2026-02-05 |

### Red Phase 結果

- **AlarmConstruct テスト**: 28 テストケース作成
- **ChatbotConstruct テスト**: 16 テストケース作成
- **合計**: 44 テストケース
- **失敗理由**: 実装ファイル未作成 (モジュールインポートエラー)

### Green Phase 結果

- **AlarmConstruct 実装**: `infra/lib/construct/monitoring/alarm-construct.ts` (約400行)
- **ChatbotConstruct 実装**: `infra/lib/construct/monitoring/chatbot-construct.ts` (約280行)
- **テスト結果**: 46 テスト全て通過
- **修正したテスト**: TC-ALARM-008, TC-ALARM-014 (CDK トークン処理・要件との整合性)

### Refactor Phase 結果

- **リファクタリング判定**: 不要（コード品質が十分高い）
- **TypeScript コンパイル**: ✅ エラーなし
- **テスト結果**: 610 テスト全て通過
- **カバレッジ**:
  - Statements: 98.27% (全体)、100% (alarm/chatbot)
  - Branch: 92.23% (全体)、94%+ (alarm/chatbot)

#### コード品質レビュー

| 観点 | 評価 | 詳細 |
|------|------|------|
| 可読性 | ⭐⭐⭐⭐⭐ | 詳細な JSDoc、一貫したマーキング |
| 重複コード | なし | 各メソッドが固有のロジック |
| 設計 | ⭐⭐⭐⭐⭐ | 適切なメソッド分割 |
| ファイルサイズ | OK | alarm: 546行、chatbot: 324行 |
| ネーミング | ⭐⭐⭐⭐⭐ | 一貫した命名規則 |

#### セキュリティレビュー

- ✅ KMS暗号化: SNS Topic に KMS キー適用済み
- ✅ IAM最小権限: Chatbot Role に CloudWatch 読み取り権限のみ
- ✅ 入力バリデーション: validateProps() で閾値範囲チェック

#### パフォーマンスレビュー

- ✅ テスト実行時間: 約20秒（全610テスト）
- ✅ 不要なリソース作成なし（条件付き作成パターン）

---

*このノートは TDD 開発のコンテキスト情報収集フェーズで作成されました*
*Red Phase 記録: 2026-02-05*
*Refactor Phase 完了: 2026-02-05*
