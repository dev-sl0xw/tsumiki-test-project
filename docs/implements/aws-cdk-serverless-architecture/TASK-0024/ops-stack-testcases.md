# TASK-0024: Ops Stack 統合 + 最終統合テスト テストケース定義書

**タスクID**: TASK-0024
**機能名**: Ops Stack 統合 + 最終統合テスト
**要件名**: aws-cdk-serverless-architecture
**作成日**: 2026-02-05
**テストファイル**: `infra/test/ops-stack.test.ts`

---

## テスト概要

### 開発言語・フレームワーク 🔵

**信頼性**: 🔵 *既存テストパターンより*

| 項目 | 値 |
|------|-----|
| **プログラミング言語** | TypeScript 5.x |
| **テストフレームワーク** | Jest 29.x |
| **CDK テストライブラリ** | aws-cdk-lib/assertions |
| **実行環境** | Node.js (testEnvironment: 'node') |

**言語選択の理由**: プロジェクト全体で TypeScript を使用しており、型安全性を活かしたテストが可能
**フレームワーク選択の理由**: AWS CDK 公式推奨の Jest + assertions ライブラリを使用

---

## テストヘルパー関数

### 必要なモックリソース作成関数 🔵

**信頼性**: 🔵 *既存テストパターン（distribution-stack.test.ts）より*

```typescript
// 【ヘルパー関数】: テスト用 VPC 作成
function createTestVpc(stack: cdk.Stack): ec2.IVpc;

// 【ヘルパー関数】: テスト用 ECS Cluster 作成
function createTestEcsCluster(stack: cdk.Stack): ecs.ICluster;

// 【ヘルパー関数】: テスト用 ECS Service 作成
function createTestEcsService(
  stack: cdk.Stack,
  cluster: ecs.ICluster,
  serviceName: string
): ecs.IService;

// 【ヘルパー関数】: テスト用 ECR Repository 作成
function createTestEcrRepository(stack: cdk.Stack, name: string): ecr.IRepository;
```

---

## 1. 正常系テストケース（基本的な動作）

### TC-OS-01: スナップショットテスト（devConfig） 🔵

**信頼性**: 🔵 *CDK ベストプラクティスより*

- **テスト名**: CloudFormation テンプレートのスナップショットテスト（Dev環境）
  - **何をテストするか**: Dev 環境設定での Ops Stack の CloudFormation テンプレート一貫性
  - **期待される動作**: テンプレートが保存されたスナップショットと完全一致する
- **入力値**: `devConfig`（logRetentionDays: 3, enableLogExport: false）
  - **入力データの意味**: 開発環境の標準設定で Stack を作成
- **期待される結果**: `toMatchSnapshot()` が成功
  - **期待結果の理由**: 意図しないテンプレート変更を検出するため
- **テストの目的**: CloudFormation テンプレートの回帰防止
  - **確認ポイント**: 全リソースの構成が変更されていないこと

```typescript
describe('TC-OS-01: スナップショットテスト（devConfig）', () => {
  // 【テスト目的】: CloudFormation テンプレートの一貫性を保証する
  // 【テスト内容】: OpsStack の CloudFormation テンプレートをスナップショットと比較
  // 【期待される動作】: テンプレートがスナップショットと一致する
  // 🔵 信頼性: CDK ベストプラクティスより

  test('CloudFormation テンプレートのスナップショットテスト（Dev環境）', () => {
    // 【テストデータ準備】: Dev 環境設定で OpsStack を作成
    // 【結果検証】: スナップショットと完全一致することを確認
    expect(template.toJSON()).toMatchSnapshot(); // 【確認内容】: テンプレート一致 🔵
  });
});
```

---

### TC-OS-02: スナップショットテスト（prodConfig） 🔵

**信頼性**: 🔵 *CDK ベストプラクティスより*

- **テスト名**: CloudFormation テンプレートのスナップショットテスト（Prod環境）
  - **何をテストするか**: Prod 環境設定での Ops Stack の CloudFormation テンプレート一貫性
  - **期待される動作**: テンプレートが保存されたスナップショットと完全一致する
- **入力値**: `prodConfig`（logRetentionDays: 30, enableLogExport: true, enableChatbot: true）
  - **入力データの意味**: 本番環境の標準設定で Stack を作成
- **期待される結果**: `toMatchSnapshot()` が成功
  - **期待結果の理由**: Prod 環境固有のリソース（LogExport, Chatbot）が含まれることを確認
- **テストの目的**: CloudFormation テンプレートの回帰防止
  - **確認ポイント**: Prod 固有リソースが正しく含まれていること

---

### TC-OS-03: LogGroupConstruct 統合テスト 🔵

**信頼性**: 🔵 *要件定義書 REQ-035, REQ-036, REQ-037 より*

- **テスト名**: CloudWatch Log Groups が正しく作成されること
  - **何をテストするか**: LogGroupConstruct が Stack に正しく統合されること
  - **期待される動作**: ECS Frontend/Backend、RDS、VPC Flow Logs 用の Log Group が作成される
- **入力値**: 標準的な OpsStackProps
  - **入力データの意味**: 必須リソースがすべて提供された状態
