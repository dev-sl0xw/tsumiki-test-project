# TASK-0003: VPC Endpoints Construct - TDD テストケース定義書

**タスクID**: TASK-0003
**機能名**: VPC Endpoints Construct
**要件名**: aws-cdk-serverless-architecture
**作成日**: 2026-01-16
**出力ファイル**: `docs/implements/aws-cdk-serverless-architecture/TASK-0003/vpc-endpoints-testcases.md`

---

## 1. テストケース概要

### 1.1 対象要件

| 要件ID | 内容 | 信頼性 |
|--------|------|--------|
| REQ-008 | SSM VPC Endpoints (ssm, ssmmessages, ec2messages) | 🔵 |
| REQ-009 | ECR VPC Endpoints (ecr.api, ecr.dkr) | 🔵 |
| REQ-010 | CloudWatch Logs VPC Endpoint (logs) | 🔵 |
| REQ-011 | S3 Gateway Endpoint | 🔵 |

### 1.2 テストケースサマリー

| カテゴリ | テストケース数 | 信頼性 |
|----------|---------------|--------|
| 正常系（基本動作） | 15 | 🔵 |
| 正常系（選択的作成） | 8 | 🟡 |
| 境界値 | 4 | 🟡 |
| 異常系 | 4 | 🔴 |
| **合計** | **31** | - |

---

## 2. 開発言語・フレームワーク

### 2.1 技術スタック 🔵

**信頼性**: 🔵 *note.md、package.json より*

- **プログラミング言語**: TypeScript ~5.6.3
  - **言語選択の理由**: CDK プロジェクトで統一的に使用されている
  - **テストに適した機能**: 型安全性により実装ミスを事前に検出可能
- **テストフレームワーク**: Jest ^29.7.0
  - **フレームワーク選択の理由**: CDK の公式テストフレームワークとして推奨
  - **テスト実行環境**: Node.js ES2018 Target
- **CDK アサーション**: `aws-cdk-lib/assertions`
  - `Template` - CloudFormation テンプレートの検証
  - `Match` - パターンマッチング

### 2.2 テスト実行コマンド 🔵

```bash
# プロジェクトディレクトリへ移動
cd infra

# 全テスト実行
npm test

# 特定テストファイル実行
npm test -- endpoints-construct.test.ts

# Watch モード
npm test -- --watch

# カバレッジ付き
npm test -- --coverage
```

---

## 3. 正常系テストケース（基本的な動作）

### 3.1 TC-VPCE-01: SSM Interface Endpoints 作成確認 🔵

**信頼性**: 🔵 *要件定義書 REQ-008 より*

#### TC-VPCE-01-01: ssm Interface Endpoint の作成

- **テスト名**: ssm Interface Endpoint が作成されること
  - **何をテストするか**: SSM 用 Interface Endpoint の作成
  - **期待される動作**: VpcEndpointType=Interface、ServiceName=.*ssm$ のリソースが作成される
- **入力値**: デフォルト Props（enableSsm=true）
  - **入力データの意味**: SSM Endpoints を有効化した標準的な構成
- **期待される結果**: AWS::EC2::VPCEndpoint リソースが ServiceName=.*ssm$ で作成される
  - **期待結果の理由**: REQ-008 で SSM VPC Endpoint の作成が要求されている
- **テストの目的**: ECS Exec (SSM Session Manager) 用の Endpoint が作成されることを確認
  - **確認ポイント**: VpcEndpointType が Interface であること
- 🔵 信頼性: 要件定義書 REQ-008 に明記

```typescript
// 【テスト目的】: SSM Interface Endpoint が正しく作成されることを確認
// 【テスト内容】: EndpointsConstruct をデフォルト設定でインスタンス化し、ssm Endpoint を検証
// 【期待される動作】: AWS::EC2::VPCEndpoint リソースが Interface タイプで作成される
// 🔵 信頼性: REQ-008 より

test('creates ssm Interface Endpoint', () => {
  // 【検証項目】: ssm Interface Endpoint の存在確認
  // 🔵 信頼性: REQ-008 より
  template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
    ServiceName: Match.stringLikeRegexp('.*ssm$'),
    VpcEndpointType: 'Interface',
    PrivateDnsEnabled: true,
  });
});
```

#### TC-VPCE-01-02: ssmmessages Interface Endpoint の作成

- **テスト名**: ssmmessages Interface Endpoint が作成されること
  - **何をテストするか**: SSM Messages 用 Interface Endpoint の作成
  - **期待される動作**: VpcEndpointType=Interface、ServiceName=.*ssmmessages$ のリソースが作成される
- **入力値**: デフォルト Props（enableSsm=true）
  - **入力データの意味**: SSM Endpoints を有効化した標準的な構成
- **期待される結果**: AWS::EC2::VPCEndpoint リソースが ServiceName=.*ssmmessages$ で作成される
  - **期待結果の理由**: REQ-008 で SSM Messages VPC Endpoint の作成が要求されている
- **テストの目的**: SSM Session Manager のメッセージ送受信用 Endpoint が作成されることを確認
  - **確認ポイント**: VpcEndpointType が Interface であること
- 🔵 信頼性: 要件定義書 REQ-008 に明記

```typescript
// 【テスト目的】: SSM Messages Interface Endpoint が正しく作成されることを確認
// 【テスト内容】: EndpointsConstruct をデフォルト設定でインスタンス化し、ssmmessages Endpoint を検証
// 【期待される動作】: AWS::EC2::VPCEndpoint リソースが Interface タイプで作成される
// 🔵 信頼性: REQ-008 より

test('creates ssmmessages Interface Endpoint', () => {
  // 【検証項目】: ssmmessages Interface Endpoint の存在確認
  // 🔵 信頼性: REQ-008 より
  template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
    ServiceName: Match.stringLikeRegexp('.*ssmmessages$'),
    VpcEndpointType: 'Interface',
    PrivateDnsEnabled: true,
  });
});
```

#### TC-VPCE-01-03: ec2messages Interface Endpoint の作成

- **テスト名**: ec2messages Interface Endpoint が作成されること
  - **何をテストするか**: EC2 Messages 用 Interface Endpoint の作成
  - **期待される動作**: VpcEndpointType=Interface、ServiceName=.*ec2messages$ のリソースが作成される
- **入力値**: デフォルト Props（enableSsm=true）
  - **入力データの意味**: SSM Endpoints を有効化した標準的な構成
- **期待される結果**: AWS::EC2::VPCEndpoint リソースが ServiceName=.*ec2messages$ で作成される
  - **期待結果の理由**: REQ-008 で EC2 Messages VPC Endpoint の作成が要求されている
- **テストの目的**: SSM エージェントのメッセージ通信用 Endpoint が作成されることを確認
  - **確認ポイント**: VpcEndpointType が Interface であること
- 🔵 信頼性: 要件定義書 REQ-008 に明記

```typescript
// 【テスト目的】: EC2 Messages Interface Endpoint が正しく作成されることを確認
// 【テスト内容】: EndpointsConstruct をデフォルト設定でインスタンス化し、ec2messages Endpoint を検証
// 【期待される動作】: AWS::EC2::VPCEndpoint リソースが Interface タイプで作成される
// 🔵 信頼性: REQ-008 より

test('creates ec2messages Interface Endpoint', () => {
  // 【検証項目】: ec2messages Interface Endpoint の存在確認
  // 🔵 信頼性: REQ-008 より
  template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
    ServiceName: Match.stringLikeRegexp('.*ec2messages$'),
    VpcEndpointType: 'Interface',
    PrivateDnsEnabled: true,
  });
});
```

