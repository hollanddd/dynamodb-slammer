import * as cdk from "aws-cdk-lib";
import {
  Dashboard,
  GraphWidget,
  Metric,
  Unit,
} from "aws-cdk-lib/aws-cloudwatch";
import { AttributeType, TableV2 } from "aws-cdk-lib/aws-dynamodb";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { join } from "path";

export class DynamoWritesStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const keySchema = {
      partitionKey: {
        type: AttributeType.STRING,
        name: "pk",
      },
      sortKey: {
        type: AttributeType.NUMBER,
        name: "sk",
      },
    };

    // Batch Write POC
    const batchPutTable = new TableV2(this, "BatchTable", {
      ...keySchema,
    });

    const batchPutFunction = new NodejsFunction(this, "DynamodbBatchFunction", {
      timeout: cdk.Duration.seconds(12),
      memorySize: 512,
      bundling: {
        commandHooks: {
          afterBundling: (_: string, outputDir: string): string[] => [
            `cp ${join(__dirname, "..", "..", "handlers", "dynamodb-batch", "MOCK_DATA.csv")} ${outputDir}`,
          ],
          beforeBundling: (): string[] => [],
          beforeInstall: (): string[] => [],
        },
      },
      entry: join(
        __dirname,
        "..",
        "..",
        "handlers",
        "dynamodb-batch",
        "index.ts",
      ),
      environment: {
        TABLE_NAME: batchPutTable.tableName,
      },
    });

    batchPutTable.grantWriteData(batchPutFunction);

    // Write from queue POC
    // Producer queue
    const queue = new Queue(this, "QueuWritePoC");

    const queueProducerFunction = new NodejsFunction(
      this,
      "QueueProducerFunc",
      {
        timeout: cdk.Duration.seconds(12),
        memorySize: 512,
        bundling: {
          commandHooks: {
            afterBundling: (_: string, outputDir: string): string[] => [
              `cp ${join(__dirname, "..", "..", "handlers", "queue-producer", "MOCK_DATA.csv")} ${outputDir}`,
            ],
            beforeBundling: (): string[] => [],
            beforeInstall: (): string[] => [],
          },
        },
        entry: join(
          __dirname,
          "..",
          "..",
          "handlers",
          "queue-producer",
          "index.ts",
        ),
        environment: {
          QUEUE_URL: queue.queueUrl,
        },
      },
    );

    queue.grantSendMessages(queueProducerFunction);

    // Consumer Queue
    const queueProducerTable = new TableV2(this, "QueuTable", {
      ...keySchema,
    });

    const queueConsumerFunction = new NodejsFunction(
      this,
      "QueueConsumerFunc",
      {
        timeout: cdk.Duration.seconds(12),
        memorySize: 512,
        entry: join(
          __dirname,
          "..",
          "..",
          "handlers",
          "queue-consumer",
          "index.ts",
        ),
        environment: {
          TABLE_NAME: queueProducerTable.tableName,
        },
      },
    );

    queueConsumerFunction.addEventSource(
      new SqsEventSource(queue, {
        batchSize: 5,
        reportBatchItemFailures: true,
      }),
    );

    queueProducerTable.grantWriteData(queueConsumerFunction);

    // Run every ten minutes
    new Rule(this, "PeriodicDynamodbPut", {
      description: "Schedule run every ten minutes",
      schedule: Schedule.rate(cdk.Duration.minutes(10)),
      targets: [
        // Uncomment to test batch write
        // new LambdaFunction(batchPutFunction),
        new LambdaFunction(queueProducerFunction),
      ],
    });

    // Dashboard
    const dashboard = new Dashboard(this, "DynamodbWriteCapacityPOC");

    dashboard.addWidgets(
      new GraphWidget({
        width: 24,
        title: "Batch Item",
        left: [
          new Metric({
            metricName: "ConsumedWriteCapacityUnits",
            namespace: "AWS/DynamoDB",
            dimensionsMap: { TableName: batchPutTable.tableName },
            statistic: "sum",
            label: "ConsumedWriteCapacityUnits",
            unit: Unit.COUNT,
            period: cdk.Duration.seconds(1),
          }),
        ],
      }),
    );

    dashboard.addWidgets(
      new GraphWidget({
        width: 24,
        title: "Queue Item",
        left: [
          new Metric({
            metricName: "ConsumedWriteCapacityUnits",
            namespace: "AWS/DynamoDB",
            dimensionsMap: { TableName: queueProducerTable.tableName },
            statistic: "sum",
            label: "ConsumedWriteCapacityUnits",
            unit: Unit.COUNT,
            period: cdk.Duration.seconds(1),
          }),
        ],
      }),
    );
  }
}
