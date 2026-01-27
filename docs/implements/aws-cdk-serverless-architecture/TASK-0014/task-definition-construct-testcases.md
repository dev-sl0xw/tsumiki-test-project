# Task Definition Construct テストケース一覧

**タスクID**: TASK-0014
**機能名**: Task Definition Construct
**要件名**: aws-cdk-serverless-architecture
**フェーズ**: Phase 3 - アプリケーション
**作成日**: 2026-01-27

---

## 1. 正常系テストケース（基本的な動作）

### TC-TASKDEF-01: Task Definition リソース作成確認 🔵

**信頼性**: 🔵 *REQ-014 より*

- **テスト名**: Task Definition リソース作成確認
  - **何をテストするか**: TaskDefinitionConstruct を作成した際に、AWS::ECS::TaskDefinition リソースが正しく生成されること
  - **期待される動作**: CloudFormation テンプレートに AWS::ECS::TaskDefinition が 1 つ含まれる
- **入力値**: 必須パラメータ（appRepository, sidecarRepository, logGroup, auroraEndpoint）を指定
  - **入力データの意味**: Task Definition を作成するための最小構成
- **期待される結果**: AWS::ECS::TaskDefinition リソースが 1 つ作成される
  - **期待結果の理由**: 1 つの Construct から 1 つの Task Definition が生成されるべき
- **テストの目的**: Task Definition リソースの存在確認
  - **確認ポイント**: `template.resourceCountIs('AWS::ECS::TaskDefinition', 1)`

**参照した要件**: REQ-014（Task Definition で 0.5 vCPU / 1GB Memory を設定）

---

### TC-TASKDEF-02: CPU 設定確認（デフォルト値） 🔵

**信頼性**: 🔵 *REQ-014、ユーザヒアリングより*

- **テスト名**: CPU 設定確認（デフォルト値 512）
  - **何をテストするか**: CPU を指定しない場合、デフォルト値 512（0.5 vCPU）が設定されること
  - **期待される動作**: Task Definition の Cpu プロパティが '512' に設定される
- **入力値**: cpu パラメータを指定しない
  - **入力データの意味**: デフォルト動作の確認
- **期待される結果**: Cpu: '512'
  - **期待結果の理由**: 要件定義書で 0.5 vCPU を指定
- **テストの目的**: CPU デフォルト値の確認
  - **確認ポイント**: `template.hasResourceProperties('AWS::ECS::TaskDefinition', { Cpu: '512' })`

**参照した要件**: REQ-014

---

### TC-TASKDEF-03: Memory 設定確認（デフォルト値） 🔵

**信頼性**: 🔵 *REQ-014、ユーザヒアリングより*

- **テスト名**: Memory 設定確認（デフォルト値 1024）
  - **何をテストするか**: memoryMiB を指定しない場合、デフォルト値 1024（1 GB）が設定されること
  - **期待される動作**: Task Definition の Memory プロパティが '1024' に設定される
- **入力値**: memoryMiB パラメータを指定しない
  - **入力データの意味**: デフォルト動作の確認
- **期待される結果**: Memory: '1024'
  - **期待結果の理由**: 要件定義書で 1 GB を指定
- **テストの目的**: Memory デフォルト値の確認
  - **確認ポイント**: `template.hasResourceProperties('AWS::ECS::TaskDefinition', { Memory: '1024' })`

**参照した要件**: REQ-014

---

### TC-TASKDEF-04: Network Mode 確認 🔵

**信頼性**: 🔵 *Fargate 必須要件より*

- **テスト名**: Network Mode が awsvpc に設定されること
  - **何をテストするか**: Fargate Task Definition は必ず awsvpc モードであること
  - **期待される動作**: Task Definition の NetworkMode プロパティが 'awsvpc' に設定される
- **入力値**: 必須パラメータのみ指定
  - **入力データの意味**: Fargate の必須設定を確認
- **期待される結果**: NetworkMode: 'awsvpc'
  - **期待結果の理由**: Fargate は awsvpc モードのみサポート