#### TC-VPCE-01-04: SSM Endpoints の公開プロパティ確認

- **テスト名**: SSM Endpoints の公開プロパティが定義されていること
  - **何をテストするか**: Construct の公開プロパティの存在確認
  - **期待される動作**: ssmEndpoint, ssmMessagesEndpoint, ec2MessagesEndpoint プロパティが定義される
- **入力値**: デフォルト Props（enableSsm=true）
  - **入力データの意味**: SSM Endpoints を有効化した標準的な構成
- **期待される結果**: 各プロパティが undefined ではないこと
  - **期待結果の理由**: 外部から Endpoint を参照可能にするため
- **テストの目的**: Construct の公開 API が正しく実装されていることを確認
  - **確認ポイント**: 各プロパティが IInterfaceVpcEndpoint 型であること
- 🔵 信頼性: note.md の実装インターフェースより

```typescript
// 【テスト目的】: SSM Endpoints の公開プロパティが正しく定義されることを確認
// 【テスト内容】: EndpointsConstruct のプロパティを直接アサート
// 【期待される動作】: ssmEndpoint, ssmMessagesEndpoint, ec2MessagesEndpoint が定義される
// 🔵 信頼性: note.md より

test('exposes SSM endpoint properties', () => {
  // 【検証項目】: 公開プロパティの存在確認
  // 🔵 信頼性: note.md より
  expect(endpointsConstruct.ssmEndpoint).toBeDefined();
  expect(endpointsConstruct.ssmMessagesEndpoint).toBeDefined();
  expect(endpointsConstruct.ec2MessagesEndpoint).toBeDefined();
});
```

---

### 3.2 TC-VPCE-02: ECR Interface Endpoints 作成確認 🔵

**信頼性**: 🔵 *要件定義書 REQ-009 より*

#### TC-VPCE-02-01: ecr.api Interface Endpoint の作成

- **テスト名**: ecr.api Interface Endpoint が作成されること
  - **何をテストするか**: ECR API 用 Interface Endpoint の作成
  - **期待される動作**: VpcEndpointType=Interface、ServiceName=.*ecr\.api$ のリソースが作成される
- **入力値**: デフォルト Props（enableEcr=true）
  - **入力データの意味**: ECR Endpoints を有効化した標準的な構成
- **期待される結果**: AWS::EC2::VPCEndpoint リソースが ServiceName=.*ecr\.api$ で作成される
  - **期待結果の理由**: REQ-009 で ECR API VPC Endpoint の作成が要求されている
- **テストの目的**: ECR API 呼び出し用の Endpoint が作成されることを確認
  - **確認ポイント**: VpcEndpointType が Interface、PrivateDnsEnabled が true であること
- 🔵 信頼性: 要件定義書 REQ-009 に明記

```typescript
// 【テスト目的】: ECR API Interface Endpoint が正しく作成されることを確認
// 【テスト内容】: EndpointsConstruct をデフォルト設定でインスタンス化し、ecr.api Endpoint を検証
// 【期待される動作】: AWS::EC2::VPCEndpoint リソースが Interface タイプで作成される
// 🔵 信頼性: REQ-009 より

test('creates ecr.api Interface Endpoint', () => {
  // 【検証項目】: ecr.api Interface Endpoint の存在確認
  // 🔵 信頼性: REQ-009 より
  template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
    ServiceName: Match.stringLikeRegexp('.*ecr\\.api$'),
    VpcEndpointType: 'Interface',
    PrivateDnsEnabled: true,
  });
});
```

#### TC-VPCE-02-02: ecr.dkr Interface Endpoint の作成

- **テスト名**: ecr.dkr Interface Endpoint が作成されること
  - **何をテストするか**: ECR Docker Registry 用 Interface Endpoint の作成
  - **期待される動作**: VpcEndpointType=Interface、ServiceName=.*ecr\.dkr$ のリソースが作成される
- **入力値**: デフォルト Props（enableEcr=true）
  - **入力データの意味**: ECR Endpoints を有効化した標準的な構成
- **期待される結果**: AWS::EC2::VPCEndpoint リソースが ServiceName=.*ecr\.dkr$ で作成される
  - **期待結果の理由**: REQ-009 で ECR Docker VPC Endpoint の作成が要求されている
- **テストの目的**: Docker イメージ Pull 用の Endpoint が作成されることを確認
  - **確認ポイント**: VpcEndpointType が Interface、PrivateDnsEnabled が true であること
- 🔵 信頼性: 要件定義書 REQ-009 に明記

```typescript
// 【テスト目的】: ECR Docker Interface Endpoint が正しく作成されることを確認
// 【テスト内容】: EndpointsConstruct をデフォルト設定でインスタンス化し、ecr.dkr Endpoint を検証
// 【期待される動作】: AWS::EC2::VPCEndpoint リソースが Interface タイプで作成される
// 🔵 信頼性: REQ-009 より

test('creates ecr.dkr Interface Endpoint', () => {
  // 【検証項目】: ecr.dkr Interface Endpoint の存在確認
  // 🔵 信頼性: REQ-009 より
  template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
    ServiceName: Match.stringLikeRegexp('.*ecr\\.dkr$'),
    VpcEndpointType: 'Interface',
    PrivateDnsEnabled: true,
  });
});
```

#### TC-VPCE-02-03: ECR Endpoints の公開プロパティ確認

- **テスト名**: ECR Endpoints の公開プロパティが定義されていること
  - **何をテストするか**: Construct の公開プロパティの存在確認
  - **期待される動作**: ecrApiEndpoint, ecrDkrEndpoint プロパティが定義される
- **入力値**: デフォルト Props（enableEcr=true）
  - **入力データの意味**: ECR Endpoints を有効化した標準的な構成
- **期待される結果**: 各プロパティが undefined ではないこと
  - **期待結果の理由**: 外部から Endpoint を参照可能にするため
- **テストの目的**: Construct の公開 API が正しく実装されていることを確認
  - **確認ポイント**: 各プロパティが IInterfaceVpcEndpoint 型であること
- 🔵 信頼性: note.md の実装インターフェースより

```typescript
// 【テスト目的】: ECR Endpoints の公開プロパティが正しく定義されることを確認
// 【テスト内容】: EndpointsConstruct のプロパティを直接アサート
// 【期待される動作】: ecrApiEndpoint, ecrDkrEndpoint が定義される
// 🔵 信頼性: note.md より

test('exposes ECR endpoint properties', () => {
  // 【検証項目】: 公開プロパティの存在確認
  // 🔵 信頼性: note.md より
  expect(endpointsConstruct.ecrApiEndpoint).toBeDefined();
  expect(endpointsConstruct.ecrDkrEndpoint).toBeDefined();
});
```

---

### 3.3 TC-VPCE-03: CloudWatch Logs Interface Endpoint 作成確認 🔵

**信頼性**: 🔵 *要件定義書 REQ-010 より*

#### TC-VPCE-03-01: logs Interface Endpoint の作成

- **テスト名**: logs Interface Endpoint が作成されること
  - **何をテストするか**: CloudWatch Logs 用 Interface Endpoint の作成
  - **期待される動作**: VpcEndpointType=Interface、ServiceName=.*logs$ のリソースが作成される
- **入力値**: デフォルト Props（enableLogs=true）
  - **入力データの意味**: CloudWatch Logs Endpoint を有効化した標準的な構成
