# TASK-0009: Secrets Manager 統合 - テストケース一覧

**タスクID**: TASK-0009
**タスク名**: Secrets Manager 統合
**要件名**: aws-cdk-serverless-architecture
**フェーズ**: Phase 2 - セキュリティ・データベース
**作成日**: 2026-01-20

---

## 1. 概要

Aurora データベースの認証情報を AWS Secrets Manager で安全に管理するための統合テストケースを定義します。TASK-0008 の Aurora Construct で既に実装済みのシークレット機能を拡張し、ECS タスク連携用のヘルパーメソッド `getSecretsForEcs()` を追加する実装に対応するテストケースです。

### 1.1 テスト対象

- 既存 Aurora Construct の Secrets Manager 統合部分（拡張確認）
- 新規実装の `getSecretsForEcs()` メソッド
- シークレットの KMS 暗号化設定
- IAM ポリシーによるアクセス制御

### 1.2 信頼性レベル凡例

- 🔵 **青信号**: 要件定義書・設計文書・ユーザヒアリングに基づく確実なテスト
- 🟡 **黄信号**: 要件定義書から妥当な推測によるテスト
- 🔴 **赤信号**: 要件定義書にない推測によるテスト

---

## 2. 正常系テストケース

### TC-SM-01: Secrets Manager シークレット作成確認

| 項目 | 内容 |
|------|------|
| **テストID** | TC-SM-01 |
| **テスト名称** | Secrets Manager シークレット作成確認 |
| **目的** | Aurora クラスター作成時に Secrets Manager シークレットが自動生成されることを検証 |
| **関連要件** | SMR-001, REQ-022 |
| **信頼性レベル** | 🔵 青信号 |

**前提条件**:
- VPC Construct が作成済み
- Security Group が作成済み
- AuroraConstruct がインスタンス化可能

**テスト入力データ**:
```typescript
new AuroraConstruct(stack, 'TestAurora', {
  vpc,
  securityGroup: auroraSg,
  envName: 'dev',
});
```

**期待される結果**:
- `AWS::SecretsManager::Secret` リソースが 1 つ作成される
- シークレットが Aurora クラスターに関連付けられている

**検証コード例**:
```typescript
template.resourceCountIs('AWS::SecretsManager::Secret', 1);
```

---

### TC-SM-02: シークレットと Aurora クラスター関連付け確認

| 項目 | 内容 |
|------|------|
| **テストID** | TC-SM-02 |
| **テスト名称** | シークレットと Aurora クラスター関連付け確認 |
| **目的** | シークレットが Aurora クラスターの認証情報として正しく関連付けられていることを検証 |
| **関連要件** | SMR-002, REQ-022 |
| **信頼性レベル** | 🔵 青信号 |

**前提条件**:
- AuroraConstruct がインスタンス化済み

**テスト入力データ**:
```typescript
const aurora = new AuroraConstruct(stack, 'TestAurora', {
  vpc,
  securityGroup: auroraSg,
  envName: 'dev',
});
```

**期待される結果**:
- `aurora.secret` プロパティが定義されている
- シークレットの ARN が DBCluster の MasterUserSecret と関連付けられている

**検証コード例**:
```typescript
expect(aurora.secret).toBeDefined();
template.hasResourceProperties('AWS::RDS::DBCluster', {
  MasterUserSecret: Match.anyValue(),
});
```

---

### TC-SM-03: KMS 暗号化有効確認

| 項目 | 内容 |
|------|------|
| **テストID** | TC-SM-03 |
| **テスト名称** | KMS 暗号化有効確認 |
| **目的** | シークレットが KMS カスタマーマネージドキーで暗号化されていることを検証 |
| **関連要件** | SMR-007, REQ-026, NFR-102 |
| **信頼性レベル** | 🔵 青信号 |

**前提条件**:
- AuroraConstruct がインスタンス化済み

**テスト入力データ**:
```typescript
new AuroraConstruct(stack, 'TestAurora', {
  vpc,
  securityGroup: auroraSg,
  envName: 'dev',
});
```

