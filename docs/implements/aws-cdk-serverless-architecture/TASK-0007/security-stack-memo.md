# TDD開発メモ: Security Stack Integration

## 概要

- 機能名: Security Stack Integration
- 開発開始: 2026-01-18
- 現在のフェーズ: Green（最小実装完了）
- タスクID: TASK-0007

## 関連ファイル

- 元タスクファイル: `docs/tasks/aws-cdk-serverless-architecture/TASK-0007.md`
- 要件定義: `docs/implements/aws-cdk-serverless-architecture/TASK-0007/requirements.md`
- テストケース定義: `docs/implements/aws-cdk-serverless-architecture/TASK-0007/testcases.md`
- 実装ファイル: `infra/lib/stack/security-stack.ts`
- テストファイル: `infra/test/security-stack.test.ts`
- タスクノート: `docs/implements/aws-cdk-serverless-architecture/TASK-0007/note.md`

---

## Redフェーズ（失敗するテスト作成）

### 作成日時

2026-01-18

### テストケース

全20テストケースを実装（29個のテスト関数）:

**正常系（16件）:**
- TC-SS-01: スナップショットテスト
- TC-SS-02: Security Group 総数確認（3つ）
- TC-SS-03: IAM Role 総数確認（2つ）
- TC-SS-04: VPC 依存関係確認
- TC-SS-05 ~ TC-SS-09: プロパティ公開確認
- TC-SS-10: Aurora SG セキュリティルール確認
- TC-SS-11 ~ TC-SS-12: IAM ポリシー確認
- TC-SS-13: 環境別設定確認
- TC-SS-14 ~ TC-SS-15: SG インバウンド確認
- TC-SS-16: CfnOutput 確認

**異常系（2件）:**
- TC-SS-17: vpc 必須パラメータ確認
- TC-SS-18: config 必須パラメータ確認

**境界値（2件）:**
- TC-SS-19: containerPort デフォルト値確認
- TC-SS-20: secretArns デフォルト値確認

### テストコード

テストファイル: `infra/test/security-stack.test.ts`

主要なテストパターン:

```typescript
// リソース数の確認
template.resourceCountIs('AWS::EC2::SecurityGroup', 3);
template.resourceCountIs('AWS::IAM::Role', 2);

// プロパティ公開の確認
expect(stack.albSecurityGroup).toBeDefined();
expect(stack.albSecurityGroup.securityGroupId).toBeDefined();

// セキュリティルールの確認
template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
  IpProtocol: 'tcp',
  FromPort: 3306,
  ToPort: 3306,
  SourceSecurityGroupId: Match.objectLike({...}),
});

// マネージドポリシーの確認
template.hasResourceProperties('AWS::IAM::Role', {
  ManagedPolicyArns: Match.arrayWith([
    Match.objectLike({
      'Fn::Join': Match.arrayWith([...]),
    }),
  ]),
});
```

### 期待される失敗

**テスト結果:**
```
Test Suites: 1 failed, 1 total
Tests:       25 failed, 4 passed, 29 total
```

**失敗理由:**
1. スタブ実装では SecurityGroupConstruct と IamRoleConstruct を統合していない
2. プロパティに値が代入されていない（undefined）
3. CloudFormation リソースが生成されない

### 次のフェーズへの要求事項

**Green Phase で実装すべき内容:**

1. SecurityGroupConstruct の統合
   ```typescript
   const securityGroups = new SecurityGroupConstruct(this, 'SecurityGroups', {
     vpc: props.vpc,
   });
   ```

2. IamRoleConstruct の統合
   ```typescript
   const iamRoles = new IamRoleConstruct(this, 'IamRoles', {});
   ```

3. プロパティの公開
   ```typescript
   this.albSecurityGroup = securityGroups.albSecurityGroup;
   this.ecsSecurityGroup = securityGroups.ecsSecurityGroup;
   this.auroraSecurityGroup = securityGroups.auroraSecurityGroup;
   this.ecsTaskRole = iamRoles.taskRole;
   this.ecsTaskExecutionRole = iamRoles.executionRole;
   ```

---

## Greenフェーズ（最小実装）

### 実装日時

2026-01-18

### 実装方針

1. **既存 Construct の統合**
   - SecurityGroupConstruct と IamRoleConstruct を SecurityStack 内で作成
   - VPC Stack のパターン（`infra/lib/stack/vpc-stack.ts`）に準拠

2. **プロパティの公開**
   - 5つの公開プロパティを Construct から委譲
   - 他の Stack からの参照を可能に

3. **CfnOutput の生成**
   - 5つのセキュリティリソースに対して CfnOutput を生成
   - クロススタック参照用のエクスポートを作成

4. **テスト修正**
   - クロススタック参照エラーを修正（env 設定の統一）

### 実装コード

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

  // CfnOutput 生成（5つ）
  new cdk.CfnOutput(this, 'AlbSecurityGroupId', {...});
  new cdk.CfnOutput(this, 'EcsSecurityGroupId', {...});
  new cdk.CfnOutput(this, 'AuroraSecurityGroupId', {...});
  new cdk.CfnOutput(this, 'EcsTaskRoleArn', {...});
  new cdk.CfnOutput(this, 'EcsTaskExecutionRoleArn', {...});
}
```

### テスト結果

```
Test Suites: 1 passed, 1 total
Tests:       29 passed, 29 total
Snapshots:   1 updated, 1 total
Time:        6.225 s
```

**全29テスト通過**

### 課題・改善点

| 項目 | 内容 | 優先度 |
|------|------|--------|
| コメント整理 | 冗長な日本語コメントの簡素化 | 中 |
| CfnOutput 整理 | 必要なエクスポートの精査 | 低 |
| Props 拡張 | containerPort, secretArns のオプション追加検討 | 低 |

---

## Refactorフェーズ（品質改善）

### リファクタ日時

[未実装]

### 改善内容

[Refactor Phase 開始時に記載]

### セキュリティレビュー

[Refactor Phase で確認]

### パフォーマンスレビュー

[Refactor Phase で確認]

### 最終コード

[Refactor Phase 完了時に記載]

### 品質評価

[Refactor Phase 完了時に記載]

---

## 参考情報

### 依存する既存 Construct

- `infra/lib/construct/security/security-group-construct.ts` (TASK-0005)
- `infra/lib/construct/security/iam-role-construct.ts` (TASK-0006)

### 参考にした既存テスト

- `infra/test/vpc-stack.test.ts` - Stack テストパターン
- `infra/test/construct/security/security-group-construct.test.ts` - SG ルール検証
- `infra/test/construct/security/iam-role-construct.test.ts` - IAM ポリシー検証

### 関連要件

| 要件ID | 内容 |
|--------|------|
| REQ-018 | Task Role に AmazonSSMManagedInstanceCore 権限を付与 |
| REQ-024 | Aurora SG で外部からの直接アクセスを遮断 |
| REQ-025 | Aurora SG で ECS SG からの 3306 のみ許可 |
| REQ-028 | ALB を Public Subnet に配置、Internet-facing |
| REQ-029 | HTTP→HTTPS リダイレクト対応 |