- **期待される結果**: AWS::EC2::VPCEndpoint リソースが ServiceName=.*logs$ で作成される
  - **期待結果の理由**: REQ-010 で CloudWatch Logs VPC Endpoint の作成が要求されている
- **テストの目的**: ECS タスクからのログ送信用 Endpoint が作成されることを確認
  - **確認ポイント**: VpcEndpointType が Interface、PrivateDnsEnabled が true であること
- 🔵 信頼性: 要件定義書 REQ-010 に明記

```typescript
// 【テスト目的】: CloudWatch Logs Interface Endpoint が正しく作成されることを確認
// 【テスト内容】: EndpointsConstruct をデフォルト設定でインスタンス化し、logs Endpoint を検証
// 【期待される動作】: AWS::EC2::VPCEndpoint リソースが Interface タイプで作成される
// 🔵 信頼性: REQ-010 より

test('creates logs Interface Endpoint', () => {
  // 【検証項目】: logs Interface Endpoint の存在確認
  // 🔵 信頼性: REQ-010 より
  template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
    ServiceName: Match.stringLikeRegexp('.*logs$'),
    VpcEndpointType: 'Interface',
    PrivateDnsEnabled: true,
  });
});
```

#### TC-VPCE-03-02: CloudWatch Logs Endpoint の公開プロパティ確認

- **テスト名**: CloudWatch Logs Endpoint の公開プロパティが定義されていること
  - **何をテストするか**: Construct の公開プロパティの存在確認
  - **期待される動作**: logsEndpoint プロパティが定義される
- **入力値**: デフォルト Props（enableLogs=true）
  - **入力データの意味**: CloudWatch Logs Endpoint を有効化した標準的な構成
- **期待される結果**: logsEndpoint プロパティが undefined ではないこと
  - **期待結果の理由**: 外部から Endpoint を参照可能にするため
- **テストの目的**: Construct の公開 API が正しく実装されていることを確認
  - **確認ポイント**: プロパティが IInterfaceVpcEndpoint 型であること
- 🔵 信頼性: note.md の実装インターフェースより

```typescript
// 【テスト目的】: CloudWatch Logs Endpoint の公開プロパティが正しく定義されることを確認
// 【テスト内容】: EndpointsConstruct のプロパティを直接アサート
// 【期待される動作】: logsEndpoint が定義される
// 🔵 信頼性: note.md より

test('exposes logs endpoint property', () => {
  // 【検証項目】: 公開プロパティの存在確認
  // 🔵 信頼性: note.md より
  expect(endpointsConstruct.logsEndpoint).toBeDefined();
});
```

---

### 3.4 TC-VPCE-04: S3 Gateway Endpoint 作成確認 🔵

**信頼性**: 🔵 *要件定義書 REQ-011 より*

#### TC-VPCE-04-01: S3 Gateway Endpoint の作成

- **テスト名**: S3 Gateway Endpoint が作成されること
  - **何をテストするか**: S3 用 Gateway Endpoint の作成
  - **期待される動作**: VpcEndpointType=Gateway、ServiceName=.*s3$ のリソースが作成される
- **入力値**: デフォルト Props（enableS3=true）
  - **入力データの意味**: S3 Gateway Endpoint を有効化した標準的な構成
- **期待される結果**: AWS::EC2::VPCEndpoint リソースが VpcEndpointType=Gateway で作成される
  - **期待結果の理由**: REQ-011 で S3 Gateway Endpoint の作成が要求されている。Gateway は無料
- **テストの目的**: ECR イメージレイヤー取得および S3 アクセス用の Endpoint が作成されることを確認
  - **確認ポイント**: VpcEndpointType が Gateway であること（Interface ではない）
- 🔵 信頼性: 要件定義書 REQ-011 に明記

```typescript
// 【テスト目的】: S3 Gateway Endpoint が正しく作成されることを確認
// 【テスト内容】: EndpointsConstruct をデフォルト設定でインスタンス化し、S3 Endpoint を検証
// 【期待される動作】: AWS::EC2::VPCEndpoint リソースが Gateway タイプで作成される
// 🔵 信頼性: REQ-011 より

test('creates S3 Gateway Endpoint', () => {
  // 【検証項目】: S3 Gateway Endpoint の存在確認
  // 🔵 信頼性: REQ-011 より
  template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
    ServiceName: Match.stringLikeRegexp('.*s3$'),
    VpcEndpointType: 'Gateway',
  });
});
```

#### TC-VPCE-04-02: S3 Gateway Endpoint の Route Table 関連付け

- **テスト名**: S3 Gateway Endpoint が Route Table に関連付けられること
  - **何をテストするか**: Gateway Endpoint と Route Table の関連付け
  - **期待される動作**: RouteTableIds プロパティに Route Table の参照が含まれる
- **入力値**: デフォルト Props（enableS3=true）
  - **入力データの意味**: S3 Gateway Endpoint を有効化した標準的な構成
- **期待される結果**: AWS::EC2::VPCEndpoint リソースの RouteTableIds が設定される
  - **期待結果の理由**: Gateway Endpoint は Route Table にルートを追加することで機能する
- **テストの目的**: Private Subnet から S3 へのルーティングが設定されることを確認
  - **確認ポイント**: RouteTableIds に複数の Route Table が指定されること
- 🔵 信頼性: note.md の設計文書より

```typescript
// 【テスト目的】: S3 Gateway Endpoint が Route Table に正しく関連付けられることを確認
// 【テスト内容】: Gateway Endpoint の RouteTableIds プロパティを検証
// 【期待される動作】: RouteTableIds に Route Table の参照が含まれる
// 🔵 信頼性: note.md より

test('S3 Gateway Endpoint has RouteTableIds', () => {
  // 【検証項目】: Route Table 関連付けの存在確認
  // 🔵 信頼性: note.md より
  template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
    ServiceName: Match.stringLikeRegexp('.*s3$'),
    VpcEndpointType: 'Gateway',
    RouteTableIds: Match.arrayWith([
      Match.objectLike({
        Ref: Match.stringLikeRegexp('.*'),
      }),
    ]),
  });
});
```

#### TC-VPCE-04-03: S3 Gateway Endpoint の公開プロパティ確認

- **テスト名**: S3 Gateway Endpoint の公開プロパティが定義されていること
  - **何をテストするか**: Construct の公開プロパティの存在確認
  - **期待される動作**: s3Endpoint プロパティが定義される
- **入力値**: デフォルト Props（enableS3=true）
  - **入力データの意味**: S3 Gateway Endpoint を有効化した標準的な構成
- **期待される結果**: s3Endpoint プロパティが undefined ではないこと
  - **期待結果の理由**: 外部から Endpoint を参照可能にするため
- **テストの目的**: Construct の公開 API が正しく実装されていることを確認
  - **確認ポイント**: プロパティが IGatewayVpcEndpoint 型であること
- 🔵 信頼性: note.md の実装インターフェースより

```typescript
// 【テスト目的】: S3 Gateway Endpoint の公開プロパティが正しく定義されることを確認
// 【テスト内容】: EndpointsConstruct のプロパティを直接アサート
// 【期待される動作】: s3Endpoint が定義される
// 🔵 信頼性: note.md より

test('exposes s3 endpoint property', () => {
  // 【検証項目】: 公開プロパティの存在確認
  // 🔵 信頼性: note.md より
  expect(endpointsConstruct.s3Endpoint).toBeDefined();
});
```

---

### 3.5 TC-VPCE-05: Interface Endpoint の Subnet 配置確認 🔵

