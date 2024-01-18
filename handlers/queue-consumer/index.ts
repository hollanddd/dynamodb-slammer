import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { SQSEvent } from 'aws-lambda';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const tableName = process.env.TABLE_NAME as string

export const handler = async (event: SQSEvent) => {
  const records = event.Records.map((record) => JSON.parse(record.body));

  console.log('records:', records.length);

  const command = new BatchWriteCommand({
    RequestItems: {
      [tableName]: records.map((Item) => ({
        PutRequest: { Item }
      })),
    },
  });

  await client.send(command);
}
