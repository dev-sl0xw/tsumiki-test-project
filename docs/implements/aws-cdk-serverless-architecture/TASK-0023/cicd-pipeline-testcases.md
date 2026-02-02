# TASK-0023: CI/CD Pipeline 構築 - テストケース定義書

**作成日時**: 2026-02-01
**タスクID**: TASK-0023
**機能名**: CI/CD Pipeline 構築
**フェーズ**: TDD テストケース洗い出し
**信頼性レベル**: 🟡 *要件定義書 REQ-040, REQ-041より (詳細設計は推測)*

---

## 1. テストケース概要

### 1.1 対象 Construct

| Construct 名 | テストファイル | テストケース数 |
|--------------|---------------|---------------|
| CodeCommitConstruct | `codecommit-construct.test.ts` | 5 |
| CodeBuildConstruct | `codebuild-construct.test.ts` | 10 |
| CodePipelineConstruct | `codepipeline-construct.test.ts` | 12 |
| 統合テスト | (ops-stack.test.ts で実施予定) | - |

### 1.2 テストケース分類

| カテゴリ | テストケース数 | 信頼性レベル分布 |
|---------|---------------|-----------------|
| CodeCommit Repository | 5 | 🔵3, 🟡2 |
| CodeBuild Project | 10 | 🔵2, 🟡8 |
| CodePipeline | 7 | 🔵2, 🟡5 |
| ECS Deploy Action | 3 | 🟡3 |
| Notification | 3 | 🔵3 |
| Props Validation | 3 | 🟡3 |
| Snapshot | 3 | 🔵3 |

---

## 2. テストケース一覧

### 2.1 CodeCommit Repository テスト

#### TC-CICD-001: CodeCommit リポジトリ作成確認 🔵

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-CICD-001 |
| **テスト名** | CodeCommit リポジトリが作成されること |
| **テスト目的** | CodeCommitConstruct がデフォルト設定で正常に CodeCommit リポジトリを作成することを確認 |
| **前提条件** | - CDK App と Stack が作成済み |
| **テスト手順** | 1. CodeCommitConstruct を必須パラメータでインスタンス化<br>2. CloudFormation テンプレートを生成<br>3. AWS::CodeCommit::Repository リソースの存在を検証 |
| **期待結果** | - AWS::CodeCommit::Repository リソースが 1 つ作成される |
| **信頼性レベル** | 🔵 REQ-040 より |
| **対応要件** | REQ-040 |

```typescript
// 【テスト目的】: CodeCommit リポジトリが正常に作成されることを確認
// 【テスト内容】: AWS::CodeCommit::Repository リソースの存在を検証
// 【期待される動作】: リポジトリが 1 つ作成される
// 🔵 信頼性: REQ-040 より

test('CodeCommit リポジトリが 1 つ作成されること', () => {
  // 【テストデータ準備】: CodeCommitConstruct を作成
  new CodeCommitConstruct(stack, 'TestRepository', {
    repositoryName: 'test-app-repository',
  });
  const template = Template.fromStack(stack);

  // 【結果検証】: リポジトリリソースの存在確認
  // 【検証項目】: AWS::CodeCommit::Repository が 1 つ存在する 🔵
  template.resourceCountIs('AWS::CodeCommit::Repository', 1);
});
```

---

#### TC-CICD-002: CodeCommit リポジトリ名設定確認 🔵

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-CICD-002 |
| **テスト名** | リポジトリ名が正しく設定されること |
| **テスト目的** | 指定したリポジトリ名が CloudFormation テンプレートに正しく反映されることを確認 |
| **前提条件** | - CDK App と Stack が作成済み |
| **テスト手順** | 1. repositoryName を指定して CodeCommitConstruct を作成<br>2. CloudFormation テンプレートを生成<br>3. RepositoryName プロパティを検証 |
| **期待結果** | - RepositoryName が指定した値に設定される |
| **信頼性レベル** | 🔵 TASK-0023 より |
| **対応要件** | REQ-040 |

```typescript
// 【テスト目的】: リポジトリ名が正しく設定されることを確認
// 【テスト内容】: RepositoryName プロパティの値を検証
// 【期待される動作】: 指定した名前が設定される
// 🔵 信頼性: TASK-0023 より

test('リポジトリ名が正しく設定されること', () => {
  // 【テストデータ準備】: 特定のリポジトリ名で Construct を作成
  const repositoryName = 'dev-app-repository';
  new CodeCommitConstruct(stack, 'TestRepository', {
    repositoryName,
  });
  const template = Template.fromStack(stack);

  // 【結果検証】: リポジトリ名の確認
  // 【検証項目】: RepositoryName が正しく設定されている 🔵
  template.hasResourceProperties('AWS::CodeCommit::Repository', {
    RepositoryName: repositoryName,
  });
});
```

---

#### TC-CICD-003: CodeCommit リポジトリ説明設定確認 🟡

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-CICD-003 |
| **テスト名** | リポジトリの説明が設定されること |
| **テスト目的** | オプショナルな description パラメータが正しく設定されることを確認 |
| **前提条件** | - CDK App と Stack が作成済み |
| **テスト手順** | 1. description を指定して CodeCommitConstruct を作成<br>2. CloudFormation テンプレートを生成<br>3. RepositoryDescription プロパティを検証 |
| **期待結果** | - RepositoryDescription が指定した値に設定される |
| **信頼性レベル** | 🟡 TASK-0023 より推測 |
| **対応要件** | REQ-040 |

```typescript
// 【テスト目的】: リポジトリの説明が設定されることを確認
// 【テスト内容】: RepositoryDescription プロパティの値を検証
// 【期待される動作】: 指定した説明が設定される
// 🟡 信頼性: TASK-0023 より推測

test('リポジトリの説明が正しく設定されること', () => {
  // 【テストデータ準備】: 説明付きで Construct を作成
  const description = 'Application source code repository';
  new CodeCommitConstruct(stack, 'TestRepository', {
    repositoryName: 'test-app-repository',
    description,
  });
  const template = Template.fromStack(stack);

  // 【結果検証】: 説明の確認
  // 【検証項目】: RepositoryDescription が正しく設定されている 🟡
  template.hasResourceProperties('AWS::CodeCommit::Repository', {
    RepositoryDescription: description,
  });
});
```

---

#### TC-CICD-004: CodeCommit repository プロパティ公開確認 🔵

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-CICD-004 |
| **テスト名** | repository プロパティが公開されること |
| **テスト目的** | Construct から repository プロパティにアクセスでき、IRepository 型であることを確認 |
| **前提条件** | - CDK App と Stack が作成済み |
| **テスト手順** | 1. CodeCommitConstruct を作成<br>2. repository プロパティにアクセス<br>3. repositoryArn が取得可能であることを確認 |
| **期待結果** | - repository プロパティが定義され、repositoryArn が取得可能 |
| **信頼性レベル** | 🔵 CDK ベストプラクティスより |
| **対応要件** | REQ-040 |

```typescript
// 【テスト目的】: repository プロパティが公開されることを確認
// 【テスト内容】: repository プロパティの存在と型を検証
// 【期待される動作】: IRepository 型のプロパティがアクセス可能
// 🔵 信頼性: CDK ベストプラクティスより

test('repository プロパティが定義されていること', () => {
  // 【テストデータ準備】: Construct を作成
  const codecommit = new CodeCommitConstruct(stack, 'TestRepository', {
    repositoryName: 'test-app-repository',
  });

  // 【結果検証】: プロパティ存在確認
  // 【検証項目】: repository プロパティが存在する 🔵
  expect(codecommit.repository).toBeDefined();
  expect(codecommit.repository.repositoryArn).toBeDefined();
});
```