- **テストの目的**: Fargate 必須設定の確認
  - **確認ポイント**: `template.hasResourceProperties('AWS::ECS::TaskDefinition', { NetworkMode: 'awsvpc' })`

**参照した要件**: architecture.md - Task Definition 仕様

---

### TC-TASKDEF-05: App Container 作成確認 🔵

**信頼性**: 🔵 *REQ-015 より*

- **テスト名**: App Container が ContainerDefinitions に含まれること
  - **何をテストするか**: Task Definition に App Container が正しく追加されること
  - **期待される動作**: ContainerDefinitions 配列に 'app' という名前のコンテナが含まれる
- **入力値**: appRepository を指定
  - **入力データの意味**: App Container のイメージソースを指定
- **期待される結果**: ContainerDefinitions に Name: 'app' のコンテナが存在
  - **期待結果の理由**: メインアプリケーションコンテナが必要
- **テストの目的**: App Container の存在確認
  - **確認ポイント**: `Match.arrayWith([Match.objectLike({ Name: 'app' })])`

**参照した要件**: REQ-015

---

### TC-TASKDEF-06: Sidecar Container 作成確認 🔵

**信頼性**: 🔵 *REQ-015, REQ-016 より*

- **テスト名**: Sidecar Container が ContainerDefinitions に含まれること
  - **何をテストするか**: Task Definition に Sidecar Container が正しく追加されること
  - **期待される動作**: ContainerDefinitions 配列に 'sidecar' という名前のコンテナが含まれる
- **入力値**: sidecarRepository を指定
  - **入力データの意味**: Sidecar Container のイメージソースを指定
- **期待される結果**: ContainerDefinitions に Name: 'sidecar' のコンテナが存在
  - **期待結果の理由**: DB 接続用の Sidecar コンテナが必要
- **テストの目的**: Sidecar Container の存在確認
  - **確認ポイント**: `Match.arrayWith([Match.objectLike({ Name: 'sidecar' })])`

**参照した要件**: REQ-015, REQ-016

---

### TC-TASKDEF-07: App Container Essential フラグ確認 🔵

**信頼性**: 🔵 *REQ-015 より*

- **テスト名**: App Container の Essential が true であること
  - **何をテストするか**: App Container がメインコンテナとして設定されること
  - **期待される動作**: App Container の Essential プロパティが true に設定される
- **入力値**: 必須パラメータを指定
  - **入力データの意味**: App Container の重要度設定を確認
- **期待される結果**: app コンテナの Essential: true
  - **期待結果の理由**: App Container が停止するとタスク全体を終了すべき
- **テストの目的**: App Container の Essential 設定確認
  - **確認ポイント**: `Match.objectLike({ Name: 'app', Essential: true })`

**参照した要件**: REQ-015

---

### TC-TASKDEF-08: Sidecar Container Essential フラグ確認 🔵

**信頼性**: 🔵 *REQ-016 より*

- **テスト名**: Sidecar Container の Essential が false であること
  - **何をテストするか**: Sidecar Container が補助コンテナとして設定されること
  - **期待される動作**: Sidecar Container の Essential プロパティが false に設定される
- **入力値**: 必須パラメータを指定
  - **入力データの意味**: Sidecar Container の重要度設定を確認
- **期待される結果**: sidecar コンテナの Essential: false
  - **期待結果の理由**: Sidecar Container が停止してもタスクは継続すべき
- **テストの目的**: Sidecar Container の Essential 設定確認
  - **確認ポイント**: `Match.objectLike({ Name: 'sidecar', Essential: false })`

**参照した要件**: REQ-016

---

### TC-TASKDEF-09: App Container ポートマッピング確認 🔵

**信頼性**: 🔵 *note.md、設計文書より*

- **テスト名**: App Container のポートマッピングが正しく設定されること
  - **何をテストするか**: App Container のコンテナポートが正しく設定されること
  - **期待される動作**: PortMappings に ContainerPort: 3000（デフォルト）が含まれる
- **入力値**: appContainerPort を指定しない（デフォルト値使用）
  - **入力データの意味**: デフォルトポートの確認
