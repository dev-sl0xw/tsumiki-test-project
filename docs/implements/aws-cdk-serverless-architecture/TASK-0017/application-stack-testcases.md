# TASK-0017: Application Stack 統合 - TDDテストケース定義書

**タスクID**: TASK-0017
**機能名**: Application Stack 統合
**要件名**: aws-cdk-serverless-architecture
**作成日**: 2026-02-01
**信頼性評価**: 🔵 高品質

---

## テスト概要

Application Stack の統合テストを定義します。既存の Stack テスト（vpc-stack.test.ts、database-stack.test.ts）のパターンに従い、以下のカテゴリでテストを実施します：

- **TC-AS-01〜02**: スナップショットテスト
- **TC-AS-03〜08**: リソース存在確認テスト
- **TC-AS-09〜14**: コンポーネント統合テスト
- **TC-AS-15〜20**: 公開プロパティ確認テスト
- **TC-AS-21〜26**: CfnOutput 確認テスト
- **TC-AS-27〜30**: 依存関係テスト
- **TC-AS-31〜33**: セキュリティテスト
- **TC-AS-34〜36**: 異常系・境界値テスト

**総テストケース数**: 36 テストケース

---

## 1. 正常系テストケース（基本的な動作）

### TC-AS-01: スナップショットテスト（devConfig） 🔵

**信頼性**: 🔵 *CDK ベストプラクティス、vpc-stack.test.ts パターンより*

- **テスト名**: CloudFormation テンプレートのスナップショットテスト（Dev環境）
  - **何をテストするか**: Application Stack の CloudFormation テンプレート全体の一貫性
  - **期待される動作**: テンプレートがスナップショットと一致する
- **入力値**: `devConfig` を使用した ApplicationStack
  - **入力データの意味**: 開発環境の標準設定
- **期待される結果**: スナップショットと一致
  - **期待結果の理由**: テンプレートの意図しない変更（リグレッション）を検出するため
- **テストの目的**: CloudFormation テンプレートの一貫性保証
  - **確認ポイント**: 全リソースの設定値が期待通り

### TC-AS-02: スナップショットテスト（prodConfig） 🔵

**信頼性**: 🔵 *database-stack.test.ts パターンより*

- **テスト名**: CloudFormation テンプレートのスナップショットテスト（Prod環境）
  - **何をテストするか**: 本番環境設定での CloudFormation テンプレート
  - **期待される動作**: 本番用テンプレートがスナップショットと一致する
- **入力値**: `prodConfig` を使用した ApplicationStack
  - **入力データの意味**: 本番環境の設定（リソースサイズ等が異なる可能性）
- **期待される結果**: スナップショットと一致
  - **期待結果の理由**: 環境別設定の正確性を保証
- **テストの目的**: 環境別 CloudFormation テンプレートの一貫性保証
  - **確認ポイント**: 環境固有の設定値

---

## 2. リソース存在確認テスト

### TC-AS-03: ECS Cluster リソース存在確認 🔵

**信頼性**: 🔵 *REQ-012、TASK-0017.md より*

- **テスト名**: ECS Cluster が 1 つ作成されること
  - **何をテストするか**: AWS::ECS::Cluster リソースの作成
  - **期待される動作**: Fargate 専用クラスターが作成される
- **入力値**: ApplicationStackProps（全必須パラメータ）
  - **入力データの意味**: Application Stack の標準入力
- **期待される結果**: `template.resourceCountIs('AWS::ECS::Cluster', 1)`
  - **期待結果の理由**: REQ-012 で 1 つの ECS Cluster 作成が要求されている
- **テストの目的**: EcsClusterConstruct 統合確認
  - **確認ポイント**: クラスターリソースの存在

### TC-AS-04: Task Definition リソース存在確認 🔵

**信頼性**: 🔵 *REQ-014〜018、TASK-0017.md より*

- **テスト名**: Task Definition が 2 つ作成されること（Frontend + Backend）
  - **何をテストするか**: AWS::ECS::TaskDefinition リソースの作成
  - **期待される動作**: Frontend と Backend 用に各 1 つ、計 2 つ作成
- **入力値**: ApplicationStackProps
  - **入力データの意味**: 標準設定
- **期待される結果**: `template.resourceCountIs('AWS::ECS::TaskDefinition', 2)`
  - **期待結果の理由**: REQ-021 で Frontend/Backend 別 Service が要求されている