- **期待される結果**:
  - Log Group が 4 つ作成される（Frontend, Backend, RDS, VPC）
  - 各 Log Group に正しい Retention が設定される
- **テストの目的**: ログ収集機能の統合確認
  - **確認ポイント**: Log Group 数、Retention 設定、命名規則

```typescript
describe('TC-OS-03: LogGroupConstruct 統合テスト', () => {
  // 【テスト目的】: CloudWatch Log Groups が正しく作成されることを確認
  // 【テスト内容】: LogGroupConstruct の統合と設定値の検証
  // 【期待される動作】: 4 つの Log Group が適切な設定で作成される
  // 🔵 信頼性: 要件定義書 REQ-035, REQ-036, REQ-037 より

  test('CloudWatch Log Groups が正しく作成されること', () => {
    // 【リソース数確認】: Log Group が 4 つ存在することを確認 🔵
    template.resourceCountIs('AWS::Logs::LogGroup', 4);
  });

  test('Dev 環境で 3 日間のログ保持が設定されること', () => {
    // 【プロパティ確認】: RetentionInDays が 3 であることを確認 🔵
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      RetentionInDays: 3,
    });
  });
});
```

---

### TC-OS-04: AlarmConstruct 統合テスト 🔵

**信頼性**: 🔵 *要件定義書 REQ-039 より*

- **テスト名**: CloudWatch Alarms と SNS Topic が正しく作成されること
  - **何をテストするか**: AlarmConstruct が Stack に正しく統合されること
  - **期待される動作**: ECS CPU/Memory Alarm、Error Pattern Alarm、SNS Topic が作成される
- **入力値**: 標準的な OpsStackProps + ECS Cluster/Service 参照
  - **入力データの意味**: アラーム監視対象のリソースが提供された状態
- **期待される結果**:
  - CloudWatch Alarm が複数作成される
  - SNS Topic が 1 つ作成される
  - SNS Topic が KMS 暗号化される
- **テストの目的**: アラーム・通知機能の統合確認
  - **確認ポイント**: Alarm 数、SNS Topic 暗号化、閾値設定

```typescript
describe('TC-OS-04: AlarmConstruct 統合テスト', () => {
  // 【テスト目的】: CloudWatch Alarms と SNS Topic が正しく作成されることを確認
  // 【テスト内容】: AlarmConstruct の統合と設定値の検証
  // 【期待される動作】: Alarm と暗号化された SNS Topic が作成される
  // 🔵 信頼性: 要件定義書 REQ-039 より

  test('CloudWatch Alarms が作成されること', () => {
    // 【リソース存在確認】: Alarm リソースが存在することを確認 🔵
    template.resourceCountIs('AWS::CloudWatch::Alarm', Match.anyValue());
  });

  test('SNS Topic が KMS 暗号化されて作成されること', () => {
    // 【セキュリティ確認】: SNS Topic の KMS 暗号化を確認 🔵
    template.hasResourceProperties('AWS::SNS::Topic', {
      KmsMasterKeyId: Match.anyValue(),
    });
  });
});
```

---

### TC-OS-05: ChatbotConstruct 統合テスト（有効時） 🔵

**信頼性**: 🔵 *要件定義書 REQ-039, REQ-103 より*

- **テスト名**: AWS Chatbot が正しく作成されること（Slack 設定あり）
  - **何をテストするか**: ChatbotConstruct が有効な Slack 設定で正しく統合されること
  - **期待される動作**: Slack Channel Configuration と IAM Role が作成される
- **入力値**: `enableChatbot: true` + 有効な Slack 設定
  - **入力データの意味**: Chatbot が有効で Slack 連携が設定された状態
- **期待される結果**:
  - Chatbot SlackChannelConfiguration が 1 つ作成される
  - SNS Topic がサブスクライブされる
- **テストの目的**: Slack 通知機能の統合確認
  - **確認ポイント**: Chatbot 作成、SNS サブスクリプション

```typescript
describe('TC-OS-05: ChatbotConstruct 統合テスト（有効時）', () => {
  // 【テスト目的】: AWS Chatbot が正しく作成されることを確認
  // 【テスト内容】: ChatbotConstruct の統合と Slack 連携の検証
  // 【期待される動作】: Chatbot が作成され SNS Topic をサブスクライブする
  // 🔵 信頼性: 要件定義書 REQ-039, REQ-103 より

  test('Slack Channel Configuration が作成されること', () => {
    // 【リソース存在確認】: Chatbot リソースが存在することを確認 🔵
    template.resourceCountIs('AWS::Chatbot::SlackChannelConfiguration', 1);
  });
});
```

---

### TC-OS-06: CI/CD Pipeline 統合テスト 🔵

**信頼性**: 🔵 *要件定義書 REQ-040, REQ-041 より*

- **テスト名**: CodePipeline、CodeBuild、CodeCommit が正しく作成されること
  - **何をテストするか**: CI/CD 関連 Construct が Stack に正しく統合されること
  - **期待される動作**: CodeCommit Repository、CodeBuild Project、CodePipeline が作成される
- **入力値**: `enableCicd: true`（デフォルト）
  - **入力データの意味**: CI/CD が有効な状態
