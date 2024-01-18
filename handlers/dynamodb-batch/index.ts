import { DynamoDBClient } from '@aws-sdk/client-dynamodb'; 
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

import kuid from 'kuid';
import { readFileSync } from 'node:fs';

function setup() {
  const csv = readFileSync('./MOCK_DATA.csv').toString();
  const lines = csv.split('\n');
  const header = lines.shift()!.split(',');

  return lines.map((line) => line.split(','))
    .filter((line) => line.length === header.length)
    .map((values) => {
      const data: any = {};
      values.forEach((value, i) => {
        data[header[i]] = value.replace('\n', '');
      });
      return data;
    })
    .map(data => {
      data.pk = kuid();
      data.sk = +Date.now();
      return data;
    });
}

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
export function* chunk(arr: Array<any>, stride = 25) {
  for (let i = 0; i < arr.length; i += stride) {
    yield arr.slice(i, Math.min(i + stride, arr.length));
  }
}

const data = setup();

export const handler = async () => {
  const chunks = chunk(data);

  for (const chunk of chunks) {
    const putRequests = chunk.map((Item) => ({ PutRequest: { Item }}));

    const command = new BatchWriteCommand({
      RequestItems: {
        [process.env.TABLE_NAME as string]: putRequests,
      }
    });

    await client.send(command);
  }
}