- **テストの目的**: TaskDefinitionConstruct 統合確認
  - **確認ポイント**: 2 つの TaskDefinition 存在

### TC-AS-05: ECS Service リソース存在確認 🔵

**信頼性**: 🔵 *REQ-019〜021、TASK-0017.md より*

- **テスト名**: ECS Service が 2 つ作成されること（Frontend + Backend）
  - **何をテストするか**: AWS::ECS::Service リソースの作成
  - **期待される動作**: Frontend と Backend Service が各 1 つ作成
- **入力値**: ApplicationStackProps
  - **入力データの意味**: 標準設定
- **期待される結果**: `template.resourceCountIs('AWS::ECS::Service', 2)`
  - **期待結果の理由**: REQ-021 で別々の ECS Service 構成が要求されている
- **テストの目的**: EcsServiceConstruct 統合確認
  - **確認ポイント**: 2 つの Service 存在

### TC-AS-06: ALB リソース存在確認 🔵

**信頼性**: 🔵 *REQ-028、TASK-0017.md より*

- **テスト名**: ALB が 1 つ作成されること
  - **何をテストするか**: AWS::ElasticLoadBalancingV2::LoadBalancer リソースの作成
  - **期待される動作**: Internet-facing ALB が作成される
- **入力値**: ApplicationStackProps
  - **入力データの意味**: 標準設定
- **期待される結果**: `template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1)`
  - **期待結果の理由**: REQ-028 で ALB 作成が要求されている
- **テストの目的**: AlbConstruct 統合確認
  - **確認ポイント**: ALB リソースの存在

### TC-AS-07: Target Group リソース存在確認 🔵

**信頼性**: 🔵 *REQ-028、alb-construct.test.ts パターンより*

- **テスト名**: Target Group が作成されること
  - **何をテストするか**: AWS::ElasticLoadBalancingV2::TargetGroup リソースの作成
  - **期待される動作**: ECS Service 用の Target Group が作成される
- **入力値**: ApplicationStackProps
  - **入力データの意味**: 標準設定
- **期待される結果**: `template.resourceCountIs('AWS::ElasticLoadBalancingV2::TargetGroup', 1)` 以上
  - **期待結果の理由**: ALB にはターゲットへのルーティング用 Target Group が必要
- **テストの目的**: ALB と ECS Service の接続確認
  - **確認ポイント**: Target Group の存在

### TC-AS-08: Listener リソース存在確認 🔵

**信頼性**: 🔵 *REQ-029〜030、alb-construct.test.ts パターンより*

- **テスト名**: HTTPS/HTTP Listener が作成されること
  - **何をテストするか**: AWS::ElasticLoadBalancingV2::Listener リソースの作成
  - **期待される動作**: HTTPS リスナーと HTTP→HTTPS リダイレクト用リスナーが作成
- **入力値**: ApplicationStackProps
  - **入力データの意味**: certificateArn を含む標準設定
- **期待される結果**: `template.resourceCountIs('AWS::ElasticLoadBalancingV2::Listener', 2)`
  - **期待結果の理由**: REQ-029（HTTP→HTTPS）、REQ-030（ACM 証明書）
- **テストの目的**: HTTPS 強制設定の確認
  - **確認ポイント**: 2 つの Listener 存在

---

## 3. コンポーネント統合テスト

### TC-AS-09: ECS Cluster Container Insights 設定確認 🔵

**信頼性**: 🔵 *REQ-013、ecs-cluster-construct.test.ts パターンより*

- **テスト名**: Container Insights が有効化されていること
  - **何をテストするか**: ECS Cluster の Container Insights 設定
  - **期待される動作**: containerInsights: 'enabled' が設定
- **入力値**: ApplicationStackProps
  - **入力データの意味**: 標準設定
- **期待される結果**: `template.hasResourceProperties('AWS::ECS::Cluster', { ClusterSettings: [...{ Name: 'containerInsights', Value: 'enabled' }] })`
  - **期待結果の理由**: REQ-013 で Container Insights 有効化が要求されている
- **テストの目的**: モニタリング設定の確認
  - **確認ポイント**: containerInsights 設定値

### TC-AS-10: Task Definition CPU/Memory 設定確認 🔵

**信頼性**: 🔵 *REQ-014、task-definition-construct.test.ts パターンより*