**期待される結果**:
- `AWS::SecretsManager::Secret` リソースに `KmsKeyId` が設定されている
- KMS キーが暗号化に使用されている

**検証コード例**:
```typescript
template.hasResourceProperties('AWS::SecretsManager::Secret', {
  KmsKeyId: Match.anyValue(),
});
```

---

### TC-SM-04: シークレット構造確認（JSON フィールド）

| 項目 | 内容 |
|------|------|
| **テストID** | TC-SM-04 |
| **テスト名称** | シークレット構造確認（JSON フィールド） |
| **目的** | シークレットの JSON 構造が username, password, host, port を含むことを検証 |
| **関連要件** | SMR-003 |
| **信頼性レベル** | 🟡 黄信号 |

**前提条件**:
- AuroraConstruct がインスタンス化済み
- `rds.Credentials.fromGeneratedSecret()` が使用されている

**テスト入力データ**:
```typescript
const aurora = new AuroraConstruct(stack, 'TestAurora', {
  vpc,
  securityGroup: auroraSg,
  envName: 'dev',
});
```

**期待される結果**:
- シークレットの `GenerateSecretString` テンプレートが設定されている
- Aurora DatabaseSecret は自動的に username, password, host, port を含む

**検証コード例**:
```typescript
template.hasResourceProperties('AWS::SecretsManager::Secret', {
  GenerateSecretString: Match.objectLike({
    SecretStringTemplate: Match.anyValue(),
    GenerateStringKey: 'password',
    ExcludeCharacters: Match.anyValue(),
  }),
});
```

---

### TC-SM-05: ECS タスクからのシークレット参照可能性確認

| 項目 | 内容 |
|------|------|
| **テストID** | TC-SM-05 |
| **テスト名称** | ECS タスクからのシークレット参照可能性確認 |
| **目的** | Aurora Construct の secret プロパティが ECS シークレット参照に使用可能であることを検証 |
| **関連要件** | SMR-004, REQ-018 |
| **信頼性レベル** | 🟡 黄信号 |

**前提条件**:
- AuroraConstruct がインスタンス化済み

**テスト入力データ**:
```typescript
const aurora = new AuroraConstruct(stack, 'TestAurora', {
  vpc,
  securityGroup: auroraSg,
  envName: 'dev',
});
```

**期待される結果**:
- `aurora.secret` が `ISecret` 型で取得可能
- `aurora.secret.secretArn` が定義されている

**検証コード例**:
```typescript
expect(aurora.secret).toBeDefined();
expect(aurora.secret.secretArn).toBeDefined();
```

---

## 3. ECS ヘルパーメソッドテストケース

### TC-SM-06: getSecretsForEcs() メソッド存在確認

| 項目 | 内容 |
|------|------|
| **テストID** | TC-SM-06 |
| **テスト名称** | getSecretsForEcs() メソッド存在確認 |
| **目的** | Aurora Construct に `getSecretsForEcs()` メソッドが実装されていることを検証 |
| **関連要件** | SMR-006 |
| **信頼性レベル** | 🟡 黄信号 |

**前提条件**:
- AuroraConstruct がインスタンス化済み

**テスト入力データ**:
```typescript
const aurora = new AuroraConstruct(stack, 'TestAurora', {
  vpc,
  securityGroup: auroraSg,
  envName: 'dev',
});
```

**期待される結果**:
- `aurora.getSecretsForEcs()` メソッドが存在する
- メソッドが `Record<string, ecs.Secret>` を返す

**検証コード例**:
```typescript
expect(typeof aurora.getSecretsForEcs).toBe('function');
const secrets = aurora.getSecretsForEcs();
expect(secrets).toBeDefined();
```

---

### TC-SM-07: getSecretsForEcs() が正しいキーを返す確認

| 項目 | 内容 |
|------|------|
| **テストID** | TC-SM-07 |
| **テスト名称** | getSecretsForEcs() が正しいキーを返す確認 |
| **目的** | `getSecretsForEcs()` が DB_PASSWORD, DB_USERNAME, DB_HOST キーを含むことを検証 |
| **関連要件** | SMR-006 |
| **信頼性レベル** | 🟡 黄信号 |