- **期待される結果**:
  - CodeCommit Repository が 1 つ作成される
  - CodeBuild Project が 1 つ作成される
  - CodePipeline が 1 つ作成される
- **テストの目的**: CI/CD パイプライン機能の統合確認
  - **確認ポイント**: リソース数、パイプラインステージ構成

```typescript
describe('TC-OS-06: CI/CD Pipeline 統合テスト', () => {
  // 【テスト目的】: CI/CD Pipeline が正しく作成されることを確認
  // 【テスト内容】: CodeCommit, CodeBuild, CodePipeline の統合検証
  // 【期待される動作】: 完全な CI/CD パイプラインが作成される
  // 🔵 信頼性: 要件定義書 REQ-040, REQ-041 より

  test('CodeCommit Repository が作成されること', () => {
    template.resourceCountIs('AWS::CodeCommit::Repository', 1); // 🔵
  });

  test('CodeBuild Project が作成されること', () => {
    template.resourceCountIs('AWS::CodeBuild::Project', 1); // 🔵
  });

  test('CodePipeline が作成されること', () => {
    template.resourceCountIs('AWS::CodePipeline::Pipeline', 1); // 🔵
  });
});
```

---

### TC-OS-07: Stack 公開プロパティテスト 🔵

**信頼性**: 🔵 *要件定義書・既存 Stack パターンより*

- **テスト名**: Stack の公開プロパティが正しく設定されること
  - **何をテストするか**: OpsStack の公開プロパティがアクセス可能であること
  - **期待される動作**: logGroups, alarms, alarmTopic などのプロパティが取得可能
- **入力値**: 標準的な OpsStackProps
  - **入力データの意味**: 正常な Stack 作成後の状態
- **期待される結果**:
  - `stack.logGroups` が定義されている
  - `stack.alarms` が定義されている
  - `stack.alarmTopic` が定義されている
- **テストの目的**: Stack 間連携のための公開プロパティ確認
  - **確認ポイント**: プロパティの存在と型

```typescript
describe('TC-OS-07: Stack 公開プロパティテスト', () => {
  // 【テスト目的】: Stack の公開プロパティが正しく設定されることを確認
  // 【テスト内容】: 各公開プロパティの存在と値を検証
  // 【期待される動作】: すべての公開プロパティがアクセス可能
  // 🔵 信頼性: 要件定義書・既存 Stack パターンより

  test('logGroups プロパティが定義されていること', () => {
    expect(stack.logGroups).toBeDefined(); // 🔵
  });

  test('alarms プロパティが定義されていること', () => {
    expect(stack.alarms).toBeDefined(); // 🔵
  });

  test('alarmTopic プロパティが定義されていること', () => {
    expect(stack.alarmTopic).toBeDefined(); // 🔵
  });
});
```

---

### TC-OS-08: CfnOutput 出力テスト 🔵

**信頼性**: 🔵 *既存 Stack パターン（DistributionStack）より*

- **テスト名**: CfnOutput が正しくエクスポートされること
  - **何をテストするか**: Stack の出力値が正しく設定されること
  - **期待される動作**: AlarmTopicArn がエクスポートされる
- **入力値**: 標準的な OpsStackProps
  - **入力データの意味**: 正常な Stack 作成後の状態
- **期待される結果**:
  - AlarmTopicArn 出力が存在する
  - Export 名が環境名を含む
- **テストの目的**: Stack 間参照のための出力確認
  - **確認ポイント**: 出力名、Export 名形式

```typescript
describe('TC-OS-08: CfnOutput 出力テスト', () => {
  // 【テスト目的】: CfnOutput が正しくエクスポートされることを確認
  // 【テスト内容】: Stack 出力値の存在と形式を検証
  // 【期待される動作】: 必要な出力値がすべてエクスポートされる
  // 🔵 信頼性: 既存 Stack パターン（DistributionStack）より

  test('AlarmTopicArn がエクスポートされること', () => {
    template.hasOutput('AlarmTopicArn', {
      Value: Match.anyValue(),
      Export: {
        Name: Match.stringLikeRegexp('.*-AlarmTopicArn'),
      },
    }); // 🔵
  });
});
```

---

## 2. 異常系テストケース（エラーハンドリング）

### TC-OS-09: envName が空の場合のバリデーションエラー 🔵

**信頼性**: 🔵 *既存 Stack パターン（DistributionStack）より*

- **テスト名**: envName が空文字の場合にエラーが発生すること
  - **エラーケースの概要**: config.envName が空文字で渡された場合
  - **エラー処理の重要性**: 環境識別子は必須であり、空の場合はリソース命名に問題が発生する
- **入力値**: `{ ...devConfig, envName: '' }`
  - **不正な理由**: envName は必須フィールドであり空文字は許可されない
  - **実際の発生シナリオ**: 設定ファイルのミス、環境変数の未設定
- **期待される結果**: Error がスローされる
  - **エラーメッセージの内容**: "envName cannot be empty" など明確なメッセージ
  - **システムの安全性**: Stack 作成が中断され、不正なリソースが作成されない
- **テストの目的**: 入力バリデーションの確認
  - **品質保証の観点**: 不正な設定での Stack 作成を防止

