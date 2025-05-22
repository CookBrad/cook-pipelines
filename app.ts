import * as cdk from 'aws-cdk-lib';
import * as pipelines from 'aws-cdk-lib/pipelines';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as iam from 'aws-cdk-lib/aws-iam';

export class PipelineStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, {
            ...props,
            env: {
                account: process.env.CDK_DEFAULT_ACCOUNT,
                region: 'us-east-2', // Adjust to your region
            },
        });

        // Create an IAM role for the pipeline
        const pipelineRole = new iam.Role(this, 'PipelineRole', {
            assumedBy: new iam.ServicePrincipal('codepipeline.amazonaws.com'),
        });

        const regionAndAccount = `${process.env.AWS_DEFAULT_REGION}:${process.env.CDK_DEFAULT_ACCOUNT}`;

        // Add CodeStar Connections permission to the role
        pipelineRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['codestar-connections:UseConnection'],
            resources: [`arn:aws:codeconnections:${regionAndAccount}:connection/*`],
        }));

        // Add permissions for CodePipeline operations and role assumption
        pipelineRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:GetObject',
                's3:PutObject',
                's3:ListBucket',
                'codebuild:StartBuild',
                'codebuild:BatchGetBuilds',
                'iam:PassRole',
                'sts:AssumeRole', // Required for role assumption
            ],
            resources: ['*'], // Refine to specific resources for production
        }));

        // Construct the CodeStar Connections ARN using SSM parameter
        const connectionArn = `arn:aws:codeconnections:${process.env.AWS_DEFAULT_REGION}:${process.env.CDK_DEFAULT_ACCOUNT}:connection/${ssm.StringParameter.valueFromLookup(this, '/connectionArn')}`;

        // Define the pipeline
        const pipeline = new pipelines.CodePipeline(this, 'InvestmentCalculator', {
            role: pipelineRole,
            synth: new pipelines.ShellStep('Synth', {
                input: pipelines.CodePipelineSource.connection('CookBrad/investment-calculator-ts', 'main', {
                    triggerOnPush: true,
                    connectionArn: connectionArn, // Correct ARN for GitHub connection
                }),
                commands: ['npm ci', 'npm run build', 'npx cdk synth'],
            }),
            codeBuildDefaults: {
                rolePolicy: [
                    new iam.PolicyStatement({
                        actions: ['ssm:GetParameter'],
                        resources: [`arn:aws:ssm:${this.region}:${this.account}:parameter/connectionArn`],
                    }),
                    new iam.PolicyStatement({
                        actions: ['sts:AssumeRole'],
                        resources: ['*'], // Refine for production
                    }),
                ],
            },
        });
    }
}