**信頼性**: 🔵 *note.md の配置設計より*

#### TC-VPCE-05-01: Interface Endpoint が Private App Subnet に配置されること

- **テスト名**: Interface Endpoint が Private App Subnet に配置されること
  - **何をテストするか**: Interface Endpoint の配置先サブネット
  - **期待される動作**: SubnetIds プロパティに Private App Subnet の参照が含まれる
- **入力値**: デフォルト Props
  - **入力データの意味**: 標準的な構成での配置確認
- **期待される結果**: AWS::EC2::VPCEndpoint の SubnetIds に適切な Subnet が指定される
  - **期待結果の理由**: Private App Subnet (PRIVATE_WITH_EGRESS) に配置する設計
- **テストの目的**: ECS Fargate からアクセス可能な Subnet に配置されることを確認
  - **確認ポイント**: SubnetIds が配列として設定されていること
- 🔵 信頼性: note.md の設計文書より

```typescript
// 【テスト目的】: Interface Endpoint が Private App Subnet に配置されることを確認
// 【テスト内容】: Interface Endpoint の SubnetIds プロパティを検証
// 【期待される動作】: SubnetIds に Subnet の参照が含まれる
// 🔵 信頼性: note.md より

test('Interface Endpoints are placed in Private App Subnets', () => {
  // 【検証項目】: Subnet 配置の確認
  // 🔵 信頼性: note.md より
  const endpoints = template.findResources('AWS::EC2::VPCEndpoint', {
    Properties: {
      VpcEndpointType: 'Interface',
    },
  });

  Object.values(endpoints).forEach((endpoint: any) => {
    expect(endpoint.Properties.SubnetIds).toBeDefined();
    expect(endpoint.Properties.SubnetIds.length).toBeGreaterThan(0);
  });
});
```

---

### 3.6 TC-VPCE-06: Security Group 関連付け確認 🔵

**信頼性**: 🔵 *note.md のセキュリティ考慮事項より*

#### TC-VPCE-06-01: Interface Endpoint に Security Group が関連付けられること

- **テスト名**: Interface Endpoint に Security Group が関連付けられること
  - **何をテストするか**: Interface Endpoint の Security Group 設定
  - **期待される動作**: SecurityGroupIds プロパティに Security Group の参照が含まれる
- **入力値**: デフォルト Props
  - **入力データの意味**: 標準的な構成でのセキュリティ設定確認
- **期待される結果**: AWS::EC2::VPCEndpoint の SecurityGroupIds が設定される
  - **期待結果の理由**: CDK がデフォルトで Security Group を作成・関連付けする
- **テストの目的**: VPC Endpoint へのアクセス制御が設定されることを確認
  - **確認ポイント**: SecurityGroupIds が配列として設定されていること
- 🔵 信頼性: note.md のセキュリティ考慮事項より

```typescript
// 【テスト目的】: Interface Endpoint に Security Group が関連付けられることを確認
// 【テスト内容】: Interface Endpoint の SecurityGroupIds プロパティを検証
// 【期待される動作】: SecurityGroupIds に Security Group の参照が含まれる
// 🔵 信頼性: note.md より

test('Interface Endpoints have Security Groups', () => {
  // 【検証項目】: Security Group 関連付けの確認
  // 🔵 信頼性: note.md より
  const endpoints = template.findResources('AWS::EC2::VPCEndpoint', {
    Properties: {
      VpcEndpointType: 'Interface',
    },
  });

  Object.values(endpoints).forEach((endpoint: any) => {
    expect(endpoint.Properties.SecurityGroupIds).toBeDefined();
    expect(endpoint.Properties.SecurityGroupIds.length).toBeGreaterThan(0);
  });
});
```

---

### 3.7 TC-VPCE-07: デフォルト Props での Endpoint 総数確認 🔵

**信頼性**: 🔵 *note.md の設計文書より*

#### TC-VPCE-07-01: デフォルト Props で 7 つの Endpoint が作成されること

- **テスト名**: デフォルト Props で 7 つの Endpoint が作成されること
  - **何をテストするか**: デフォルト設定での Endpoint 総数
  - **期待される動作**: SSM x 3 + ECR x 2 + Logs x 1 + S3 x 1 = 7 個の Endpoint が作成される
- **入力値**: デフォルト Props（全フラグ true）
  - **入力データの意味**: 全 Endpoint を有効化した標準的な構成
- **期待される結果**: AWS::EC2::VPCEndpoint リソースが 7 個作成される
  - **期待結果の理由**: 設計仕様で 7 種類の Endpoint が定義されている
- **テストの目的**: 全ての Endpoint が正しく作成されることを確認
  - **確認ポイント**: resourceCountIs で総数を検証
- 🔵 信頼性: note.md の設計文書より

```typescript
// 【テスト目的】: デフォルト設定で全ての Endpoint が作成されることを確認
// 【テスト内容】: AWS::EC2::VPCEndpoint リソースの総数を検証
// 【期待される動作】: 7 個の Endpoint が作成される
// 🔵 信頼性: note.md より

test('creates all 7 endpoints with default props', () => {
  // 【検証項目】: Endpoint 総数の確認
  // 🔵 信頼性: note.md より
  // SSM(3) + ECR(2) + Logs(1) + S3(1) = 7
  template.resourceCountIs('AWS::EC2::VPCEndpoint', 7);
});
```

---

## 4. 正常系テストケース（選択的 Endpoint 作成）

### 4.1 TC-VPCE-08: enableSsm=false での SSM Endpoint 無効化確認 🟡

**信頼性**: 🟡 *実装設計から妥当な推測*

#### TC-VPCE-08-01: enableSsm=false で SSM Endpoint が作成されないこと

- **テスト名**: enableSsm=false で SSM Endpoint が作成されないこと
  - **何をテストするか**: SSM Endpoints の無効化機能
  - **期待される動作**: ssm, ssmmessages, ec2messages の 3 Endpoint が作成されない
- **入力値**: enableSsm=false、他はデフォルト
  - **入力データの意味**: SSM Endpoints のみを無効化した構成
- **期待される結果**: SSM 関連の AWS::EC2::VPCEndpoint が存在しない
  - **期待結果の理由**: enableSsm=false により SSM Endpoints の作成をスキップ
- **テストの目的**: Props による選択的 Endpoint 作成機能が動作することを確認
  - **確認ポイント**: ServiceName に ssm が含まれる Endpoint が 0 個
- 🟡 信頼性: 実装設計から妥当な推測

```typescript
// 【テスト目的】: enableSsm=false で SSM Endpoint が作成されないことを確認
// 【テスト内容】: enableSsm=false で EndpointsConstruct を作成し、SSM Endpoint の不在を検証
// 【期待される動作】: SSM 関連の Endpoint が 0 個
// 🟡 信頼性: 実装設計から妥当な推測

describe('when enableSsm=false', () => {
  beforeEach(() => {
    // 【テストデータ準備】: enableSsm=false で Construct を作成
    endpointsConstruct = new EndpointsConstruct(stack, 'TestEndpoints', {
      vpc: vpcConstruct.vpc,
      enableSsm: false,
    });
    template = Template.fromStack(stack);
  });

  test('does not create SSM endpoints', () => {
    // 【検証項目】: SSM Endpoint の不在確認
    // 🟡 信頼性: 実装設計から
    const endpoints = template.findResources('AWS::EC2::VPCEndpoint', {
      Properties: {
        ServiceName: Match.stringLikeRegexp('.*ssm.*'),
      },
    });
    expect(Object.keys(endpoints).length).toBe(0);
  });

  test('creates 4 endpoints (ECR + Logs + S3)', () => {
    // 【検証項目】: Endpoint 総数の確認
    // 🟡 信頼性: 実装設計から
    // ECR(2) + Logs(1) + S3(1) = 4
    template.resourceCountIs('AWS::EC2::VPCEndpoint', 4);
  });
});
```