**前提条件**:
- AuroraConstruct がインスタンス化済み
- `getSecretsForEcs()` メソッドが実装済み

**テスト入力データ**:
```typescript
const aurora = new AuroraConstruct(stack, 'TestAurora', {
  vpc,
  securityGroup: auroraSg,
  envName: 'dev',
});
const secrets = aurora.getSecretsForEcs();
```

**期待される結果**:
- `secrets` オブジェクトに `DB_PASSWORD` キーが含まれる
- `secrets` オブジェクトに `DB_USERNAME` キーが含まれる
- `secrets` オブジェクトに `DB_HOST` キーが含まれる

**検証コード例**:
```typescript
expect(Object.keys(secrets)).toContain('DB_PASSWORD');
expect(Object.keys(secrets)).toContain('DB_USERNAME');
expect(Object.keys(secrets)).toContain('DB_HOST');
```

---

### TC-SM-08: DB_PASSWORD が password フィールドを参照確認

| 項目 | 内容 |
|------|------|
| **テストID** | TC-SM-08 |
| **テスト名称** | DB_PASSWORD が password フィールドを参照確認 |
| **目的** | `DB_PASSWORD` がシークレットの `password` フィールドを正しく参照することを検証 |
| **関連要件** | SMR-005 |
| **信頼性レベル** | 🟡 黄信号 |

**前提条件**:
- AuroraConstruct がインスタンス化済み
- `getSecretsForEcs()` メソッドが実装済み

**テスト入力データ**:
```typescript
const aurora = new AuroraConstruct(stack, 'TestAurora', {
  vpc,
  securityGroup: auroraSg,
  envName: 'dev',
});
const secrets = aurora.getSecretsForEcs();
```

**期待される結果**:
- `secrets.DB_PASSWORD` が `ecs.Secret` 型である
- シークレットの `password` フィールドを参照している

**検証コード例**:
```typescript
expect(secrets.DB_PASSWORD).toBeDefined();
// ECS Secret の型検証（ecs.Secret.fromSecretsManager の戻り値）
expect(secrets.DB_PASSWORD).toHaveProperty('arn');
```

---

### TC-SM-09: DB_USERNAME が username フィールドを参照確認

| 項目 | 内容 |
|------|------|
| **テストID** | TC-SM-09 |
| **テスト名称** | DB_USERNAME が username フィールドを参照確認 |
| **目的** | `DB_USERNAME` がシークレットの `username` フィールドを正しく参照することを検証 |
| **関連要件** | SMR-005 |
| **信頼性レベル** | 🟡 黄信号 |

**前提条件**:
- AuroraConstruct がインスタンス化済み
- `getSecretsForEcs()` メソッドが実装済み

**テスト入力データ**:
```typescript
const aurora = new AuroraConstruct(stack, 'TestAurora', {
  vpc,
  securityGroup: auroraSg,
  envName: 'dev',
});
const secrets = aurora.getSecretsForEcs();
```

**期待される結果**:
- `secrets.DB_USERNAME` が `ecs.Secret` 型である
- シークレットの `username` フィールドを参照している

**検証コード例**:
```typescript
expect(secrets.DB_USERNAME).toBeDefined();
```

---

### TC-SM-10: DB_HOST が host フィールドを参照確認

| 項目 | 内容 |
|------|------|
| **テストID** | TC-SM-10 |
| **テスト名称** | DB_HOST が host フィールドを参照確認 |
| **目的** | `DB_HOST` がシークレットの `host` フィールドを正しく参照することを検証 |
| **関連要件** | SMR-005 |
| **信頼性レベル** | 🟡 黄信号 |

**前提条件**:
- AuroraConstruct がインスタンス化済み
- `getSecretsForEcs()` メソッドが実装済み

**テスト入力データ**:
```typescript
const aurora = new AuroraConstruct(stack, 'TestAurora', {
  vpc,
  securityGroup: auroraSg,
  envName: 'dev',
});
const secrets = aurora.getSecretsForEcs();
```