- **期待される結果**: PortMappings に ContainerPort: 3000
  - **期待結果の理由**: デフォルトポートは 3000
- **テストの目的**: ポートマッピング設定の確認
  - **確認ポイント**: `Match.objectLike({ PortMappings: Match.arrayWith([{ ContainerPort: 3000 }]) })`

**参照した要件**: note.md - Container 構成

---

### TC-TASKDEF-10: Logging 設定確認（awslogs ドライバー） 🔵

**信頼性**: 🔵 *REQ-035 より*

- **テスト名**: awslogs ドライバーが設定されること
  - **何をテストするか**: コンテナログが CloudWatch Logs に出力される設定になっていること
  - **期待される動作**: LogConfiguration に awslogs ドライバーが設定される
- **入力値**: logGroup を指定
  - **入力データの意味**: ログ出力先の Log Group を指定
- **期待される結果**: LogConfiguration.LogDriver: 'awslogs'
  - **期待結果の理由**: CloudWatch Logs へのログ出力が要件
- **テストの目的**: ログ設定の確認
  - **確認ポイント**: `Match.objectLike({ LogConfiguration: { LogDriver: 'awslogs' } })`

**参照した要件**: REQ-035

---

### TC-TASKDEF-11: Task Role 参照確認 🔵

**信頼性**: 🔵 *REQ-018 より*

- **テスト名**: TaskRoleArn が設定されること
  - **何をテストするか**: Task Definition に Task Role が関連付けられること
  - **期待される動作**: TaskRoleArn プロパティが設定される
- **入力値**: taskRole を指定（または自動作成）
  - **入力データの意味**: Task Role の設定を確認
- **期待される結果**: TaskRoleArn が定義されている
  - **期待結果の理由**: ECS Exec、Secrets Manager アクセスに Task Role が必要
- **テストの目的**: Task Role の関連付け確認
  - **確認ポイント**: `template.hasResourceProperties('AWS::ECS::TaskDefinition', { TaskRoleArn: Match.anyValue() })`

**参照した要件**: REQ-018

---

### TC-TASKDEF-12: Execution Role 参照確認 🔵

**信頼性**: 🔵 *CDK ベストプラクティスより*

- **テスト名**: ExecutionRoleArn が設定されること
  - **何をテストするか**: Task Definition に Execution Role が関連付けられること
  - **期待される動作**: ExecutionRoleArn プロパティが設定される
- **入力値**: executionRole を指定（または自動作成）
  - **入力データの意味**: Execution Role の設定を確認
- **期待される結果**: ExecutionRoleArn が定義されている
  - **期待結果の理由**: ECR Pull、CloudWatch Logs 書き込みに Execution Role が必要
- **テストの目的**: Execution Role の関連付け確認
  - **確認ポイント**: `template.hasResourceProperties('AWS::ECS::TaskDefinition', { ExecutionRoleArn: Match.anyValue() })`

**参照した要件**: CDK ベストプラクティス

---

### TC-TASKDEF-13: Sidecar TARGET_HOST 環境変数確認 🔵

**信頼性**: 🔵 *REQ-017、docker/sidecar/entrypoint.sh より*

- **テスト名**: Sidecar Container に TARGET_HOST 環境変数が設定されること
  - **何をテストするか**: Sidecar Container が Aurora Endpoint を TARGET_HOST として持つこと
  - **期待される動作**: sidecar コンテナの Environment に TARGET_HOST が含まれる
- **入力値**: auroraEndpoint: 'aurora.cluster.ap-northeast-1.rds.amazonaws.com'
  - **入力データの意味**: Aurora Cluster の Endpoint を指定
- **期待される結果**: Environment に { Name: 'TARGET_HOST', Value: 'aurora...' }
  - **期待結果の理由**: Sidecar が Aurora に接続するために必要
- **テストの目的**: TARGET_HOST 環境変数の確認
  - **確認ポイント**: `Match.arrayWith([{ Name: 'TARGET_HOST', Value: Match.anyValue() }])`

