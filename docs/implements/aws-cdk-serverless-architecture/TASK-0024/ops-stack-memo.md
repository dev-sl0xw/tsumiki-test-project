# TDD開発メモ: Ops Stack

## 概要

- 機能名: Ops Stack 統合 + 最終統合テスト
- タスクID: TASK-0024
- 開発開始: 2026-02-05
- 現在のフェーズ: **完了**（Verify Complete フェーズ完了）

## 関連ファイル

- 元タスクファイル: `docs/tasks/aws-cdk-serverless-architecture/TASK-0024.md`
- 要件定義: `docs/implements/aws-cdk-serverless-architecture/TASK-0024/ops-stack-requirements.md`
- テストケース定義: `docs/implements/aws-cdk-serverless-architecture/TASK-0024/ops-stack-testcases.md`
- 実装ファイル: `infra/lib/stack/ops-stack.ts`
- テストファイル: `infra/test/ops-stack.test.ts`

---

## Red フェーズ（失敗するテスト作成）

### 作成日時

2026-02-05

### テストケース

**合計**: 20 テストケース

| 分類 | テスト数 |
|------|----------|
| スナップショット | 2 |
| Construct 統合 | 6 |
| 異常系（バリデーション） | 3 |
| オプション設定 | 5 |
| 環境別設定 | 2 |
| セキュリティ | 2 |

### テストコード

テストファイル: `infra/test/ops-stack.test.ts`

主要なテストパターン:

```typescript
// 1. スナップショットテスト
expect(template.toJSON()).toMatchSnapshot();

// 2. リソース存在確認
template.resourceCountIs('AWS::Logs::LogGroup', 4);

// 3. プロパティ検証
template.hasResourceProperties('AWS::Logs::LogGroup', {
  RetentionInDays: 3,
});

// 4. 公開プロパティ検証
expect(stack.logGroups).toBeDefined();

// 5. バリデーションエラー検証
expect(() => new OpsStack(...)).toThrow();

// 6. 出力検証
template.hasOutput('AlarmTopicArn', {
  Value: Match.anyValue(),
});
```

### 期待される失敗

```
FAIL test/ops-stack.test.ts
  ● Test suite failed to run

    test/ops-stack.test.ts:28:26 - error TS2307: Cannot find module '../lib/stack/ops-stack' or its corresponding type declarations.

    28 import { OpsStack } from '../lib/stack/ops-stack';
```

**失敗理由**: `OpsStack` クラスが未実装のため、モジュールのインポートに失敗

### 次のフェーズへの要求事項

#### 1. OpsStack クラスの作成

**ファイル**: `infra/lib/stack/ops-stack.ts`

**必須実装項目**:

1. **OpsStackProps インターフェース**
   - config: EnvironmentConfig
   - ecsCluster: ecs.ICluster
   - ecsServices: { frontend, backend }
   - vpc: ec2.IVpc
   - enableLogExport?: boolean
   - enableChatbot?: boolean
   - enableCicd?: boolean

2. **バリデーション**
   - validateEnvName() メソッド
   - 空文字、長さ、形式チェック

3. **Construct 統合**
   - LogGroupConstruct（4 Log Groups）
   - AlarmConstruct（SNS Topic 含む）
   - ChatbotConstruct（オプション）
   - LogExportConstruct（オプション）
   - CodeCommit/CodeBuild/CodePipeline（オプション）

4. **公開プロパティ**
   - logGroups
   - alarms
   - alarmTopic

5. **CfnOutput**
   - AlarmTopicArn

---

## Green フェーズ（最小実装）

### 実装日時

2026-02-05

### 実装方針

1. **既存 Construct 統合**: TDD 完了済みの Construct のみ使用
2. **DistributionStack パターン踏襲**: バリデーション、CfnOutput、Props 設計
3. **オプション機能の条件付き作成**: enableLogExport, enableChatbot, enableCicd フラグで制御

### 実装コード

**ファイル**: `infra/lib/stack/ops-stack.ts`

```typescript
export class OpsStack extends cdk.Stack {
  public readonly logGroups: LogGroupConstruct;
  public readonly alarms: AlarmConstruct;
  public readonly alarmTopic: sns.ITopic;
  public readonly chatbot?: ChatbotConstruct;
  public readonly pipeline?: CodePipelineConstruct;

  constructor(scope: Construct, id: string, props: OpsStackProps) {
    super(scope, id, props);

    // バリデーション
    this.validateEnvName(props.config.envName);

    // Step 1: LogGroupConstruct 作成
    this.logGroups = new LogGroupConstruct(this, 'LogGroups', {...});

    // Step 2: AlarmConstruct 作成
    this.alarms = new AlarmConstruct(this, 'Alarms', {...});
    this.alarmTopic = this.alarms.alarmTopic;

    // Step 3: ChatbotConstruct 作成（条件付き）
    if (enableChatbot) {
      this.chatbot = new ChatbotConstruct(this, 'Chatbot', {...});
    }

    // Step 4: LogExportConstruct 作成（条件付き）
    if (enableLogExport) {
      new LogExportConstruct(this, 'LogExport', {...});
    }

    // Step 5: CI/CD Constructs 作成（条件付き）
    if (enableCicd) {
      // CodeCommit, CodeBuild, CodePipeline
    }

    // CfnOutput 定義
    this.createCfnOutputs(envName);
  }
}
```

### テスト結果

