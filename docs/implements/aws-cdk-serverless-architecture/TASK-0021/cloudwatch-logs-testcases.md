# TASK-0021: CloudWatch Logs 設定 - テストケース仕様書

**作成日時**: 2026-02-01
**タスクID**: TASK-0021
**要件名**: aws-cdk-serverless-architecture
**フェーズ**: Phase 4 - 配信・運用

---

## 1. テストケース一覧

| テストケースID | テスト名 | カテゴリ | 信頼性 | 対応要件 |
|----------------|----------|----------|--------|----------|
| TC-LOGS-001 | ECS Frontend Log Group 作成確認 | Log Group 作成 | 🔵 | REQ-035 |
| TC-LOGS-002 | ECS Backend Log Group 作成確認 | Log Group 作成 | 🔵 | REQ-035 |
| TC-LOGS-003 | RDS Aurora Log Group 作成確認 | Log Group 作成 | 🔵 | REQ-035 |
| TC-LOGS-004 | VPC Flow Log Group 作成確認 | Log Group 作成 | 🔵 | REQ-035 |
| TC-LOGS-005 | Dev 環境ログ保持期間確認 (3日) | Retention 設定 | 🔵 | REQ-036, REQ-102 |
| TC-LOGS-006 | Prod 環境ログ保持期間確認 (30日) | Retention 設定 | 🔵 | REQ-037 |
| TC-LOGS-007 | 環境パラメータ動的設定確認 | Retention 設定 | 🔵 | REQ-036, REQ-037 |
| TC-LOGS-008 | カスタム保持期間オーバーライド確認 | Retention 設定 | 🟡 | 設計仕様 |
| TC-LOGS-009 | KMS 暗号化キー作成確認 | KMS 暗号化 | 🔵 | セキュリティベストプラクティス |
| TC-LOGS-010 | Log Group KMS 暗号化設定確認 | KMS 暗号化 | 🔵 | セキュリティベストプラクティス |
| TC-LOGS-011 | カスタム KMS キー使用確認 | KMS 暗号化 | 🟡 | 設計仕様 |
| TC-LOGS-012 | 暗号化無効時の動作確認 | KMS 暗号化 | 🟡 | 設計仕様 |
| TC-LOGS-013 | S3 アーカイブバケット作成確認 | S3 Glacier Export | 🔵 | REQ-038 |
| TC-LOGS-014 | S3 Lifecycle Rule Glacier 移行確認 | S3 Glacier Export | 🔵 | REQ-101 |
| TC-LOGS-015 | Kinesis Firehose 作成確認 | S3 Glacier Export | 🔵 | REQ-038 |
| TC-LOGS-016 | Subscription Filter 設定確認 | S3 Glacier Export | 🔵 | REQ-038 |
| TC-LOGS-017 | Dev 環境 S3 Export 無効確認 | S3 Glacier Export | 🔵 | REQ-102 |
| TC-LOGS-018 | ecsFrontendLogGroup プロパティ確認 | Props 検証 | 🟡 | 設計仕様 |
| TC-LOGS-019 | ecsBackendLogGroup プロパティ確認 | Props 検証 | 🟡 | 設計仕様 |
| TC-LOGS-020 | rdsLogGroup プロパティ確認 | Props 検証 | 🟡 | 設計仕様 |
| TC-LOGS-021 | vpcFlowLogGroup プロパティ確認 | Props 検証 | 🟡 | 設計仕様 |
| TC-LOGS-022 | encryptionKey プロパティ確認 | Props 検証 | 🟡 | 設計仕様 |
| TC-LOGS-023 | archiveBucket プロパティ確認 | Props 検証 | 🟡 | 設計仕様 |
| TC-LOGS-024 | envName 必須パラメータ確認 | Props 検証 | 🔵 | 設計仕様 |
| TC-LOGS-025 | Dev 環境テンプレートスナップショット | Snapshot | 🔵 | CDK ベストプラクティス |
| TC-LOGS-026 | Prod 環境テンプレートスナップショット | Snapshot | 🔵 | CDK ベストプラクティス |
| TC-LOGS-027 | RemovalPolicy Dev 環境確認 | エッジケース | 🟡 | CDK ベストプラクティス |
| TC-LOGS-028 | RemovalPolicy Prod 環境確認 | エッジケース | 🟡 | CDK ベストプラクティス |
| TC-LOGS-029 | KMS キーポリシー CloudWatch 許可確認 | KMS 暗号化 | 🔵 | セキュリティベストプラクティス |
| TC-LOGS-030 | 複数インスタンス作成確認 | エッジケース | 🟡 | CDK 動作仕様 |

---

## 2. テストケース詳細

### 2.1 Log Group 作成テスト

#### TC-LOGS-001: ECS Frontend Log Group 作成確認

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-LOGS-001 |
| **テスト名** | ECS Frontend Log Group 作成確認 |
| **テスト目的** | ECS Frontend サービス用の Log Group が正しい命名規則で作成されることを確認する |
| **前提条件** | - CDK App と Stack が初期化されていること<br>- LogGroupConstruct がインスタンス化可能であること |
| **テスト手順** | 1. LogGroupConstruct を `envName: 'dev'` で作成<br>2. Template.fromStack() でテンプレート取得<br>3. AWS::Logs::LogGroup リソースの存在確認<br>4. LogGroupName が `/ecs/dev/frontend` パターンに一致することを確認 |
| **期待結果** | - AWS::Logs::LogGroup リソースが作成される<br>- LogGroupName が `/ecs/{env-name}/frontend` パターンに一致する |
| **信頼性レベル** | 🔵 |
| **対応要件** | REQ-035 |

```typescript
// テストコード例
describe('TC-LOGS-001: ECS Frontend Log Group 作成確認', () => {
  test('ECS Frontend 用 Log Group が作成されること', () => {
    new LogGroupConstruct(stack, 'LogGroup', { envName: 'dev' });
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Logs::LogGroup', {
      LogGroupName: Match.stringLikeRegexp('/ecs/.*/frontend'),
    });
  });
});
```