**参照した要件**: REQ-017

---

### TC-TASKDEF-14: Sidecar TARGET_PORT 環境変数確認 🔵

**信頼性**: 🔵 *REQ-017、docker/sidecar/entrypoint.sh より*

- **テスト名**: Sidecar Container に TARGET_PORT 環境変数が設定されること
  - **何をテストするか**: Sidecar Container が Aurora Port を TARGET_PORT として持つこと
  - **期待される動作**: sidecar コンテナの Environment に TARGET_PORT が含まれる
- **入力値**: auroraPort: 3306（デフォルト）
  - **入力データの意味**: Aurora の MySQL ポートを指定
- **期待される結果**: Environment に { Name: 'TARGET_PORT', Value: '3306' }
  - **期待結果の理由**: Sidecar が Aurora に接続するために必要
- **テストの目的**: TARGET_PORT 環境変数の確認
  - **確認ポイント**: `Match.arrayWith([{ Name: 'TARGET_PORT', Value: '3306' }])`

**参照した要件**: REQ-017

---

### TC-TASKDEF-15: Sidecar MODE 環境変数確認 🔵

**信頼性**: 🔵 *REQ-016, REQ-017、docker/sidecar/entrypoint.sh より*

- **テスト名**: Sidecar Container に MODE 環境変数が設定されること
  - **何をテストするか**: Sidecar Container の動作モード（proxy/sleep）が設定されること
  - **期待される動作**: sidecar コンテナの Environment に MODE が含まれる
- **入力値**: sidecarMode: 'proxy'（デフォルト）
  - **入力データの意味**: Sidecar の動作モードを指定
- **期待される結果**: Environment に { Name: 'MODE', Value: 'proxy' }
  - **期待結果の理由**: Sidecar の動作モードを決定
- **テストの目的**: MODE 環境変数の確認
  - **確認ポイント**: `Match.arrayWith([{ Name: 'MODE', Value: 'proxy' }])`

**参照した要件**: REQ-016, REQ-017

---

### TC-TASKDEF-16: 公開プロパティ taskDefinition 確認 🔵

**信頼性**: 🔵 *note.md、設計文書より*

- **テスト名**: taskDefinition プロパティが定義されていること
  - **何をテストするか**: Construct の公開プロパティとして taskDefinition が取得できること
  - **期待される動作**: construct.taskDefinition が undefined でないこと
- **入力値**: 必須パラメータを指定
  - **入力データの意味**: Construct の出力プロパティを確認
- **期待される結果**: taskDefinition プロパティが定義されている
  - **期待結果の理由**: ECS Service から参照するために必要
- **テストの目的**: 公開プロパティの確認
  - **確認ポイント**: `expect(construct.taskDefinition).toBeDefined()`

**参照した要件**: note.md - 出力プロパティ設計

---

### TC-TASKDEF-17: 公開プロパティ appContainer 確認 🔵

**信頼性**: 🔵 *note.md、設計文書より*

- **テスト名**: appContainer プロパティが定義されていること
  - **何をテストするか**: Construct の公開プロパティとして appContainer が取得できること
  - **期待される動作**: construct.appContainer が undefined でないこと
- **入力値**: 必須パラメータを指定
  - **入力データの意味**: Construct の出力プロパティを確認
- **期待される結果**: appContainer プロパティが定義されている
  - **期待結果の理由**: 他の Construct から参照するために必要
- **テストの目的**: 公開プロパティの確認
  - **確認ポイント**: `expect(construct.appContainer).toBeDefined()`

**参照した要件**: note.md - 出力プロパティ設計

---

### TC-TASKDEF-18: 公開プロパティ sidecarContainer 確認 🔵

**信頼性**: 🔵 *note.md、設計文書より*

- **テスト名**: sidecarContainer プロパティが定義されていること
  - **何をテストするか**: Construct の公開プロパティとして sidecarContainer が取得できること
  - **期待される動作**: construct.sidecarContainer が undefined でないこと
- **入力値**: 必須パラメータを指定
  - **入力データの意味**: Construct の出力プロパティを確認