---

### 4.2 TC-VPCE-09: enableEcr=false での ECR Endpoint 無効化確認 🟡

**信頼性**: 🟡 *実装設計から妥当な推測*

#### TC-VPCE-09-01: enableEcr=false で ECR Endpoint が作成されないこと

- **テスト名**: enableEcr=false で ECR Endpoint が作成されないこと
  - **何をテストするか**: ECR Endpoints の無効化機能
  - **期待される動作**: ecr.api, ecr.dkr の 2 Endpoint が作成されない
- **入力値**: enableEcr=false、他はデフォルト
  - **入力データの意味**: ECR Endpoints のみを無効化した構成
- **期待される結果**: ECR 関連の AWS::EC2::VPCEndpoint が存在しない
  - **期待結果の理由**: enableEcr=false により ECR Endpoints の作成をスキップ
- **テストの目的**: Props による選択的 Endpoint 作成機能が動作することを確認
  - **確認ポイント**: ServiceName に ecr が含まれる Endpoint が 0 個
- 🟡 信頼性: 実装設計から妥当な推測

```typescript
// 【テスト目的】: enableEcr=false で ECR Endpoint が作成されないことを確認
// 【テスト内容】: enableEcr=false で EndpointsConstruct を作成し、ECR Endpoint の不在を検証
// 【期待される動作】: ECR 関連の Endpoint が 0 個
// 🟡 信頼性: 実装設計から妥当な推測

describe('when enableEcr=false', () => {
  beforeEach(() => {
    // 【テストデータ準備】: enableEcr=false で Construct を作成
    endpointsConstruct = new EndpointsConstruct(stack, 'TestEndpoints', {
      vpc: vpcConstruct.vpc,
      enableEcr: false,
    });
    template = Template.fromStack(stack);
  });

  test('does not create ECR endpoints', () => {
    // 【検証項目】: ECR Endpoint の不在確認
    // 🟡 信頼性: 実装設計から
    const endpoints = template.findResources('AWS::EC2::VPCEndpoint', {
      Properties: {
        ServiceName: Match.stringLikeRegexp('.*ecr.*'),
      },
    });
    expect(Object.keys(endpoints).length).toBe(0);
  });

  test('creates 5 endpoints (SSM + Logs + S3)', () => {
    // 【検証項目】: Endpoint 総数の確認
    // 🟡 信頼性: 実装設計から
    // SSM(3) + Logs(1) + S3(1) = 5
    template.resourceCountIs('AWS::EC2::VPCEndpoint', 5);
  });
});
```

---

### 4.3 TC-VPCE-10: enableLogs=false での CloudWatch Logs Endpoint 無効化確認 🟡

**信頼性**: 🟡 *実装設計から妥当な推測*

#### TC-VPCE-10-01: enableLogs=false で CloudWatch Logs Endpoint が作成されないこと

- **テスト名**: enableLogs=false で CloudWatch Logs Endpoint が作成されないこと
  - **何をテストするか**: CloudWatch Logs Endpoint の無効化機能
  - **期待される動作**: logs Endpoint が作成されない
- **入力値**: enableLogs=false、他はデフォルト
  - **入力データの意味**: CloudWatch Logs Endpoint のみを無効化した構成
- **期待される結果**: logs の AWS::EC2::VPCEndpoint が存在しない
  - **期待結果の理由**: enableLogs=false により logs Endpoint の作成をスキップ
- **テストの目的**: Props による選択的 Endpoint 作成機能が動作することを確認
  - **確認ポイント**: ServiceName に logs が含まれる Endpoint が 0 個
- 🟡 信頼性: 実装設計から妥当な推測

```typescript
// 【テスト目的】: enableLogs=false で CloudWatch Logs Endpoint が作成されないことを確認
// 【テスト内容】: enableLogs=false で EndpointsConstruct を作成し、logs Endpoint の不在を検証
// 【期待される動作】: logs Endpoint が 0 個
// 🟡 信頼性: 実装設計から妥当な推測

describe('when enableLogs=false', () => {
  beforeEach(() => {
    // 【テストデータ準備】: enableLogs=false で Construct を作成
    endpointsConstruct = new EndpointsConstruct(stack, 'TestEndpoints', {
      vpc: vpcConstruct.vpc,
      enableLogs: false,
    });
    template = Template.fromStack(stack);
  });

  test('does not create logs endpoint', () => {
    // 【検証項目】: logs Endpoint の不在確認
    // 🟡 信頼性: 実装設計から
    const endpoints = template.findResources('AWS::EC2::VPCEndpoint', {
      Properties: {
        ServiceName: Match.stringLikeRegexp('.*logs$'),
      },
    });
    expect(Object.keys(endpoints).length).toBe(0);
  });

  test('creates 6 endpoints (SSM + ECR + S3)', () => {
    // 【検証項目】: Endpoint 総数の確認
    // 🟡 信頼性: 実装設計から
    // SSM(3) + ECR(2) + S3(1) = 6
    template.resourceCountIs('AWS::EC2::VPCEndpoint', 6);
  });
});
```

---

### 4.4 TC-VPCE-11: enableS3=false での S3 Gateway Endpoint 無効化確認 🟡

**信頼性**: 🟡 *実装設計から妥当な推測*

#### TC-VPCE-11-01: enableS3=false で S3 Gateway Endpoint が作成されないこと

- **テスト名**: enableS3=false で S3 Gateway Endpoint が作成されないこと
  - **何をテストするか**: S3 Gateway Endpoint の無効化機能
  - **期待される動作**: S3 Gateway Endpoint が作成されない
- **入力値**: enableS3=false、他はデフォルト
  - **入力データの意味**: S3 Gateway Endpoint のみを無効化した構成
- **期待される結果**: S3 の AWS::EC2::VPCEndpoint が存在しない
  - **期待結果の理由**: enableS3=false により S3 Endpoint の作成をスキップ
- **テストの目的**: Props による選択的 Endpoint 作成機能が動作することを確認
  - **確認ポイント**: ServiceName に s3 が含まれる Endpoint が 0 個
- 🟡 信頼性: 実装設計から妥当な推測

```typescript
// 【テスト目的】: enableS3=false で S3 Gateway Endpoint が作成されないことを確認
// 【テスト内容】: enableS3=false で EndpointsConstruct を作成し、S3 Endpoint の不在を検証
// 【期待される動作】: S3 Endpoint が 0 個
// 🟡 信頼性: 実装設計から妥当な推測

describe('when enableS3=false', () => {
  beforeEach(() => {
    // 【テストデータ準備】: enableS3=false で Construct を作成
    endpointsConstruct = new EndpointsConstruct(stack, 'TestEndpoints', {
      vpc: vpcConstruct.vpc,
      enableS3: false,
    });
    template = Template.fromStack(stack);
  });

  test('does not create S3 endpoint', () => {
    // 【検証項目】: S3 Endpoint の不在確認
    // 🟡 信頼性: 実装設計から
    const endpoints = template.findResources('AWS::EC2::VPCEndpoint', {
      Properties: {
        ServiceName: Match.stringLikeRegexp('.*s3$'),
      },
    });
    expect(Object.keys(endpoints).length).toBe(0);
  });

  test('creates 6 endpoints (SSM + ECR + Logs)', () => {
    // 【検証項目】: Endpoint 総数の確認
    // 🟡 信頼性: 実装設計から
    // SSM(3) + ECR(2) + Logs(1) = 6
    template.resourceCountIs('AWS::EC2::VPCEndpoint', 6);
  });
});
```