---

#### TC-LOGS-002: ECS Backend Log Group 作成確認

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-LOGS-002 |
| **テスト名** | ECS Backend Log Group 作成確認 |
| **テスト目的** | ECS Backend サービス用の Log Group が正しい命名規則で作成されることを確認する |
| **前提条件** | - CDK App と Stack が初期化されていること<br>- LogGroupConstruct がインスタンス化可能であること |
| **テスト手順** | 1. LogGroupConstruct を `envName: 'dev'` で作成<br>2. Template.fromStack() でテンプレート取得<br>3. AWS::Logs::LogGroup リソースの存在確認<br>4. LogGroupName が `/ecs/dev/backend` パターンに一致することを確認 |
| **期待結果** | - AWS::Logs::LogGroup リソースが作成される<br>- LogGroupName が `/ecs/{env-name}/backend` パターンに一致する |
| **信頼性レベル** | 🔵 |
| **対応要件** | REQ-035 |

```typescript
// テストコード例
describe('TC-LOGS-002: ECS Backend Log Group 作成確認', () => {
  test('ECS Backend 用 Log Group が作成されること', () => {
    new LogGroupConstruct(stack, 'LogGroup', { envName: 'dev' });
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Logs::LogGroup', {
      LogGroupName: Match.stringLikeRegexp('/ecs/.*/backend'),
    });
  });
});
```

---

#### TC-LOGS-003: RDS Aurora Log Group 作成確認

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-LOGS-003 |
| **テスト名** | RDS Aurora Log Group 作成確認 |
| **テスト目的** | RDS Aurora 用の Log Group が正しい命名規則で作成されることを確認する |
| **前提条件** | - CDK App と Stack が初期化されていること<br>- LogGroupConstruct がインスタンス化可能であること |
| **テスト手順** | 1. LogGroupConstruct を `envName: 'dev'` で作成<br>2. Template.fromStack() でテンプレート取得<br>3. AWS::Logs::LogGroup リソースの存在確認<br>4. LogGroupName が `/rds/dev/aurora` パターンに一致することを確認 |
| **期待結果** | - AWS::Logs::LogGroup リソースが作成される<br>- LogGroupName が `/rds/{env-name}/aurora` パターンに一致する |
| **信頼性レベル** | 🔵 |
| **対応要件** | REQ-035 |

```typescript
// テストコード例
describe('TC-LOGS-003: RDS Aurora Log Group 作成確認', () => {
  test('RDS Aurora 用 Log Group が作成されること', () => {
    new LogGroupConstruct(stack, 'LogGroup', { envName: 'dev' });
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Logs::LogGroup', {
      LogGroupName: Match.stringLikeRegexp('/rds/.*/aurora'),
    });
  });
});
```

---

#### TC-LOGS-004: VPC Flow Log Group 作成確認

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-LOGS-004 |
| **テスト名** | VPC Flow Log Group 作成確認 |
| **テスト目的** | VPC Flow Logs 用の Log Group が正しい命名規則で作成されることを確認する |
| **前提条件** | - CDK App と Stack が初期化されていること<br>- LogGroupConstruct がインスタンス化可能であること |
| **テスト手順** | 1. LogGroupConstruct を `envName: 'dev'` で作成<br>2. Template.fromStack() でテンプレート取得<br>3. AWS::Logs::LogGroup リソースの存在確認<br>4. LogGroupName が `/vpc/dev/flow-logs` パターンに一致することを確認 |
| **期待結果** | - AWS::Logs::LogGroup リソースが作成される<br>- LogGroupName が `/vpc/{env-name}/flow-logs` パターンに一致する |
| **信頼性レベル** | 🔵 |
| **対応要件** | REQ-035 |

```typescript
// テストコード例
describe('TC-LOGS-004: VPC Flow Log Group 作成確認', () => {
  test('VPC Flow Logs 用 Log Group が作成されること', () => {
    new LogGroupConstruct(stack, 'LogGroup', { envName: 'dev' });
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Logs::LogGroup', {
      LogGroupName: Match.stringLikeRegexp('/vpc/.*/flow-logs'),
    });
  });
});
```

---

### 2.2 Retention 設定テスト

#### TC-LOGS-005: Dev 環境ログ保持期間確認 (3日)

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-LOGS-005 |
| **テスト名** | Dev 環境ログ保持期間確認 (3日) |
| **テスト目的** | Dev 環境で Log Group の保持期間が 3 日間に設定されることを確認する |
| **前提条件** | - CDK App と Stack が初期化されていること<br>- LogGroupConstruct がインスタンス化可能であること |
| **テスト手順** | 1. LogGroupConstruct を `envName: 'dev'` で作成<br>2. Template.fromStack() でテンプレート取得<br>3. AWS::Logs::LogGroup の RetentionInDays プロパティ確認 |
| **期待結果** | - 全ての Log Group の RetentionInDays が 3 に設定される |
| **信頼性レベル** | 🔵 |
| **対応要件** | REQ-036, REQ-102 |

```typescript
// テストコード例
describe('TC-LOGS-005: Dev 環境ログ保持期間確認 (3日)', () => {
  test('Dev 環境で RetentionInDays が 3 に設定されること', () => {
    new LogGroupConstruct(stack, 'LogGroup', { envName: 'dev' });
    const template = Template.fromStack(stack);

    const logGroups = template.findResources('AWS::Logs::LogGroup');
    Object.values(logGroups).forEach((lg: any) => {
      expect(lg.Properties.RetentionInDays).toBe(3);
    });
  });
});
```

---

#### TC-LOGS-006: Prod 環境ログ保持期間確認 (30日)

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-LOGS-006 |
| **テスト名** | Prod 環境ログ保持期間確認 (30日) |
| **テスト目的** | Prod 環境で Log Group の保持期間が 30 日間に設定されることを確認する |
| **前提条件** | - CDK App と Stack が初期化されていること<br>- LogGroupConstruct がインスタンス化可能であること |
| **テスト手順** | 1. LogGroupConstruct を `envName: 'prod'` で作成<br>2. Template.fromStack() でテンプレート取得<br>3. AWS::Logs::LogGroup の RetentionInDays プロパティ確認 |
| **期待結果** | - 全ての Log Group の RetentionInDays が 30 に設定される |
| **信頼性レベル** | 🔵 |
| **対応要件** | REQ-037 |