- **テスト名**: Task Definition の CPU/Memory が正しく設定されていること
  - **何をテストするか**: Task Definition の Cpu と Memory 設定
  - **期待される動作**: 0.5 vCPU / 1 GB Memory が設定
- **入力値**: ApplicationStackProps（config.taskCpu, config.taskMemory）
  - **入力データの意味**: 環境設定からの CPU/Memory 値
- **期待される結果**: `template.hasResourceProperties('AWS::ECS::TaskDefinition', { Cpu: '512', Memory: '1024' })`
  - **期待結果の理由**: REQ-014 で 0.5 vCPU / 1GB が指定されている
- **テストの目的**: タスクリソース設定の確認
  - **確認ポイント**: Cpu と Memory の値

### TC-AS-11: ECS Service Desired Count 設定確認 🔵

**信頼性**: 🔵 *REQ-020、ecs-service-construct.test.ts パターンより*

- **テスト名**: Desired Count が 2 以上に設定されていること
  - **何をテストするか**: ECS Service の DesiredCount 設定
  - **期待される動作**: 高可用性のため 2 以上のタスク数が設定
- **入力値**: ApplicationStackProps（config.desiredCount）
  - **入力データの意味**: 環境設定からの Desired Count
- **期待される結果**: `DesiredCount >= 2`
  - **期待結果の理由**: REQ-020、NFR-004 で Desired Count 2 以上が要求されている
- **テストの目的**: 高可用性設定の確認
  - **確認ポイント**: DesiredCount 値

### TC-AS-12: ECS Service EnableExecuteCommand 設定確認 🔵

**信頼性**: 🔵 *REQ-019、ecs-service-construct.test.ts パターンより*

- **テスト名**: ECS Exec が有効化されていること
  - **何をテストするか**: ECS Service の EnableExecuteCommand 設定
  - **期待される動作**: ECS Exec が有効
- **入力値**: ApplicationStackProps
  - **入力データの意味**: 標準設定
- **期待される結果**: `template.hasResourceProperties('AWS::ECS::Service', { EnableExecuteCommand: true })`
  - **期待結果の理由**: REQ-019 で ECS Exec 有効化が要求されている
- **テストの目的**: 運用機能の確認
  - **確認ポイント**: EnableExecuteCommand の値

### TC-AS-13: ALB Internet-facing 設定確認 🔵

**信頼性**: 🔵 *REQ-028、alb-construct.test.ts パターンより*

- **テスト名**: ALB が Internet-facing で設定されていること
  - **何をテストするか**: ALB の Scheme 設定
  - **期待される動作**: Public Subnet に配置され、インターネットからアクセス可能
- **入力値**: ApplicationStackProps
  - **入力データの意味**: 標準設定
- **期待される結果**: `template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', { Scheme: 'internet-facing' })`
  - **期待結果の理由**: REQ-028 で Internet-facing が要求されている
- **テストの目的**: ALB 配置設定の確認
  - **確認ポイント**: Scheme の値

### TC-AS-14: HTTP→HTTPS リダイレクト設定確認 🔵

**信頼性**: 🔵 *REQ-029、alb-construct.test.ts パターンより*

- **テスト名**: HTTP リクエストが HTTPS にリダイレクトされること
  - **何をテストするか**: HTTP Listener のリダイレクトアクション
  - **期待される動作**: Port 80 への接続が Port 443 へリダイレクト
- **入力値**: ApplicationStackProps
  - **入力データの意味**: 標準設定
- **期待される結果**: `DefaultActions: [{ Type: 'redirect', RedirectConfig: { Protocol: 'HTTPS', Port: '443', StatusCode: 'HTTP_301' } }]`
  - **期待結果の理由**: REQ-029 で HTTP→HTTPS リダイレクトが要求されている
- **テストの目的**: セキュリティ設定の確認
  - **確認ポイント**: リダイレクトアクションの設定

---

## 4. 公開プロパティ確認テスト

### TC-AS-15: cluster プロパティ公開確認 🔵

**信頼性**: 🔵 *note.md 公開プロパティ、database-stack.test.ts パターンより*

- **テスト名**: cluster プロパティが定義されていること
  - **何をテストするか**: ApplicationStack.cluster プロパティの存在
  - **期待される動作**: ICluster 型のプロパティがアクセス可能