```typescript
describe('TC-OS-09: envName が空の場合のバリデーションエラー', () => {
  // 【テスト目的】: envName が空の場合にエラーが発生することを確認
  // 【テスト内容】: 空の envName でスタック作成を試行
  // 【期待される動作】: バリデーションエラーがスローされる
  // 🔵 信頼性: 既存 Stack パターン（DistributionStack）より

  test('envName が空文字の場合にエラーが発生すること', () => {
    const invalidConfig = { ...devConfig, envName: '' };

    expect(() => {
      new OpsStack(app, 'InvalidStack', {
        config: invalidConfig,
        ecsCluster: testCluster,
        ecsServices: testServices,
        vpc: testVpc,
        env: testEnv,
      });
    }).toThrow(); // 🔵
  });
});
```

---

### TC-OS-10: envName が長すぎる場合のバリデーションエラー 🔵

**信頼性**: 🔵 *既存 Stack パターン（DistributionStack）より*

- **テスト名**: envName が 20 文字を超える場合にエラーが発生すること
  - **エラーケースの概要**: config.envName が最大長を超えた場合
  - **エラー処理の重要性**: AWS リソース名には長さ制限があるため
- **入力値**: `{ ...devConfig, envName: 'a'.repeat(21) }`
  - **不正な理由**: envName は 20 文字以下に制限される
  - **実際の発生シナリオ**: 長い環境名（例: "development-feature-branch-123"）の使用
- **期待される結果**: Error がスローされる
  - **エラーメッセージの内容**: "envName must be 20 characters or less"
  - **システムの安全性**: AWS リソース名制限違反を事前に防止
- **テストの目的**: 境界値バリデーションの確認
  - **品質保証の観点**: AWS 制限に起因するデプロイエラーを防止

```typescript
describe('TC-OS-10: envName が長すぎる場合のバリデーションエラー', () => {
  // 【テスト目的】: envName が最大長を超える場合にエラーが発生することを確認
  // 【テスト内容】: 21 文字の envName でスタック作成を試行
  // 【期待される動作】: バリデーションエラーがスローされる
  // 🔵 信頼性: 既存 Stack パターン（DistributionStack）より

  test('envName が 20 文字を超える場合にエラーが発生すること', () => {
    const invalidConfig = { ...devConfig, envName: 'a'.repeat(21) };

    expect(() => {
      new OpsStack(app, 'InvalidStack', {
        config: invalidConfig,
        ecsCluster: testCluster,
        ecsServices: testServices,
        vpc: testVpc,
        env: testEnv,
      });
    }).toThrow(); // 🔵
  });
});
```

---

### TC-OS-11: envName が不正な形式の場合のバリデーションエラー 🔵

**信頼性**: 🔵 *既存 Stack パターン（DistributionStack）より*

- **テスト名**: envName に不正な文字が含まれる場合にエラーが発生すること
  - **エラーケースの概要**: envName に許可されない文字（スペース、特殊文字等）が含まれる場合
  - **エラー処理の重要性**: AWS リソース名に使用できない文字を含む場合、デプロイ時にエラーになる
- **入力値**: `{ ...devConfig, envName: 'dev env' }` または `{ ...devConfig, envName: 'dev@prod' }`
  - **不正な理由**: envName は英数字とハイフンのみ許可
  - **実際の発生シナリオ**: ユーザー入力による環境名設定
- **期待される結果**: Error がスローされる
  - **エラーメッセージの内容**: "envName must match pattern ^[a-z0-9-]+$"
  - **システムの安全性**: 不正なリソース名によるデプロイ失敗を防止
- **テストの目的**: 入力形式バリデーションの確認
  - **品質保証の観点**: 設定エラーの早期検出

```typescript
describe('TC-OS-11: envName が不正な形式の場合のバリデーションエラー', () => {
  // 【テスト目的】: envName に不正な文字が含まれる場合にエラーが発生することを確認
  // 【テスト内容】: 不正な形式の envName でスタック作成を試行
  // 【期待される動作】: バリデーションエラーがスローされる
  // 🔵 信頼性: 既存 Stack パターン（DistributionStack）より

  test('envName にスペースが含まれる場合にエラーが発生すること', () => {
    const invalidConfig = { ...devConfig, envName: 'dev env' };

    expect(() => {
      new OpsStack(app, 'InvalidStack', {
        config: invalidConfig,
        ecsCluster: testCluster,
        ecsServices: testServices,
        vpc: testVpc,
        env: testEnv,
      });
    }).toThrow(); // 🔵
  });
});
```

---

## 3. 境界値テストケース（オプション設定）

### TC-OS-12: Chatbot 無効時のテスト 🔵

**信頼性**: 🔵 *要件定義書・ChatbotConstruct 実装より*

- **テスト名**: enableChatbot: false の場合に Chatbot が作成されないこと
  - **境界値の意味**: オプション機能の無効化境界
  - **境界値での動作保証**: 無効化時にリソースが作成されないことを確認
- **入力値**: `enableChatbot: false`
  - **境界値選択の根拠**: オプション機能の無効化は重要な境界条件
  - **実際の使用場面**: Dev 環境や Slack 未設定環境でのデプロイ