```typescript
// テストコード例
describe('TC-LOGS-006: Prod 環境ログ保持期間確認 (30日)', () => {
  test('Prod 環境で RetentionInDays が 30 に設定されること', () => {
    new LogGroupConstruct(stack, 'LogGroup', { envName: 'prod' });
    const template = Template.fromStack(stack);

    const logGroups = template.findResources('AWS::Logs::LogGroup');
    Object.values(logGroups).forEach((lg: any) => {
      expect(lg.Properties.RetentionInDays).toBe(30);
    });
  });
});
```

---

#### TC-LOGS-007: 環境パラメータ動的設定確認

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-LOGS-007 |
| **テスト名** | 環境パラメータ動的設定確認 |
| **テスト目的** | envName パラメータにより保持期間が動的に切り替わることを確認する |
| **前提条件** | - CDK App と Stack が初期化されていること |
| **テスト手順** | 1. `envName: 'dev'` で LogGroupConstruct を作成し、RetentionInDays を確認<br>2. 別の Stack で `envName: 'prod'` で LogGroupConstruct を作成し、RetentionInDays を確認<br>3. 値が異なることを確認 |
| **期待結果** | - Dev 環境: RetentionInDays = 3<br>- Prod 環境: RetentionInDays = 30 |
| **信頼性レベル** | 🔵 |
| **対応要件** | REQ-036, REQ-037 |

```typescript
// テストコード例
describe('TC-LOGS-007: 環境パラメータ動的設定確認', () => {
  test('envName により保持期間が動的に切り替わること', () => {
    // Dev 環境
    const devStack = new cdk.Stack(app, 'DevStack');
    new LogGroupConstruct(devStack, 'LogGroup', { envName: 'dev' });
    const devTemplate = Template.fromStack(devStack);

    // Prod 環境
    const prodStack = new cdk.Stack(app, 'ProdStack');
    new LogGroupConstruct(prodStack, 'LogGroup', { envName: 'prod' });
    const prodTemplate = Template.fromStack(prodStack);

    // 検証
    const devLogGroups = devTemplate.findResources('AWS::Logs::LogGroup');
    const prodLogGroups = prodTemplate.findResources('AWS::Logs::LogGroup');

    Object.values(devLogGroups).forEach((lg: any) => {
      expect(lg.Properties.RetentionInDays).toBe(3);
    });
    Object.values(prodLogGroups).forEach((lg: any) => {
      expect(lg.Properties.RetentionInDays).toBe(30);
    });
  });
});
```

---

#### TC-LOGS-008: カスタム保持期間オーバーライド確認

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-LOGS-008 |
| **テスト名** | カスタム保持期間オーバーライド確認 |
| **テスト目的** | retentionDays プロパティでデフォルト値をオーバーライドできることを確認する |
| **前提条件** | - CDK App と Stack が初期化されていること |
| **テスト手順** | 1. LogGroupConstruct を `envName: 'dev', retentionDays: logs.RetentionDays.ONE_WEEK` で作成<br>2. Template.fromStack() でテンプレート取得<br>3. RetentionInDays が 7 であることを確認 |
| **期待結果** | - RetentionInDays が 7 (ONE_WEEK) に設定される |
| **信頼性レベル** | 🟡 |
| **対応要件** | 設計仕様 |

```typescript
// テストコード例
describe('TC-LOGS-008: カスタム保持期間オーバーライド確認', () => {
  test('retentionDays でデフォルト値をオーバーライドできること', () => {
    new LogGroupConstruct(stack, 'LogGroup', {
      envName: 'dev',
      retentionDays: logs.RetentionDays.ONE_WEEK,
    });
    const template = Template.fromStack(stack);

    const logGroups = template.findResources('AWS::Logs::LogGroup');
    Object.values(logGroups).forEach((lg: any) => {
      expect(lg.Properties.RetentionInDays).toBe(7);
    });
  });
});
```

---

### 2.3 KMS 暗号化テスト

#### TC-LOGS-009: KMS 暗号化キー作成確認

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-LOGS-009 |
| **テスト名** | KMS 暗号化キー作成確認 |
| **テスト目的** | Log Group 暗号化用の KMS キーが作成されることを確認する |
| **前提条件** | - CDK App と Stack が初期化されていること<br>- enableEncryption がデフォルト (true) であること |
| **テスト手順** | 1. LogGroupConstruct を `envName: 'dev'` で作成<br>2. Template.fromStack() でテンプレート取得<br>3. AWS::KMS::Key リソースの存在確認 |
| **期待結果** | - AWS::KMS::Key リソースが作成される<br>- EnableKeyRotation が true に設定される |
| **信頼性レベル** | 🔵 |
| **対応要件** | セキュリティベストプラクティス |

```typescript
// テストコード例
describe('TC-LOGS-009: KMS 暗号化キー作成確認', () => {
  test('KMS キーが作成されること', () => {
    new LogGroupConstruct(stack, 'LogGroup', { envName: 'dev' });
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::KMS::Key', {
      EnableKeyRotation: true,
    });
  });
});
```

---

#### TC-LOGS-010: Log Group KMS 暗号化設定確認

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-LOGS-010 |
| **テスト名** | Log Group KMS 暗号化設定確認 |
| **テスト目的** | 全ての Log Group に KMS 暗号化が設定されていることを確認する |
| **前提条件** | - CDK App と Stack が初期化されていること |
| **テスト手順** | 1. LogGroupConstruct を `envName: 'dev'` で作成<br>2. Template.fromStack() でテンプレート取得<br>3. 全ての AWS::Logs::LogGroup に KmsKeyId が設定されていることを確認 |
| **期待結果** | - 全ての Log Group に KmsKeyId プロパティが設定される |
| **信頼性レベル** | 🔵 |
| **対応要件** | セキュリティベストプラクティス |