---

#### TC-CICD-005: CodeCommit cloneUrlHttp プロパティ公開確認 🟡

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-CICD-005 |
| **テスト名** | cloneUrlHttp プロパティが公開されること |
| **テスト目的** | Construct から HTTPS Clone URL が取得できることを確認 |
| **前提条件** | - CDK App と Stack が作成済み |
| **テスト手順** | 1. CodeCommitConstruct を作成<br>2. cloneUrlHttp プロパティにアクセス<br>3. 文字列型であることを確認 |
| **期待結果** | - cloneUrlHttp プロパティが定義され、string 型 |
| **信頼性レベル** | 🟡 CDK 実装パターンから推測 |
| **対応要件** | REQ-040 |

```typescript
// 【テスト目的】: cloneUrlHttp プロパティが公開されることを確認
// 【テスト内容】: cloneUrlHttp プロパティの存在と型を検証
// 【期待される動作】: string 型のプロパティがアクセス可能
// 🟡 信頼性: CDK 実装パターンから推測

test('cloneUrlHttp プロパティが定義されていること', () => {
  // 【テストデータ準備】: Construct を作成
  const codecommit = new CodeCommitConstruct(stack, 'TestRepository', {
    repositoryName: 'test-app-repository',
  });

  // 【結果検証】: プロパティ存在確認
  // 【検証項目】: cloneUrlHttp プロパティが存在する 🟡
  expect(codecommit.cloneUrlHttp).toBeDefined();
  expect(typeof codecommit.cloneUrlHttp).toBe('string');
});
```

---

### 2.2 CodeBuild Project テスト

#### TC-CICD-006: CodeBuild プロジェクト作成確認 🟡

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-CICD-006 |
| **テスト名** | CodeBuild プロジェクトが作成されること |
| **テスト目的** | CodeBuildConstruct がデフォルト設定で正常に CodeBuild プロジェクトを作成することを確認 |
| **前提条件** | - CDK App と Stack が作成済み<br>- ECR リポジトリが存在 |
| **テスト手順** | 1. CodeBuildConstruct を必須パラメータでインスタンス化<br>2. CloudFormation テンプレートを生成<br>3. AWS::CodeBuild::Project リソースの存在を検証 |
| **期待結果** | - AWS::CodeBuild::Project リソースが 1 つ作成される |
| **信頼性レベル** | 🟡 REQ-041 より推測 |
| **対応要件** | REQ-041 |

```typescript
// 【テスト目的】: CodeBuild プロジェクトが正常に作成されることを確認
// 【テスト内容】: AWS::CodeBuild::Project リソースの存在を検証
// 【期待される動作】: プロジェクトが 1 つ作成される
// 🟡 信頼性: REQ-041 より推測

test('CodeBuild プロジェクトが 1 つ作成されること', () => {
  // 【テストデータ準備】: CodeBuildConstruct を作成
  new CodeBuildConstruct(stack, 'TestBuild', {
    projectName: 'test-app-build',
    ecrRepository: ecrRepository,
  });
  const template = Template.fromStack(stack);

  // 【結果検証】: プロジェクトリソースの存在確認
  // 【検証項目】: AWS::CodeBuild::Project が 1 つ存在する 🟡
  template.resourceCountIs('AWS::CodeBuild::Project', 1);
});
```

---

#### TC-CICD-007: CodeBuild ビルドイメージ設定確認 🟡

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-CICD-007 |
| **テスト名** | ビルドイメージが正しく設定されること |
| **テスト目的** | CodeBuild プロジェクトに適切なビルドイメージが設定されることを確認 |
| **前提条件** | - CDK App と Stack が作成済み |
| **テスト手順** | 1. CodeBuildConstruct を作成<br>2. CloudFormation テンプレートを生成<br>3. Environment.Image プロパティを検証 |
| **期待結果** | - LinuxBuildImage.STANDARD_7_0 相当のイメージが設定される |
| **信頼性レベル** | 🟡 TASK-0023 より推測 |
| **対応要件** | REQ-041 |

```typescript
// 【テスト目的】: ビルドイメージが正しく設定されることを確認
// 【テスト内容】: Environment.Image プロパティの値を検証
// 【期待される動作】: Standard 7.0 イメージが設定される
// 🟡 信頼性: TASK-0023 より推測

test('ビルドイメージが STANDARD_7_0 に設定されること', () => {
  // 【テストデータ準備】: デフォルト設定で Construct を作成
  new CodeBuildConstruct(stack, 'TestBuild', {
    projectName: 'test-app-build',
    ecrRepository: ecrRepository,
  });
  const template = Template.fromStack(stack);

  // 【結果検証】: ビルドイメージの確認
  // 【検証項目】: Image が aws/codebuild/standard:7.0 🟡
  template.hasResourceProperties('AWS::CodeBuild::Project', {
    Environment: Match.objectLike({
      Image: Match.stringLikeRegexp('aws/codebuild/standard:7.0'),
    }),
  });
});
```

---

#### TC-CICD-008: CodeBuild コンピュートタイプ設定確認 🟡

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-CICD-008 |
| **テスト名** | コンピュートタイプが正しく設定されること |
| **テスト目的** | CodeBuild プロジェクトに適切なコンピュートタイプが設定されることを確認 |
| **前提条件** | - CDK App と Stack が作成済み |
| **テスト手順** | 1. CodeBuildConstruct を作成<br>2. CloudFormation テンプレートを生成<br>3. Environment.ComputeType プロパティを検証 |
| **期待結果** | - BUILD_GENERAL1_SMALL が設定される |
| **信頼性レベル** | 🟡 TASK-0023 より推測 |
| **対応要件** | REQ-041 |

```typescript
// 【テスト目的】: コンピュートタイプが正しく設定されることを確認
// 【テスト内容】: Environment.ComputeType プロパティの値を検証
// 【期待される動作】: BUILD_GENERAL1_SMALL が設定される
// 🟡 信頼性: TASK-0023 より推測

test('コンピュートタイプが BUILD_GENERAL1_SMALL に設定されること', () => {
  // 【テストデータ準備】: デフォルト設定で Construct を作成
  new CodeBuildConstruct(stack, 'TestBuild', {
    projectName: 'test-app-build',
    ecrRepository: ecrRepository,
  });
  const template = Template.fromStack(stack);

  // 【結果検証】: コンピュートタイプの確認
  // 【検証項目】: ComputeType が BUILD_GENERAL1_SMALL 🟡
  template.hasResourceProperties('AWS::CodeBuild::Project', {
    Environment: Match.objectLike({
      ComputeType: 'BUILD_GENERAL1_SMALL',
    }),
  });
});
```

---

#### TC-CICD-009: CodeBuild 特権モード設定確認 🟡

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-CICD-009 |
| **テスト名** | 特権モードが有効化されること |
| **テスト目的** | Docker ビルドのため特権モードが有効になっていることを確認 |
| **前提条件** | - CDK App と Stack が作成済み |
| **テスト手順** | 1. CodeBuildConstruct を作成<br>2. CloudFormation テンプレートを生成<br>3. Environment.PrivilegedMode プロパティを検証 |
| **期待結果** | - PrivilegedMode が true に設定される |
| **信頼性レベル** | 🟡 Docker ビルド要件より推測 |
| **対応要件** | REQ-041 |