- **期待される結果**: sidecarContainer プロパティが定義されている
  - **期待結果の理由**: 他の Construct から参照するために必要
- **テストの目的**: 公開プロパティの確認
  - **確認ポイント**: `expect(construct.sidecarContainer).toBeDefined()`

**参照した要件**: note.md - 出力プロパティ設計

---

## 2. オプションパラメータテストケース

### TC-TASKDEF-19: カスタム CPU 設定確認 🟡

**信頼性**: 🟡 *interfaces.ts から妥当な推測*

- **テスト名**: カスタム CPU 値が正しく設定されること
  - **何をテストするか**: cpu パラメータを指定した場合、その値が設定されること
  - **期待される動作**: Task Definition の Cpu プロパティが指定値に設定される
- **入力値**: cpu: 1024
  - **入力データの意味**: 1 vCPU を指定
- **期待される結果**: Cpu: '1024'
  - **期待結果の理由**: 指定した CPU 値が反映される
- **テストの目的**: カスタム CPU 設定の確認
  - **確認ポイント**: `template.hasResourceProperties('AWS::ECS::TaskDefinition', { Cpu: '1024' })`

**参照した要件**: interfaces.ts - TaskDefinitionConfig

---

### TC-TASKDEF-20: カスタム Memory 設定確認 🟡

**信頼性**: 🟡 *interfaces.ts から妥当な推測*

- **テスト名**: カスタム Memory 値が正しく設定されること
  - **何をテストするか**: memoryMiB パラメータを指定した場合、その値が設定されること
  - **期待される動作**: Task Definition の Memory プロパティが指定値に設定される
- **入力値**: memoryMiB: 2048
  - **入力データの意味**: 2 GB を指定
- **期待される結果**: Memory: '2048'
  - **期待結果の理由**: 指定した Memory 値が反映される
- **テストの目的**: カスタム Memory 設定の確認
  - **確認ポイント**: `template.hasResourceProperties('AWS::ECS::TaskDefinition', { Memory: '2048' })`

**参照した要件**: interfaces.ts - TaskDefinitionConfig

---

### TC-TASKDEF-21: カスタムポート設定確認 🟡

**信頼性**: 🟡 *interfaces.ts から妥当な推測*

- **テスト名**: カスタム App Container ポートが正しく設定されること
  - **何をテストするか**: appContainerPort パラメータを指定した場合、ポートマッピングに反映されること
  - **期待される動作**: PortMappings に指定したポートが含まれる
- **入力値**: appContainerPort: 8080
  - **入力データの意味**: カスタムポートを指定
- **期待される結果**: PortMappings に ContainerPort: 8080
  - **期待結果の理由**: 指定したポートが反映される
- **テストの目的**: カスタムポート設定の確認
  - **確認ポイント**: `Match.objectLike({ PortMappings: Match.arrayWith([{ ContainerPort: 8080 }]) })`

**参照した要件**: interfaces.ts - TaskDefinitionConstructProps

---

### TC-TASKDEF-22: sidecarMode sleep 設定確認 🟡

**信頼性**: 🟡 *interfaces.ts、docker/sidecar/entrypoint.sh から妥当な推測*

- **テスト名**: sidecarMode が sleep の場合、MODE 環境変数が sleep になること
  - **何をテストするか**: sidecarMode: 'sleep' を指定した場合の動作確認
  - **期待される動作**: sidecar コンテナの MODE 環境変数が 'sleep' に設定される
- **入力値**: sidecarMode: 'sleep'
  - **入力データの意味**: デバッグ用待機モードを指定
- **期待される結果**: Environment に { Name: 'MODE', Value: 'sleep' }
  - **期待結果の理由**: 指定したモードが反映される
- **テストの目的**: sidecarMode オプションの確認
  - **確認ポイント**: `Match.arrayWith([{ Name: 'MODE', Value: 'sleep' }])`

**参照した要件**: interfaces.ts、docker/sidecar/entrypoint.sh

---