- **入力値**: ApplicationStack インスタンス
  - **入力データの意味**: 作成済み Stack
- **期待される結果**: `expect(stack.cluster).toBeDefined()`
  - **期待結果の理由**: 後続 Stack（Ops Stack 等）からの参照に必要
- **テストの目的**: Stack 間連携の確認
  - **確認ポイント**: clusterArn が取得可能か

### TC-AS-16: frontendTaskDefinition プロパティ公開確認 🔵

**信頼性**: 🔵 *note.md 公開プロパティより*

- **テスト名**: frontendTaskDefinition プロパティが定義されていること
  - **何をテストするか**: ApplicationStack.frontendTaskDefinition プロパティの存在
  - **期待される動作**: FargateTaskDefinition 型のプロパティがアクセス可能
- **入力値**: ApplicationStack インスタンス
  - **入力データの意味**: 作成済み Stack
- **期待される結果**: `expect(stack.frontendTaskDefinition).toBeDefined()`
  - **期待結果の理由**: CI/CD Pipeline 等からの参照に必要
- **テストの目的**: Task Definition へのアクセス確認
  - **確認ポイント**: taskDefinitionArn が取得可能か

### TC-AS-17: backendTaskDefinition プロパティ公開確認 🔵

**信頼性**: 🔵 *note.md 公開プロパティより*

- **テスト名**: backendTaskDefinition プロパティが定義されていること
  - **何をテストするか**: ApplicationStack.backendTaskDefinition プロパティの存在
  - **期待される動作**: FargateTaskDefinition 型のプロパティがアクセス可能
- **入力値**: ApplicationStack インスタンス
  - **入力データの意味**: 作成済み Stack
- **期待される結果**: `expect(stack.backendTaskDefinition).toBeDefined()`
  - **期待結果の理由**: CI/CD Pipeline 等からの参照に必要
- **テストの目的**: Task Definition へのアクセス確認
  - **確認ポイント**: taskDefinitionArn が取得可能か

### TC-AS-18: frontendService プロパティ公開確認 🔵

**信頼性**: 🔵 *note.md 公開プロパティより*

- **テスト名**: frontendService プロパティが定義されていること
  - **何をテストするか**: ApplicationStack.frontendService プロパティの存在
  - **期待される動作**: FargateService 型のプロパティがアクセス可能
- **入力値**: ApplicationStack インスタンス
  - **入力データの意味**: 作成済み Stack
- **期待される結果**: `expect(stack.frontendService).toBeDefined()`
  - **期待結果の理由**: Ops Stack からのモニタリング設定等に必要
- **テストの目的**: Service へのアクセス確認
  - **確認ポイント**: serviceArn が取得可能か

### TC-AS-19: backendService プロパティ公開確認 🔵

**信頼性**: 🔵 *note.md 公開プロパティより*

- **テスト名**: backendService プロパティが定義されていること
  - **何をテストするか**: ApplicationStack.backendService プロパティの存在
  - **期待される動作**: FargateService 型のプロパティがアクセス可能
- **入力値**: ApplicationStack インスタンス
  - **入力データの意味**: 作成済み Stack
- **期待される結果**: `expect(stack.backendService).toBeDefined()`
  - **期待結果の理由**: Ops Stack からのモニタリング設定等に必要
- **テストの目的**: Service へのアクセス確認
  - **確認ポイント**: serviceArn が取得可能か

### TC-AS-20: loadBalancer / dnsName プロパティ公開確認 🔵

**信頼性**: 🔵 *note.md 公開プロパティより*

- **テスト名**: loadBalancer と dnsName プロパティが定義されていること
  - **何をテストするか**: ApplicationStack.loadBalancer, dnsName プロパティの存在
  - **期待される動作**: IApplicationLoadBalancer 型と string 型のプロパティがアクセス可能
- **入力値**: ApplicationStack インスタンス
  - **入力データの意味**: 作成済み Stack
- **期待される結果**: `expect(stack.loadBalancer).toBeDefined()`, `expect(stack.dnsName).toBeDefined()`
  - **期待結果の理由**: Distribution Stack から CloudFront Origin 設定に必要
- **テストの目的**: ALB プロパティへのアクセス確認
  - **確認ポイント**: loadBalancerArn、dnsName が取得可能か

---

## 5. CfnOutput 確認テスト