- **期待される結果**: Chatbot SlackChannelConfiguration が 0 個
  - **境界での正確性**: 不要なリソースが作成されない
  - **一貫した動作**: 無効化フラグが正しく機能する
- **テストの目的**: オプション機能の無効化確認
  - **堅牢性の確認**: 不要なリソース作成によるコスト増を防止

```typescript
describe('TC-OS-12: Chatbot 無効時のテスト', () => {
  // 【テスト目的】: Chatbot 無効時にリソースが作成されないことを確認
  // 【テスト内容】: enableChatbot: false でスタック作成
  // 【期待される動作】: Chatbot 関連リソースが 0 個
  // 🔵 信頼性: 要件定義書・ChatbotConstruct 実装より

  test('enableChatbot: false の場合に Chatbot が作成されないこと', () => {
    const stackWithoutChatbot = new OpsStack(app, 'NoChatbotStack', {
      config: devConfig,
      ecsCluster: testCluster,
      ecsServices: testServices,
      vpc: testVpc,
      enableChatbot: false,
      env: testEnv,
    });
    const templateWithoutChatbot = Template.fromStack(stackWithoutChatbot);

    templateWithoutChatbot.resourceCountIs('AWS::Chatbot::SlackChannelConfiguration', 0); // 🔵
  });
});
```

---

### TC-OS-13: Slack 設定なしで Chatbot 有効時のテスト 🔵

**信頼性**: 🔵 *ChatbotConstruct 実装より*

- **テスト名**: Slack 設定がない場合に Chatbot がスキップされること
  - **境界値の意味**: 必要な設定が欠けている場合の動作
  - **境界値での動作保証**: 設定不足時にエラーではなくスキップすることを確認
- **入力値**: `enableChatbot: true` + `slackWorkspaceId: ''`, `slackChannelId: ''`
  - **境界値選択の根拠**: 有効化フラグと実際の設定値の不整合
  - **実際の使用場面**: 設定ファイルの移行時、環境変数未設定時
- **期待される結果**: Chatbot が作成されない（エラーではなくスキップ）
  - **境界での正確性**: グレースフルデグラデーション
  - **一貫した動作**: 設定不足時も安全にデプロイ可能
- **テストの目的**: グレースフルデグラデーションの確認
  - **堅牢性の確認**: 設定不足でもデプロイが失敗しない

```typescript
describe('TC-OS-13: Slack 設定なしで Chatbot 有効時のテスト', () => {
  // 【テスト目的】: Slack 設定がない場合に Chatbot がスキップされることを確認
  // 【テスト内容】: enableChatbot: true + 空の Slack 設定でスタック作成
  // 【期待される動作】: Chatbot が作成されない（エラーではなくスキップ）
  // 🔵 信頼性: ChatbotConstruct 実装より

  test('Slack 設定がない場合に Chatbot がスキップされること', () => {
    const configWithoutSlack = {
      ...devConfig,
      slackWorkspaceId: '',
      slackChannelId: '',
    };

    // エラーが発生しないことを確認
    expect(() => {
      new OpsStack(app, 'NoSlackStack', {
        config: configWithoutSlack,
        ecsCluster: testCluster,
        ecsServices: testServices,
        vpc: testVpc,
        enableChatbot: true, // 有効化しているが Slack 設定なし
        env: testEnv,
      });
    }).not.toThrow(); // 🔵
  });
});
```

---

### TC-OS-14: CI/CD 無効時のテスト 🔵

**信頼性**: 🔵 *要件定義書より*

- **テスト名**: enableCicd: false の場合に CI/CD リソースが作成されないこと
  - **境界値の意味**: CI/CD 機能の無効化境界
  - **境界値での動作保証**: 無効化時にパイプライン関連リソースが作成されない
- **入力値**: `enableCicd: false`
  - **境界値選択の根拠**: CI/CD は外部システムで管理される場合もある
  - **実際の使用場面**: 既存の CI/CD システムを使用する場合
- **期待される結果**: CodeCommit, CodeBuild, CodePipeline が 0 個
  - **境界での正確性**: 不要なリソースが作成されない
  - **一貫した動作**: 無効化フラグが正しく機能する
- **テストの目的**: オプション機能の無効化確認
  - **堅牢性の確認**: 柔軟な構成に対応

```typescript
describe('TC-OS-14: CI/CD 無効時のテスト', () => {
  // 【テスト目的】: CI/CD 無効時にリソースが作成されないことを確認
  // 【テスト内容】: enableCicd: false でスタック作成
  // 【期待される動作】: CI/CD 関連リソースが 0 個
  // 🔵 信頼性: 要件定義書より

  test('enableCicd: false の場合に CI/CD リソースが作成されないこと', () => {
    const stackWithoutCicd = new OpsStack(app, 'NoCicdStack', {
      config: devConfig,
      ecsCluster: testCluster,
      ecsServices: testServices,
      vpc: testVpc,
      enableCicd: false,
      env: testEnv,
    });
    const templateWithoutCicd = Template.fromStack(stackWithoutCicd);

    templateWithoutCicd.resourceCountIs('AWS::CodeCommit::Repository', 0); // 🔵
    templateWithoutCicd.resourceCountIs('AWS::CodeBuild::Project', 0); // 🔵
    templateWithoutCicd.resourceCountIs('AWS::CodePipeline::Pipeline', 0); // 🔵
  });
});
```

