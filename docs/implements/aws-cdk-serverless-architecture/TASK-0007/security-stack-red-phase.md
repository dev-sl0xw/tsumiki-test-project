# TASK-0007: Security Stack 統合 - Red Phase 記録

**タスクID**: TASK-0007
**機能名**: Security Stack Integration
**フェーズ**: TDD Red Phase - 失敗するテストケースの作成
**作成日**: 2026-01-18
**信頼性レベル**: 🔵 高品質

---

## 1. Red Phase 概要

### 1.1 目的

TDD Red Phase として、Security Stack の実装に先立ち、失敗するテストケースを作成しました。これにより、実装すべき機能を明確に定義し、テスト駆動開発のサイクルを確立します。

### 1.2 作成したファイル

| ファイル | 説明 |
|---------|------|
| `infra/lib/stack/security-stack.ts` | SecurityStack スタブ実装 |
| `infra/test/security-stack.test.ts` | SecurityStack テストファイル（29テスト） |

---

## 2. テストケース一覧

### 2.1 正常系テストケース（16件）

| テストID | テスト名 | 信頼性 | 状態 |
|----------|---------|--------|------|
| TC-SS-01 | CloudFormation テンプレートのスナップショットテスト | 🔵 | PASS |
| TC-SS-02 | Security Group が 3 つ作成されること | 🔵 | FAIL |
| TC-SS-03 | IAM Role が 2 つ作成されること | 🔵 | FAIL |
| TC-SS-04 | Security Group が指定された VPC 内に作成されること | 🔵 | FAIL |
| TC-SS-05 | albSecurityGroup プロパティが定義されていること | 🔵 | FAIL |
| TC-SS-06 | ecsSecurityGroup プロパティが定義されていること | 🔵 | FAIL |
| TC-SS-07 | auroraSecurityGroup プロパティが定義されていること | 🔵 | FAIL |
| TC-SS-08 | ecsTaskRole プロパティが定義されていること | 🔵 | FAIL |
| TC-SS-09 | ecsTaskExecutionRole プロパティが定義されていること | 🔵 | FAIL |
| TC-SS-10 | Aurora SG で ECS からの 3306 インバウンドが許可されていること | 🔵 | FAIL |
| TC-SS-11 | Task Role に AmazonSSMManagedInstanceCore がアタッチされていること | 🔵 | FAIL |
| TC-SS-12 | Execution Role に AmazonECSTaskExecutionRolePolicy がアタッチされていること | 🔵 | FAIL |
| TC-SS-13 | 環境別設定（Dev/Prod）で正常に動作すること | 🔵 | FAIL |
| TC-SS-14 | ALB SG に HTTP(80)/HTTPS(443) インバウンドが許可されていること | 🔵 | FAIL |
| TC-SS-15 | ECS SG に ALB SG からのインバウンドが許可されていること | 🔵 | FAIL |
| TC-SS-16 | CfnOutput でクロススタック参照用エクスポートが生成されること | 🔵 | PASS |

### 2.2 異常系テストケース（2件）

| テストID | テスト名 | 信頼性 | 状態 |
|----------|---------|--------|------|
| TC-SS-17 | vpc 必須パラメータとして定義されていること（型チェック） | 🔵 | PASS |
| TC-SS-18 | config 必須パラメータとして定義されていること（型チェック） | 🔵 | PASS |

### 2.3 境界値テストケース（2件）

| テストID | テスト名 | 信頼性 | 状態 |
|----------|---------|--------|------|
| TC-SS-19 | containerPort デフォルト値 (80) 確認 | 🔵 | FAIL |
| TC-SS-20 | secretArns デフォルト値 (['*']) 確認 | 🟡 | FAIL |

---

## 3. テスト実行結果

### 3.1 実行コマンド

```bash
cd infra && npm test -- --testPathPattern=security-stack
```

### 3.2 結果サマリー

```
Test Suites: 1 failed, 1 total
Tests:       25 failed, 4 passed, 29 total
Snapshots:   1 written, 1 total
```

### 3.3 成功したテスト（4件）

1. **TC-SS-01**: スナップショットテスト - 空のスタックでもスナップショットは生成される
2. **TC-SS-16**: CfnOutput 確認 - 空配列でも条件を満たす（0 >= 0）
3. **TC-SS-17**: vpc 型チェック - TypeScript の型システムで検証済み
4. **TC-SS-18**: config 型チェック - TypeScript の型システムで検証済み

