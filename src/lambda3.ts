exports.handler = async (event: any, context: any) => {
  const name = "lambda3";
  const now: Date = new Date();
  const revision: string = process.env.REVISION || "";

  const logs = {
    revision: process.env.REVISION,
    event: name,
    isoDate: now.toISOString(),
    time: now.getTime()
  };
  console.log(JSON.stringify(logs));
  const response = {
    statusCode: 200,
    body: JSON.stringify(logs)
  };
  return response;
};