```typescript
// 【テスト目的】: 特権モードが有効化されることを確認
// 【テスト内容】: Environment.PrivilegedMode プロパティの値を検証
// 【期待される動作】: Docker ビルド用に特権モードが有効
// 🟡 信頼性: Docker ビルド要件より推測

test('特権モードが有効化されていること', () => {
  // 【テストデータ準備】: デフォルト設定で Construct を作成
  new CodeBuildConstruct(stack, 'TestBuild', {
    projectName: 'test-app-build',
    ecrRepository: ecrRepository,
  });
  const template = Template.fromStack(stack);

  // 【結果検証】: 特権モードの確認
  // 【検証項目】: PrivilegedMode が true 🟡
  template.hasResourceProperties('AWS::CodeBuild::Project', {
    Environment: Match.objectLike({
      PrivilegedMode: true,
    }),
  });
});
```

---

#### TC-CICD-010: CodeBuild IAM ロール作成確認 🔵

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-CICD-010 |
| **テスト名** | CodeBuild 用 IAM ロールが作成されること |
| **テスト目的** | CodeBuild プロジェクトに適切な IAM ロールが設定されることを確認 |
| **前提条件** | - CDK App と Stack が作成済み |
| **テスト手順** | 1. CodeBuildConstruct を作成<br>2. CloudFormation テンプレートを生成<br>3. ServiceRole プロパティを検証 |
| **期待結果** | - ServiceRole が設定される |
| **信頼性レベル** | 🔵 CodeBuild 必須要件 |
| **対応要件** | REQ-041 |

```typescript
// 【テスト目的】: CodeBuild 用 IAM ロールが作成されることを確認
// 【テスト内容】: ServiceRole プロパティの存在を検証
// 【期待される動作】: IAM ロールが自動作成され設定される
// 🔵 信頼性: CodeBuild 必須要件

test('IAM ロールが設定されていること', () => {
  // 【テストデータ準備】: Construct を作成
  new CodeBuildConstruct(stack, 'TestBuild', {
    projectName: 'test-app-build',
    ecrRepository: ecrRepository,
  });
  const template = Template.fromStack(stack);

  // 【結果検証】: ServiceRole の確認
  // 【検証項目】: ServiceRole が設定されている 🔵
  template.hasResourceProperties('AWS::CodeBuild::Project', {
    ServiceRole: Match.anyValue(),
  });
});
```

---

#### TC-CICD-011: CodeBuild ECR 権限確認 🟡

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-CICD-011 |
| **テスト名** | ECR への Push 権限が付与されること |
| **テスト目的** | CodeBuild ロールに ECR へのプッシュ権限が付与されることを確認 |
| **前提条件** | - CDK App と Stack が作成済み<br>- ECR リポジトリが存在 |
| **テスト手順** | 1. CodeBuildConstruct を ECR リポジトリ付きで作成<br>2. CloudFormation テンプレートを生成<br>3. IAM ポリシーに ECR 権限が含まれることを検証 |
| **期待結果** | - ecr:PutImage, ecr:InitiateLayerUpload 等の権限が付与される |
| **信頼性レベル** | 🟡 Docker イメージプッシュ要件より推測 |
| **対応要件** | REQ-041 |

```typescript
// 【テスト目的】: ECR への Push 権限が付与されることを確認
// 【テスト内容】: IAM ポリシーの ECR 関連アクション検証
// 【期待される動作】: ECR Push 権限が付与される
// 🟡 信頼性: Docker イメージプッシュ要件より推測

test('ECR への Push 権限が付与されていること', () => {
  // 【テストデータ準備】: ECR リポジトリ付きで Construct を作成
  new CodeBuildConstruct(stack, 'TestBuild', {
    projectName: 'test-app-build',
    ecrRepository: ecrRepository,
  });
  const template = Template.fromStack(stack);

  // 【結果検証】: IAM ポリシーの確認
  // 【検証項目】: ecr:* アクションが含まれる 🟡
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: Match.objectLike({
      Statement: Match.arrayWith([
        Match.objectLike({
          Action: Match.arrayWith([
            Match.stringLikeRegexp('ecr:.*'),
          ]),
        }),
      ]),
    }),
  });
});
```

---

#### TC-CICD-012: CodeBuild 環境変数設定確認 🟡

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-CICD-012 |
| **テスト名** | 環境変数が正しく設定されること |
| **テスト目的** | カスタム環境変数が CodeBuild プロジェクトに反映されることを確認 |
| **前提条件** | - CDK App と Stack が作成済み |
| **テスト手順** | 1. environmentVariables を指定して CodeBuildConstruct を作成<br>2. CloudFormation テンプレートを生成<br>3. EnvironmentVariables プロパティを検証 |
| **期待結果** | - 指定した環境変数が設定される |
| **信頼性レベル** | 🟡 TASK-0023 より推測 |
| **対応要件** | REQ-041 |

```typescript
// 【テスト目的】: 環境変数が正しく設定されることを確認
// 【テスト内容】: EnvironmentVariables プロパティの値を検証
// 【期待される動作】: 指定した環境変数が設定される
// 🟡 信頼性: TASK-0023 より推測

test('環境変数が正しく設定されること', () => {
  // 【テストデータ準備】: 環境変数付きで Construct を作成
  new CodeBuildConstruct(stack, 'TestBuild', {
    projectName: 'test-app-build',
    ecrRepository: ecrRepository,
    environmentVariables: {
      AWS_DEFAULT_REGION: {
        type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
        value: 'ap-northeast-1',
      },
    },
  });
  const template = Template.fromStack(stack);

  // 【結果検証】: 環境変数の確認
  // 【検証項目】: EnvironmentVariables が設定されている 🟡
  template.hasResourceProperties('AWS::CodeBuild::Project', {
    Environment: Match.objectLike({
      EnvironmentVariables: Match.anyValue(),
    }),
  });
});
```

---

#### TC-CICD-013: CodeBuild project プロパティ公開確認 🔵

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-CICD-013 |
| **テスト名** | project プロパティが公開されること |
| **テスト目的** | Construct から project プロパティにアクセスでき、IProject 型であることを確認 |
| **前提条件** | - CDK App と Stack が作成済み |
| **テスト手順** | 1. CodeBuildConstruct を作成<br>2. project プロパティにアクセス<br>3. projectArn が取得可能であることを確認 |
| **期待結果** | - project プロパティが定義され、projectArn が取得可能 |
| **信頼性レベル** | 🔵 CDK ベストプラクティスより |
| **対応要件** | REQ-041 |

```typescript
// 【テスト目的】: project プロパティが公開されることを確認
// 【テスト内容】: project プロパティの存在と型を検証
// 【期待される動作】: IProject 型のプロパティがアクセス可能
// 🔵 信頼性: CDK ベストプラクティスより

test('project プロパティが定義されていること', () => {
  // 【テストデータ準備】: Construct を作成
  const codebuild = new CodeBuildConstruct(stack, 'TestBuild', {
    projectName: 'test-app-build',
    ecrRepository: ecrRepository,
  });

  // 【結果検証】: プロパティ存在確認
  // 【検証項目】: project プロパティが存在する 🔵
  expect(codebuild.project).toBeDefined();
  expect(codebuild.project.projectArn).toBeDefined();
});
```