```typescript
// テストコード例
describe('TC-LOGS-010: Log Group KMS 暗号化設定確認', () => {
  test('全ての Log Group に KmsKeyId が設定されること', () => {
    new LogGroupConstruct(stack, 'LogGroup', { envName: 'dev' });
    const template = Template.fromStack(stack);

    const logGroups = template.findResources('AWS::Logs::LogGroup');
    Object.values(logGroups).forEach((lg: any) => {
      expect(lg.Properties.KmsKeyId).toBeDefined();
    });
  });
});
```

---

#### TC-LOGS-011: カスタム KMS キー使用確認

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-LOGS-011 |
| **テスト名** | カスタム KMS キー使用確認 |
| **テスト目的** | 外部から提供された KMS キーを使用できることを確認する |
| **前提条件** | - CDK App と Stack が初期化されていること<br>- 既存の KMS キーが存在すること |
| **テスト手順** | 1. 別途 KMS キーを作成<br>2. LogGroupConstruct を `encryptionKey: customKey` で作成<br>3. Log Group が提供された KMS キーを参照していることを確認 |
| **期待結果** | - 新しい KMS キーが作成されない (カウント確認)<br>- Log Group が提供された KMS キーを参照する |
| **信頼性レベル** | 🟡 |
| **対応要件** | 設計仕様 |

```typescript
// テストコード例
describe('TC-LOGS-011: カスタム KMS キー使用確認', () => {
  test('外部 KMS キーを使用できること', () => {
    const customKey = new kms.Key(stack, 'CustomKey');
    new LogGroupConstruct(stack, 'LogGroup', {
      envName: 'dev',
      encryptionKey: customKey,
    });
    const template = Template.fromStack(stack);

    // KMS キーが 1 つだけ (カスタムキーのみ) であることを確認
    template.resourceCountIs('AWS::KMS::Key', 1);
  });
});
```

---

#### TC-LOGS-012: 暗号化無効時の動作確認

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-LOGS-012 |
| **テスト名** | 暗号化無効時の動作確認 |
| **テスト目的** | enableEncryption: false を指定した場合に KMS 暗号化が無効になることを確認する |
| **前提条件** | - CDK App と Stack が初期化されていること |
| **テスト手順** | 1. LogGroupConstruct を `enableEncryption: false` で作成<br>2. Template.fromStack() でテンプレート取得<br>3. AWS::KMS::Key が作成されていないことを確認<br>4. Log Group に KmsKeyId が設定されていないことを確認 |
| **期待結果** | - AWS::KMS::Key リソースが作成されない<br>- Log Group に KmsKeyId が設定されない |
| **信頼性レベル** | 🟡 |
| **対応要件** | 設計仕様 |

```typescript
// テストコード例
describe('TC-LOGS-012: 暗号化無効時の動作確認', () => {
  test('enableEncryption: false で KMS 暗号化が無効になること', () => {
    new LogGroupConstruct(stack, 'LogGroup', {
      envName: 'dev',
      enableEncryption: false,
    });
    const template = Template.fromStack(stack);

    // KMS キーが作成されないことを確認
    template.resourceCountIs('AWS::KMS::Key', 0);

    // Log Group に KmsKeyId が設定されていないことを確認
    const logGroups = template.findResources('AWS::Logs::LogGroup');
    Object.values(logGroups).forEach((lg: any) => {
      expect(lg.Properties.KmsKeyId).toBeUndefined();
    });
  });
});
```

---

#### TC-LOGS-029: KMS キーポリシー CloudWatch 許可確認

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-LOGS-029 |
| **テスト名** | KMS キーポリシー CloudWatch 許可確認 |
| **テスト目的** | KMS キーが CloudWatch Logs サービスからのアクセスを許可していることを確認する |
| **前提条件** | - CDK App と Stack が初期化されていること |
| **テスト手順** | 1. LogGroupConstruct を `envName: 'dev'` で作成<br>2. Template.fromStack() でテンプレート取得<br>3. KMS キーポリシーに CloudWatch Logs サービスプリンシパルが含まれることを確認 |
| **期待結果** | - KMS キーポリシーに `logs.{region}.amazonaws.com` が許可されている |
| **信頼性レベル** | 🔵 |
| **対応要件** | セキュリティベストプラクティス |

```typescript
// テストコード例
describe('TC-LOGS-029: KMS キーポリシー CloudWatch 許可確認', () => {
  test('KMS キーポリシーが CloudWatch Logs サービスを許可すること', () => {
    new LogGroupConstruct(stack, 'LogGroup', { envName: 'dev' });
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Principal: Match.objectLike({
              Service: Match.stringLikeRegexp('logs\\..*\\.amazonaws\\.com'),
            }),
          }),
        ]),
      }),
    });
  });
});
```

---

### 2.4 S3 Glacier Export テスト

#### TC-LOGS-013: S3 アーカイブバケット作成確認

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-LOGS-013 |
| **テスト名** | S3 アーカイブバケット作成確認 |
| **テスト目的** | Prod 環境でログアーカイブ用の S3 バケットが作成されることを確認する |
| **前提条件** | - CDK App と Stack が初期化されていること<br>- envName が 'prod' であること |
| **テスト手順** | 1. LogExportConstruct を `envName: 'prod'`, `enableExport: true` で作成<br>2. Template.fromStack() でテンプレート取得<br>3. AWS::S3::Bucket リソースの存在確認 |
| **期待結果** | - AWS::S3::Bucket リソースが作成される<br>- PublicAccessBlockConfiguration が全て true に設定される |
| **信頼性レベル** | 🔵 |
| **対応要件** | REQ-038 |