### TC-TASKDEF-23: App Container 環境変数設定確認 🟡

**信頼性**: 🟡 *interfaces.ts から妥当な推測*

- **テスト名**: appEnvironment で指定した環境変数が設定されること
  - **何をテストするか**: appEnvironment パラメータを指定した場合、App Container に反映されること
  - **期待される動作**: app コンテナの Environment に指定した環境変数が含まれる
- **入力値**: appEnvironment: { NODE_ENV: 'production', APP_PORT: '3000' }
  - **入力データの意味**: アプリケーション用の環境変数を指定
- **期待される結果**: Environment に指定した環境変数が含まれる
  - **期待結果の理由**: 指定した環境変数が反映される
- **テストの目的**: appEnvironment オプションの確認
  - **確認ポイント**: `Match.arrayWith([{ Name: 'NODE_ENV', Value: 'production' }])`

**参照した要件**: interfaces.ts - TaskDefinitionConstructProps

---

### TC-TASKDEF-24: 既存 Task Role 使用確認 🟡

**信頼性**: 🟡 *iam-role-construct.ts から妥当な推測*

- **テスト名**: 既存の Task Role を指定した場合、その Role が使用されること
  - **何をテストするか**: taskRole パラメータを指定した場合の動作確認
  - **期待される動作**: 指定した Task Role の ARN が TaskRoleArn に設定される
- **入力値**: taskRole: 既存の IAM Role
  - **入力データの意味**: 外部で作成した Task Role を使用
- **期待される結果**: TaskRoleArn に指定した Role の ARN が設定される
  - **期待結果の理由**: 指定した Role が使用される
- **テストの目的**: 既存 Task Role 使用の確認
  - **確認ポイント**: `TaskRoleArn が指定した Role の ARN を参照`

**参照した要件**: iam-role-construct.ts

---

## 3. 境界値テストケース

### TC-TASKDEF-25: CPU 最小値確認（256） 🟡

**信頼性**: 🟡 *Fargate CPU/Memory 制約より*

- **テスト名**: CPU 最小値（256）が正しく設定されること
  - **何をテストするか**: CPU の最小値を使用した場合の動作確認
  - **境界値の意味**: Fargate でサポートされる最小 CPU 値
- **入力値**: cpu: 256
  - **境界値選択の根拠**: Fargate の最小 CPU 値
- **期待される結果**: Cpu: '256'
  - **境界での正確性**: 256 CPU でリソースが作成される
- **テストの目的**: CPU 最小値の確認
  - **堅牢性の確認**: 最小リソースでの動作確認

**参照した要件**: note.md - Fargate CPU/Memory 組み合わせ制約

---

### TC-TASKDEF-26: CPU 最大値確認（4096） 🟡

**信頼性**: 🟡 *Fargate CPU/Memory 制約より*

- **テスト名**: CPU 最大値（4096）が正しく設定されること
  - **何をテストするか**: CPU の最大値を使用した場合の動作確認
  - **境界値の意味**: Fargate でサポートされる最大 CPU 値
- **入力値**: cpu: 4096
  - **境界値選択の根拠**: Fargate の最大 CPU 値
- **期待される結果**: Cpu: '4096'
  - **境界での正確性**: 4096 CPU でリソースが作成される
- **テストの目的**: CPU 最大値の確認
  - **堅牢性の確認**: 最大リソースでの動作確認

**参照した要件**: note.md - Fargate CPU/Memory 組み合わせ制約

---

### TC-TASKDEF-27: auroraPort カスタム値確認 🟡

**信頼性**: 🟡 *interfaces.ts から妥当な推測*

- **テスト名**: カスタム Aurora ポートが正しく設定されること
  - **何をテストするか**: auroraPort パラメータを指定した場合の動作確認
  - **境界値の意味**: デフォルト以外のポート番号の使用
- **入力値**: auroraPort: 3307
  - **境界値選択の根拠**: MySQL の代替ポート
- **期待される結果**: TARGET_PORT が '3307' に設定される
  - **境界での正確性**: カスタムポートが正しく設定される