```
PASS test/ops-stack.test.ts (12.498 s)
  OpsStack
    TC-OS-01〜02: スナップショットテスト ✓
    TC-OS-03: LogGroupConstruct 統合テスト ✓
    TC-OS-04: AlarmConstruct 統合テスト ✓
    TC-OS-05: ChatbotConstruct 統合テスト ✓
    TC-OS-06: CI/CD Pipeline 統合テスト ✓
    TC-OS-07: Stack 公開プロパティテスト ✓
    TC-OS-08: CfnOutput 出力テスト ✓
    TC-OS-09〜11: バリデーションエラーテスト ✓
    TC-OS-12〜16: オプション設定テスト ✓
    TC-OS-17〜18: 環境別設定テスト ✓
    TC-OS-21〜22: セキュリティテスト ✓

Test Suites: 1 passed, 1 total
Tests:       27 passed, 27 total
Snapshots:   2 written, 2 total
```

### 課題・改善点

1. **CDK トークン問題**: Cross-Stack 参照時の serviceName トークン問題を静的名前で回避
2. **Deprecation 警告**: `containerInsights` → `containerInsightsV2` 移行推奨（テストコード側）
3. **Refactor 候補**: ヘルパーメソッドの追加抽出検討

---

## Refactor フェーズ（品質改善）

### リファクタ日時

2026-02-06

### 改善内容

1. **ログ保持期間マッピングの定数化** 🔵
   - `RETENTION_DAYS_MAP` 定数を外出し
   - `DEFAULT_RETENTION_DAYS` 定数を追加
   - パフォーマンス向上（毎回のオブジェクト生成回避）

2. **CI/CD 生成ロジックの分離** 🔵
   - `createCicdPipeline()` ヘルパーメソッドを追加
   - コンストラクタの可読性向上
   - 単一責任原則の適用

3. **ファイルヘッダー更新** 🔵
   - Green Phase → Refactor Phase 完了表示

4. **コメント強化** 🔵
   - 定数、メソッドのコメント充実
   - 信頼性レベルの更新

### セキュリティレビュー

| 項目 | 結果 | 備考 |
|------|------|------|
| KMS 暗号化 | ✅ 有効 | SNS Topic, CloudWatch Logs |
| IAM 最小権限 | ✅ 適用済 | 各 Construct で設定 |
| 入力値検証 | ✅ 実装済 | validateEnvName() |
| 機密情報露出 | ✅ なし | Props に機密情報なし |

**脆弱性**: なし

### パフォーマンスレビュー

| 項目 | 結果 | 備考 |
|------|------|------|
| 定数マッピング | ✅ 最適化済 | インラインから定数に変更 |
| オブジェクト生成 | ✅ 最小限 | 不要な生成を削減 |
| メソッド複雑度 | ✅ 低い | 各メソッドが単一責任 |

### 最終コード

**ファイル**: `infra/lib/stack/ops-stack.ts` (458行)

```
構造:
├── 定数定義 (7個)
│   ├── MAX_ENV_NAME_LENGTH, ENV_NAME_PATTERN
│   ├── ERROR_ENV_NAME_* (3個)
│   ├── RETENTION_DAYS_MAP (新規)
│   └── DEFAULT_RETENTION_DAYS (新規)
├── OpsStackProps インターフェース
├── OpsStack クラス
│   ├── 公開プロパティ (5個)
│   └── プライベートメソッド (4個)
│       ├── validateEnvName()
│       ├── getRetentionDays() (改善)
│       ├── createCicdPipeline() (新規)
│       └── createCfnOutputs()
```

### 品質評価

```
✅ 高品質:
- テスト結果: 全27テスト継続成功
- セキュリティ: 重大な脆弱性なし
- パフォーマンス: 最適化完了
- リファクタ品質: 目標達成
- コード品質: 458行（500行制限内）
- ドキュメント: 完成
```

---

## 開発履歴

| 日時 | フェーズ | 内容 |
|------|---------|------|
| 2026-02-05 | 要件定義 | ops-stack-requirements.md 作成 |
| 2026-02-05 | テストケース | ops-stack-testcases.md 作成（22件） |
| 2026-02-05 | Red | ops-stack.test.ts 作成（20件）、失敗確認完了 |
| 2026-02-05 | Green | ops-stack.ts 作成、全27テスト通過、スナップショット2件生成 |
| 2026-02-06 | Refactor | 定数抽出、ヘルパーメソッド分離、コメント強化、品質評価完了 |
| 2026-02-06 | Verify Complete | 完全性検証完了、要件カバレッジ100%、27テスト全通過 |

---

## 注意事項

### 技術的制約

1. **Construct 新規作成禁止**: 既存の TDD 完了済み Construct のみ使用
2. **循環参照禁止**: Ops Stack は Application Stack を参照するが、逆参照は禁止
3. **Props 必須項目**: config, ecsCluster, ecsServices, vpc は必須

### 既存 Construct との整合性

- LogGroupConstruct: envName, retentionDays, enableEncryption
- AlarmConstruct: envName, ecsClusterName, ecsServiceNames, logGroups, config
- ChatbotConstruct: envName, slackWorkspaceId, slackChannelId, snsTopics
- LogExportConstruct: envName, enableExport, logGroups, glacierTransitionDays
- CodeCommit/CodeBuild/CodePipeline: 各 Props を参照

### パターン参考

- DistributionStack: バリデーション、CfnOutput、Props 設計
- ApplicationStack: 複数 Construct 統合、依存関係