---

#### TC-CICD-014: CodeBuild コンピュートタイプカスタム設定確認 🟡

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-CICD-014 |
| **テスト名** | カスタムコンピュートタイプが設定されること |
| **テスト目的** | computeType パラメータでデフォルト以外の値を設定できることを確認 |
| **前提条件** | - CDK App と Stack が作成済み |
| **テスト手順** | 1. computeType: MEDIUM を指定して CodeBuildConstruct を作成<br>2. CloudFormation テンプレートを生成<br>3. ComputeType プロパティを検証 |
| **期待結果** | - BUILD_GENERAL1_MEDIUM が設定される |
| **信頼性レベル** | 🟡 TASK-0023 より推測 |
| **対応要件** | REQ-041 |

```typescript
// 【テスト目的】: カスタムコンピュートタイプが設定されることを確認
// 【テスト内容】: カスタム ComputeType の反映を検証
// 【期待される動作】: MEDIUM サイズが設定される
// 🟡 信頼性: TASK-0023 より推測

test('カスタムコンピュートタイプが正しく設定されること', () => {
  // 【テストデータ準備】: MEDIUM サイズで Construct を作成
  new CodeBuildConstruct(stack, 'TestBuild', {
    projectName: 'test-app-build',
    ecrRepository: ecrRepository,
    computeType: codebuild.ComputeType.MEDIUM,
  });
  const template = Template.fromStack(stack);

  // 【結果検証】: コンピュートタイプの確認
  // 【検証項目】: ComputeType が BUILD_GENERAL1_MEDIUM 🟡
  template.hasResourceProperties('AWS::CodeBuild::Project', {
    Environment: Match.objectLike({
      ComputeType: 'BUILD_GENERAL1_MEDIUM',
    }),
  });
});
```

---

#### TC-CICD-015: CodeBuild 特権モード無効化確認 🟡

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-CICD-015 |
| **テスト名** | 特権モードを無効化できること |
| **テスト目的** | privilegedMode: false で特権モードを無効化できることを確認 |
| **前提条件** | - CDK App と Stack が作成済み |
| **テスト手順** | 1. privilegedMode: false を指定して CodeBuildConstruct を作成<br>2. CloudFormation テンプレートを生成<br>3. PrivilegedMode プロパティを検証 |
| **期待結果** | - PrivilegedMode が false に設定される |
| **信頼性レベル** | 🟡 TASK-0023 より推測 |
| **対応要件** | REQ-041 |

```typescript
// 【テスト目的】: 特権モードを無効化できることを確認
// 【テスト内容】: PrivilegedMode: false の反映を検証
// 【期待される動作】: 特権モードが無効になる
// 🟡 信頼性: TASK-0023 より推測

test('特権モードを無効化できること', () => {
  // 【テストデータ準備】: 特権モード無効で Construct を作成
  new CodeBuildConstruct(stack, 'TestBuild', {
    projectName: 'test-app-build',
    ecrRepository: ecrRepository,
    privilegedMode: false,
  });
  const template = Template.fromStack(stack);

  // 【結果検証】: 特権モードの確認
  // 【検証項目】: PrivilegedMode が false 🟡
  template.hasResourceProperties('AWS::CodeBuild::Project', {
    Environment: Match.objectLike({
      PrivilegedMode: false,
    }),
  });
});
```

---

### 2.3 CodePipeline テスト

#### TC-CICD-016: CodePipeline 作成確認 🟡

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-CICD-016 |
| **テスト名** | CodePipeline が作成されること |
| **テスト目的** | CodePipelineConstruct が正常にパイプラインを作成することを確認 |
| **前提条件** | - CDK App と Stack が作成済み<br>- CodeCommit リポジトリが存在<br>- CodeBuild プロジェクトが存在<br>- ECS Service が存在 |
| **テスト手順** | 1. CodePipelineConstruct を必須パラメータでインスタンス化<br>2. CloudFormation テンプレートを生成<br>3. AWS::CodePipeline::Pipeline リソースの存在を検証 |
| **期待結果** | - AWS::CodePipeline::Pipeline リソースが 1 つ作成される |
| **信頼性レベル** | 🟡 REQ-041 より推測 |
| **対応要件** | REQ-041 |

```typescript
// 【テスト目的】: CodePipeline が正常に作成されることを確認
// 【テスト内容】: AWS::CodePipeline::Pipeline リソースの存在を検証
// 【期待される動作】: パイプラインが 1 つ作成される
// 🟡 信頼性: REQ-041 より推測

test('CodePipeline が 1 つ作成されること', () => {
  // 【テストデータ準備】: CodePipelineConstruct を作成
  new CodePipelineConstruct(stack, 'TestPipeline', {
    pipelineName: 'test-app-pipeline',
    repository: repository,
    buildProject: buildProject,
    ecsCluster: ecsCluster,
    ecsService: ecsService,
  });
  const template = Template.fromStack(stack);

  // 【結果検証】: パイプラインリソースの存在確認
  // 【検証項目】: AWS::CodePipeline::Pipeline が 1 つ存在する 🟡
  template.resourceCountIs('AWS::CodePipeline::Pipeline', 1);
});
```

---

#### TC-CICD-017: Source ステージ確認 🔵

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-CICD-017 |
| **テスト名** | Source ステージが CodeCommit を参照すること |
| **テスト目的** | パイプラインの Source ステージが正しく CodeCommit リポジトリを参照することを確認 |
| **前提条件** | - CodePipelineConstruct が作成済み |
| **テスト手順** | 1. CloudFormation テンプレートを生成<br>2. Stages 配列の最初のステージを検証<br>3. CodeCommit アクションが含まれることを確認 |
| **期待結果** | - Source ステージに CodeCommit アクションが設定される |
| **信頼性レベル** | 🔵 TASK-0023 より |
| **対応要件** | REQ-040, REQ-041 |

```typescript
// 【テスト目的】: Source ステージが CodeCommit を参照することを確認
// 【テスト内容】: Stages 配列の Source ステージ設定を検証
// 【期待される動作】: CodeCommit アクションが設定される
// 🔵 信頼性: TASK-0023 より

test('Source ステージが CodeCommit を参照していること', () => {
  // 【テストデータ準備】: Construct を作成
  new CodePipelineConstruct(stack, 'TestPipeline', {
    pipelineName: 'test-app-pipeline',
    repository: repository,
    buildProject: buildProject,
    ecsCluster: ecsCluster,
    ecsService: ecsService,
  });
  const template = Template.fromStack(stack);

  // 【結果検証】: Source ステージの確認
  // 【検証項目】: CodeCommit アクションが含まれる 🔵
  template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
    Stages: Match.arrayWith([
      Match.objectLike({
        Name: 'Source',
        Actions: Match.arrayWith([
          Match.objectLike({
            ActionTypeId: Match.objectLike({
              Provider: 'CodeCommit',
            }),
          }),
        ]),
      }),
    ]),
  });
});
```

---

#### TC-CICD-018: Build ステージ確認 🟡

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-CICD-018 |
| **テスト名** | Build ステージが CodeBuild を参照すること |
| **テスト目的** | パイプラインの Build ステージが正しく CodeBuild プロジェクトを参照することを確認 |
| **前提条件** | - CodePipelineConstruct が作成済み |
| **テスト手順** | 1. CloudFormation テンプレートを生成<br>2. Stages 配列の Build ステージを検証<br>3. CodeBuild アクションが含まれることを確認 |
| **期待結果** | - Build ステージに CodeBuild アクションが設定される |
| **信頼性レベル** | 🟡 TASK-0023 より推測 |
| **対応要件** | REQ-041 |