**期待される結果**:
- `secrets.DB_HOST` が `ecs.Secret` 型である
- シークレットの `host` フィールドを参照している

**検証コード例**:
```typescript
expect(secrets.DB_HOST).toBeDefined();
```

---

## 4. IAM ポリシーテストケース

### TC-SM-11: Task Role の GetSecretValue 権限確認

| 項目 | 内容 |
|------|------|
| **テストID** | TC-SM-11 |
| **テスト名称** | Task Role の GetSecretValue 権限確認 |
| **目的** | ECS Task Role に `secretsmanager:GetSecretValue` 権限が付与されていることを検証 |
| **関連要件** | SMNFR-001, REQ-018 |
| **信頼性レベル** | 🔵 青信号 |

**前提条件**:
- IamRoleConstruct がインスタンス化済み

**テスト入力データ**:
```typescript
new IamRoleConstruct(stack, 'IamRoles', {
  secretArns: ['arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:test-secret'],
});
```

**期待される結果**:
- `AWS::IAM::Policy` に `secretsmanager:GetSecretValue` アクションが含まれる
- リソースに指定した Secret ARN が設定されている

**検証コード例**:
```typescript
template.hasResourceProperties('AWS::IAM::Policy', {
  PolicyDocument: {
    Statement: Match.arrayWith([
      Match.objectLike({
        Action: 'secretsmanager:GetSecretValue',
        Effect: 'Allow',
      }),
    ]),
  },
});
```

---

### TC-SM-12: 最小権限の原則適用確認

| 項目 | 内容 |
|------|------|
| **テストID** | TC-SM-12 |
| **テスト名称** | 最小権限の原則適用確認 |
| **目的** | Task Role の Secrets Manager 権限が特定のリソースに制限されていることを検証 |
| **関連要件** | SMNFR-002 |
| **信頼性レベル** | 🟡 黄信号 |

**前提条件**:
- IamRoleConstruct が特定の Secret ARN で作成済み

**テスト入力データ**:
```typescript
const secretArn = 'arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:specific-secret';
new IamRoleConstruct(stack, 'IamRoles', {
  secretArns: [secretArn],
});
```

**期待される結果**:
- ポリシーの Resource が `*` ではなく特定の ARN に制限されている

**検証コード例**:
```typescript
template.hasResourceProperties('AWS::IAM::Policy', {
  PolicyDocument: {
    Statement: Match.arrayWith([
      Match.objectLike({
        Action: 'secretsmanager:GetSecretValue',
        Resource: Match.arrayWith([secretArn]),
      }),
    ]),
  },
});
```

---

### TC-SM-13: Task Role と Aurora Secret の統合確認

| 項目 | 内容 |
|------|------|
| **テストID** | TC-SM-13 |
| **テスト名称** | Task Role と Aurora Secret の統合確認 |
| **目的** | Task Role が Aurora Construct で生成されたシークレットにアクセスできる構成を検証 |
| **関連要件** | SMR-004, SMNFR-001 |
| **信頼性レベル** | 🟡 黄信号 |

**前提条件**:
- AuroraConstruct がインスタンス化済み
- IamRoleConstruct が Aurora Secret ARN で作成済み

**テスト入力データ**:
```typescript
const aurora = new AuroraConstruct(stack, 'TestAurora', {
  vpc,
  securityGroup: auroraSg,
  envName: 'dev',
});

new IamRoleConstruct(stack, 'IamRoles', {
  secretArns: [aurora.secret.secretArn],
});
```

**期待される結果**:
- IamRoleConstruct が Aurora Secret の ARN を受け取れる
- ポリシーに Aurora Secret ARN が含まれる

**検証コード例**:
```typescript
// Aurora Secret ARN がクロススタック参照として使用可能
expect(aurora.secret.secretArn).toBeDefined();
```

---

## 5. 異常系テストケース

### TC-SM-14: シークレット未生成時のエラー確認

| 項目 | 内容 |
|------|------|
| **テストID** | TC-SM-14 |
| **テスト名称** | シークレット未生成時のエラー確認 |
| **目的** | Aurora クラスターのシークレットが null の場合のエラーハンドリングを検証 |
| **関連要件** | - |
| **信頼性レベル** | 🔴 赤信号 |