### TC-AS-21: AlbDnsName CfnOutput 確認 🔵

**信頼性**: 🔵 *note.md CfnOutput、database-stack.test.ts パターンより*

- **テスト名**: AlbDnsName が CfnOutput でエクスポートされていること
  - **何をテストするか**: AlbDnsName の CfnOutput 存在と Export 設定
  - **期待される動作**: `${envName}-AlbDnsName` でエクスポート
- **入力値**: ApplicationStack Template
  - **入力データの意味**: synth 後のテンプレート
- **期待される結果**: `template.hasOutput('AlbDnsName', { Export: { Name: '${envName}-AlbDnsName' } })`
  - **期待結果の理由**: 他 Stack からの参照、運用時の確認用
- **テストの目的**: CloudFormation 出力の確認
  - **確認ポイント**: Export 名の正確性

### TC-AS-22: AlbArn CfnOutput 確認 🔵

**信頼性**: 🔵 *note.md CfnOutput より*

- **テスト名**: AlbArn が CfnOutput でエクスポートされていること
  - **何をテストするか**: AlbArn の CfnOutput 存在と Export 設定
  - **期待される動作**: `${envName}-AlbArn` でエクスポート
- **入力値**: ApplicationStack Template
  - **入力データの意味**: synth 後のテンプレート
- **期待される結果**: `template.hasOutput('AlbArn', { Export: { Name: '${envName}-AlbArn' } })`
  - **期待結果の理由**: WAF 関連付け等に必要
- **テストの目的**: CloudFormation 出力の確認
  - **確認ポイント**: Export 名の正確性

### TC-AS-23: EcsClusterArn CfnOutput 確認 🔵

**信頼性**: 🔵 *note.md CfnOutput より*

- **テスト名**: EcsClusterArn が CfnOutput でエクスポートされていること
  - **何をテストするか**: EcsClusterArn の CfnOutput 存在と Export 設定
  - **期待される動作**: `${envName}-EcsClusterArn` でエクスポート
- **入力値**: ApplicationStack Template
  - **入力データの意味**: synth 後のテンプレート
- **期待される結果**: `template.hasOutput('EcsClusterArn', { Export: { Name: '${envName}-EcsClusterArn' } })`
  - **期待結果の理由**: Ops Stack のモニタリング設定に必要
- **テストの目的**: CloudFormation 出力の確認
  - **確認ポイント**: Export 名の正確性

### TC-AS-24: FrontendServiceArn CfnOutput 確認 🔵

**信頼性**: 🔵 *note.md CfnOutput より*

- **テスト名**: FrontendServiceArn が CfnOutput でエクスポートされていること
  - **何をテストするか**: FrontendServiceArn の CfnOutput 存在と Export 設定
  - **期待される動作**: `${envName}-FrontendServiceArn` でエクスポート
- **入力値**: ApplicationStack Template
  - **入力データの意味**: synth 後のテンプレート
- **期待される結果**: `template.hasOutput('FrontendServiceArn', { Export: { Name: '${envName}-FrontendServiceArn' } })`
  - **期待結果の理由**: CI/CD Pipeline 等からの参照に必要
- **テストの目的**: CloudFormation 出力の確認
  - **確認ポイント**: Export 名の正確性

### TC-AS-25: BackendServiceArn CfnOutput 確認 🔵

**信頼性**: 🔵 *note.md CfnOutput より*

- **テスト名**: BackendServiceArn が CfnOutput でエクスポートされていること
  - **何をテストするか**: BackendServiceArn の CfnOutput 存在と Export 設定
  - **期待される動作**: `${envName}-BackendServiceArn` でエクスポート
- **入力値**: ApplicationStack Template
  - **入力データの意味**: synth 後のテンプレート
- **期待される結果**: `template.hasOutput('BackendServiceArn', { Export: { Name: '${envName}-BackendServiceArn' } })`
  - **期待結果の理由**: CI/CD Pipeline 等からの参照に必要
- **テストの目的**: CloudFormation 出力の確認
  - **確認ポイント**: Export 名の正確性

### TC-AS-26: TargetGroupArn CfnOutput 確認 🟡

**信頼性**: 🟡 *CDK ベストプラクティスから妥当な推測*

- **テスト名**: TargetGroupArn が CfnOutput でエクスポートされていること
  - **何をテストするか**: TargetGroupArn の CfnOutput 存在
  - **期待される動作**: Target Group ARN がエクスポート（オプション）