```typescript
// テストコード例
describe('TC-LOGS-013: S3 アーカイブバケット作成確認', () => {
  test('Prod 環境で S3 バケットが作成されること', () => {
    new LogExportConstruct(stack, 'LogExport', {
      envName: 'prod',
      logGroups: [],
      enableExport: true,
    });
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });
});
```

---

#### TC-LOGS-014: S3 Lifecycle Rule Glacier 移行確認

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-LOGS-014 |
| **テスト名** | S3 Lifecycle Rule Glacier 移行確認 |
| **テスト目的** | S3 バケットに 30 日後の Glacier 移行ルールが設定されることを確認する |
| **前提条件** | - CDK App と Stack が初期化されていること<br>- LogExportConstruct が作成されていること |
| **テスト手順** | 1. LogExportConstruct を `envName: 'prod'` で作成<br>2. Template.fromStack() でテンプレート取得<br>3. S3 バケットの LifecycleConfiguration を確認 |
| **期待結果** | - Transitions に StorageClass: GLACIER, TransitionInDays: 30 が含まれる |
| **信頼性レベル** | 🔵 |
| **対応要件** | REQ-101 |

```typescript
// テストコード例
describe('TC-LOGS-014: S3 Lifecycle Rule Glacier 移行確認', () => {
  test('30日後に Glacier へ移行するルールが設定されること', () => {
    new LogExportConstruct(stack, 'LogExport', {
      envName: 'prod',
      logGroups: [],
      enableExport: true,
    });
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::S3::Bucket', {
      LifecycleConfiguration: {
        Rules: Match.arrayWith([
          Match.objectLike({
            Transitions: Match.arrayWith([
              Match.objectLike({
                StorageClass: 'GLACIER',
                TransitionInDays: 30,
              }),
            ]),
            Status: 'Enabled',
          }),
        ]),
      },
    });
  });
});
```

---

#### TC-LOGS-015: Kinesis Firehose 作成確認

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-LOGS-015 |
| **テスト名** | Kinesis Firehose 作成確認 |
| **テスト目的** | ログエクスポート用の Kinesis Data Firehose が作成されることを確認する |
| **前提条件** | - CDK App と Stack が初期化されていること<br>- envName が 'prod' であること |
| **テスト手順** | 1. LogExportConstruct を `envName: 'prod'`, `enableExport: true` で作成<br>2. Template.fromStack() でテンプレート取得<br>3. AWS::KinesisFirehose::DeliveryStream リソースの存在確認 |
| **期待結果** | - AWS::KinesisFirehose::DeliveryStream リソースが作成される<br>- S3DestinationConfiguration が設定される |
| **信頼性レベル** | 🔵 |
| **対応要件** | REQ-038 |

```typescript
// テストコード例
describe('TC-LOGS-015: Kinesis Firehose 作成確認', () => {
  test('Kinesis Data Firehose が作成されること', () => {
    new LogExportConstruct(stack, 'LogExport', {
      envName: 'prod',
      logGroups: [],
      enableExport: true,
    });
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::KinesisFirehose::DeliveryStream', {
      S3DestinationConfiguration: Match.objectLike({
        BucketARN: Match.anyValue(),
      }),
    });
  });
});
```

---

#### TC-LOGS-016: Subscription Filter 設定確認

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-LOGS-016 |
| **テスト名** | Subscription Filter 設定確認 |
| **テスト目的** | Log Group から Firehose への Subscription Filter が設定されることを確認する |
| **前提条件** | - CDK App と Stack が初期化されていること<br>- Log Group と Firehose が作成されていること |
| **テスト手順** | 1. LogGroupConstruct を作成<br>2. LogExportConstruct を logGroups を指定して作成<br>3. AWS::Logs::SubscriptionFilter リソースの存在確認 |
| **期待結果** | - AWS::Logs::SubscriptionFilter リソースが Log Group ごとに作成される<br>- DestinationArn が Firehose を参照する |
| **信頼性レベル** | 🔵 |
| **対応要件** | REQ-038 |

```typescript
// テストコード例
describe('TC-LOGS-016: Subscription Filter 設定確認', () => {
  test('Subscription Filter が設定されること', () => {
    const logGroupConstruct = new LogGroupConstruct(stack, 'LogGroup', {
      envName: 'prod',
    });
    new LogExportConstruct(stack, 'LogExport', {
      envName: 'prod',
      logGroups: [logGroupConstruct.ecsFrontendLogGroup],
      enableExport: true,
    });
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Logs::SubscriptionFilter', {
      DestinationArn: Match.anyValue(),
      FilterPattern: '',
    });
  });
});
```

---

#### TC-LOGS-017: Dev 環境 S3 Export 無効確認

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-LOGS-017 |
| **テスト名** | Dev 環境 S3 Export 無効確認 |
| **テスト目的** | Dev 環境で S3 Export リソースが作成されないことを確認する |
| **前提条件** | - CDK App と Stack が初期化されていること<br>- envName が 'dev' であること |
| **テスト手順** | 1. LogExportConstruct を `envName: 'dev'` で作成<br>2. Template.fromStack() でテンプレート取得<br>3. S3 バケットと Firehose が作成されていないことを確認 |
| **期待結果** | - AWS::S3::Bucket リソースが作成されない<br>- AWS::KinesisFirehose::DeliveryStream リソースが作成されない |
| **信頼性レベル** | 🔵 |
| **対応要件** | REQ-102 |

```typescript
// テストコード例
describe('TC-LOGS-017: Dev 環境 S3 Export 無効確認', () => {
  test('Dev 環境で S3 Export リソースが作成されないこと', () => {
    new LogExportConstruct(stack, 'LogExport', {
      envName: 'dev',
      logGroups: [],
    });
    const template = Template.fromStack(stack);

    // S3 バケットが作成されないことを確認
    template.resourceCountIs('AWS::S3::Bucket', 0);

    // Firehose が作成されないことを確認
    template.resourceCountIs('AWS::KinesisFirehose::DeliveryStream', 0);
  });
});
```

---

### 2.5 Props 検証テスト