- **テストの目的**: カスタム Aurora ポートの確認
  - **堅牢性の確認**: デフォルト以外のポート番号での動作確認

**参照した要件**: interfaces.ts - TaskDefinitionConstructProps

---

## 4. スナップショットテストケース

### TC-TASKDEF-28: CloudFormation テンプレートスナップショット確認 🔵

**信頼性**: 🔵 *品質保証のため*

- **テスト名**: CloudFormation テンプレートがスナップショットと一致すること
  - **何をテストするか**: 生成される CloudFormation テンプレートの意図しない変更を検出
  - **期待される動作**: テンプレートがスナップショットと一致すること
- **入力値**: 固定の設定でテストを実行
  - **入力データの意味**: 一貫したテスト条件
- **期待される結果**: スナップショットと一致
  - **期待結果の理由**: 意図しない変更の検出
- **テストの目的**: リグレッション防止
  - **確認ポイント**: `expect(template.toJSON()).toMatchSnapshot()`

**参照した要件**: 品質保証

---

## 5. 開発言語・フレームワーク 🔵

**信頼性**: 🔵 *note.md、CLAUDE.md より*

- **プログラミング言語**: TypeScript (strict mode)
  - **言語選択の理由**: AWS CDK v2 の公式サポート言語であり、型安全性が高い
  - **テストに適した機能**: 型チェックによる早期エラー検出
- **テストフレームワーク**: Jest
  - **フレームワーク選択の理由**: CDK プロジェクトの標準テストフレームワーク
  - **テスト実行環境**: Node.js 環境、`npm test` で実行
- **アサーションライブラリ**: aws-cdk-lib/assertions
  - **ライブラリ選択の理由**: CDK テンプレートの検証に特化
  - **主要メソッド**: `Template.fromStack()`, `hasResourceProperties()`, `Match.*`

---

## 6. 要件定義との対応関係 🔵

**信頼性**: 🔵 *要件定義書より*

### 参照した機能概要

- **セクション 1**: 機能の概要（EARS要件定義書・設計文書ベース）
- **セクション 2**: 入力・出力の仕様

### 参照した入力・出力仕様

- **セクション 2.1**: 入力パラメータ（Props）
- **セクション 2.2**: 出力プロパティ

### 参照した制約条件

- **セクション 3.1**: Fargate CPU/Memory 組み合わせ制約
- **セクション 3.2**: Container 設定制約
- **セクション 3.3**: IAM ポリシー制約
- **セクション 3.6**: ログ設定制約

### 参照した使用例

- **セクション 4.1**: 基本的な使用パターン
- **セクション 4.2**: カスタム設定の使用例

---

## 7. テストケース実装ファイル

| ファイルパス | 内容 |
|--------------|------|
| `infra/test/construct/ecs/task-definition-construct.test.ts` | テスト実装ファイル |

---

## 8. 信頼性レベルサマリー

| レベル | 件数 | 割合 | 説明 |
|--------|------|------|------|
| 🔵 青信号 | 20 | 71% | 要件定義書・設計文書を参考にした確実なテストケース |
| 🟡 黄信号 | 8 | 29% | 要件定義書・設計文書から妥当な推測によるテストケース |
| 🔴 赤信号 | 0 | 0% | 推測によるテストケース（なし） |

**品質評価**: ✅ 高品質 - テストケースの大部分が要件定義書・設計文書により確認済み

---

## 9. テストケース分類

| 分類 | 件数 | テストケースID |
|------|------|----------------|
| **正常系** | 18 | TC-TASKDEF-01〜18 |
| **オプションパラメータ** | 6 | TC-TASKDEF-19〜24 |
| **境界値** | 3 | TC-TASKDEF-25〜27 |
| **スナップショット** | 1 | TC-TASKDEF-28 |
| **合計** | **28** | |

---

## 10. 次のステップ

テストケース定義フェーズ完了後、以下のコマンドで Red フェーズ（失敗テスト作成）を開始します：

```
/tsumiki:tdd-red aws-cdk-serverless-architecture TASK-0014
```
