import { StepFunctions } from "aws-sdk";
exports.handler = async (event: any, context: any) => {
  const stepfunctions = new StepFunctions({ apiVersion: "2016-11-23" });
  const stateMachineArn = process.env.STATEMACHINE_ARN || "";
  const params = { stateMachineArn };
  const result = await stepfunctions.startExecution(params).promise();
  console.log({ result });
};