**前提条件**:
- 異常なケース（通常発生しない）

**テスト入力データ**:
- N/A（CDK 内部でシークレットは必ず生成される）

**期待される結果**:
- CDK の `fromGeneratedSecret()` 使用時、シークレットは必ず生成されるため、このケースは発生しない
- **注意**: このテストは実装上不要だが、ドキュメント目的で記載

**検証コード例**:
```typescript
// このテストは実装不要（CDK の仕様上シークレットは必ず生成される）
// Aurora Construct で this.secret = this.cluster.secret! を使用
```

---

### TC-SM-15: 無効な Secret ARN 指定時の動作確認

| 項目 | 内容 |
|------|------|
| **テストID** | TC-SM-15 |
| **テスト名称** | 無効な Secret ARN 指定時の動作確認 |
| **目的** | IamRoleConstruct に無効な ARN を指定した場合の動作を検証 |
| **関連要件** | - |
| **信頼性レベル** | 🔴 赤信号 |

**前提条件**:
- IamRoleConstruct をインスタンス化

**テスト入力データ**:
```typescript
new IamRoleConstruct(stack, 'IamRoles', {
  secretArns: ['invalid-arn'],
});
```

**期待される結果**:
- CDK synth は成功する（ARN 形式のバリデーションは実行時）
- デプロイ時に IAM ポリシーエラーが発生する可能性がある
- **注意**: CDK レベルでは ARN 形式の検証は行われない

**検証コード例**:
```typescript
// CDK synth は成功する（形式検証なし）
expect(() => {
  new IamRoleConstruct(stack, 'IamRoles', {
    secretArns: ['invalid-arn'],
  });
}).not.toThrow();
```

---

## 6. バリエーションテストケース

### TC-SM-16: 複数シークレット参照時の動作確認

| 項目 | 内容 |
|------|------|
| **テストID** | TC-SM-16 |
| **テスト名称** | 複数シークレット参照時の動作確認 |
| **目的** | IamRoleConstruct に複数の Secret ARN を指定した場合の動作を検証 |
| **関連要件** | - |
| **信頼性レベル** | 🟡 黄信号 |

**前提条件**:
- IamRoleConstruct をインスタンス化

**テスト入力データ**:
```typescript
new IamRoleConstruct(stack, 'IamRoles', {
  secretArns: [
    'arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:secret1',
    'arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:secret2',
  ],
});
```

**期待される結果**:
- ポリシーの Resource に両方の ARN が含まれる

**検証コード例**:
```typescript
template.hasResourceProperties('AWS::IAM::Policy', {
  PolicyDocument: {
    Statement: Match.arrayWith([
      Match.objectLike({
        Resource: Match.arrayWith([
          'arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:secret1',
          'arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:secret2',
        ]),
      }),
    ]),
  },
});
```

---

### TC-SM-17: secretArns 未指定時のデフォルト動作確認

| 項目 | 内容 |
|------|------|
| **テストID** | TC-SM-17 |
| **テスト名称** | secretArns 未指定時のデフォルト動作確認 |
| **目的** | secretArns を指定しない場合、デフォルト値 `['*']` が適用されることを検証 |
| **関連要件** | - |
| **信頼性レベル** | 🟡 黄信号 |

**前提条件**:
- IamRoleConstruct を secretArns 未指定でインスタンス化

**テスト入力データ**:
```typescript
new IamRoleConstruct(stack, 'IamRoles', {});
```

**期待される結果**:
- ポリシーの Resource が `['*']` に設定される

**検証コード例**:
```typescript
template.hasResourceProperties('AWS::IAM::Policy', {
  PolicyDocument: {
    Statement: Match.arrayWith([
      Match.objectLike({
        Action: 'secretsmanager:GetSecretValue',
        Resource: '*',
      }),
    ]),
  },
});
```

---

## 7. オプション機能テストケース

### TC-SM-18: 自動ローテーション設定確認（オプション）