---

## 5. 境界値テストケース

### 5.1 TC-VPCE-12: 全フラグ false での Endpoint 作成確認 🟡

**信頼性**: 🟡 *実装設計から妥当な推測*

#### TC-VPCE-12-01: 全フラグ false で Endpoint が 0 個であること

- **テスト名**: 全フラグ false で Endpoint が作成されないこと
  - **境界値の意味**: 全ての Endpoint を無効化した最小構成
  - **境界値での動作保証**: Props の組み合わせが正しく処理されること
- **入力値**: enableSsm=false, enableEcr=false, enableLogs=false, enableS3=false
  - **境界値選択の根拠**: 全フラグ無効という最小境界
  - **実際の使用場面**: コスト削減やテスト環境での使用
- **期待される結果**: AWS::EC2::VPCEndpoint リソースが 0 個
  - **境界での正確性**: 不要なリソースが作成されないこと
  - **一貫した動作**: 全フラグ無効でもエラーにならないこと
- **テストの目的**: 最小構成での動作確認
  - **堅牢性の確認**: 極端な設定でもエラーが発生しないこと
- 🟡 信頼性: 実装設計から妥当な推測

```typescript
// 【テスト目的】: 全フラグ false で Endpoint が作成されないことを確認
// 【テスト内容】: 全フラグを false に設定し、Endpoint 数を検証
// 【期待される動作】: Endpoint が 0 個
// 🟡 信頼性: 実装設計から妥当な推測

describe('when all flags are false', () => {
  beforeEach(() => {
    // 【テストデータ準備】: 全フラグ false で Construct を作成
    endpointsConstruct = new EndpointsConstruct(stack, 'TestEndpoints', {
      vpc: vpcConstruct.vpc,
      enableSsm: false,
      enableEcr: false,
      enableLogs: false,
      enableS3: false,
    });
    template = Template.fromStack(stack);
  });

  test('creates 0 endpoints', () => {
    // 【検証項目】: Endpoint 総数が 0
    // 🟡 信頼性: 実装設計から
    template.resourceCountIs('AWS::EC2::VPCEndpoint', 0);
  });

  test('all endpoint properties are undefined', () => {
    // 【検証項目】: 公開プロパティが undefined
    // 🟡 信頼性: 実装設計から
    expect(endpointsConstruct.ssmEndpoint).toBeUndefined();
    expect(endpointsConstruct.ssmMessagesEndpoint).toBeUndefined();
    expect(endpointsConstruct.ec2MessagesEndpoint).toBeUndefined();
    expect(endpointsConstruct.ecrApiEndpoint).toBeUndefined();
    expect(endpointsConstruct.ecrDkrEndpoint).toBeUndefined();
    expect(endpointsConstruct.logsEndpoint).toBeUndefined();
    expect(endpointsConstruct.s3Endpoint).toBeUndefined();
  });
});
```

---

### 5.2 TC-VPCE-13: Props 未指定でのデフォルト動作確認 🟡

**信頼性**: 🟡 *実装設計から妥当な推測*

#### TC-VPCE-13-01: Props 未指定（vpc のみ）でデフォルト動作すること

- **テスト名**: vpc のみ指定でデフォルト動作すること
  - **境界値の意味**: オプションパラメータ未指定での動作
  - **境界値での動作保証**: デフォルト値が正しく適用されること
- **入力値**: vpc のみ指定（enable* フラグ未指定）
  - **境界値選択の根拠**: 最小限の必須パラメータのみ
  - **実際の使用場面**: 標準的な使用パターン
- **期待される結果**: 全 7 個の Endpoint が作成される
  - **境界での正確性**: デフォルト値 true が適用される
  - **一貫した動作**: 明示的な true 指定と同じ動作
- **テストの目的**: デフォルト値の動作確認
  - **堅牢性の確認**: オプションパラメータ未指定でも正常動作
- 🟡 信頼性: 実装設計から妥当な推測

```typescript
// 【テスト目的】: Props 未指定でデフォルト動作することを確認
// 【テスト内容】: vpc のみ指定で EndpointsConstruct を作成し、全 Endpoint の作成を検証
// 【期待される動作】: 全 7 個の Endpoint が作成される
// 🟡 信頼性: 実装設計から妥当な推測

describe('when only vpc is provided (default props)', () => {
  beforeEach(() => {
    // 【テストデータ準備】: vpc のみ指定で Construct を作成
    endpointsConstruct = new EndpointsConstruct(stack, 'TestEndpoints', {
      vpc: vpcConstruct.vpc,
    });
    template = Template.fromStack(stack);
  });

  test('creates all 7 endpoints by default', () => {
    // 【検証項目】: Endpoint 総数が 7
    // 🟡 信頼性: 実装設計から
    template.resourceCountIs('AWS::EC2::VPCEndpoint', 7);
  });
});
```

---

### 5.3 TC-VPCE-14: Interface Endpoint の Subnet 数確認 🟡

**信頼性**: 🟡 *VPC Construct の設計から妥当な推測*

#### TC-VPCE-14-01: Interface Endpoint が 2 つの AZ の Subnet に配置されること

- **テスト名**: Interface Endpoint が 2 AZ に配置されること
  - **境界値の意味**: Multi-AZ 配置の境界確認
  - **境界値での動作保証**: 可用性要件を満たす配置
- **入力値**: デフォルト Props（maxAzs=2 の VPC）
  - **境界値選択の根拠**: 設計仕様の 2 AZ 構成
  - **実際の使用場面**: 本番環境での標準構成
- **期待される結果**: SubnetIds に 2 つの Subnet が含まれる
  - **境界での正確性**: 各 AZ に 1 つずつ配置
  - **一貫した動作**: 全ての Interface Endpoint で同じ配置
- **テストの目的**: Multi-AZ 配置の確認
  - **堅牢性の確認**: 高可用性構成の検証
- 🟡 信頼性: VPC Construct の設計から妥当な推測

```typescript
// 【テスト目的】: Interface Endpoint が 2 AZ に配置されることを確認
// 【テスト内容】: Interface Endpoint の SubnetIds 要素数を検証
// 【期待される動作】: 各 Endpoint が 2 つの Subnet に配置される
// 🟡 信頼性: VPC Construct の設計から

test('Interface Endpoints are placed in 2 subnets (Multi-AZ)', () => {
  // 【検証項目】: Subnet 数の確認
  // 🟡 信頼性: VPC Construct 設計から
  const endpoints = template.findResources('AWS::EC2::VPCEndpoint', {
    Properties: {
      VpcEndpointType: 'Interface',
    },
  });

  Object.values(endpoints).forEach((endpoint: any) => {
    expect(endpoint.Properties.SubnetIds.length).toBe(2);
  });
});
```

---

### 5.4 TC-VPCE-15: Gateway Endpoint の Route Table 数確認 🟡

**信頼性**: 🟡 *note.md の設計から妥当な推測*

#### TC-VPCE-15-01: S3 Gateway Endpoint が複数の Route Table に関連付けられること

- **テスト名**: S3 Gateway Endpoint が複数の Route Table に関連付けられること
  - **境界値の意味**: Route Table 関連付けの数量確認
  - **境界値での動作保証**: 必要な全ての Subnet からアクセス可能