```typescript
// 【テスト目的】: Build ステージが CodeBuild を参照することを確認
// 【テスト内容】: Stages 配列の Build ステージ設定を検証
// 【期待される動作】: CodeBuild アクションが設定される
// 🟡 信頼性: TASK-0023 より推測

test('Build ステージが CodeBuild を参照していること', () => {
  // 【テストデータ準備】: Construct を作成
  new CodePipelineConstruct(stack, 'TestPipeline', {
    pipelineName: 'test-app-pipeline',
    repository: repository,
    buildProject: buildProject,
    ecsCluster: ecsCluster,
    ecsService: ecsService,
  });
  const template = Template.fromStack(stack);

  // 【結果検証】: Build ステージの確認
  // 【検証項目】: CodeBuild アクションが含まれる 🟡
  template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
    Stages: Match.arrayWith([
      Match.objectLike({
        Name: 'Build',
        Actions: Match.arrayWith([
          Match.objectLike({
            ActionTypeId: Match.objectLike({
              Provider: 'CodeBuild',
            }),
          }),
        ]),
      }),
    ]),
  });
});
```

---

#### TC-CICD-019: Deploy ステージ確認 🟡

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-CICD-019 |
| **テスト名** | Deploy ステージが ECS を参照すること |
| **テスト目的** | パイプラインの Deploy ステージが正しく ECS をターゲットとすることを確認 |
| **前提条件** | - CodePipelineConstruct が作成済み |
| **テスト手順** | 1. CloudFormation テンプレートを生成<br>2. Stages 配列の Deploy ステージを検証<br>3. ECS アクションが含まれることを確認 |
| **期待結果** | - Deploy ステージに ECS アクションが設定される |
| **信頼性レベル** | 🟡 TASK-0023 より推測 |
| **対応要件** | REQ-041 |

```typescript
// 【テスト目的】: Deploy ステージが ECS を参照することを確認
// 【テスト内容】: Stages 配列の Deploy ステージ設定を検証
// 【期待される動作】: ECS アクションが設定される
// 🟡 信頼性: TASK-0023 より推測

test('Deploy ステージが ECS を参照していること', () => {
  // 【テストデータ準備】: Construct を作成
  new CodePipelineConstruct(stack, 'TestPipeline', {
    pipelineName: 'test-app-pipeline',
    repository: repository,
    buildProject: buildProject,
    ecsCluster: ecsCluster,
    ecsService: ecsService,
  });
  const template = Template.fromStack(stack);

  // 【結果検証】: Deploy ステージの確認
  // 【検証項目】: ECS アクションが含まれる 🟡
  template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
    Stages: Match.arrayWith([
      Match.objectLike({
        Name: 'Deploy',
        Actions: Match.arrayWith([
          Match.objectLike({
            ActionTypeId: Match.objectLike({
              Provider: 'ECS',
            }),
          }),
        ]),
      }),
    ]),
  });
});
```

---

#### TC-CICD-020: アーティファクトバケット確認 🔵

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-CICD-020 |
| **テスト名** | アーティファクトバケットが設定されること |
| **テスト目的** | パイプラインにアーティファクト保存用の S3 バケットが設定されることを確認 |
| **前提条件** | - CodePipelineConstruct が作成済み |
| **テスト手順** | 1. CloudFormation テンプレートを生成<br>2. ArtifactStore プロパティを検証<br>3. S3 バケットが参照されていることを確認 |
| **期待結果** | - ArtifactStore に S3 バケットが設定される |
| **信頼性レベル** | 🔵 CodePipeline 必須要件 |
| **対応要件** | REQ-041 |

```typescript
// 【テスト目的】: アーティファクトバケットが設定されることを確認
// 【テスト内容】: ArtifactStore プロパティの存在を検証
// 【期待される動作】: S3 バケットがアーティファクトストアとして設定される
// 🔵 信頼性: CodePipeline 必須要件

test('アーティファクトバケットが設定されていること', () => {
  // 【テストデータ準備】: Construct を作成
  new CodePipelineConstruct(stack, 'TestPipeline', {
    pipelineName: 'test-app-pipeline',
    repository: repository,
    buildProject: buildProject,
    ecsCluster: ecsCluster,
    ecsService: ecsService,
  });
  const template = Template.fromStack(stack);

  // 【結果検証】: ArtifactStore の確認
  // 【検証項目】: ArtifactStore が S3 タイプで設定されている 🔵
  template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
    ArtifactStore: Match.objectLike({
      Type: 'S3',
      Location: Match.anyValue(),
    }),
  });
});
```

---

#### TC-CICD-021: ブランチ名デフォルト値確認 🟡

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-CICD-021 |
| **テスト名** | ブランチ名のデフォルト値が main であること |
| **テスト目的** | branchName 未指定時にデフォルトで 'main' が使用されることを確認 |
| **前提条件** | - CodePipelineConstruct が作成済み |
| **テスト手順** | 1. branchName を省略して CodePipelineConstruct を作成<br>2. CloudFormation テンプレートを生成<br>3. Source アクションの BranchName を検証 |
| **期待結果** | - BranchName が 'main' に設定される |
| **信頼性レベル** | 🟡 TASK-0023 より推測 |
| **対応要件** | REQ-040 |

```typescript
// 【テスト目的】: ブランチ名のデフォルト値が main であることを確認
// 【テスト内容】: branchName 省略時のデフォルト動作を検証
// 【期待される動作】: 'main' ブランチが使用される
// 🟡 信頼性: TASK-0023 より推測

test('ブランチ名のデフォルト値が main であること', () => {
  // 【テストデータ準備】: branchName を省略して Construct を作成
  new CodePipelineConstruct(stack, 'TestPipeline', {
    pipelineName: 'test-app-pipeline',
    repository: repository,
    buildProject: buildProject,
    ecsCluster: ecsCluster,
    ecsService: ecsService,
    // branchName を省略
  });
  const template = Template.fromStack(stack);

  // 【結果検証】: デフォルトブランチ名の確認
  // 【検証項目】: BranchName が 'main' 🟡
  template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
    Stages: Match.arrayWith([
      Match.objectLike({
        Name: 'Source',
        Actions: Match.arrayWith([
          Match.objectLike({
            Configuration: Match.objectLike({
              BranchName: 'main',
            }),
          }),
        ]),
      }),
    ]),
  });
});
```

---

#### TC-CICD-022: pipeline プロパティ公開確認 🟡

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-CICD-022 |
| **テスト名** | pipeline プロパティが公開されること |
| **テスト目的** | Construct から pipeline プロパティにアクセスでき、IPipeline 型であることを確認 |
| **前提条件** | - CodePipelineConstruct が作成済み |
| **テスト手順** | 1. CodePipelineConstruct を作成<br>2. pipeline プロパティにアクセス<br>3. pipelineArn が取得可能であることを確認 |
| **期待結果** | - pipeline プロパティが定義され、pipelineArn が取得可能 |
| **信頼性レベル** | 🟡 CDK ベストプラクティスより推測 |
| **対応要件** | REQ-041 |