| 項目 | 内容 |
|------|------|
| **テストID** | TC-SM-18 |
| **テスト名称** | 自動ローテーション設定確認（オプション） |
| **目的** | シークレットの自動ローテーションが設定可能であることを検証 |
| **関連要件** | SMC-001 |
| **信頼性レベル** | 🟡 黄信号 |

**前提条件**:
- Aurora Construct にローテーション設定オプションが追加されている（将来の拡張）

**テスト入力データ**:
```typescript
// 将来の拡張で追加予定
new AuroraConstruct(stack, 'TestAurora', {
  vpc,
  securityGroup: auroraSg,
  envName: 'dev',
  enableRotation: true,
  rotationDays: 30,
});
```

**期待される結果**:
- `AWS::SecretsManager::RotationSchedule` リソースが作成される
- RotationRules に 30 日が設定される

**検証コード例**:
```typescript
// 将来の拡張で実装予定
template.hasResource('AWS::SecretsManager::RotationSchedule', {
  Properties: {
    RotationRules: {
      AutomaticallyAfterDays: 30,
    },
  },
});
```

**注意**: このテストケースは将来の拡張用です。現時点では Aurora の自動シークレット生成により、シークレットは作成されますが、ローテーションは手動設定が必要です。

---

### TC-SM-19: カスタム KMS キー指定確認（オプション）

| 項目 | 内容 |
|------|------|
| **テストID** | TC-SM-19 |
| **テスト名称** | カスタム KMS キー指定確認（オプション） |
| **目的** | シークレットにカスタム KMS キーを指定できることを検証 |
| **関連要件** | SMO-001, NFR-102 |
| **信頼性レベル** | 🟡 黄信号 |

**前提条件**:
- Aurora Construct がインスタンス化済み
- Aurora ストレージ暗号化キーがシークレット暗号化に自動適用される

**テスト入力データ**:
```typescript
new AuroraConstruct(stack, 'TestAurora', {
  vpc,
  securityGroup: auroraSg,
  envName: 'dev',
});
```

**期待される結果**:
- Aurora クラスターのストレージ暗号化キーがシークレット暗号化にも使用される
- `AWS::SecretsManager::Secret` の `KmsKeyId` が設定されている

**検証コード例**:
```typescript
template.hasResourceProperties('AWS::SecretsManager::Secret', {
  KmsKeyId: Match.anyValue(),
});
```

---

## 8. エッジケーステストケース

### TC-SM-20: 空の環境名での動作確認

| 項目 | 内容 |
|------|------|
| **テストID** | TC-SM-20 |
| **テスト名称** | 空の環境名での動作確認 |
| **目的** | envName に空文字を指定した場合の動作を検証 |
| **関連要件** | - |
| **信頼性レベル** | 🔴 赤信号 |

**前提条件**:
- AuroraConstruct をインスタンス化

**テスト入力データ**:
```typescript
new AuroraConstruct(stack, 'TestAurora', {
  vpc,
  securityGroup: auroraSg,
  envName: '',
});
```

**期待される結果**:
- リソースは作成される（CDK レベルでのバリデーションなし）
- 空の envName でも Aurora クラスターとシークレットが作成される

**検証コード例**:
```typescript
// 空の envName でもリソースは作成される
template.resourceCountIs('AWS::RDS::DBCluster', 1);
template.resourceCountIs('AWS::SecretsManager::Secret', 1);
```

---

### TC-SM-21: 長い環境名でのシークレット名生成確認

| 項目 | 内容 |
|------|------|
| **テストID** | TC-SM-21 |
| **テスト名称** | 長い環境名でのシークレット名生成確認 |
| **目的** | envName が長い場合でもシークレットが正常に作成されることを検証 |
| **関連要件** | - |
| **信頼性レベル** | 🔴 赤信号 |

**前提条件**:
- AuroraConstruct をインスタンス化

**テスト入力データ**:
```typescript
new AuroraConstruct(stack, 'TestAurora', {
  vpc,
  securityGroup: auroraSg,
  envName: 'very-long-environment-name-for-testing-purposes',
});
```