- **入力値**: ApplicationStack Template
  - **入力データの意味**: synth 後のテンプレート
- **期待される結果**: Output が存在する（オプション）
  - **期待結果の理由**: Auto Scaling 設定等に有用
- **テストの目的**: 運用利便性の確認
  - **確認ポイント**: Output の存在

---

## 6. 依存関係テスト

### TC-AS-27: VPC 依存関係確認 🔵

**信頼性**: 🔵 *architecture.md Stack 依存関係より*

- **テスト名**: Application Stack が VPC を正しく受け取ること
  - **何をテストするか**: Props の vpc パラメータが各 Construct で使用されること
  - **期待される動作**: ALB、ECS Service が VPC のサブネットに配置
- **入力値**: ApplicationStackProps（vpc）
  - **入力データの意味**: VpcStack からの VPC
- **期待される結果**: ALB と Service の Subnets 設定が VPC を参照
  - **期待結果の理由**: Stack 間の依存関係が正しく設定されている
- **テストの目的**: VpcStack 統合の確認
  - **確認ポイント**: サブネット参照の正確性

### TC-AS-28: Security Stack 依存関係確認 🔵

**信頼性**: 🔵 *architecture.md Stack 依存関係より*

- **テスト名**: Application Stack が Security Group と IAM Role を正しく受け取ること
  - **何をテストするか**: Props の ecsSecurityGroup, albSecurityGroup, ecsTaskRole, ecsTaskExecutionRole が使用されること
  - **期待される動作**: 各リソースに適切な Security Group と Role が設定
- **入力値**: ApplicationStackProps（Security 関連）
  - **入力データの意味**: SecurityStack からのリソース
- **期待される結果**: Service と ALB に SecurityGroupIds が設定
  - **期待結果の理由**: Stack 間の依存関係が正しく設定されている
- **テストの目的**: SecurityStack 統合の確認
  - **確認ポイント**: Security Group 参照の正確性

### TC-AS-29: Database Stack 依存関係確認 🔵

**信頼性**: 🔵 *architecture.md Stack 依存関係より*

- **テスト名**: Application Stack が DB 接続情報を正しく受け取ること
  - **何をテストするか**: Props の dbEndpoint, dbPort, dbSecret が Task Definition で使用されること
  - **期待される動作**: Sidecar Container の環境変数に DB 接続情報が設定
- **入力値**: ApplicationStackProps（DB 関連）
  - **入力データの意味**: DatabaseStack からの接続情報
- **期待される結果**: Task Definition の Environment に DB 情報が含まれる
  - **期待結果の理由**: Sidecar パターンでの DB 接続に必要
- **テストの目的**: DatabaseStack 統合の確認
  - **確認ポイント**: 環境変数の設定

### TC-AS-30: Construct 間依存関係確認 🔵

**信頼性**: 🔵 *TASK-0017.md より*

- **テスト名**: Service が Cluster と Task Definition に依存していること
  - **何をテストするか**: ECS Service が正しい Cluster と Task Definition を参照すること
  - **期待される動作**: DependsOn または Ref で依存関係が設定
- **入力値**: ApplicationStack Template
  - **入力データの意味**: synth 後のテンプレート
- **期待される結果**: Service の Cluster と TaskDefinition 参照が存在
  - **期待結果の理由**: デプロイ順序の制御に必要
- **テストの目的**: Construct 間の依存関係確認
  - **確認ポイント**: 参照の存在

---

## 7. セキュリティテスト

### TC-AS-31: HTTPS 強制設定確認 🔵

**信頼性**: 🔵 *REQ-029、NFR-105 より*

- **テスト名**: HTTPS が強制されていること
  - **何をテストするか**: HTTP→HTTPS リダイレクト + HTTPS Listener の存在
  - **期待される動作**: Port 80 は 443 へリダイレクト、Port 443 で終端
- **入力値**: ApplicationStack Template
  - **入力データの意味**: synth 後のテンプレート
- **期待される結果**: HTTP Listener にリダイレクトアクション、HTTPS Listener に forward アクション
  - **期待結果の理由**: セキュリティ要件の遵守
- **テストの目的**: HTTPS 強制の確認
  - **確認ポイント**: Listener アクションの設定