```typescript
// 【テスト目的】: pipeline プロパティが公開されることを確認
// 【テスト内容】: pipeline プロパティの存在と型を検証
// 【期待される動作】: IPipeline 型のプロパティがアクセス可能
// 🟡 信頼性: CDK ベストプラクティスより推測

test('pipeline プロパティが定義されていること', () => {
  // 【テストデータ準備】: Construct を作成
  const pipeline = new CodePipelineConstruct(stack, 'TestPipeline', {
    pipelineName: 'test-app-pipeline',
    repository: repository,
    buildProject: buildProject,
    ecsCluster: ecsCluster,
    ecsService: ecsService,
  });

  // 【結果検証】: プロパティ存在確認
  // 【検証項目】: pipeline プロパティが存在する 🟡
  expect(pipeline.pipeline).toBeDefined();
  expect(pipeline.pipeline.pipelineArn).toBeDefined();
});
```

---

### 2.4 ECS Deploy Action テスト

#### TC-CICD-023: ECS Deploy Action 設定確認 🟡

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-CICD-023 |
| **テスト名** | ECS Deploy Action が設定されること |
| **テスト目的** | Deploy ステージに ECS Deploy Action が正しく設定されることを確認 |
| **前提条件** | - CodePipelineConstruct が作成済み |
| **テスト手順** | 1. CloudFormation テンプレートを生成<br>2. Deploy ステージのアクション設定を検証<br>3. ECS Provider が使用されていることを確認 |
| **期待結果** | - ActionTypeId.Provider が 'ECS' に設定される |
| **信頼性レベル** | 🟡 TASK-0023 より推測 |
| **対応要件** | REQ-041 |

```typescript
// 【テスト目的】: ECS Deploy Action が設定されることを確認
// 【テスト内容】: Deploy ステージの ActionTypeId を検証
// 【期待される動作】: ECS Provider が使用される
// 🟡 信頼性: TASK-0023 より推測

test('ECS Deploy Action が設定されていること', () => {
  // 【テストデータ準備】: Construct を作成
  new CodePipelineConstruct(stack, 'TestPipeline', {
    pipelineName: 'test-app-pipeline',
    repository: repository,
    buildProject: buildProject,
    ecsCluster: ecsCluster,
    ecsService: ecsService,
  });
  const template = Template.fromStack(stack);

  // 【結果検証】: ECS Deploy Action の確認
  // 【検証項目】: Provider が 'ECS' 🟡
  template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
    Stages: Match.arrayWith([
      Match.objectLike({
        Name: 'Deploy',
        Actions: Match.arrayWith([
          Match.objectLike({
            ActionTypeId: Match.objectLike({
              Category: 'Deploy',
              Provider: 'ECS',
            }),
          }),
        ]),
      }),
    ]),
  });
});
```

---

#### TC-CICD-024: ECS Service ターゲット確認 🟡

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-CICD-024 |
| **テスト名** | 正しい ECS Service をターゲットとすること |
| **テスト目的** | Deploy アクションが指定した ECS Service をターゲットとしていることを確認 |
| **前提条件** | - CodePipelineConstruct が作成済み |
| **テスト手順** | 1. CloudFormation テンプレートを生成<br>2. Deploy アクションの Configuration を検証<br>3. ServiceName が設定されていることを確認 |
| **期待結果** | - Configuration.ServiceName が設定される |
| **信頼性レベル** | 🟡 TASK-0023 より推測 |
| **対応要件** | REQ-041 |

```typescript
// 【テスト目的】: 正しい ECS Service をターゲットとすることを確認
// 【テスト内容】: Deploy アクションの Configuration.ServiceName を検証
// 【期待される動作】: ServiceName が設定される
// 🟡 信頼性: TASK-0023 より推測

test('正しい ECS Service をターゲットとしていること', () => {
  // 【テストデータ準備】: Construct を作成
  new CodePipelineConstruct(stack, 'TestPipeline', {
    pipelineName: 'test-app-pipeline',
    repository: repository,
    buildProject: buildProject,
    ecsCluster: ecsCluster,
    ecsService: ecsService,
  });
  const template = Template.fromStack(stack);

  // 【結果検証】: ServiceName の確認
  // 【検証項目】: ServiceName が設定されている 🟡
  template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
    Stages: Match.arrayWith([
      Match.objectLike({
        Name: 'Deploy',
        Actions: Match.arrayWith([
          Match.objectLike({
            Configuration: Match.objectLike({
              ServiceName: Match.anyValue(),
            }),
          }),
        ]),
      }),
    ]),
  });
});
```

---

#### TC-CICD-025: ECS Cluster ターゲット確認 🟡

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-CICD-025 |
| **テスト名** | 正しい ECS Cluster をターゲットとすること |
| **テスト目的** | Deploy アクションが指定した ECS Cluster をターゲットとしていることを確認 |
| **前提条件** | - CodePipelineConstruct が作成済み |
| **テスト手順** | 1. CloudFormation テンプレートを生成<br>2. Deploy アクションの Configuration を検証<br>3. ClusterName が設定されていることを確認 |
| **期待結果** | - Configuration.ClusterName が設定される |
| **信頼性レベル** | 🟡 TASK-0023 より推測 |
| **対応要件** | REQ-041 |

```typescript
// 【テスト目的】: 正しい ECS Cluster をターゲットとすることを確認
// 【テスト内容】: Deploy アクションの Configuration.ClusterName を検証
// 【期待される動作】: ClusterName が設定される
// 🟡 信頼性: TASK-0023 より推測

test('正しい ECS Cluster をターゲットとしていること', () => {
  // 【テストデータ準備】: Construct を作成
  new CodePipelineConstruct(stack, 'TestPipeline', {
    pipelineName: 'test-app-pipeline',
    repository: repository,
    buildProject: buildProject,
    ecsCluster: ecsCluster,
    ecsService: ecsService,
  });
  const template = Template.fromStack(stack);

  // 【結果検証】: ClusterName の確認
  // 【検証項目】: ClusterName が設定されている 🟡
  template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
    Stages: Match.arrayWith([
      Match.objectLike({
        Name: 'Deploy',
        Actions: Match.arrayWith([
          Match.objectLike({
            Configuration: Match.objectLike({
              ClusterName: Match.anyValue(),
            }),
          }),
        ]),
      }),
    ]),
  });
});
```

---

### 2.5 Notification テスト

#### TC-CICD-026: 通知ルール作成確認 🔵

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-CICD-026 |
| **テスト名** | 通知ルールが作成されること |
| **テスト目的** | パイプラインに通知ルールが正しく設定されることを確認 |
| **前提条件** | - CodePipelineConstruct が作成済み<br>- SNS Topic が指定されている |
| **テスト手順** | 1. notificationTopic を指定して CodePipelineConstruct を作成<br>2. CloudFormation テンプレートを生成<br>3. AWS::CodeStarNotifications::NotificationRule の存在を検証 |
| **期待結果** | - NotificationRule リソースが作成される |
| **信頼性レベル** | 🔵 REQ-039 より |
| **対応要件** | REQ-039 |