- **入力値**: デフォルト Props
  - **境界値選択の根拠**: 設計仕様で Private App と Private DB 両方に関連付け
  - **実際の使用場面**: ECR イメージ取得と DB からの S3 アクセス
- **期待される結果**: RouteTableIds に複数の Route Table が含まれる
  - **境界での正確性**: Private App と Private DB の Route Table
  - **一貫した動作**: 各 AZ の Route Table が含まれる
- **テストの目的**: Route Table 関連付けの網羅性確認
  - **堅牢性の確認**: 必要な全てのルートが設定される
- 🟡 信頼性: note.md の設計から妥当な推測

```typescript
// 【テスト目的】: S3 Gateway Endpoint が複数の Route Table に関連付けられることを確認
// 【テスト内容】: S3 Gateway Endpoint の RouteTableIds 要素数を検証
// 【期待される動作】: 複数の Route Table に関連付けられる
// 🟡 信頼性: note.md から

test('S3 Gateway Endpoint is associated with multiple Route Tables', () => {
  // 【検証項目】: Route Table 数の確認
  // 🟡 信頼性: note.md から
  const endpoints = template.findResources('AWS::EC2::VPCEndpoint', {
    Properties: {
      VpcEndpointType: 'Gateway',
    },
  });

  const s3Endpoint = Object.values(endpoints)[0] as any;
  expect(s3Endpoint.Properties.RouteTableIds.length).toBeGreaterThan(1);
});
```

---

## 6. 異常系テストケース（エラーハンドリング）

### 6.1 TC-VPCE-16: vpc が undefined の場合のエラー 🔴

**信頼性**: 🔴 *TypeScript の型システムから推測*

#### TC-VPCE-16-01: vpc が undefined の場合は TypeScript コンパイルエラーになること

- **テスト名**: vpc が undefined の場合はコンパイルエラー
  - **エラーケースの概要**: 必須パラメータ未指定
  - **エラー処理の重要性**: 不正な Construct 作成を防止
- **入力値**: vpc を指定しない（Props 未指定 or vpc: undefined）
  - **不正な理由**: vpc は必須パラメータ
  - **実際の発生シナリオ**: 開発者のコーディングミス
- **期待される結果**: TypeScript コンパイルエラー
  - **エラーメッセージの内容**: Property 'vpc' is missing
  - **システムの安全性**: ランタイムエラーを防止
- **テストの目的**: 型安全性の確認
  - **品質保証の観点**: コンパイル時にエラーを検出
- 🔴 信頼性: TypeScript の型システムから推測

```typescript
// 【テスト目的】: vpc 未指定がコンパイルエラーになることを確認
// 【テスト内容】: 型レベルでのテスト（実行時テストではない）
// 【期待される動作】: TypeScript コンパイルエラー
// 🔴 信頼性: TypeScript から推測

// このテストは型チェックで検証されるため、実行時テストは不要
// 以下のコードがコンパイルエラーになることを確認:
// new EndpointsConstruct(stack, 'Test', {}); // Error: Property 'vpc' is missing
```

---

### 6.2 TC-VPCE-17: 不正な VPC 参照の場合のエラー 🔴

**信頼性**: 🔴 *CDK の動作から推測*

#### TC-VPCE-17-01: 無効な VPC 参照で CDK 合成時エラーになること

- **テスト名**: 無効な VPC 参照で CDK 合成時エラー
  - **エラーケースの概要**: VPC に PRIVATE_WITH_EGRESS サブネットがない
  - **エラー処理の重要性**: デプロイ前にエラーを検出
- **入力値**: サブネットのない VPC
  - **不正な理由**: Interface Endpoint の配置先がない
  - **実際の発生シナリオ**: 不完全な VPC 構成での使用
- **期待される結果**: CDK 合成時エラー
  - **エラーメッセージの内容**: No subnets found
  - **システムの安全性**: 無効なデプロイを防止
- **テストの目的**: VPC 依存関係の検証
  - **品質保証の観点**: 前提条件の不備を検出
- 🔴 信頼性: CDK の動作から推測

```typescript
// 【テスト目的】: 無効な VPC 参照で合成エラーになることを確認
// 【テスト内容】: PRIVATE_WITH_EGRESS サブネットのない VPC を使用
// 【期待される動作】: CDK 合成時にエラー
// 🔴 信頼性: CDK 動作から推測

test('throws error when VPC has no PRIVATE_WITH_EGRESS subnets', () => {
  // 【テストデータ準備】: サブネットのない VPC を作成
  const emptyVpc = new ec2.Vpc(stack, 'EmptyVpc', {
    maxAzs: 2,
    subnetConfiguration: [
      {
        name: 'Public',
        subnetType: ec2.SubnetType.PUBLIC,
        cidrMask: 24,
      },
    ],
  });

  // 【実行と検証】: エラーがスローされること
  // 🔴 信頼性: CDK 動作から推測
  expect(() => {
    new EndpointsConstruct(stack, 'TestEndpoints', {
      vpc: emptyVpc,
    });
  }).toThrow();
});
```

---

### 6.3 TC-VPCE-18: 同名 Endpoint 重複時のエラー 🔴

**信頼性**: 🔴 *CDK の動作から推測*

#### TC-VPCE-18-01: 同じ Scope 内で重複した ID での作成がエラーになること

- **テスト名**: 同じ Scope 内で重複した ID での作成がエラー
  - **エラーケースの概要**: Construct ID の重複
  - **エラー処理の重要性**: リソース名の衝突を防止
- **入力値**: 同じ Stack に同じ ID で 2 回作成
  - **不正な理由**: CDK では Construct ID は一意でなければならない
  - **実際の発生シナリオ**: コピー&ペーストミスや複数インスタンス作成
- **期待される結果**: CDK 合成時エラー
  - **エラーメッセージの内容**: There is already a Construct with name
  - **システムの安全性**: リソース衝突を防止
- **テストの目的**: CDK の ID 管理の検証
  - **品質保証の観点**: 意図しない重複作成の防止
- 🔴 信頼性: CDK の動作から推測

```typescript
// 【テスト目的】: 同じ ID で重複作成がエラーになることを確認
// 【テスト内容】: 同じ Stack 内で同じ ID の Construct を 2 回作成
// 【期待される動作】: エラーがスローされる
// 🔴 信頼性: CDK 動作から推測

test('throws error when creating duplicate constructs with same id', () => {
  // 【テストデータ準備】: 1 つ目の Construct を作成
  new EndpointsConstruct(stack, 'TestEndpoints', {
    vpc: vpcConstruct.vpc,
  });

  // 【実行と検証】: 同じ ID で 2 つ目を作成しようとするとエラー
  // 🔴 信頼性: CDK 動作から推測
  expect(() => {
    new EndpointsConstruct(stack, 'TestEndpoints', {
      vpc: vpcConstruct.vpc,
    });
  }).toThrow(/There is already a Construct with name/);
});
```

---

### 6.4 TC-VPCE-19: VPC Endpoint 数上限超過のエラー 🔴

**信頼性**: 🔴 *AWS Service Quota から推測*

#### TC-VPCE-19-01: VPC あたりの Endpoint 数上限超過時はデプロイエラーになること

- **テスト名**: VPC Endpoint 数上限超過でデプロイエラー
  - **エラーケースの概要**: AWS Service Quota の超過
  - **エラー処理の重要性**: デプロイ失敗の原因を明確化