#### TC-LOGS-018: ecsFrontendLogGroup プロパティ確認

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-LOGS-018 |
| **テスト名** | ecsFrontendLogGroup プロパティ確認 |
| **テスト目的** | ecsFrontendLogGroup プロパティが定義され、アクセス可能であることを確認する |
| **前提条件** | - CDK App と Stack が初期化されていること |
| **テスト手順** | 1. LogGroupConstruct を作成<br>2. ecsFrontendLogGroup プロパティの存在確認<br>3. logGroupName が定義されていることを確認 |
| **期待結果** | - ecsFrontendLogGroup が undefined ではない<br>- logGroupName が定義されている |
| **信頼性レベル** | 🟡 |
| **対応要件** | 設計仕様 |

```typescript
// テストコード例
describe('TC-LOGS-018: ecsFrontendLogGroup プロパティ確認', () => {
  test('ecsFrontendLogGroup プロパティが定義されていること', () => {
    const logGroupConstruct = new LogGroupConstruct(stack, 'LogGroup', {
      envName: 'dev',
    });

    expect(logGroupConstruct.ecsFrontendLogGroup).toBeDefined();
    expect(logGroupConstruct.ecsFrontendLogGroup.logGroupName).toBeDefined();
  });
});
```

---

#### TC-LOGS-019: ecsBackendLogGroup プロパティ確認

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-LOGS-019 |
| **テスト名** | ecsBackendLogGroup プロパティ確認 |
| **テスト目的** | ecsBackendLogGroup プロパティが定義され、アクセス可能であることを確認する |
| **前提条件** | - CDK App と Stack が初期化されていること |
| **テスト手順** | 1. LogGroupConstruct を作成<br>2. ecsBackendLogGroup プロパティの存在確認<br>3. logGroupName が定義されていることを確認 |
| **期待結果** | - ecsBackendLogGroup が undefined ではない<br>- logGroupName が定義されている |
| **信頼性レベル** | 🟡 |
| **対応要件** | 設計仕様 |

```typescript
// テストコード例
describe('TC-LOGS-019: ecsBackendLogGroup プロパティ確認', () => {
  test('ecsBackendLogGroup プロパティが定義されていること', () => {
    const logGroupConstruct = new LogGroupConstruct(stack, 'LogGroup', {
      envName: 'dev',
    });

    expect(logGroupConstruct.ecsBackendLogGroup).toBeDefined();
    expect(logGroupConstruct.ecsBackendLogGroup.logGroupName).toBeDefined();
  });
});
```

---

#### TC-LOGS-020: rdsLogGroup プロパティ確認

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-LOGS-020 |
| **テスト名** | rdsLogGroup プロパティ確認 |
| **テスト目的** | rdsLogGroup プロパティが定義され、アクセス可能であることを確認する |
| **前提条件** | - CDK App と Stack が初期化されていること |
| **テスト手順** | 1. LogGroupConstruct を作成<br>2. rdsLogGroup プロパティの存在確認<br>3. logGroupName が定義されていることを確認 |
| **期待結果** | - rdsLogGroup が undefined ではない<br>- logGroupName が定義されている |
| **信頼性レベル** | 🟡 |
| **対応要件** | 設計仕様 |

```typescript
// テストコード例
describe('TC-LOGS-020: rdsLogGroup プロパティ確認', () => {
  test('rdsLogGroup プロパティが定義されていること', () => {
    const logGroupConstruct = new LogGroupConstruct(stack, 'LogGroup', {
      envName: 'dev',
    });

    expect(logGroupConstruct.rdsLogGroup).toBeDefined();
    expect(logGroupConstruct.rdsLogGroup.logGroupName).toBeDefined();
  });
});
```

---

#### TC-LOGS-021: vpcFlowLogGroup プロパティ確認

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-LOGS-021 |
| **テスト名** | vpcFlowLogGroup プロパティ確認 |
| **テスト目的** | vpcFlowLogGroup プロパティが定義され、アクセス可能であることを確認する |
| **前提条件** | - CDK App と Stack が初期化されていること |
| **テスト手順** | 1. LogGroupConstruct を作成<br>2. vpcFlowLogGroup プロパティの存在確認<br>3. logGroupName が定義されていることを確認 |
| **期待結果** | - vpcFlowLogGroup が undefined ではない<br>- logGroupName が定義されている |
| **信頼性レベル** | 🟡 |
| **対応要件** | 設計仕様 |

```typescript
// テストコード例
describe('TC-LOGS-021: vpcFlowLogGroup プロパティ確認', () => {
  test('vpcFlowLogGroup プロパティが定義されていること', () => {
    const logGroupConstruct = new LogGroupConstruct(stack, 'LogGroup', {
      envName: 'dev',
    });

    expect(logGroupConstruct.vpcFlowLogGroup).toBeDefined();
    expect(logGroupConstruct.vpcFlowLogGroup.logGroupName).toBeDefined();
  });
});
```

---

#### TC-LOGS-022: encryptionKey プロパティ確認

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-LOGS-022 |
| **テスト名** | encryptionKey プロパティ確認 |
| **テスト目的** | encryptionKey プロパティが定義され、アクセス可能であることを確認する |
| **前提条件** | - CDK App と Stack が初期化されていること<br>- enableEncryption がデフォルト (true) であること |
| **テスト手順** | 1. LogGroupConstruct を作成<br>2. encryptionKey プロパティの存在確認<br>3. keyArn が定義されていることを確認 |
| **期待結果** | - encryptionKey が undefined ではない<br>- keyArn が定義されている |
| **信頼性レベル** | 🟡 |
| **対応要件** | 設計仕様 |

```typescript
// テストコード例
describe('TC-LOGS-022: encryptionKey プロパティ確認', () => {
  test('encryptionKey プロパティが定義されていること', () => {
    const logGroupConstruct = new LogGroupConstruct(stack, 'LogGroup', {
      envName: 'dev',
    });

    expect(logGroupConstruct.encryptionKey).toBeDefined();
    expect(logGroupConstruct.encryptionKey?.keyArn).toBeDefined();
  });
});
```