---

### TC-OS-15: LogExport 有効時のテスト（Prod 環境） 🔵

**信頼性**: 🔵 *要件定義書 REQ-038, REQ-101 より*

- **テスト名**: enableLogExport: true の場合に S3 エクスポートリソースが作成されること
  - **境界値の意味**: Prod 環境固有機能の有効化境界
  - **境界値での動作保証**: 有効化時に Firehose, S3 バケットが作成される
- **入力値**: `enableLogExport: true` + `prodConfig`
  - **境界値選択の根拠**: Prod 環境ではログ長期保存が必要
  - **実際の使用場面**: コンプライアンス要件を満たす Prod 環境
- **期待される結果**:
  - Kinesis Firehose Delivery Stream が作成される
  - S3 バケット（アーカイブ用）が作成される
- **テストの目的**: Prod 環境固有機能の確認
  - **堅牢性の確認**: 環境別設定が正しく機能する

```typescript
describe('TC-OS-15: LogExport 有効時のテスト（Prod 環境）', () => {
  // 【テスト目的】: LogExport 有効時に S3 エクスポートリソースが作成されることを確認
  // 【テスト内容】: enableLogExport: true + prodConfig でスタック作成
  // 【期待される動作】: Firehose と S3 バケットが作成される
  // 🔵 信頼性: 要件定義書 REQ-038, REQ-101 より

  test('Kinesis Firehose Delivery Stream が作成されること', () => {
    const prodStack = new OpsStack(app, 'ProdOpsStack', {
      config: prodConfig,
      ecsCluster: testCluster,
      ecsServices: testServices,
      vpc: testVpc,
      enableLogExport: true,
      env: testEnv,
    });
    const prodTemplate = Template.fromStack(prodStack);

    prodTemplate.resourceCountIs('AWS::KinesisFirehose::DeliveryStream', Match.anyValue()); // 🔵
  });
});
```

---

### TC-OS-16: LogExport 無効時のテスト（Dev 環境） 🔵

**信頼性**: 🔵 *要件定義書 REQ-102 より*

- **テスト名**: enableLogExport: false の場合に S3 エクスポートリソースが作成されないこと
  - **境界値の意味**: Dev 環境でのコスト最適化境界
  - **境界値での動作保証**: 無効化時に不要なリソースが作成されない
- **入力値**: `enableLogExport: false` + `devConfig`
  - **境界値選択の根拠**: Dev 環境では長期保存不要
  - **実際の使用場面**: コスト削減が優先される Dev 環境
- **期待される結果**: Kinesis Firehose が 0 個
  - **境界での正確性**: 不要なリソースによるコスト増を防止
  - **一貫した動作**: 無効化フラグが正しく機能する
- **テストの目的**: Dev 環境のコスト最適化確認
  - **堅牢性の確認**: 環境別設定が正しく機能する

```typescript
describe('TC-OS-16: LogExport 無効時のテスト（Dev 環境）', () => {
  // 【テスト目的】: LogExport 無効時に S3 エクスポートリソースが作成されないことを確認
  // 【テスト内容】: enableLogExport: false + devConfig でスタック作成
  // 【期待される動作】: Firehose が作成されない
  // 🔵 信頼性: 要件定義書 REQ-102 より

  test('Kinesis Firehose が作成されないこと', () => {
    const devStack = new OpsStack(app, 'DevOpsStack', {
      config: devConfig,
      ecsCluster: testCluster,
      ecsServices: testServices,
      vpc: testVpc,
      enableLogExport: false,
      env: testEnv,
    });
    const devTemplate = Template.fromStack(devStack);

    devTemplate.resourceCountIs('AWS::KinesisFirehose::DeliveryStream', 0); // 🔵
  });
});
```

---

## 4. 環境別設定テストケース

### TC-OS-17: Dev 環境設定の適用確認 🔵

**信頼性**: 🔵 *要件定義書 REQ-036, REQ-042 より*

- **テスト名**: Dev 環境設定が正しく適用されること
  - **何をテストするか**: devConfig でのログ保持期間、オプション設定
  - **期待される動作**: 3 日間のログ保持、LogExport 無効
- **入力値**: `devConfig`
- **期待される結果**:
  - Log Group RetentionInDays: 3
  - Firehose: 0 個
- **テストの目的**: Dev 環境固有設定の確認

```typescript
describe('TC-OS-17: Dev 環境設定の適用確認', () => {
  // 【テスト目的】: Dev 環境設定が正しく適用されることを確認
  // 【テスト内容】: devConfig での OpsStack 作成と設定値検証
  // 【期待される動作】: Dev 固有の設定値が適用される
  // 🔵 信頼性: 要件定義書 REQ-036, REQ-042 より

  test('Dev 環境で 3 日間のログ保持が設定されること', () => {
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      RetentionInDays: 3,
    }); // 🔵
  });
});
```

---

### TC-OS-18: Prod 環境設定の適用確認 🔵

