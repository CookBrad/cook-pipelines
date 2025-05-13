import * as cdk from 'aws-cdk-lib';
import * as pipelines from 'aws-cdk-lib/pipelines';
import * as ssm from 'aws-cdk-lib/aws-ssm';

const app = new cdk.App();

export class MyPipelineStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const pipeline = new pipelines.CodePipeline(this, 'MyPipeline', {
            synth: new pipelines.ShellStep('Synth', {
                input: pipelines.CodePipelineSource.connection('CookBrad/investment-calculator-ts', 'main', {
                    connectionArn: ssm.StringParameter.valueForStringParameter(this, '/connectionArn'),
                }),
                commands: ['npm ci', 'npm run build', 'npx cdk synth'],
            }),
        });
    }
}

new MyPipelineStack(app, 'MyPipelineStack');

app.synth();