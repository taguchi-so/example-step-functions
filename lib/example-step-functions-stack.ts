import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as sfn from "@aws-cdk/aws-stepfunctions";
import * as tasks from "@aws-cdk/aws-stepfunctions-tasks";
import * as events from "@aws-cdk/aws-events";
import * as targets from "@aws-cdk/aws-events-targets";
import * as iam from "@aws-cdk/aws-iam";

interface subnetCongfig {
  subnetId: string;
  availabilityZone: string;
  routeTableId: string;
}

interface StageContext {
  bucketName: string;
  vpcName: string;
  privateSubnets: subnetCongfig[];
  securityGroupID: string;
}

export class ExampleStepFunctionsStack extends cdk.Stack {
  readonly env: string;
  readonly revision: string;
  readonly context: StageContext;
  readonly prefix: string = "ExampleStepFunctions";

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. set enviroment
    this.node.setContext;
    this.env = this.node.tryGetContext("env") || "dev";
    this.revision = this.node.tryGetContext("revision") || "";
    this.context = this.node.tryGetContext(this.env) || {};

    // 2. describe vpc and private subnet and security group
    const { vpc, selectSubnets, securityGroup } = this.getNetworkResources();

    // 3. create lambdas and state machine
    const stateMachine = this.createStateMachine(
      vpc,
      selectSubnets,
      securityGroup
    );

    // 4. create dispatcher labmda and cloudwatch events
    this.createDispatcher(vpc, selectSubnets, securityGroup, stateMachine);
  }

  createStateMachine(
    vpc: ec2.IVpc,
    selectSubnets: ec2.SelectedSubnets,
    securityGroup: ec2.ISecurityGroup
  ): sfn.StateMachine {
    // create lambda to selected vpc and private subnet
    let lambdas: lambda.Function[] = [];
    let lambdaTasks: sfn.Task[] = [];
    ["Lambda1", "Lambda2", "Lambda3"].map(name => {
      const lambdaFunc: lambda.Function = new lambda.Function(
        this,
        `${this.prefix}-${name}`,
        {
          functionName: `${this.prefix}-${name}`,
          code: lambda.Code.asset("src"),
          handler: `${name.toLowerCase()}.handler`,
          timeout: cdk.Duration.seconds(300),
          runtime: lambda.Runtime.NODEJS_10_X,
          environment: {
            ENV: this.env,
            REVISION: this.revision
          },
          vpc: vpc,
          vpcSubnets: selectSubnets,
          securityGroup: securityGroup
        }
      );
      lambdaTasks.push(
        new sfn.Task(this, `${this.prefix}-Task-${name}`, {
          task: new tasks.InvokeFunction(lambdaFunc)
        })
      );
    });

    const definition = lambdaTasks[0].next(lambdaTasks[1]).next(lambdaTasks[2]);
    const stateMachine: sfn.StateMachine = new sfn.StateMachine(
      this,
      `${this.prefix}-StateMachine`,
      {
        stateMachineName: `${this.prefix}-StateMachine`,
        definition: definition,
        timeout: cdk.Duration.minutes(5)
      }
    );
    return stateMachine;
  }

  createDispatcher(
    vpc: ec2.IVpc,
    selectSubnets: ec2.SelectedSubnets,
    securityGroup: ec2.ISecurityGroup,
    stateMachine: sfn.StateMachine
  ): events.Rule {
    const name: string = "Dispatcher";
    const dispatchLambda: lambda.Function = new lambda.Function(
      this,
      `${this.prefix}-${name}`,
      {
        functionName: `${this.prefix}-${name}`,
        code: lambda.Code.asset("src"),
        handler: `${name.toLowerCase()}.handler`,
        timeout: cdk.Duration.seconds(300),
        runtime: lambda.Runtime.NODEJS_10_X,
        environment: {
          ENV: this.env,
          REVISION: this.revision,
          STATEMACHINE_ARN: stateMachine.stateMachineArn
        },
        vpc: vpc,
        vpcSubnets: selectSubnets,
        securityGroup: securityGroup,
        initialPolicy: this.createDispatchPolicyStatements()
      }
    );

    const rule: events.Rule = new events.Rule(this, "Rule", {
      schedule: events.Schedule.expression("cron(*/5 * ? * * *)")
    });

    rule.addTarget(new targets.LambdaFunction(dispatchLambda));
    return rule;
  }

  createDispatchPolicyStatements(): iam.PolicyStatement[] {
    // TODO: 権限をちゃんと考える
    const statement = new iam.PolicyStatement({
      actions: ["states:*"],
      resources: ["*"],
      effect: iam.Effect.ALLOW
    });
    return [statement];
  }

  getNetworkResources(): {
    vpc: ec2.IVpc;
    selectSubnets: ec2.SelectedSubnets;
    securityGroup: ec2.ISecurityGroup;
  } {
    const vpc = ec2.Vpc.fromLookup(this, "VPC", {
      vpcId: this.context.vpcName
    });

    const selectSubnets: ec2.SelectedSubnets = vpc.selectSubnets({
      subnets: this.context.privateSubnets.map(privateSubnet => {
        return ec2.Subnet.fromSubnetAttributes(this, privateSubnet.subnetId, {
          subnetId: privateSubnet.subnetId,
          availabilityZone: privateSubnet.availabilityZone,
          routeTableId: privateSubnet.routeTableId
        });
      })
    });

    const securityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      "SecurityGroup",
      this.context.securityGroupID
    );
    return { vpc, selectSubnets, securityGroup };
  }
}