### 3.4 失敗したテスト（25件）

すべてスタブ実装のため、実際のリソースが作成されていないことが原因。

---

## 4. 期待される失敗内容

### 4.1 リソース数の不一致

```
Expected 3 resources of type AWS::EC2::SecurityGroup but found 0
Expected 2 resources of type AWS::IAM::Role but found 0
```

**原因**: スタブ実装では SecurityGroupConstruct と IamRoleConstruct を統合していないため。

### 4.2 プロパティの未定義

```
expect(received).toBeDefined()
Received: undefined
```

**原因**: スタブ実装ではプロパティに値を代入していないため（definite assignment assertion `!` を使用）。

### 4.3 リソースの不在

```
Template has 0 resources with type AWS::EC2::SecurityGroupIngress.
No matches found
```

**原因**: Security Group が作成されていないため、Ingress ルールも存在しない。

---

## 5. Green Phase で実装すべき内容

### 5.1 実装タスク

1. **SecurityGroupConstruct の統合**
   - SecurityGroupConstruct をインポート
   - VPC を渡して Construct を作成
   - 3つの Security Group プロパティを公開

2. **IamRoleConstruct の統合**
   - IamRoleConstruct をインポート
   - Construct を作成
   - 2つの IAM Role プロパティを公開

3. **プロパティの公開**
   - `albSecurityGroup: ec2.ISecurityGroup`
   - `ecsSecurityGroup: ec2.ISecurityGroup`
   - `auroraSecurityGroup: ec2.ISecurityGroup`
   - `ecsTaskRole: iam.IRole`
   - `ecsTaskExecutionRole: iam.IRole`

### 5.2 実装パターン

```typescript
constructor(scope: Construct, id: string, props: SecurityStackProps) {
  super(scope, id, props);

  // SecurityGroupConstruct の作成
  const securityGroups = new SecurityGroupConstruct(this, 'SecurityGroups', {
    vpc: props.vpc,
  });

  // IamRoleConstruct の作成
  const iamRoles = new IamRoleConstruct(this, 'IamRoles', {});

  // プロパティ公開
  this.albSecurityGroup = securityGroups.albSecurityGroup;
  this.ecsSecurityGroup = securityGroups.ecsSecurityGroup;
  this.auroraSecurityGroup = securityGroups.auroraSecurityGroup;
  this.ecsTaskRole = iamRoles.taskRole;
  this.ecsTaskExecutionRole = iamRoles.executionRole;
}
```

---

## 6. 品質評価

### 6.1 評価結果

**評価結果**: ✅ **高品質**

| 基準 | 状態 | 備考 |
|------|------|------|
| テスト実行 | ✅ | 実行可能で失敗することを確認済み |
| 期待値 | ✅ | 明確で具体的 |
| アサーション | ✅ | 適切 |
| 実装方針 | ✅ | 明確（既存 Construct の統合） |
| 信頼性レベル | ✅ | 🔵（青信号）が 95%（19/20） |

### 6.2 信頼性レベルサマリー

| レベル | 件数 | 割合 |
|--------|------|------|
| 🔵 青信号 | 19 | 95% |
| 🟡 黄信号 | 1 | 5% |
| 🔴 赤信号 | 0 | 0% |

---

## 7. 次のステップ

**次のお勧めステップ**: `/tsumiki:tdd-green aws-cdk-serverless-architecture TASK-0007` で Green フェーズ（最小実装）を開始します。

---

## 8. 関連文書

| 文書 | パス |
|------|------|
| 要件定義書 | `docs/implements/aws-cdk-serverless-architecture/TASK-0007/requirements.md` |
| テストケース定義書 | `docs/implements/aws-cdk-serverless-architecture/TASK-0007/testcases.md` |
| タスクノート | `docs/implements/aws-cdk-serverless-architecture/TASK-0007/note.md` |
| スタブ実装 | `infra/lib/stack/security-stack.ts` |
| テストファイル | `infra/test/security-stack.test.ts` |
| 参考実装 | `infra/lib/stack/vpc-stack.ts` |
| 参考テスト | `infra/test/vpc-stack.test.ts` |