---

#### TC-LOGS-023: archiveBucket プロパティ確認

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-LOGS-023 |
| **テスト名** | archiveBucket プロパティ確認 |
| **テスト目的** | Prod 環境で archiveBucket プロパティが定義され、アクセス可能であることを確認する |
| **前提条件** | - CDK App と Stack が初期化されていること<br>- envName が 'prod' であること |
| **テスト手順** | 1. LogExportConstruct を `envName: 'prod'` で作成<br>2. archiveBucket プロパティの存在確認<br>3. bucketArn が定義されていることを確認 |
| **期待結果** | - archiveBucket が undefined ではない<br>- bucketArn が定義されている |
| **信頼性レベル** | 🟡 |
| **対応要件** | 設計仕様 |

```typescript
// テストコード例
describe('TC-LOGS-023: archiveBucket プロパティ確認', () => {
  test('archiveBucket プロパティが定義されていること (Prod)', () => {
    const logExportConstruct = new LogExportConstruct(stack, 'LogExport', {
      envName: 'prod',
      logGroups: [],
      enableExport: true,
    });

    expect(logExportConstruct.archiveBucket).toBeDefined();
    expect(logExportConstruct.archiveBucket?.bucketArn).toBeDefined();
  });
});
```

---

#### TC-LOGS-024: envName 必須パラメータ確認

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-LOGS-024 |
| **テスト名** | envName 必須パラメータ確認 |
| **テスト目的** | envName が必須パラメータであり、有効な値のみ受け付けることを確認する |
| **前提条件** | - CDK App と Stack が初期化されていること |
| **テスト手順** | 1. envName: 'dev' で正常に作成できることを確認<br>2. envName: 'prod' で正常に作成できることを確認<br>3. TypeScript の型チェックにより不正な値が拒否されることを確認 |
| **期待結果** | - 'dev' と 'prod' のみが有効な envName 値として受け付けられる |
| **信頼性レベル** | 🔵 |
| **対応要件** | 設計仕様 |

```typescript
// テストコード例
describe('TC-LOGS-024: envName 必須パラメータ確認', () => {
  test('envName: dev が有効であること', () => {
    expect(() => {
      new LogGroupConstruct(stack, 'LogGroupDev', { envName: 'dev' });
    }).not.toThrow();
  });

  test('envName: prod が有効であること', () => {
    const prodStack = new cdk.Stack(app, 'ProdStack');
    expect(() => {
      new LogGroupConstruct(prodStack, 'LogGroupProd', { envName: 'prod' });
    }).not.toThrow();
  });
});
```

---

### 2.6 スナップショットテスト

#### TC-LOGS-025: Dev 環境テンプレートスナップショット

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-LOGS-025 |
| **テスト名** | Dev 環境テンプレートスナップショット |
| **テスト目的** | Dev 環境の CloudFormation テンプレートが期待通りであることを確認する |
| **前提条件** | - CDK App と Stack が初期化されていること |
| **テスト手順** | 1. LogGroupConstruct を `envName: 'dev'` で作成<br>2. Template.fromStack() でテンプレート取得<br>3. toMatchSnapshot() でスナップショット比較 |
| **期待結果** | - テンプレートが保存されたスナップショットと一致する |
| **信頼性レベル** | 🔵 |
| **対応要件** | CDK ベストプラクティス |

```typescript
// テストコード例
describe('TC-LOGS-025: Dev 環境テンプレートスナップショット', () => {
  test('Dev 環境テンプレートがスナップショットと一致すること', () => {
    new LogGroupConstruct(stack, 'LogGroup', { envName: 'dev' });
    const template = Template.fromStack(stack);

    expect(template.toJSON()).toMatchSnapshot();
  });
});
```

---

#### TC-LOGS-026: Prod 環境テンプレートスナップショット

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-LOGS-026 |
| **テスト名** | Prod 環境テンプレートスナップショット |
| **テスト目的** | Prod 環境の CloudFormation テンプレートが期待通りであることを確認する |
| **前提条件** | - CDK App と Stack が初期化されていること |
| **テスト手順** | 1. LogGroupConstruct と LogExportConstruct を `envName: 'prod'` で作成<br>2. Template.fromStack() でテンプレート取得<br>3. toMatchSnapshot() でスナップショット比較 |
| **期待結果** | - テンプレートが保存されたスナップショットと一致する |
| **信頼性レベル** | 🔵 |
| **対応要件** | CDK ベストプラクティス |

```typescript
// テストコード例
describe('TC-LOGS-026: Prod 環境テンプレートスナップショット', () => {
  test('Prod 環境テンプレートがスナップショットと一致すること', () => {
    const logGroupConstruct = new LogGroupConstruct(stack, 'LogGroup', {
      envName: 'prod',
    });
    new LogExportConstruct(stack, 'LogExport', {
      envName: 'prod',
      logGroups: [
        logGroupConstruct.ecsFrontendLogGroup,
        logGroupConstruct.ecsBackendLogGroup,
        logGroupConstruct.rdsLogGroup,
        logGroupConstruct.vpcFlowLogGroup,
      ],
      enableExport: true,
    });
    const template = Template.fromStack(stack);

    expect(template.toJSON()).toMatchSnapshot();
  });
});
```

---

### 2.7 エッジケーステスト

#### TC-LOGS-027: RemovalPolicy Dev 環境確認

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-LOGS-027 |
| **テスト名** | RemovalPolicy Dev 環境確認 |
| **テスト目的** | Dev 環境で Log Group の RemovalPolicy が DESTROY に設定されることを確認する |
| **前提条件** | - CDK App と Stack が初期化されていること |
| **テスト手順** | 1. LogGroupConstruct を `envName: 'dev'` で作成<br>2. Template.fromStack() でテンプレート取得<br>3. Log Group の DeletionPolicy を確認 |
| **期待結果** | - DeletionPolicy が 'Delete' に設定される |
| **信頼性レベル** | 🟡 |
| **対応要件** | CDK ベストプラクティス |