### TC-AS-32: ACM 証明書設定確認 🔵

**信頼性**: 🔵 *REQ-030 より*

- **テスト名**: HTTPS Listener に ACM 証明書が設定されていること
  - **何をテストするか**: HTTPS Listener の Certificates 設定
  - **期待される動作**: Props で受け取った certificateArn が設定
- **入力値**: ApplicationStackProps（certificateArn）
  - **入力データの意味**: 証明書 ARN
- **期待される結果**: `Certificates: [{ CertificateArn: <certificateArn> }]`
  - **期待結果の理由**: TLS 終端に必要
- **テストの目的**: TLS 設定の確認
  - **確認ポイント**: CertificateArn の参照

### TC-AS-33: Private Subnet 配置確認 🔵

**信頼性**: 🔵 *architecture.md、セキュリティ設計より*

- **テスト名**: ECS Service が Private App Subnet に配置されていること
  - **何をテストするか**: ECS Service の NetworkConfiguration
  - **期待される動作**: Private App Subnet のみに配置、Public IP なし
- **入力値**: ApplicationStack Template
  - **入力データの意味**: synth 後のテンプレート
- **期待される結果**: `AssignPublicIp: 'DISABLED'`
  - **期待結果の理由**: セキュリティ要件（外部からの直接アクセス防止）
- **テストの目的**: ネットワークセキュリティの確認
  - **確認ポイント**: サブネットと Public IP 設定

---

## 8. 異常系テストケース（エラーハンドリング）

### TC-AS-34: 必須パラメータ欠落時のエラー 🟡

**信頼性**: 🟡 *TypeScript/CDK の動作仕様から妥当な推測*

- **テスト名**: 必須パラメータが欠落した場合にエラーが発生すること
  - **エラーケースの概要**: vpc パラメータなしで Stack 作成を試みる
  - **エラー処理の重要性**: 不完全な設定でのデプロイ防止
- **入力値**: ApplicationStackProps（vpc を除外）
  - **不正な理由**: vpc は Stack 作成に必須
  - **実際の発生シナリオ**: 設定ミス、コピペエラー
- **期待される結果**: TypeScript コンパイルエラーまたは Runtime エラー
  - **エラーメッセージの内容**: 必須パラメータの欠落を示すメッセージ
  - **システムの安全性**: 不完全な Stack は作成されない
- **テストの目的**: 入力検証の確認
  - **品質保証の観点**: 早期エラー検出によるデプロイ事故防止

### TC-AS-35: 無効な ARN 形式の処理 🟡

**信頼性**: 🟡 *CDK/CloudFormation の動作仕様から妥当な推測*

- **テスト名**: 無効な ARN 形式でエラーが発生すること
  - **エラーケースの概要**: 不正な形式の ECR リポジトリ ARN を指定
  - **エラー処理の重要性**: デプロイ失敗の早期検出
- **入力値**: `appRepositoryArn: 'invalid-arn-format'`
  - **不正な理由**: ARN 形式に準拠していない
  - **実際の発生シナリオ**: 手入力ミス、環境変数の設定漏れ
- **期待される結果**: CDK synth 時または CloudFormation デプロイ時にエラー
  - **エラーメッセージの内容**: ARN 形式エラーを示すメッセージ
  - **システムの安全性**: 無効な設定でのデプロイ防止
- **テストの目的**: ARN バリデーションの確認
  - **品質保証の観点**: 設定ミスの早期検出

---

## 9. 境界値テストケース

### TC-AS-36: 環境別設定での動作確認 🔵

**信頼性**: 🔵 *parameter.ts、database-stack.test.ts パターンより*

- **テスト名**: devConfig と prodConfig の両方で Stack が正常に作成されること
  - **境界値の意味**: 環境設定の最小構成（dev）と最大構成（prod）
  - **境界値での動作保証**: 両環境で同じリソース構成が作成される
- **入力値**: devConfig / prodConfig
  - **境界値選択の根拠**: 実際の運用で使用される環境設定
  - **実際の使用場面**: 開発環境と本番環境でのデプロイ
- **期待される結果**: 両環境で基本リソースが正常に作成
  - **境界での正確性**: リソース数と基本設定が同一
  - **一貫した動作**: 環境固有の値（envName 等）のみ異なる
- **テストの目的**: 環境別設定の互換性確認
  - **堅牢性の確認**: どちらの環境でも安定動作