```typescript
// 【テスト目的】: 通知ルールが作成されることを確認
// 【テスト内容】: AWS::CodeStarNotifications::NotificationRule の存在を検証
// 【期待される動作】: 通知ルールが作成される
// 🔵 信頼性: REQ-039 より

test('通知ルールが作成されること', () => {
  // 【テストデータ準備】: SNS Topic 付きで Construct を作成
  new CodePipelineConstruct(stack, 'TestPipeline', {
    pipelineName: 'test-app-pipeline',
    repository: repository,
    buildProject: buildProject,
    ecsCluster: ecsCluster,
    ecsService: ecsService,
    notificationTopic: snsTopic,
  });
  const template = Template.fromStack(stack);

  // 【結果検証】: NotificationRule の存在確認
  // 【検証項目】: AWS::CodeStarNotifications::NotificationRule が存在する 🔵
  template.resourceCountIs('AWS::CodeStarNotifications::NotificationRule', 1);
});
```

---

#### TC-CICD-027: SNS Target 設定確認 🔵

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-CICD-027 |
| **テスト名** | SNS Topic が通知ターゲットに設定されること |
| **テスト目的** | 通知ルールのターゲットに SNS Topic が正しく設定されることを確認 |
| **前提条件** | - CodePipelineConstruct が作成済み<br>- SNS Topic が指定されている |
| **テスト手順** | 1. CloudFormation テンプレートを生成<br>2. NotificationRule の Targets を検証<br>3. SNS ターゲットが含まれることを確認 |
| **期待結果** | - Targets に SNS Topic が設定される |
| **信頼性レベル** | 🔵 REQ-039 より |
| **対応要件** | REQ-039 |

```typescript
// 【テスト目的】: SNS Topic が通知ターゲットに設定されることを確認
// 【テスト内容】: NotificationRule の Targets を検証
// 【期待される動作】: SNS Topic がターゲットに設定される
// 🔵 信頼性: REQ-039 より

test('SNS Topic が通知ターゲットに設定されること', () => {
  // 【テストデータ準備】: SNS Topic 付きで Construct を作成
  new CodePipelineConstruct(stack, 'TestPipeline', {
    pipelineName: 'test-app-pipeline',
    repository: repository,
    buildProject: buildProject,
    ecsCluster: ecsCluster,
    ecsService: ecsService,
    notificationTopic: snsTopic,
  });
  const template = Template.fromStack(stack);

  // 【結果検証】: Targets の確認
  // 【検証項目】: SNS TargetType が設定されている 🔵
  template.hasResourceProperties('AWS::CodeStarNotifications::NotificationRule', {
    Targets: Match.arrayWith([
      Match.objectLike({
        TargetType: 'SNS',
      }),
    ]),
  });
});
```

---

#### TC-CICD-028: パイプライン通知イベント確認 🔵

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-CICD-028 |
| **テスト名** | パイプラインイベントが通知対象として設定されること |
| **テスト目的** | 適切なパイプラインイベントが通知ルールに設定されることを確認 |
| **前提条件** | - CodePipelineConstruct が作成済み<br>- SNS Topic が指定されている |
| **テスト手順** | 1. CloudFormation テンプレートを生成<br>2. NotificationRule の EventTypeIds を検証<br>3. 必要なイベントが含まれることを確認 |
| **期待結果** | - EventTypeIds に開始、成功、失敗イベントが設定される |
| **信頼性レベル** | 🔵 REQ-039, TASK-0023 より |
| **対応要件** | REQ-039 |

```typescript
// 【テスト目的】: パイプラインイベントが通知対象として設定されることを確認
// 【テスト内容】: NotificationRule の EventTypeIds を検証
// 【期待される動作】: パイプライン実行イベントが設定される
// 🔵 信頼性: REQ-039, TASK-0023 より

test('パイプライン通知イベントが設定されること', () => {
  // 【テストデータ準備】: SNS Topic 付きで Construct を作成
  new CodePipelineConstruct(stack, 'TestPipeline', {
    pipelineName: 'test-app-pipeline',
    repository: repository,
    buildProject: buildProject,
    ecsCluster: ecsCluster,
    ecsService: ecsService,
    notificationTopic: snsTopic,
  });
  const template = Template.fromStack(stack);

  // 【結果検証】: EventTypeIds の確認
  // 【検証項目】: パイプライン実行イベントが含まれる 🔵
  template.hasResourceProperties('AWS::CodeStarNotifications::NotificationRule', {
    EventTypeIds: Match.arrayWith([
      'codepipeline-pipeline-pipeline-execution-started',
      'codepipeline-pipeline-pipeline-execution-succeeded',
      'codepipeline-pipeline-pipeline-execution-failed',
    ]),
  });
});
```

---

### 2.6 Props Validation テスト

#### TC-CICD-029: 必須パラメータ検証（CodeCommit） 🟡

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-CICD-029 |
| **テスト名** | repositoryName が必須であること |
| **テスト目的** | CodeCommitConstruct で repositoryName が必須パラメータであることを確認 |
| **前提条件** | - CDK App と Stack が作成済み |
| **テスト手順** | 1. repositoryName を省略して CodeCommitConstruct を作成試行<br>2. TypeScript コンパイルエラーまたはランタイムエラーを確認 |
| **期待結果** | - コンパイルエラーまたはランタイムエラーが発生する |
| **信頼性レベル** | 🟡 TypeScript 型システムより |
| **対応要件** | REQ-040 |

**注**: このテストケースは TypeScript コンパイル時に検証されるため、ランタイムテストとしては省略可能。Props の型定義により必須パラメータが保証される。

---

#### TC-CICD-030: 必須パラメータ検証（CodeBuild） 🟡

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-CICD-030 |
| **テスト名** | projectName が必須であること |
| **テスト目的** | CodeBuildConstruct で projectName が必須パラメータであることを確認 |
| **前提条件** | - CDK App と Stack が作成済み |
| **テスト手順** | 1. projectName を省略して CodeBuildConstruct を作成試行<br>2. TypeScript コンパイルエラーまたはランタイムエラーを確認 |
| **期待結果** | - コンパイルエラーまたはランタイムエラーが発生する |
| **信頼性レベル** | 🟡 TypeScript 型システムより |
| **対応要件** | REQ-041 |

**注**: このテストケースは TypeScript コンパイル時に検証されるため、ランタイムテストとしては省略可能。

---

#### TC-CICD-031: 必須パラメータ検証（CodePipeline） 🟡

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-CICD-031 |
| **テスト名** | pipelineName, repository, buildProject, ecsService が必須であること |
| **テスト目的** | CodePipelineConstruct で必須パラメータが検証されることを確認 |
| **前提条件** | - CDK App と Stack が作成済み |
| **テスト手順** | 1. 必須パラメータを省略して CodePipelineConstruct を作成試行<br>2. TypeScript コンパイルエラーまたはランタイムエラーを確認 |
| **期待結果** | - コンパイルエラーまたはランタイムエラーが発生する |
| **信頼性レベル** | 🟡 TypeScript 型システムより |
| **対応要件** | REQ-041 |

**注**: このテストケースは TypeScript コンパイル時に検証されるため、ランタイムテストとしては省略可能。

---

### 2.7 Snapshot テスト

#### TC-CICD-032: CodeCommit CloudFormation スナップショット 🔵

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-CICD-032 |
| **テスト名** | CodeCommit CloudFormation テンプレートスナップショット |
| **テスト目的** | 生成される CloudFormation テンプレートが期待通りであることを確認 |
| **前提条件** | - CodeCommitConstruct が作成済み |
| **テスト手順** | 1. CloudFormation テンプレートを生成<br>2. スナップショットと比較 |
| **期待結果** | - テンプレートがスナップショットと一致する |
| **信頼性レベル** | 🔵 CDK ベストプラクティスより |
| **対応要件** | REQ-040 |