- **入力値**: 多数の Endpoint を作成（CDK テストでは再現困難）
  - **不正な理由**: VPC あたりの Gateway Endpoint 数に上限がある
  - **実際の発生シナリオ**: 大規模環境での多数の Endpoint 作成
- **期待される結果**: AWS CloudFormation デプロイエラー
  - **エラーメッセージの内容**: Quota exceeded
  - **システムの安全性**: 課金増加を防止
- **テストの目的**: AWS 制約の認識
  - **品質保証の観点**: 運用時の制約を文書化（実行時テストは困難）
- 🔴 信頼性: AWS Service Quota から推測（デプロイ時のみ検出可能）

```typescript
// 【テスト目的】: AWS Service Quota 超過はデプロイ時に検出されることを文書化
// 【テスト内容】: このテストは CDK 単体テストでは再現困難
// 【期待される動作】: デプロイ時に AWS からエラーが返される
// 🔴 信頼性: AWS Service Quota から推測

// 注: このエラーケースは AWS 環境へのデプロイ時にのみ検出可能
// CDK 単体テストでは Service Quota をシミュレートできないため、
// E2E テストまたは手動テストで検証が必要
```

---

## 7. テストケース実装時のセットアップ・クリーンアップ

### 7.1 テストファイル全体のセットアップ 🔵

**信頼性**: 🔵 *既存テスト vpc-construct.test.ts より*

```typescript
/**
 * VPC Endpoints Construct テスト
 *
 * TASK-0003: VPC Endpoints Construct 実装
 * フェーズ: TDD Red Phase - 失敗するテストケースの作成
 *
 * テストケース:
 * - TC-VPCE-01: SSM Interface Endpoints 作成確認
 * - TC-VPCE-02: ECR Interface Endpoints 作成確認
 * - TC-VPCE-03: CloudWatch Logs Interface Endpoint 作成確認
 * - TC-VPCE-04: S3 Gateway Endpoint 作成確認
 * - TC-VPCE-05: Interface Endpoint の Subnet 配置確認
 * - TC-VPCE-06: Security Group 関連付け確認
 * - TC-VPCE-07: デフォルト Props での Endpoint 総数確認
 * - TC-VPCE-08〜11: 選択的 Endpoint 作成確認
 * - TC-VPCE-12〜15: 境界値テスト
 * - TC-VPCE-16〜19: 異常系テスト
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { VpcConstruct } from '../../../lib/construct/vpc/vpc-construct';
import { EndpointsConstruct } from '../../../lib/construct/vpc/endpoints-construct';

describe('EndpointsConstruct', () => {
  // 【テスト前準備】: 各テストで独立した CDK App と Stack を作成
  // 【環境初期化】: 前のテストの状態が影響しないよう、新しいインスタンスを使用
  let app: cdk.App;
  let stack: cdk.Stack;
  let vpcConstruct: VpcConstruct;
  let endpointsConstruct: EndpointsConstruct;
  let template: Template;

  beforeEach(() => {
    // 【テストデータ準備】: CDK App と Stack を作成
    // 【初期条件設定】: デフォルト設定で VPC と Endpoints を作成
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: {
        account: '123456789012',
        region: 'ap-northeast-1',
      },
    });
    vpcConstruct = new VpcConstruct(stack, 'TestVpc');
  });

  afterEach(() => {
    // 【テスト後処理】: 明示的なクリーンアップは不要
    // 【状態復元】: Jest が自動的にテスト間の分離を保証
  });

  // テストケースをここに実装
});
```

---

## 8. 要件定義との対応関係

### 8.1 参照した EARS 要件 🔵

| 要件ID | 内容 | 対応テストケース |
|--------|------|-----------------|
| REQ-008 | Systems Manager VPC Endpoints | TC-VPCE-01 |
| REQ-009 | ECR VPC Endpoints | TC-VPCE-02 |
| REQ-010 | CloudWatch Logs VPC Endpoint | TC-VPCE-03 |
| REQ-011 | S3 Gateway Endpoint | TC-VPCE-04 |

### 8.2 参照した設計文書 🔵

| 文書 | 参照セクション | 対応テストケース |
|------|---------------|-----------------|
| note.md | 設計文書 > VPC Endpoints 構成 | TC-VPCE-01〜07 |
| note.md | 実装インターフェース | 公開プロパティ確認テスト |
| note.md | 注意事項 > 技術的制約 | TC-VPCE-05, 06 |
| vpc-endpoints-requirements.md | テスト戦略 | TC-VPCE-01〜09 |

### 8.3 参照した受け入れ基準 🔵

| AC-ID | 基準 | 対応テストケース |
|-------|------|-----------------|
| AC-002 | SSM 用 VPC Endpoint が作成される | TC-VPCE-01 |
| AC-003 | ECR 用 VPC Endpoint が作成される | TC-VPCE-02 |
| AC-004 | CloudWatch Logs 用 VPC Endpoint が作成される | TC-VPCE-03 |
| AC-005 | S3 用 Gateway Endpoint が作成される | TC-VPCE-04 |
| AC-006 | Interface Endpoint が Private App Subnet に配置 | TC-VPCE-05 |
| AC-007 | Interface Endpoint で Private DNS が有効 | TC-VPCE-01〜03 |
| AC-008 | S3 Gateway Endpoint が Route Table に追加 | TC-VPCE-04-02 |

---

## 9. 信頼性レベルサマリー

### 9.1 テストケース別信頼性

| カテゴリ | 🔵 青信号 | 🟡 黄信号 | 🔴 赤信号 | 合計 |
|----------|-----------|-----------|-----------|------|
| 正常系（基本動作） | 15 | 0 | 0 | 15 |
| 正常系（選択的作成） | 0 | 8 | 0 | 8 |
| 境界値 | 0 | 4 | 0 | 4 |
| 異常系 | 0 | 0 | 4 | 4 |
| **合計** | **15** | **12** | **4** | **31** |
| **割合** | **48%** | **39%** | **13%** | **100%** |

### 9.2 品質評価

**評価**: ✅ **高品質**

- **テストケース分類**: 正常系・異常系・境界値が網羅されている
- **期待値定義**: 各テストケースの期待値が明確
- **技術選択**: TypeScript + Jest + CDK assertions で確定
- **実装可能性**: 現在の技術スタックで実現可能
- **信頼性レベル**: 🔵（青信号）が 48%、🟡（黄信号）が 39%

### 9.3 要改善項目

| 項目 | 現在の信頼性 | 改善方法 |
|------|-------------|----------|
| 選択的 Endpoint 作成テスト | 🟡 | 実装後に動作確認 |
| 境界値テスト | 🟡 | 実装後に動作確認 |
| 異常系テスト（AWS 制約） | 🔴 | E2E テストで検証 |

---

## 10. 変更履歴

| 日付 | 版 | 変更内容 |
|------|-----|---------|
| 2026-01-16 | 1.0 | 初版作成 |

---

## 11. 関連文書リンク

| 文書 | パス |
|------|------|
| タスク定義 | `docs/tasks/aws-cdk-serverless-architecture/TASK-0003.md` |
| タスクノート | `docs/implements/aws-cdk-serverless-architecture/TASK-0003/note.md` |
| 要件定義書 | `docs/implements/aws-cdk-serverless-architecture/TASK-0003/vpc-endpoints-requirements.md` |
| 依存先テスト | `infra/test/construct/vpc/vpc-construct.test.ts` |
| テスト出力先 | `infra/test/construct/vpc/endpoints-construct.test.ts` |