---

## 10. 開発言語・フレームワーク

### 使用技術 🔵

**信頼性**: 🔵 *CLAUDE.md、既存テストファイルより*

- **プログラミング言語**: TypeScript
  - **言語選択の理由**: REQ-401 で AWS CDK v2 (TypeScript) が指定
  - **テストに適した機能**: 型安全性、async/await サポート
- **テストフレームワーク**: Jest + aws-cdk-lib/assertions
  - **フレームワーク選択の理由**: CDK 標準のテストライブラリ、既存テストとの一貫性
  - **テスト実行環境**: `npm test` で実行

### インポート文 🔵

```typescript
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { ApplicationStack } from '../lib/stack/application-stack';
import { devConfig, prodConfig } from '../parameter';
```

---

## 11. テストケース実装時の日本語コメント指針

### テストファイルヘッダー例

```typescript
/**
 * Application Stack テスト
 *
 * TASK-0017: Application Stack 統合
 * フェーズ: TDD Red Phase - 失敗するテストケースの作成
 *
 * 【テスト概要】: ApplicationStack の動作を検証するテストスイート
 * 【テスト対象】: application-stack.ts
 * 【テストケース数】: 36 テストケース
 *
 * テストケース:
 * - TC-AS-01〜02: スナップショットテスト
 * - TC-AS-03〜08: リソース存在確認テスト
 * - TC-AS-09〜14: コンポーネント統合テスト
 * - TC-AS-15〜20: 公開プロパティ確認テスト
 * - TC-AS-21〜26: CfnOutput 確認テスト
 * - TC-AS-27〜30: 依存関係テスト
 * - TC-AS-31〜33: セキュリティテスト
 * - TC-AS-34〜36: 異常系・境界値テスト
 *
 * 🔵 信頼性: 要件定義書 REQ-012〜021, REQ-028〜030、タスク定義書に基づくテスト
 */
```

### テストケースコメント例

```typescript
// ============================================================================
// TC-AS-03: ECS Cluster リソース存在確認
// 🔵 信頼性: REQ-012、TASK-0017.md より
// ============================================================================
describe('TC-AS-03: ECS Cluster リソース存在確認', () => {
  // 【テスト目的】: Application Stack が ECS Cluster を正しく作成することを確認
  // 【テスト内容】: AWS::ECS::Cluster リソースが 1 つ存在することを検証
  // 【期待される動作】: ECS Cluster リソースが 1 つ存在する
  // 🔵 信頼性: REQ-012 より

  test('ECS Cluster が 1 つ作成されること', () => {
    // 【検証項目】: Cluster リソースの数
    // 🔵 信頼性: REQ-012 より
    template.resourceCountIs('AWS::ECS::Cluster', 1);
  });
});
```

---

## 12. 要件定義との対応関係

### 参照した機能概要

- **TASK-0017.md**: Application Stack の責務、統合対象 Construct
- **architecture.md**: Stack 依存関係、CDK Stack 構成

### 参照した入力・出力仕様

- **application-stack-requirements.md セクション2**: ApplicationStackProps、公開プロパティ、CfnOutput
- **interfaces.ts**: 型定義

### 参照した制約条件

- **requirements.md**: REQ-012〜021（コンピューティング）、REQ-028〜030（ALB）、NFR-001〜004、NFR-101〜105

### 参照した使用例

- **既存テストファイル**: database-stack.test.ts、vpc-stack.test.ts のパターン

---

## 13. 信頼性レベルサマリー

| レベル | 件数 | 割合 | 説明 |
|--------|------|------|------|
| 🔵 青信号 | 33 | 92% | 要件定義書・設計文書・既存テストパターンより確認済み |
| 🟡 黄信号 | 3 | 8% | CDK/TypeScript 仕様からの妥当な推測 |
| 🔴 赤信号 | 0 | 0% | 推測なし |

**品質評価**: ✅ 高品質 - テストケースの92%が要件定義書・設計文書により確認済み

---

## 14. テストファイル実装場所

| ファイルパス | 説明 |
|-------------|------|
| `infra/test/application-stack.test.ts` | Application Stack テストファイル |

---

## 次のステップ

Red フェーズ（失敗テスト作成）を開始します：

```
/tsumiki:tdd-red aws-cdk-serverless-architecture TASK-0017
```