**期待される結果**:
- シークレットが正常に作成される
- CloudFormation の名前制限を超えない

**検証コード例**:
```typescript
template.resourceCountIs('AWS::SecretsManager::Secret', 1);
```

---

### TC-SM-22: getSecretsForEcs() 複数回呼び出し時の一貫性確認

| 項目 | 内容 |
|------|------|
| **テストID** | TC-SM-22 |
| **テスト名称** | getSecretsForEcs() 複数回呼び出し時の一貫性確認 |
| **目的** | `getSecretsForEcs()` を複数回呼び出した場合に同一の結果が返されることを検証 |
| **関連要件** | - |
| **信頼性レベル** | 🟡 黄信号 |

**前提条件**:
- AuroraConstruct がインスタンス化済み
- `getSecretsForEcs()` メソッドが実装済み

**テスト入力データ**:
```typescript
const aurora = new AuroraConstruct(stack, 'TestAurora', {
  vpc,
  securityGroup: auroraSg,
  envName: 'dev',
});
const secrets1 = aurora.getSecretsForEcs();
const secrets2 = aurora.getSecretsForEcs();
```

**期待される結果**:
- `secrets1` と `secrets2` が同じキーを持つ
- 各呼び出しで同じシークレット参照が返される

**検証コード例**:
```typescript
expect(Object.keys(secrets1)).toEqual(Object.keys(secrets2));
expect(Object.keys(secrets1)).toEqual(['DB_PASSWORD', 'DB_USERNAME', 'DB_HOST']);
```

---

## 9. テストケースサマリー

### 9.1 カテゴリ別テストケース数

| カテゴリ | テストケース数 | 🔵 青信号 | 🟡 黄信号 | 🔴 赤信号 |
|---------|--------------|----------|----------|----------|
| 正常系テストケース | 5 | 3 | 2 | 0 |
| ECS ヘルパーメソッドテストケース | 5 | 0 | 5 | 0 |
| IAM ポリシーテストケース | 3 | 1 | 2 | 0 |
| 異常系テストケース | 2 | 0 | 0 | 2 |
| バリエーションテストケース | 2 | 0 | 2 | 0 |
| オプション機能テストケース | 2 | 0 | 2 | 0 |
| エッジケーステストケース | 3 | 0 | 1 | 2 |
| **合計** | **22** | **4** | **14** | **4** |

### 9.2 信頼性レベル分布

| レベル | 件数 | 割合 |
|--------|------|------|
| 🔵 青信号 | 4 | 18% |
| 🟡 黄信号 | 14 | 64% |
| 🔴 赤信号 | 4 | 18% |

### 9.3 優先度別実装順序

**高優先度（必須）**:
1. TC-SM-01 〜 TC-SM-05: 正常系テスト（既存 Aurora Construct の Secrets Manager 機能確認）
2. TC-SM-06 〜 TC-SM-10: ECS ヘルパーメソッドテスト（新規実装 `getSecretsForEcs()`）
3. TC-SM-11: IAM GetSecretValue 権限テスト

**中優先度（推奨）**:
4. TC-SM-12 〜 TC-SM-13: IAM 最小権限テスト
5. TC-SM-16 〜 TC-SM-17: バリエーションテスト

**低優先度（オプション）**:
6. TC-SM-14 〜 TC-SM-15: 異常系テスト
7. TC-SM-18 〜 TC-SM-19: オプション機能テスト
8. TC-SM-20 〜 TC-SM-22: エッジケーステスト

---

## 10. 関連文書

- **要件定義書**: [requirements.md](requirements.md)
- **タスクノート**: [note.md](note.md)
- **既存 Aurora Construct テスト**: `/Volumes/data/aws-workspace/tsumiki-test-project/infra/test/construct/database/aurora-construct.test.ts`
- **Aurora Construct 実装**: `/Volumes/data/aws-workspace/tsumiki-test-project/infra/lib/construct/database/aurora-construct.ts`
- **IAM Role Construct 実装**: `/Volumes/data/aws-workspace/tsumiki-test-project/infra/lib/construct/security/iam-role-construct.ts`