**信頼性**: 🔵 *要件定義書 REQ-037, REQ-042 より*

- **テスト名**: Prod 環境設定が正しく適用されること
  - **何をテストするか**: prodConfig でのログ保持期間、LogExport 設定
  - **期待される動作**: 30 日間のログ保持、LogExport 有効
- **入力値**: `prodConfig` + `enableLogExport: true`
- **期待される結果**:
  - Log Group RetentionInDays: 30
  - Firehose: 1 個以上
- **テストの目的**: Prod 環境固有設定の確認

```typescript
describe('TC-OS-18: Prod 環境設定の適用確認', () => {
  // 【テスト目的】: Prod 環境設定が正しく適用されることを確認
  // 【テスト内容】: prodConfig での OpsStack 作成と設定値検証
  // 【期待される動作】: Prod 固有の設定値が適用される
  // 🔵 信頼性: 要件定義書 REQ-037, REQ-042 より

  test('Prod 環境で 30 日間のログ保持が設定されること', () => {
    const prodStack = new OpsStack(app, 'ProdOpsStack', {
      config: prodConfig,
      ecsCluster: testCluster,
      ecsServices: testServices,
      vpc: testVpc,
      enableLogExport: true,
      enableChatbot: true,
      env: testEnv,
    });
    const prodTemplate = Template.fromStack(prodStack);

    prodTemplate.hasResourceProperties('AWS::Logs::LogGroup', {
      RetentionInDays: 30,
    }); // 🔵
  });
});
```

---

## 5. 統合テストケース

### TC-OS-19: 全 Stack CDK Synth テスト 🔵

**信頼性**: 🔵 *TASK-0024 タスク定義より*

- **テスト名**: 全 6 Stack の CDK Synth が成功すること
  - **何をテストするか**: VPC, Security, Database, Application, Distribution, Ops Stack の統合
  - **期待される動作**: すべての Stack が正常に Synth される
- **入力値**: 全 Stack の Props
- **期待される結果**: エラーなく CloudFormation テンプレートが生成される
- **テストの目的**: 全体統合の確認

```typescript
describe('TC-OS-19: 全 Stack CDK Synth テスト', () => {
  // 【テスト目的】: 全 6 Stack の CDK Synth が成功することを確認
  // 【テスト内容】: すべての Stack を連携させた統合テスト
  // 【期待される動作】: エラーなく Synth が完了する
  // 🔵 信頼性: TASK-0024 タスク定義より

  test('全 Stack が正常に作成されること', () => {
    expect(() => {
      // 1. VPC Stack
      const vpcStack = new VpcStack(app, 'TestVpcStack', { config: devConfig, env: testEnv });

      // 2. Security Stack
      const securityStack = new SecurityStack(app, 'TestSecurityStack', {
        vpc: vpcStack.vpc,
        config: devConfig,
        env: testEnv,
      });

      // 3. Database Stack
      const databaseStack = new DatabaseStack(app, 'TestDatabaseStack', {
        vpc: vpcStack.vpc,
        dbSecurityGroup: securityStack.dbSecurityGroup,
        config: devConfig,
        env: testEnv,
      });

      // 4. Application Stack
      const applicationStack = new ApplicationStack(app, 'TestApplicationStack', {
        vpc: vpcStack.vpc,
        ecsSecurityGroup: securityStack.ecsSecurityGroup,
        // ... 他の依存リソース
        config: devConfig,
        env: testEnv,
      });

      // 5. Distribution Stack
      const distributionStack = new DistributionStack(app, 'TestDistributionStack', {
        alb: applicationStack.loadBalancer,
        // ... 他の依存リソース
        config: devConfig,
        env: testEnv,
      });

      // 6. Ops Stack
      const opsStack = new OpsStack(app, 'TestOpsStack', {
        config: devConfig,
        ecsCluster: applicationStack.cluster,
        ecsServices: {
          frontend: applicationStack.frontendService,
          backend: applicationStack.backendService,
        },
        vpc: vpcStack.vpc,
        env: testEnv,
      });
    }).not.toThrow(); // 🔵
  });
});
```

---

### TC-OS-20: Stack 間循環参照テスト 🔵

**信頼性**: 🔵 *CDK ベストプラクティスより*

- **テスト名**: Stack 間に循環参照が発生しないこと
  - **何をテストするか**: Stack 間の依存関係グラフに循環がないこと
  - **期待される動作**: Synth 時に循環参照エラーが発生しない
- **入力値**: 全 Stack の構成
- **期待される結果**: 正常に Synth が完了
- **テストの目的**: アーキテクチャ整合性の確認

```typescript
describe('TC-OS-20: Stack 間循環参照テスト', () => {
  // 【テスト目的】: Stack 間に循環参照が発生しないことを確認
  // 【テスト内容】: 全 Stack を連携させた依存関係検証
  // 【期待される動作】: 循環参照エラーなく Synth が完了する
  // 🔵 信頼性: CDK ベストプラクティスより

  test('循環参照が発生しないこと', () => {
    // TC-OS-19 と同様の Stack 構成で Synth を実行
    // エラーなく完了すれば循環参照がないことが保証される
    expect(() => {
      app.synth();
    }).not.toThrow(); // 🔵
  });
});
```

