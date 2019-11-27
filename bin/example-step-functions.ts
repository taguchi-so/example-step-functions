#!/usr/bin/env node
import "source-map-support/register";
import cdk = require("@aws-cdk/core");
import { ExampleStepFunctionsStack } from "../lib/example-step-functions-stack";

const app = new cdk.App();
const env: string = app.node.tryGetContext("env");
new ExampleStepFunctionsStack(
  app,
  `ExampleStepFunctionsStack-${env || "dev"}`,
  {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION
    }
  }
);