```typescript
// 【テスト目的】: CloudFormation テンプレートの一貫性を保証する
// 【テスト内容】: テンプレートをスナップショットと比較
// 【期待される動作】: テンプレートがスナップショットと一致する
// 🔵 信頼性: CDK ベストプラクティスより

test('CloudFormation テンプレートがスナップショットと一致すること', () => {
  // 【テストデータ準備】: Construct を作成
  new CodeCommitConstruct(stack, 'TestRepository', {
    repositoryName: 'test-app-repository',
  });
  const template = Template.fromStack(stack);

  // 【結果検証】: スナップショットとの比較
  // 【検証項目】: CloudFormation テンプレート全体 🔵
  expect(template.toJSON()).toMatchSnapshot();
});
```

---

#### TC-CICD-033: CodeBuild CloudFormation スナップショット 🔵

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-CICD-033 |
| **テスト名** | CodeBuild CloudFormation テンプレートスナップショット |
| **テスト目的** | 生成される CloudFormation テンプレートが期待通りであることを確認 |
| **前提条件** | - CodeBuildConstruct が作成済み |
| **テスト手順** | 1. CloudFormation テンプレートを生成<br>2. スナップショットと比較 |
| **期待結果** | - テンプレートがスナップショットと一致する |
| **信頼性レベル** | 🔵 CDK ベストプラクティスより |
| **対応要件** | REQ-041 |

```typescript
// 【テスト目的】: CloudFormation テンプレートの一貫性を保証する
// 【テスト内容】: テンプレートをスナップショットと比較
// 【期待される動作】: テンプレートがスナップショットと一致する
// 🔵 信頼性: CDK ベストプラクティスより

test('CloudFormation テンプレートがスナップショットと一致すること', () => {
  // 【テストデータ準備】: Construct を作成
  new CodeBuildConstruct(stack, 'TestBuild', {
    projectName: 'test-app-build',
    ecrRepository: ecrRepository,
  });
  const template = Template.fromStack(stack);

  // 【結果検証】: スナップショットとの比較
  // 【検証項目】: CloudFormation テンプレート全体 🔵
  expect(template.toJSON()).toMatchSnapshot();
});
```

---

#### TC-CICD-034: CodePipeline CloudFormation スナップショット 🔵

| 項目 | 内容 |
|------|------|
| **テストケースID** | TC-CICD-034 |
| **テスト名** | CodePipeline CloudFormation テンプレートスナップショット |
| **テスト目的** | 生成される CloudFormation テンプレートが期待通りであることを確認 |
| **前提条件** | - CodePipelineConstruct が作成済み |
| **テスト手順** | 1. CloudFormation テンプレートを生成<br>2. スナップショットと比較 |
| **期待結果** | - テンプレートがスナップショットと一致する |
| **信頼性レベル** | 🔵 CDK ベストプラクティスより |
| **対応要件** | REQ-041 |

```typescript
// 【テスト目的】: CloudFormation テンプレートの一貫性を保証する
// 【テスト内容】: テンプレートをスナップショットと比較
// 【期待される動作】: テンプレートがスナップショットと一致する
// 🔵 信頼性: CDK ベストプラクティスより

test('CloudFormation テンプレートがスナップショットと一致すること', () => {
  // 【テストデータ準備】: Construct を作成
  new CodePipelineConstruct(stack, 'TestPipeline', {
    pipelineName: 'test-app-pipeline',
    repository: repository,
    buildProject: buildProject,
    ecsCluster: ecsCluster,
    ecsService: ecsService,
    notificationTopic: snsTopic,
  });
  const template = Template.fromStack(stack);

  // 【結果検証】: スナップショットとの比較
  // 【検証項目】: CloudFormation テンプレート全体 🔵
  expect(template.toJSON()).toMatchSnapshot();
});
```

---

## 3. 開発言語・フレームワーク

| 項目 | 内容 | 信頼性 |
|------|------|--------|
| **プログラミング言語** | TypeScript (strict mode) | 🔵 |
| **テストフレームワーク** | Jest | 🔵 |
| **CDK Assertions** | aws-cdk-lib/assertions | 🔵 |
| **テスト実行環境** | Node.js 18+ | 🔵 |

### テスト実行コマンド

```bash
# CI/CD 関連テスト全実行
npm test -- cicd

# 個別 Construct テスト実行
npm test -- codecommit-construct.test.ts
npm test -- codebuild-construct.test.ts
npm test -- codepipeline-construct.test.ts

# スナップショット更新
npm test -- -u

# カバレッジ付き実行
npm test -- --coverage
```

🔵 信頼性: CLAUDE.md、package.json より

---

## 4. 要件定義との対応関係

| テストケース | 対応要件 | 信頼性 |
|--------------|----------|--------|
| TC-CICD-001〜005 | REQ-040 (CI/CD パイプライン構築) | 🔵 |
| TC-CICD-006〜015 | REQ-041 (CodePipeline/CodeBuild 使用) | 🟡 |
| TC-CICD-016〜025 | REQ-041 (自動デプロイ) | 🟡 |
| TC-CICD-026〜028 | REQ-039 (Chatbot 経由 Slack 通知) | 🔵 |
| TC-CICD-029〜031 | REQ-040, REQ-041 (Props 検証) | 🟡 |
| TC-CICD-032〜034 | CDK ベストプラクティス (スナップショット) | 🔵 |

---

## 5. 信頼性レベルサマリー

| レベル | 件数 | 割合 |
|--------|------|------|
| 🔵 青信号 | 14 | 41% |
| 🟡 黄信号 | 20 | 59% |
| 🔴 赤信号 | 0 | 0% |

**品質評価**: ⚠️ 要改善

### 主な課題

1. **詳細設計の推測が多い**: CodeBuild、CodePipeline の詳細設定は要件定義書に明記されておらず、推測に基づいている
2. **デプロイ方式未確定**: Rolling Update vs Blue/Green の選択が未確定
3. **手動承認フロー未確定**: Prod 環境での手動承認フローの要否が未確定

### 推奨アクション

1. 実装前に以下の詳細設計を確認:
   - ブランチ戦略の詳細（main/develop の使い分け）
   - 手動承認フローの要否（Prod 環境のみ？）
   - Blue/Green vs Rolling Update の選択
   - buildspec.yml の詳細内容

---

## 6. テストファイル構成

```
infra/test/construct/cicd/
├── codecommit-construct.test.ts   # TC-CICD-001〜005, 032
├── codebuild-construct.test.ts    # TC-CICD-006〜015, 033
└── codepipeline-construct.test.ts # TC-CICD-016〜031, 034
```

---

## 7. TDD 進捗状況

| フェーズ | ステータス | 完了日 | レポート |
|---------|----------|--------|----------|
| TaskNote | ✅ 完了 | 2026-02-01 | `note.md` |
| Requirements | ⏳ 未実施 | - | - |
| **TestCases** | ✅ 完了 | 2026-02-01 | 本ドキュメント |
| Red | ⏳ 未実施 | - | - |
| Green | ⏳ 未実施 | - | - |
| Refactor | ⏳ 未実施 | - | - |
| Verify | ⏳ 未実施 | - | - |

**次のステップ**: `/tsumiki:tdd-red TASK-0023` で Red フェーズ（失敗テスト作成）を開始します。