---

## 6. セキュリティテストケース

### TC-OS-21: CloudWatch Logs 暗号化テスト 🔵

**信頼性**: 🔵 *要件定義書 NFR-102 より*

- **テスト名**: CloudWatch Logs が KMS 暗号化されていること
  - **何をテストするか**: Log Group に KMS キーが設定されていること
  - **期待される動作**: すべての Log Group が暗号化される
- **入力値**: 標準的な OpsStackProps
- **期待される結果**: Log Group に KmsKeyId プロパティが設定されている
- **テストの目的**: セキュリティ要件の確認

```typescript
describe('TC-OS-21: CloudWatch Logs 暗号化テスト', () => {
  // 【テスト目的】: CloudWatch Logs が KMS 暗号化されていることを確認
  // 【テスト内容】: Log Group の KmsKeyId プロパティを検証
  // 【期待される動作】: すべての Log Group が暗号化される
  // 🔵 信頼性: 要件定義書 NFR-102 より

  test('Log Group が KMS 暗号化されていること', () => {
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      KmsKeyId: Match.anyValue(),
    }); // 🔵
  });
});
```

---

### TC-OS-22: SNS Topic 暗号化テスト 🔵

**信頼性**: 🔵 *要件定義書 NFR-101 より*

- **テスト名**: SNS Topic が KMS 暗号化されていること
  - **何をテストするか**: アラーム通知用 SNS Topic に KMS キーが設定されていること
  - **期待される動作**: SNS Topic が暗号化される
- **入力値**: 標準的な OpsStackProps
- **期待される結果**: SNS Topic に KmsMasterKeyId プロパティが設定されている
- **テストの目的**: セキュリティ要件の確認

```typescript
describe('TC-OS-22: SNS Topic 暗号化テスト', () => {
  // 【テスト目的】: SNS Topic が KMS 暗号化されていることを確認
  // 【テスト内容】: SNS Topic の KmsMasterKeyId プロパティを検証
  // 【期待される動作】: SNS Topic が暗号化される
  // 🔵 信頼性: 要件定義書 NFR-101 より

  test('SNS Topic が KMS 暗号化されていること', () => {
    template.hasResourceProperties('AWS::SNS::Topic', {
      KmsMasterKeyId: Match.anyValue(),
    }); // 🔵
  });
});
```

---

## テストケースサマリー

### テストケース分類

| 分類 | テスト数 | テストID |
|------|----------|----------|
| スナップショット | 2 | TC-OS-01, TC-OS-02 |
| 正常系（Construct 統合） | 6 | TC-OS-03 ~ TC-OS-08 |
| 異常系（バリデーション） | 3 | TC-OS-09 ~ TC-OS-11 |
| 境界値（オプション設定） | 5 | TC-OS-12 ~ TC-OS-16 |
| 環境別設定 | 2 | TC-OS-17, TC-OS-18 |
| 統合テスト | 2 | TC-OS-19, TC-OS-20 |
| セキュリティ | 2 | TC-OS-21, TC-OS-22 |
| **合計** | **22** | - |

### 信頼性レベルサマリー

| レベル | 件数 | 割合 |
|--------|------|------|
| 🔵 青信号 | 22 | 100% |
| 🟡 黄信号 | 0 | 0% |
| 🔴 赤信号 | 0 | 0% |

**品質評価**: ✅ **高品質** - すべてのテストケースが要件定義書・既存実装パターンに基づいて定義

---

## 要件定義との対応関係

| 要件ID | 要件内容 | 対応テストケース |
|--------|---------|-----------------|
| REQ-035 | ログを CloudWatch Logs に収集 | TC-OS-03 |
| REQ-036 | Dev 環境でログ保持期間 1-3 日 | TC-OS-03, TC-OS-17 |
| REQ-037 | Prod 環境でログ保持期間 15-30 日 | TC-OS-18 |
| REQ-038 | Prod 環境でログを S3 Glacier に長期保存 | TC-OS-15 |
| REQ-039 | CloudWatch Alarm 発生時に Slack 通知 | TC-OS-04, TC-OS-05 |
| REQ-040 | CI/CD パイプライン構築 | TC-OS-06 |
| REQ-041 | CodePipeline / CodeBuild による自動デプロイ | TC-OS-06 |
| REQ-042 | Dev と Prod 2 環境構成 | TC-OS-01, TC-OS-02, TC-OS-17, TC-OS-18 |
| REQ-101 | Prod 環境で 30日後に S3 Glacier 移管 | TC-OS-15 |
| REQ-102 | Dev 環境で 3日後にログ削除 | TC-OS-16 |
| REQ-103 | Alarm 発生時に Slack 通知送信 | TC-OS-05 |
| NFR-101 | データ暗号化 | TC-OS-21, TC-OS-22 |
| NFR-102 | Storage Encryption 有効化 | TC-OS-21 |

---

## 次のステップ

```
次のお勧めステップ: `/tsumiki:tdd-red aws-cdk-serverless-architecture TASK-0024` で Red フェーズ（失敗テスト作成）を開始します。
```