```typescript
// テストコード例
describe('TC-LOGS-027: RemovalPolicy Dev 環境確認', () => {
  test('Dev 環境で DeletionPolicy が Delete であること', () => {
    new LogGroupConstruct(stack, 'LogGroup', { envName: 'dev' });
    const template = Template.fromStack(stack);

    const logGroups = template.findResources('AWS::Logs::LogGroup');
    Object.values(logGroups).forEach((lg: any) => {
      expect(lg.DeletionPolicy).toBe('Delete');
    });
  });
});
```

---

#### TC-LOGS-028: RemovalPolicy Prod 環境確認

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-LOGS-028 |
| **テスト名** | RemovalPolicy Prod 環境確認 |
| **テスト目的** | Prod 環境で Log Group の RemovalPolicy が RETAIN に設定されることを確認する |
| **前提条件** | - CDK App と Stack が初期化されていること |
| **テスト手順** | 1. LogGroupConstruct を `envName: 'prod'` で作成<br>2. Template.fromStack() でテンプレート取得<br>3. Log Group の DeletionPolicy を確認 |
| **期待結果** | - DeletionPolicy が 'Retain' に設定される |
| **信頼性レベル** | 🟡 |
| **対応要件** | CDK ベストプラクティス |

```typescript
// テストコード例
describe('TC-LOGS-028: RemovalPolicy Prod 環境確認', () => {
  test('Prod 環境で DeletionPolicy が Retain であること', () => {
    new LogGroupConstruct(stack, 'LogGroup', { envName: 'prod' });
    const template = Template.fromStack(stack);

    const logGroups = template.findResources('AWS::Logs::LogGroup');
    Object.values(logGroups).forEach((lg: any) => {
      expect(lg.DeletionPolicy).toBe('Retain');
    });
  });
});
```

---

#### TC-LOGS-030: 複数インスタンス作成確認

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-LOGS-030 |
| **テスト名** | 複数インスタンス作成確認 |
| **テスト目的** | 同一 Stack 内で複数の LogGroupConstruct インスタンスが作成できることを確認する |
| **前提条件** | - CDK App と Stack が初期化されていること |
| **テスト手順** | 1. LogGroupConstruct を 2 つの異なる ID で作成<br>2. Template.fromStack() でテンプレート取得<br>3. Log Group リソースの数を確認 |
| **期待結果** | - 8 つの Log Group が作成される (4 種類 x 2 インスタンス) |
| **信頼性レベル** | 🟡 |
| **対応要件** | CDK 動作仕様 |

```typescript
// テストコード例
describe('TC-LOGS-030: 複数インスタンス作成確認', () => {
  test('複数の LogGroupConstruct を作成できること', () => {
    new LogGroupConstruct(stack, 'LogGroup1', { envName: 'dev' });
    new LogGroupConstruct(stack, 'LogGroup2', { envName: 'dev' });
    const template = Template.fromStack(stack);

    // 4 種類 x 2 インスタンス = 8 Log Groups
    template.resourceCountIs('AWS::Logs::LogGroup', 8);
  });
});
```

---

## 3. テストカテゴリ別サマリー

| カテゴリ | テストケース数 | 🔵 青信号 | 🟡 黄信号 | 🔴 赤信号 |
|----------|----------------|-----------|-----------|-----------|
| Log Group 作成 | 4 | 4 | 0 | 0 |
| Retention 設定 | 4 | 3 | 1 | 0 |
| KMS 暗号化 | 5 | 3 | 2 | 0 |
| S3 Glacier Export | 5 | 5 | 0 | 0 |
| Props 検証 | 7 | 1 | 6 | 0 |
| Snapshot | 2 | 2 | 0 | 0 |
| エッジケース | 3 | 0 | 3 | 0 |
| **合計** | **30** | **18** | **12** | **0** |

---

## 4. 要件カバレッジ

| 要件ID | 要件名 | 対応テストケース | カバレッジ |
|--------|--------|------------------|------------|
| REQ-035 | CloudWatch Logs 収集 | TC-LOGS-001〜004 | 100% |
| REQ-036 | Dev 環境保持期間 | TC-LOGS-005, TC-LOGS-007 | 100% |
| REQ-037 | Prod 環境保持期間 | TC-LOGS-006, TC-LOGS-007 | 100% |
| REQ-038 | S3 Glacier 長期保存 | TC-LOGS-013〜016 | 100% |
| REQ-101 | Glacier 30日移行 | TC-LOGS-014 | 100% |
| REQ-102 | Dev 環境3日削除 | TC-LOGS-005, TC-LOGS-017 | 100% |

---

## 5. テスト実行コマンド

```bash
# テスト全体実行
cd infra && npm test

# CloudWatch Logs テストのみ実行
npm test -- log-group-construct.test.ts
npm test -- log-export-construct.test.ts

# スナップショット更新
npm test -- -u

# 特定テストケース実行
npm test -- --testNamePattern="TC-LOGS-001"

# カバレッジ取得
npm test -- --coverage
```

---

## 6. テストファイル配置

| ファイルパス | 内容 |
|--------------|------|
| `infra/test/construct/monitoring/log-group-construct.test.ts` | LogGroupConstruct テスト |
| `infra/test/construct/monitoring/log-export-construct.test.ts` | LogExportConstruct テスト |

---

## 7. 信頼性レベルサマリー

| レベル | 件数 | 割合 | 説明 |
|--------|------|------|------|
| 🔵 青信号 | 18 | 60% | 要件定義書・設計文書に基づく確実なテスト |
| 🟡 黄信号 | 12 | 40% | 設計仕様・CDK 動作仕様からの妥当な推測 |
| 🔴 赤信号 | 0 | 0% | 推測によるテスト |

**品質評価**: 高品質 - 全てのテストケースが要件定義書または設計仕様に基づいている

---

**作成者**: Claude Code (TDD Skill)
**レビュー状態**: 未レビュー
**次のフェーズ**: `/tsumiki:tdd-red` - 失敗するテストの実装
